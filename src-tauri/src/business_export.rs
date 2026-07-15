use std::collections::{HashMap, VecDeque};
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, AtomicU8, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_EXPORT_CHUNK_BYTES: usize = 1 << 20;
const VALIDATION_TAIL_CHARS: usize = 128;
const FINALIZATION_PENDING: u8 = 0;
const FINALIZATION_CANCELLED: u8 = 1;
const FINALIZATION_COMMITTING: u8 = 2;
const TERMINAL_HISTORY_LIMIT: usize = 64;

pub struct BusinessExportStreamState {
    registry: Mutex<BusinessExportRegistry>,
    sequence: AtomicU64,
    operation_sequence: AtomicU64,
}

struct BusinessExportRegistry {
    sessions: HashMap<String, BusinessExportSession>,
    reservations: HashMap<String, String>,
    terminal_history: HashMap<String, TerminalOutcome>,
    terminal_order: VecDeque<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum TerminalOutcome {
    Committed,
    Cancelled,
}

enum BusinessExportSession {
    Preparing {
        destination_key: String,
    },
    Active(ActiveBusinessExportHandle),
    Appending {
        token: u64,
        handle: ActiveBusinessExportHandle,
    },
    Finalizing(Arc<AtomicU8>),
    Published(PublishedBusinessExport),
    Cleaning {
        token: u64,
        target: CleanupTarget,
    },
    CleanupPending(CleanupTarget),
    Committing {
        token: u64,
        published: PublishedBusinessExport,
    },
}

type ActiveBusinessExportHandle = Arc<ActiveBusinessExportSession>;

struct ActiveBusinessExportSession {
    stream: Mutex<Option<ActiveBusinessExportStream>>,
    cancellation: Arc<AtomicU8>,
}

struct ActiveBusinessExportStream {
    final_path: PathBuf,
    temp_path: PathBuf,
    backup_path: PathBuf,
    destination_key: String,
    file: File,
    file_name: String,
    extension: String,
    bytes_written: usize,
    validation_tail: String,
}

#[derive(Clone)]
struct PublishedBusinessExport {
    final_path: PathBuf,
    backup_path: Option<PathBuf>,
    owns_final_output: bool,
    destination_key: String,
}

#[derive(Clone)]
enum CleanupTarget {
    Partial(PartialBusinessExportCleanup),
    Published(PublishedBusinessExport),
    Transaction {
        partial: PartialBusinessExportCleanup,
        published: PublishedBusinessExport,
    },
}

#[derive(Clone)]
struct PartialBusinessExportCleanup {
    temp_path: PathBuf,
    destination_key: String,
}

impl CleanupTarget {
    fn destination_key(&self) -> &str {
        match self {
            Self::Partial(partial) => &partial.destination_key,
            Self::Published(published) => &published.destination_key,
            Self::Transaction { partial, .. } => &partial.destination_key,
        }
    }
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginBusinessExportStreamPayload {
    pub path: String,
    pub expected_extension: String,
    pub redaction_policy: String,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginBusinessExportStreamResponse {
    pub session_id: String,
    pub file_name: String,
    pub extension: String,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendBusinessExportStreamResponse {
    pub bytes_written: usize,
}

impl BusinessExportStreamState {
    pub fn new() -> Self {
        Self {
            registry: Mutex::new(BusinessExportRegistry {
                sessions: HashMap::new(),
                reservations: HashMap::new(),
                terminal_history: HashMap::new(),
                terminal_order: VecDeque::new(),
            }),
            sequence: AtomicU64::new(0),
            operation_sequence: AtomicU64::new(0),
        }
    }

    pub fn cleanup_all(&self) -> Result<(), String> {
        self.cleanup_all_with_ops(remove_file_if_present, |from, to| std::fs::rename(from, to))
    }

    #[cfg(test)]
    fn cleanup_all_with_remover<F>(&self, remove_file: F) -> Result<(), String>
    where
        F: FnMut(&Path) -> std::io::Result<()>,
    {
        self.cleanup_all_with_ops(remove_file, |from, to| std::fs::rename(from, to))
    }

    fn cleanup_all_with_ops<F, G>(
        &self,
        mut remove_file: F,
        mut rename_file: G,
    ) -> Result<(), String>
    where
        F: FnMut(&Path) -> std::io::Result<()>,
        G: FnMut(&Path, &Path) -> std::io::Result<()>,
    {
        let session_ids = lock_registry(self)
            .sessions
            .keys()
            .cloned()
            .collect::<Vec<_>>();
        for session_id in session_ids {
            let _ = cancel_business_export_stream_with_ops(
                self,
                &session_id,
                &mut remove_file,
                &mut rename_file,
            );
        }
        let registry = lock_registry(self);
        if registry.sessions.is_empty() {
            return Ok(());
        }
        if registry
            .sessions
            .values()
            .any(|session| matches!(session, BusinessExportSession::CleanupPending(_)))
        {
            return Err("导出文件清理失败，请关闭占用文件后重试。".into());
        }
        Err("正在安全取消导出，请稍后重试关闭应用。".into())
    }

    #[cfg(test)]
    fn active_count(&self) -> usize {
        lock_registry(self)
            .sessions
            .values()
            .filter(|session| {
                matches!(
                    session,
                    BusinessExportSession::Active(_)
                        | BusinessExportSession::Appending { .. }
                        | BusinessExportSession::Finalizing(_)
                )
            })
            .count()
    }

    #[cfg(test)]
    fn session_count(&self) -> usize {
        lock_registry(self).sessions.len()
    }

    #[cfg(test)]
    fn active_temp_path(&self, session_id: &str) -> Option<PathBuf> {
        let handle = {
            let registry = lock_registry(self);
            match registry.sessions.get(session_id) {
                Some(BusinessExportSession::Active(handle))
                | Some(BusinessExportSession::Appending { handle, .. }) => Some(Arc::clone(handle)),
                Some(BusinessExportSession::Preparing { .. })
                | Some(BusinessExportSession::Finalizing(_))
                | Some(BusinessExportSession::Published(_))
                | Some(BusinessExportSession::Cleaning { .. })
                | Some(BusinessExportSession::CleanupPending(_))
                | Some(BusinessExportSession::Committing { .. })
                | None => None,
            }
        }?;
        let stream = lock_active_stream(&handle);
        stream.as_ref().map(|stream| stream.temp_path.clone())
    }

    #[cfg(test)]
    fn registry_is_unlocked(&self) -> bool {
        self.registry.try_lock().is_ok()
    }

    #[cfg(test)]
    fn terminal_count(&self) -> usize {
        lock_registry(self).terminal_history.len()
    }
}

impl Default for BusinessExportStreamState {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for BusinessExportStreamState {
    fn drop(&mut self) {
        let registry = self
            .registry
            .get_mut()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let sessions = registry
            .sessions
            .drain()
            .map(|(_, session)| session)
            .collect::<Vec<_>>();
        for session in sessions {
            cleanup_session_best_effort(session);
        }
    }
}

pub fn begin_business_export_stream(
    state: &BusinessExportStreamState,
    payload: BeginBusinessExportStreamPayload,
) -> Result<BeginBusinessExportStreamResponse, String> {
    validate_redaction_policy(&payload.redaction_policy)?;
    let extension = normalize_extension(&payload.expected_extension)?;
    let final_path = PathBuf::from(payload.path);
    validate_business_export_path(&final_path, extension)?;
    let file_name = final_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "保存文件名无效，请重新选择位置。".to_string())?
        .to_string();
    let session_id = next_stream_id(state);
    let destination_key = normalize_destination_key(&final_path)?;
    {
        let mut registry = lock_registry(state);
        if registry.reservations.contains_key(&destination_key) {
            return Err("该文件正在导出，请等待当前任务结束后重试。".into());
        }
        registry
            .reservations
            .insert(destination_key.clone(), session_id.clone());
        registry.sessions.insert(
            session_id.clone(),
            BusinessExportSession::Preparing {
                destination_key: destination_key.clone(),
            },
        );
    }
    let parent = final_path
        .parent()
        .ok_or_else(|| "保存位置不可用，请重新选择。".to_string())?;
    let temp_path = parent.join(format!(".{}.{}.partial", file_name, session_id));
    let backup_path = parent.join(format!(".{}.{}.backup", file_name, session_id));
    let file = match OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temp_path)
    {
        Ok(file) => file,
        Err(_) => {
            remove_session_and_reservation(state, &session_id, &destination_key);
            return Err("无法准备导出文件，请重新选择位置。".into());
        }
    };
    let stream = ActiveBusinessExportStream {
        final_path,
        temp_path,
        backup_path,
        destination_key: destination_key.clone(),
        file,
        file_name: file_name.clone(),
        extension: extension.to_string(),
        bytes_written: 0,
        validation_tail: String::new(),
    };
    let mut registry = lock_registry(state);
    let can_activate = matches!(
        registry.sessions.get(&session_id),
        Some(BusinessExportSession::Preparing { destination_key: current })
            if current == &destination_key
    );
    if !can_activate {
        drop(registry);
        cleanup_active_best_effort(stream);
        remove_session_and_reservation(state, &session_id, &destination_key);
        return Err("导出任务不可用，请重新开始。".into());
    }
    let handle = Arc::new(ActiveBusinessExportSession {
        stream: Mutex::new(Some(stream)),
        cancellation: Arc::new(AtomicU8::new(FINALIZATION_PENDING)),
    });
    registry
        .sessions
        .insert(session_id.clone(), BusinessExportSession::Active(handle));
    Ok(BeginBusinessExportStreamResponse {
        session_id,
        file_name,
        extension: extension.to_string(),
    })
}

pub fn append_business_export_stream(
    state: &BusinessExportStreamState,
    session_id: &str,
    chunk: &str,
) -> Result<AppendBusinessExportStreamResponse, String> {
    let mut remove_file = remove_file_if_present;
    let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
    append_business_export_stream_with_ops(
        state,
        session_id,
        chunk,
        |file, bytes| file.write_all(bytes),
        || {},
        &mut remove_file,
        &mut rename_file,
    )
}

#[cfg(test)]
fn append_business_export_stream_with_writer<W>(
    state: &BusinessExportStreamState,
    session_id: &str,
    chunk: &str,
    write_chunk: W,
) -> Result<AppendBusinessExportStreamResponse, String>
where
    W: FnOnce(&mut File, &[u8]) -> std::io::Result<()>,
{
    let mut remove_file = remove_file_if_present;
    let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
    append_business_export_stream_with_ops(
        state,
        session_id,
        chunk,
        write_chunk,
        || {},
        &mut remove_file,
        &mut rename_file,
    )
}

#[cfg(test)]
fn append_business_export_stream_with_writer_and_remover<W, R>(
    state: &BusinessExportStreamState,
    session_id: &str,
    chunk: &str,
    write_chunk: W,
    mut remove_file: R,
) -> Result<AppendBusinessExportStreamResponse, String>
where
    W: FnOnce(&mut File, &[u8]) -> std::io::Result<()>,
    R: FnMut(&Path) -> std::io::Result<()>,
{
    let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
    append_business_export_stream_with_ops(
        state,
        session_id,
        chunk,
        write_chunk,
        || {},
        &mut remove_file,
        &mut rename_file,
    )
}

#[cfg(test)]
fn append_business_export_stream_with_writer_and_after_cancellation_check<W, H>(
    state: &BusinessExportStreamState,
    session_id: &str,
    chunk: &str,
    write_chunk: W,
    after_cancellation_check: H,
) -> Result<AppendBusinessExportStreamResponse, String>
where
    W: FnOnce(&mut File, &[u8]) -> std::io::Result<()>,
    H: FnOnce(),
{
    let mut remove_file = remove_file_if_present;
    let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
    append_business_export_stream_with_ops(
        state,
        session_id,
        chunk,
        write_chunk,
        after_cancellation_check,
        &mut remove_file,
        &mut rename_file,
    )
}

fn append_business_export_stream_with_ops<W, H, R, G>(
    state: &BusinessExportStreamState,
    session_id: &str,
    chunk: &str,
    write_chunk: W,
    after_cancellation_check: H,
    remove_file: &mut R,
    rename_file: &mut G,
) -> Result<AppendBusinessExportStreamResponse, String>
where
    W: FnOnce(&mut File, &[u8]) -> std::io::Result<()>,
    H: FnOnce(),
    R: FnMut(&Path) -> std::io::Result<()>,
    G: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    let append_token = next_operation_id(state);
    let handle = {
        let mut registry = lock_registry(state);
        let handle = match registry.sessions.get(session_id) {
            Some(BusinessExportSession::Active(handle)) => Arc::clone(handle),
            Some(BusinessExportSession::Appending { .. }) => {
                return Err("导出正在写入，请稍后重试。".into());
            }
            Some(BusinessExportSession::Finalizing(_))
            | Some(BusinessExportSession::Published(_))
            | Some(BusinessExportSession::Preparing { .. })
            | Some(BusinessExportSession::Cleaning { .. })
            | Some(BusinessExportSession::CleanupPending(_))
            | Some(BusinessExportSession::Committing { .. })
            | None => {
                return Err("导出任务已结束，请重新开始。".into());
            }
        };
        registry.sessions.insert(
            session_id.to_string(),
            BusinessExportSession::Appending {
                token: append_token,
                handle: Arc::clone(&handle),
            },
        );
        handle
    };

    let mut stream_guard = lock_active_stream(&handle);
    let stream = stream_guard
        .as_mut()
        .ok_or_else(|| "导出写入状态不确定，请重新开始。".to_string())?;
    let outcome = if chunk.len() > MAX_EXPORT_CHUNK_BYTES {
        Err("单次导出内容过大，请缩小分块后重试。".to_string())
    } else {
        let candidate = format!("{}{}", stream.validation_tail, chunk);
        match validate_business_export_content(&candidate) {
            Err(error) => Err(error),
            Ok(()) => match stream.bytes_written.checked_add(chunk.len()) {
                None => Err("导出内容过大，请缩小范围后重试。".to_string()),
                Some(bytes_written) => match write_chunk(&mut stream.file, chunk.as_bytes()) {
                    Err(_) => Err("保存失败，请换一个位置后重试。".to_string()),
                    Ok(()) => {
                        stream.bytes_written = bytes_written;
                        stream.validation_tail = trailing_chars(&candidate, VALIDATION_TAIL_CHARS);
                        Ok(AppendBusinessExportStreamResponse { bytes_written })
                    }
                },
            },
        }
    };
    let outcome = if handle.cancellation.load(Ordering::Acquire) == FINALIZATION_CANCELLED {
        Err("导出已取消，请重新开始。".to_string())
    } else {
        outcome
    };
    after_cancellation_check();

    let mut registry = lock_registry(state);
    let owns_append_token = matches!(
        registry.sessions.get(session_id),
        Some(BusinessExportSession::Appending { token, handle: current })
            if *token == append_token && Arc::ptr_eq(current, &handle)
    );
    if !owns_append_token {
        return Err("导出写入状态不确定，请稍后重试。".into());
    }
    let outcome = if handle.cancellation.load(Ordering::Acquire) == FINALIZATION_CANCELLED {
        Err("导出已取消，请重新开始。".to_string())
    } else {
        outcome
    };
    if outcome.is_ok() {
        registry.sessions.insert(
            session_id.to_string(),
            BusinessExportSession::Active(Arc::clone(&handle)),
        );
        drop(registry);
        drop(stream_guard);
        return outcome;
    }

    let original_error = outcome.expect_err("error branch checked");
    let stream = stream_guard
        .take()
        .ok_or_else(|| "导出写入状态不确定，请稍后重试。".to_string())?;
    let ActiveBusinessExportStream {
        temp_path,
        destination_key,
        file,
        ..
    } = stream;
    let target = CleanupTarget::Partial(PartialBusinessExportCleanup {
        temp_path,
        destination_key,
    });
    let cleanup_token = next_operation_id(state);
    registry.sessions.insert(
        session_id.to_string(),
        BusinessExportSession::Cleaning {
            token: cleanup_token,
            target: target.clone(),
        },
    );
    drop(registry);
    drop(stream_guard);
    drop(file);
    execute_cleanup_operation(
        state,
        session_id,
        cleanup_token,
        target,
        remove_file,
        rename_file,
    )?;
    Err(original_error)
}

pub fn complete_business_export_stream(
    state: &BusinessExportStreamState,
    session_id: &str,
) -> Result<BusinessExportResponse, String> {
    complete_business_export_stream_with_hooks(state, session_id, || {}, || {}, || {})
}

fn complete_business_export_stream_with_hooks<F, G, H>(
    state: &BusinessExportStreamState,
    session_id: &str,
    before_publish: F,
    after_publish_gate: G,
    after_rename: H,
) -> Result<BusinessExportResponse, String>
where
    F: FnOnce(),
    G: FnOnce(),
    H: FnOnce(),
{
    enum ActiveAcquisition {
        Take(ActiveBusinessExportHandle, Arc<AtomicU8>),
        Wait(ActiveBusinessExportHandle),
    }

    let (handle, finalization) = loop {
        let acquisition = {
            let mut registry = lock_registry(state);
            match registry.sessions.get(session_id) {
                Some(BusinessExportSession::Active(handle)) => {
                    let handle = Arc::clone(handle);
                    let finalization = Arc::clone(&handle.cancellation);
                    registry.sessions.insert(
                        session_id.to_string(),
                        BusinessExportSession::Finalizing(Arc::clone(&finalization)),
                    );
                    ActiveAcquisition::Take(handle, finalization)
                }
                Some(BusinessExportSession::Appending { handle, .. }) => {
                    ActiveAcquisition::Wait(Arc::clone(handle))
                }
                Some(BusinessExportSession::Preparing { .. })
                | Some(BusinessExportSession::Finalizing(_))
                | Some(BusinessExportSession::Published(_))
                | Some(BusinessExportSession::Cleaning { .. })
                | Some(BusinessExportSession::CleanupPending(_))
                | Some(BusinessExportSession::Committing { .. })
                | None => return Err("导出任务已结束，请重新开始。".into()),
            }
        };
        match acquisition {
            ActiveAcquisition::Take(handle, finalization) => break (handle, finalization),
            ActiveAcquisition::Wait(handle) => {
                drop(lock_active_stream(&handle));
            }
        }
    };
    let mut stream = lock_active_stream(&handle)
        .take()
        .ok_or_else(|| "导出完成状态不确定，请重新开始。".to_string())?;
    if stream.file.flush().is_err() || stream.file.sync_all().is_err() {
        cleanup_finalizing_partial(state, session_id, &finalization, stream)?;
        return Err("保存失败，请换一个位置后重试。".into());
    }
    before_publish();
    if finalization
        .compare_exchange(
            FINALIZATION_PENDING,
            FINALIZATION_COMMITTING,
            Ordering::AcqRel,
            Ordering::Acquire,
        )
        .is_err()
    {
        cleanup_finalizing_partial(state, session_id, &finalization, stream)?;
        return Err("导出已取消，请重新开始。".into());
    }
    after_publish_gate();
    let response = BusinessExportResponse {
        file_name: stream.file_name.clone(),
        extension: stream.extension.clone(),
        bytes_written: stream.bytes_written,
    };
    let temp_path = stream.temp_path.clone();
    let final_path = stream.final_path.clone();
    let reserved_backup_path = stream.backup_path.clone();
    let destination_key = stream.destination_key.clone();
    drop(stream.file);
    let partial = PartialBusinessExportCleanup {
        temp_path: temp_path.clone(),
        destination_key: destination_key.clone(),
    };
    if finalization.load(Ordering::Acquire) == FINALIZATION_CANCELLED {
        cleanup_finalizing_target(
            state,
            session_id,
            &finalization,
            CleanupTarget::Partial(partial),
        )?;
        return Err("导出已取消，请重新开始。".into());
    }

    let backup_path = match preserve_existing_destination(&final_path, &reserved_backup_path) {
        Ok(backup_path) => backup_path,
        Err(error) => {
            cleanup_finalizing_target(
                state,
                session_id,
                &finalization,
                CleanupTarget::Partial(partial),
            )?;
            return Err(error);
        }
    };
    let mut published = PublishedBusinessExport {
        final_path: final_path.clone(),
        backup_path,
        owns_final_output: false,
        destination_key,
    };
    if finalization.load(Ordering::Acquire) == FINALIZATION_CANCELLED {
        cleanup_finalizing_target(
            state,
            session_id,
            &finalization,
            CleanupTarget::Transaction {
                partial: partial.clone(),
                published: published.clone(),
            },
        )?;
        return Err("导出已取消，请重新开始。".into());
    }

    if std::fs::rename(&temp_path, &final_path).is_err() {
        cleanup_finalizing_target(
            state,
            session_id,
            &finalization,
            CleanupTarget::Transaction {
                partial,
                published: published.clone(),
            },
        )?;
        return Err("保存失败，请换一个位置后重试。".into());
    }
    published.owns_final_output = true;
    after_rename();
    let Some(finalization_status) = replace_finalizing_session(
        state,
        session_id,
        &finalization,
        BusinessExportSession::Published(published),
    ) else {
        return Err("导出文件清理失败，请稍后重试。".into());
    };
    if finalization_status == FINALIZATION_CANCELLED {
        cancel_business_export_stream(state, session_id)?;
        return Err("导出已取消，请重新开始。".into());
    }
    Ok(response)
}

pub fn commit_business_export_stream(
    state: &BusinessExportStreamState,
    session_id: &str,
) -> Result<(), String> {
    let (token, published) = {
        let mut registry = lock_registry(state);
        let published = match registry.sessions.get(session_id) {
            Some(BusinessExportSession::Published(published)) => published.clone(),
            Some(BusinessExportSession::Committing { .. }) => {
                return Err("导出正在提交，请稍后重试。".into());
            }
            Some(BusinessExportSession::CleanupPending(_))
            | Some(BusinessExportSession::Cleaning { .. }) => {
                return Err("导出已取消或正在安全清理，无法提交。".into());
            }
            Some(BusinessExportSession::Preparing { .. })
            | Some(BusinessExportSession::Active(_))
            | Some(BusinessExportSession::Appending { .. })
            | Some(BusinessExportSession::Finalizing(_)) => {
                return Err("导出任务尚未完成，请稍后重试。".into());
            }
            None => return terminal_commit_result(&registry, session_id),
        };
        let token = next_operation_id(state);
        registry.sessions.insert(
            session_id.to_string(),
            BusinessExportSession::Committing {
                token,
                published: published.clone(),
            },
        );
        (token, published)
    };

    let cleanup_result = published
        .backup_path
        .as_deref()
        .map(remove_file_if_present)
        .unwrap_or(Ok(()));
    let mut registry = lock_registry(state);
    let owns_commit_token = matches!(
        registry.sessions.get(session_id),
        Some(BusinessExportSession::Committing { token: current, .. }) if *current == token
    );
    if !owns_commit_token {
        return Err("导出提交状态不确定，请稍后重试。".into());
    }
    if cleanup_result.is_err() {
        registry.sessions.insert(
            session_id.to_string(),
            BusinessExportSession::Published(published),
        );
        return Err("导出备份清理失败，请关闭占用文件后重试。".into());
    }
    finish_terminal_session(
        &mut registry,
        session_id,
        &published.destination_key,
        TerminalOutcome::Committed,
    );
    Ok(())
}

pub fn cancel_business_export_stream(
    state: &BusinessExportStreamState,
    session_id: &str,
) -> Result<(), String> {
    let mut remove_file = |path: &Path| std::fs::remove_file(path);
    let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
    cancel_business_export_stream_with_ops(state, session_id, &mut remove_file, &mut rename_file)
}

#[cfg(test)]
fn cancel_business_export_stream_with_remover<F>(
    state: &BusinessExportStreamState,
    session_id: &str,
    remove_file: F,
) -> Result<(), String>
where
    F: FnMut(&Path) -> std::io::Result<()>,
{
    let mut remove_file = remove_file;
    let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
    cancel_business_export_stream_with_ops(state, session_id, &mut remove_file, &mut rename_file)
}

fn cancel_business_export_stream_with_ops<F, G>(
    state: &BusinessExportStreamState,
    session_id: &str,
    remove_file: &mut F,
    rename_file: &mut G,
) -> Result<(), String>
where
    F: FnMut(&Path) -> std::io::Result<()>,
    G: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    enum CancelAction {
        Active(ActiveBusinessExportHandle, Arc<AtomicU8>),
        Cleanup(u64, CleanupTarget),
    }

    let action = {
        let mut registry = lock_registry(state);
        let session = registry.sessions.remove(session_id);
        match session {
            Some(BusinessExportSession::Active(handle)) => {
                let finalization = Arc::clone(&handle.cancellation);
                finalization.store(FINALIZATION_CANCELLED, Ordering::Release);
                registry.sessions.insert(
                    session_id.to_string(),
                    BusinessExportSession::Finalizing(Arc::clone(&finalization)),
                );
                CancelAction::Active(handle, finalization)
            }
            Some(BusinessExportSession::Appending { token, handle }) => {
                handle
                    .cancellation
                    .store(FINALIZATION_CANCELLED, Ordering::Release);
                registry.sessions.insert(
                    session_id.to_string(),
                    BusinessExportSession::Appending { token, handle },
                );
                return Ok(());
            }
            Some(BusinessExportSession::Published(published)) => {
                let target = CleanupTarget::Published(published);
                let token = next_operation_id(state);
                registry.sessions.insert(
                    session_id.to_string(),
                    BusinessExportSession::Cleaning {
                        token,
                        target: target.clone(),
                    },
                );
                CancelAction::Cleanup(token, target)
            }
            Some(BusinessExportSession::CleanupPending(target)) => {
                let token = next_operation_id(state);
                registry.sessions.insert(
                    session_id.to_string(),
                    BusinessExportSession::Cleaning {
                        token,
                        target: target.clone(),
                    },
                );
                CancelAction::Cleanup(token, target)
            }
            Some(BusinessExportSession::Finalizing(finalization)) => {
                finalization.store(FINALIZATION_CANCELLED, Ordering::Release);
                registry.sessions.insert(
                    session_id.to_string(),
                    BusinessExportSession::Finalizing(finalization),
                );
                return Ok(());
            }
            Some(session @ BusinessExportSession::Preparing { .. })
            | Some(session @ BusinessExportSession::Cleaning { .. })
            | Some(session @ BusinessExportSession::Committing { .. }) => {
                registry.sessions.insert(session_id.to_string(), session);
                return Err("导出正在安全处理，请稍后重试。".into());
            }
            None => return terminal_cancel_result(&registry, session_id),
        }
    };
    match action {
        CancelAction::Active(handle, finalization) => {
            let stream = lock_active_stream(&handle)
                .take()
                .ok_or_else(|| "导出清理状态不确定，请稍后重试。".to_string())?;
            cleanup_finalizing_partial_with_ops(
                state,
                session_id,
                &finalization,
                stream,
                remove_file,
                rename_file,
            )
        }
        CancelAction::Cleanup(token, target) => {
            execute_cleanup_operation(state, session_id, token, target, remove_file, rename_file)
        }
    }
}

fn next_stream_id(state: &BusinessExportStreamState) -> String {
    let sequence = state.sequence.fetch_add(1, Ordering::Relaxed);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("export-{}-{}-{}", std::process::id(), nanos, sequence)
}

fn next_operation_id(state: &BusinessExportStreamState) -> u64 {
    state.operation_sequence.fetch_add(1, Ordering::Relaxed)
}

fn lock_registry(state: &BusinessExportStreamState) -> MutexGuard<'_, BusinessExportRegistry> {
    state
        .registry
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn lock_active_stream(
    handle: &ActiveBusinessExportHandle,
) -> MutexGuard<'_, Option<ActiveBusinessExportStream>> {
    handle
        .stream
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn normalize_destination_key(path: &Path) -> Result<String, String> {
    let parent = path
        .parent()
        .ok_or_else(|| "保存位置不可用，请重新选择。".to_string())?;
    let file_name = path
        .file_name()
        .ok_or_else(|| "保存文件名无效，请重新选择位置。".to_string())?;
    let canonical_parent =
        std::fs::canonicalize(parent).map_err(|_| "保存位置不可用，请重新选择。".to_string())?;
    let normalized = canonical_parent
        .join(file_name)
        .to_string_lossy()
        .replace('\\', "/");
    if cfg!(windows) {
        Ok(normalized.to_lowercase())
    } else {
        Ok(normalized)
    }
}

fn remove_session_and_reservation(
    state: &BusinessExportStreamState,
    session_id: &str,
    destination_key: &str,
) {
    let mut registry = lock_registry(state);
    registry.sessions.remove(session_id);
    release_destination(&mut registry, session_id, destination_key);
}

fn release_destination(
    registry: &mut BusinessExportRegistry,
    session_id: &str,
    destination_key: &str,
) {
    if registry
        .reservations
        .get(destination_key)
        .is_some_and(|owner| owner == session_id)
    {
        registry.reservations.remove(destination_key);
    }
}

fn finish_terminal_session(
    registry: &mut BusinessExportRegistry,
    session_id: &str,
    destination_key: &str,
    outcome: TerminalOutcome,
) {
    registry.sessions.remove(session_id);
    release_destination(registry, session_id, destination_key);
    if registry
        .terminal_history
        .insert(session_id.to_string(), outcome)
        .is_none()
    {
        registry.terminal_order.push_back(session_id.to_string());
    }
    while registry.terminal_order.len() > TERMINAL_HISTORY_LIMIT {
        if let Some(expired) = registry.terminal_order.pop_front() {
            registry.terminal_history.remove(&expired);
        }
    }
}

fn terminal_commit_result(
    registry: &BusinessExportRegistry,
    session_id: &str,
) -> Result<(), String> {
    match registry.terminal_history.get(session_id) {
        Some(TerminalOutcome::Committed) => Ok(()),
        Some(TerminalOutcome::Cancelled) => Err("导出已取消，请重新开始。".into()),
        None => Err("导出任务已结束，请重新开始。".into()),
    }
}

fn terminal_cancel_result(
    registry: &BusinessExportRegistry,
    session_id: &str,
) -> Result<(), String> {
    match registry.terminal_history.get(session_id) {
        Some(TerminalOutcome::Cancelled) => Ok(()),
        Some(TerminalOutcome::Committed) => Err("导出已提交，无法取消。".into()),
        None => Err("导出任务已结束，请重新开始。".into()),
    }
}

fn trailing_chars(value: &str, maximum: usize) -> String {
    let mut characters = value.chars().rev().take(maximum).collect::<Vec<_>>();
    characters.reverse();
    characters.into_iter().collect()
}

fn cleanup_active_best_effort(stream: ActiveBusinessExportStream) {
    let temp_path = stream.temp_path.clone();
    drop(stream.file);
    let _ = remove_file_if_present(&temp_path);
}

fn cleanup_active_handle_best_effort(handle: ActiveBusinessExportHandle) {
    handle
        .cancellation
        .store(FINALIZATION_CANCELLED, Ordering::Release);
    if let Some(stream) = lock_active_stream(&handle).take() {
        cleanup_active_best_effort(stream);
    }
}

fn cleanup_session_best_effort(session: BusinessExportSession) {
    match session {
        BusinessExportSession::Preparing { .. } => {}
        BusinessExportSession::Active(handle) | BusinessExportSession::Appending { handle, .. } => {
            cleanup_active_handle_best_effort(handle)
        }
        BusinessExportSession::Finalizing(finalization) => {
            finalization.store(FINALIZATION_CANCELLED, Ordering::Release);
        }
        BusinessExportSession::Published(published) => {
            let _ = revoke_published_export(&published);
        }
        BusinessExportSession::Cleaning { target, .. }
        | BusinessExportSession::CleanupPending(target) => {
            let mut remove_file = remove_file_if_present;
            let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
            let _ = perform_cleanup_target(&target, &mut remove_file, &mut rename_file);
        }
        BusinessExportSession::Committing { published, .. } => {
            let _ = revoke_published_export(&published);
        }
    }
}

fn remove_file_if_present(path: &Path) -> std::io::Result<()> {
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

fn preserve_existing_destination(
    final_path: &Path,
    backup_path: &Path,
) -> Result<Option<PathBuf>, String> {
    if backup_path.exists() {
        return Err("无法准备导出备份，请重新选择位置。".into());
    }
    match std::fs::rename(final_path, backup_path) {
        Ok(()) => Ok(Some(backup_path.to_path_buf())),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err("无法保护原文件，请关闭占用文件后重试。".into()),
    }
}

fn revoke_published_export(published: &PublishedBusinessExport) -> Result<(), String> {
    revoke_published_export_with_ops(published, remove_file_if_present, |from, to| {
        std::fs::rename(from, to)
    })
}

fn revoke_published_export_with_ops<F, G>(
    published: &PublishedBusinessExport,
    mut remove_file: F,
    mut rename_file: G,
) -> Result<(), String>
where
    F: FnMut(&Path) -> std::io::Result<()>,
    G: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    if published.owns_final_output {
        if let Err(error) = remove_file(&published.final_path) {
            if error.kind() != std::io::ErrorKind::NotFound {
                return Err("导出文件清理失败，请关闭占用文件后重试。".into());
            }
        }
    } else if published.final_path.exists() {
        return Err("导出文件清理失败，请关闭占用文件后重试。".into());
    }

    if let Some(backup_path) = published.backup_path.as_deref() {
        rename_file(backup_path, &published.final_path)
            .map_err(|_| "导出文件清理失败，请关闭占用文件后重试。".to_string())?;
    }
    Ok(())
}

fn perform_cleanup_target<F, G>(
    target: &CleanupTarget,
    remove_file: &mut F,
    rename_file: &mut G,
) -> Result<(), String>
where
    F: FnMut(&Path) -> std::io::Result<()>,
    G: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    match target {
        CleanupTarget::Partial(partial) => remove_file(&partial.temp_path)
            .or_else(|error| {
                if error.kind() == std::io::ErrorKind::NotFound {
                    Ok(())
                } else {
                    Err(error)
                }
            })
            .map_err(|_| "导出文件清理失败，请关闭占用文件后重试。".to_string()),
        CleanupTarget::Published(published) => {
            revoke_published_export_with_ops(published, remove_file, rename_file)
        }
        CleanupTarget::Transaction { partial, published } => {
            remove_file(&partial.temp_path)
                .or_else(|error| {
                    if error.kind() == std::io::ErrorKind::NotFound {
                        Ok(())
                    } else {
                        Err(error)
                    }
                })
                .map_err(|_| "导出文件清理失败，请关闭占用文件后重试。".to_string())?;
            revoke_published_export_with_ops(published, remove_file, rename_file)
        }
    }
}

fn execute_cleanup_operation<F, G>(
    state: &BusinessExportStreamState,
    session_id: &str,
    token: u64,
    target: CleanupTarget,
    remove_file: &mut F,
    rename_file: &mut G,
) -> Result<(), String>
where
    F: FnMut(&Path) -> std::io::Result<()>,
    G: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    let cleanup_result = perform_cleanup_target(&target, remove_file, rename_file);
    let mut registry = lock_registry(state);
    let owns_cleanup_token = matches!(
        registry.sessions.get(session_id),
        Some(BusinessExportSession::Cleaning { token: current, .. }) if *current == token
    );
    if !owns_cleanup_token {
        return Err("导出清理状态不确定，请稍后重试。".into());
    }
    if cleanup_result.is_ok() {
        finish_terminal_session(
            &mut registry,
            session_id,
            target.destination_key(),
            TerminalOutcome::Cancelled,
        );
    } else {
        registry.sessions.insert(
            session_id.to_string(),
            BusinessExportSession::CleanupPending(target),
        );
    }
    cleanup_result
}

fn cleanup_finalizing_partial(
    state: &BusinessExportStreamState,
    session_id: &str,
    finalization: &Arc<AtomicU8>,
    stream: ActiveBusinessExportStream,
) -> Result<(), String> {
    let mut remove_file = remove_file_if_present;
    let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
    cleanup_finalizing_partial_with_ops(
        state,
        session_id,
        finalization,
        stream,
        &mut remove_file,
        &mut rename_file,
    )
}

fn cleanup_finalizing_partial_with_ops<F, G>(
    state: &BusinessExportStreamState,
    session_id: &str,
    finalization: &Arc<AtomicU8>,
    stream: ActiveBusinessExportStream,
    remove_file: &mut F,
    rename_file: &mut G,
) -> Result<(), String>
where
    F: FnMut(&Path) -> std::io::Result<()>,
    G: FnMut(&Path, &Path) -> std::io::Result<()>,
{
    let ActiveBusinessExportStream {
        temp_path,
        destination_key,
        file,
        ..
    } = stream;
    let target = CleanupTarget::Partial(PartialBusinessExportCleanup {
        temp_path,
        destination_key,
    });
    let token = next_operation_id(state);
    replace_finalizing_session(
        state,
        session_id,
        finalization,
        BusinessExportSession::Cleaning {
            token,
            target: target.clone(),
        },
    )
    .ok_or_else(|| "导出清理状态不确定，请稍后重试。".to_string())?;
    drop(file);
    execute_cleanup_operation(state, session_id, token, target, remove_file, rename_file)
}

fn cleanup_finalizing_target(
    state: &BusinessExportStreamState,
    session_id: &str,
    finalization: &Arc<AtomicU8>,
    target: CleanupTarget,
) -> Result<(), String> {
    let token = next_operation_id(state);
    replace_finalizing_session(
        state,
        session_id,
        finalization,
        BusinessExportSession::Cleaning {
            token,
            target: target.clone(),
        },
    )
    .ok_or_else(|| "导出清理状态不确定，请稍后重试。".to_string())?;
    let mut remove_file = remove_file_if_present;
    let mut rename_file = |from: &Path, to: &Path| std::fs::rename(from, to);
    execute_cleanup_operation(
        state,
        session_id,
        token,
        target,
        &mut remove_file,
        &mut rename_file,
    )
}

fn replace_finalizing_session(
    state: &BusinessExportStreamState,
    session_id: &str,
    finalization: &Arc<AtomicU8>,
    replacement: BusinessExportSession,
) -> Option<u8> {
    let mut registry = lock_registry(state);
    let status = match registry.sessions.get(session_id) {
        Some(BusinessExportSession::Finalizing(current)) if Arc::ptr_eq(current, finalization) => {
            Some(current.load(Ordering::Acquire))
        }
        _ => None,
    }?;
    registry
        .sessions
        .insert(session_id.to_string(), replacement);
    Some(status)
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessExportPayload {
    pub path: String,
    pub content: String,
    pub expected_extension: String,
    pub redaction_policy: String,
}

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BusinessExportResponse {
    pub file_name: String,
    pub extension: String,
    pub bytes_written: usize,
}

pub async fn export_business_file_command(
    state: &BusinessExportStreamState,
    payload: BusinessExportPayload,
) -> Result<BusinessExportResponse, String> {
    export_business_file_command_with_hooks(state, payload, || {}, |_: &str| Ok(())).await
}

#[cfg(test)]
async fn export_business_file_command_with_before_complete<F>(
    state: &BusinessExportStreamState,
    payload: BusinessExportPayload,
    before_complete: F,
) -> Result<BusinessExportResponse, String>
where
    F: FnOnce(),
{
    export_business_file_command_with_hooks(state, payload, before_complete, |_: &str| Ok(())).await
}

async fn export_business_file_command_with_hooks<F, G>(
    state: &BusinessExportStreamState,
    payload: BusinessExportPayload,
    before_complete: F,
    before_commit: G,
) -> Result<BusinessExportResponse, String>
where
    F: FnOnce(),
    G: FnOnce(&str) -> Result<(), String>,
{
    validate_redaction_policy(&payload.redaction_policy)?;
    let extension = normalize_extension(&payload.expected_extension)?;
    let path = PathBuf::from(payload.path);
    validate_business_export_path(&path, extension)?;
    validate_business_export_content(&payload.content)?;
    let opened = begin_business_export_stream(
        state,
        BeginBusinessExportStreamPayload {
            path: path.to_string_lossy().to_string(),
            expected_extension: extension.to_string(),
            redaction_policy: payload.redaction_policy,
        },
    )?;
    let result = (|| {
        for chunk in split_utf8_chunks(&payload.content, MAX_EXPORT_CHUNK_BYTES) {
            append_business_export_stream(state, &opened.session_id, chunk)?;
        }
        before_complete();
        let response = complete_business_export_stream(state, &opened.session_id)?;
        before_commit(&opened.session_id)?;
        commit_business_export_stream(state, &opened.session_id)?;
        Ok(response)
    })();
    match result {
        Ok(response) => Ok(response),
        Err(error) => match cancel_business_export_stream(state, &opened.session_id) {
            Ok(()) => Err(error),
            Err(cleanup_error) => Err(cleanup_error),
        },
    }
}

fn split_utf8_chunks(value: &str, maximum_bytes: usize) -> Vec<&str> {
    if value.is_empty() {
        return Vec::new();
    }
    let mut chunks = Vec::new();
    let mut start = 0;
    while start < value.len() {
        let mut end = (start + maximum_bytes).min(value.len());
        while end > start && !value.is_char_boundary(end) {
            end -= 1;
        }
        chunks.push(&value[start..end]);
        start = end;
    }
    chunks
}

fn validate_redaction_policy(value: &str) -> Result<(), String> {
    match value {
        "redacted" | "unredacted-confirmed" => Ok(()),
        _ => Err("导出隐私策略无效，已阻止写入。".into()),
    }
}

fn normalize_extension(value: &str) -> Result<&'static str, String> {
    match value
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase()
        .as_str()
    {
        "md" => Ok("md"),
        "csv" => Ok("csv"),
        "json" => Ok("json"),
        _ => Err("导出格式无效，请重新选择格式。".into()),
    }
}

fn validate_business_export_path(path: &Path, expected_extension: &str) -> Result<(), String> {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "保存文件名无效，请重新选择位置。".to_string())?;

    if contains_sensitive_marker(file_name) {
        return Err("保存文件名包含私密标记，请重命名后重试。".into());
    }

    let actual_extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if actual_extension != expected_extension {
        return Err(format!("请选择 .{} 文件后重试。", expected_extension));
    }

    let parent_exists = path.parent().map(Path::exists).unwrap_or(false);
    if !parent_exists {
        return Err("保存位置不可用，请重新选择。".into());
    }

    Ok(())
}

fn validate_business_export_content(content: &str) -> Result<(), String> {
    if contains_sensitive_marker(content) {
        return Err("导出内容仍包含密钥、本机路径或原始私密标记，已阻止写入。".into());
    }
    Ok(())
}

fn contains_sensitive_marker(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("datakey=")
        || lower.contains("datakey:")
        || lower.contains("data_key=")
        || lower.contains("data_key:")
        || lower.contains("data-key=")
        || lower.contains("data-key:")
        || lower.contains("data key")
        || lower.contains("api_key=")
        || lower.contains("api_key:")
        || lower.contains("api-key=")
        || lower.contains("api-key:")
        || lower.contains("api key")
        || lower.contains("access_token")
        || lower.contains("token=")
        || lower.contains("token:")
        || lower.contains("secret=")
        || lower.contains("secret:")
        || lower.contains("bearer ")
        || lower.contains("sk-")
        || lower.contains("wxid_")
        || lower.contains("wechat files")
        || lower.contains("微信 files")
        || lower.contains("微信文件")
        || contains_windows_user_path(value)
        || lower.contains("/api/v1/sns/media/proxy?")
}

fn contains_windows_user_path(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.windows(9).any(|window| {
        let drive = window[0].is_ascii_alphabetic();
        let colon = window[1] == b':';
        let slash = window[2] == b'\\' || window[2] == b'/';
        let users = window[3..].eq_ignore_ascii_case(b"users\\")
            || window[3..].eq_ignore_ascii_case(b"users/");
        drive && colon && slash && users
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn writes_business_export_without_returning_private_directory() {
        let path = unique_temp_file("chatlog-search-export.md");
        let state = BusinessExportStreamState::new();
        let payload = BusinessExportPayload {
            path: path.to_string_lossy().to_string(),
            content: "# 搜索结果\n已隐藏消息内容\n".into(),
            expected_extension: "md".into(),
            redaction_policy: "redacted".into(),
        };

        let response =
            tauri::async_runtime::block_on(export_business_file_command(&state, payload))
                .expect("business export should write safe redacted content");
        let contents = std::fs::read_to_string(&path).expect("export file should be readable");
        let _ = std::fs::remove_file(&path);

        let expected_file_name = path
            .file_name()
            .and_then(|name| name.to_str())
            .expect("temp file should have a valid file name");

        assert_eq!(response.file_name, expected_file_name);
        assert!(response.file_name.ends_with("chatlog-search-export.md"));
        assert_eq!(response.extension, "md");
        assert_eq!(
            response.bytes_written,
            "# 搜索结果\n已隐藏消息内容\n".as_bytes().len()
        );
        assert!(contents.contains("已隐藏消息内容"));
        assert!(!response.file_name.contains("Users"));
    }

    #[test]
    fn rejects_content_with_hard_secret_or_raw_path_markers() {
        let path = unique_temp_file("chatlog-search-export.md");
        let state = BusinessExportStreamState::new();
        let payload = BusinessExportPayload {
            path: path.to_string_lossy().to_string(),
            content: "dataKey: synthetic-secret C:\\Users\\Synthetic\\Private".into(),
            expected_extension: "md".into(),
            redaction_policy: "unredacted-confirmed".into(),
        };

        let error = tauri::async_runtime::block_on(export_business_file_command(&state, payload))
            .expect_err("secret-bearing content must be blocked");

        assert!(error.contains("已阻止写入"));
        assert!(!path.exists());
    }

    #[test]
    fn rejects_private_filename_and_extension_mismatch() {
        let state = BusinessExportStreamState::new();
        let unsafe_path = unique_temp_file("wxid_synthetic_private.json");
        let unsafe_payload = BusinessExportPayload {
            path: unsafe_path.to_string_lossy().to_string(),
            content: "{}".into(),
            expected_extension: "json".into(),
            redaction_policy: "redacted".into(),
        };
        let unsafe_error =
            tauri::async_runtime::block_on(export_business_file_command(&state, unsafe_payload))
                .expect_err("private filenames must be blocked");
        assert!(unsafe_error.contains("保存文件名"));

        let csv_path = unique_temp_file("chatlog-search-export.csv");
        let wrong_extension_payload = BusinessExportPayload {
            path: csv_path.to_string_lossy().to_string(),
            content: "section,label,value\n".into(),
            expected_extension: "md".into(),
            redaction_policy: "redacted".into(),
        };
        let extension_error = tauri::async_runtime::block_on(export_business_file_command(
            &state,
            wrong_extension_payload,
        ))
        .expect_err("extension mismatch must be blocked");
        assert!(extension_error.contains(".md"));
    }

    #[test]
    fn normalized_destination_reservation_rejects_parallel_streams_for_the_same_file() {
        let path = unique_temp_file("chatlog-search-reserved.md");
        let _ = std::fs::remove_file(&path);
        let parent = path.parent().unwrap();
        let alias = parent.join(".").join(path.file_name().unwrap());
        let state = BusinessExportStreamState::new();
        let first = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();

        let error = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: alias.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .expect_err("path aliases must share one exclusive reservation");

        assert!(error.contains("正在导出"));
        cancel_business_export_stream(&state, &first.session_id).unwrap();
        let reopened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: alias.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .expect("successful cleanup must release the path reservation");
        cancel_business_export_stream(&state, &reopened.session_id).unwrap();
    }

    #[test]
    fn one_shot_export_cannot_bypass_an_active_stream_reservation() {
        let path = unique_temp_file("chatlog-search-one-shot-reserved.md");
        std::fs::write(&path, "original user file").unwrap();
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();

        let error = tauri::async_runtime::block_on(export_business_file_command(
            &state,
            BusinessExportPayload {
                path: path.to_string_lossy().to_string(),
                content: "one-shot export".into(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        ))
        .expect_err("one-shot writes must honor the same path reservation");

        assert!(error.contains("正在导出"));
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "original user file"
        );
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn one_shot_export_keeps_the_original_visible_until_transaction_publish() {
        let path = unique_temp_file("chatlog-search-one-shot-transaction.md");
        std::fs::write(&path, "original user file").unwrap();
        let state = BusinessExportStreamState::new();
        let observed_path = path.clone();

        let response =
            tauri::async_runtime::block_on(export_business_file_command_with_before_complete(
                &state,
                BusinessExportPayload {
                    path: path.to_string_lossy().to_string(),
                    content: "new one-shot export".into(),
                    expected_extension: "md".into(),
                    redaction_policy: "redacted".into(),
                },
                move || {
                    assert_eq!(
                        std::fs::read_to_string(&observed_path).unwrap(),
                        "original user file",
                        "one-shot export must write privately before the publish boundary"
                    );
                },
            ))
            .unwrap();

        assert_eq!(response.bytes_written, "new one-shot export".len());
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "new one-shot export"
        );
        assert_eq!(state.session_count(), 0);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn one_shot_export_restores_the_original_when_publish_cannot_be_committed() {
        let path = unique_temp_file("chatlog-search-one-shot-rollback.md");
        std::fs::write(&path, "original user file").unwrap();
        let state = BusinessExportStreamState::new();

        let error = tauri::async_runtime::block_on(export_business_file_command_with_hooks(
            &state,
            BusinessExportPayload {
                path: path.to_string_lossy().to_string(),
                content: "uncommitted one-shot export".into(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
            || {},
            |session_id| cancel_business_export_stream(&state, session_id),
        ))
        .expect_err("a one-shot publish that cannot commit must roll back");

        assert!(error.contains("取消"));
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "original user file"
        );
        assert_eq!(state.session_count(), 0);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn streams_chunks_to_a_private_partial_file_and_publishes_only_on_complete() {
        let path = unique_temp_file("chatlog-search-stream.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .expect("stream should open");
        let partial = state
            .active_temp_path(&opened.session_id)
            .expect("active stream should own a partial file");

        append_business_export_stream(&state, &opened.session_id, "# Search\n")
            .expect("first chunk should append");
        append_business_export_stream(&state, &opened.session_id, "safe row\n")
            .expect("second chunk should append");
        assert!(
            !path.exists(),
            "final path must stay absent before completion"
        );
        assert!(
            partial.exists(),
            "bounded chunks should be written to the private partial file"
        );

        let response = complete_business_export_stream(&state, &opened.session_id)
            .expect("stream should complete atomically");
        assert_eq!(response.bytes_written, "# Search\nsafe row\n".len());
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "# Search\nsafe row\n"
        );
        assert!(!partial.exists());
        assert_eq!(state.active_count(), 0);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn slow_append_does_not_hold_the_global_registry_or_block_another_session() {
        let first_path = unique_temp_file("chatlog-search-slow-append-a.md");
        let second_path = unique_temp_file("chatlog-search-slow-append-b.md");
        let third_path = unique_temp_file("chatlog-search-slow-append-c.md");
        let _ = std::fs::remove_file(&first_path);
        let _ = std::fs::remove_file(&second_path);
        let _ = std::fs::remove_file(&third_path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let first = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: first_path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let second = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: second_path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();

        let (writer_ready_tx, writer_ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_writer_tx, release_writer_rx) = std::sync::mpsc::sync_channel(0);
        let append_state = std::sync::Arc::clone(&state);
        let first_session_id = first.session_id.clone();
        let first_append = std::thread::spawn(move || {
            append_business_export_stream_with_writer(
                &append_state,
                &first_session_id,
                "first chunk",
                |file, bytes| {
                    writer_ready_tx.send(()).unwrap();
                    release_writer_rx.recv().unwrap();
                    file.write_all(bytes)
                },
            )
        });
        writer_ready_rx.recv().unwrap();
        let registry_was_unlocked = state.registry_is_unlocked();

        let (other_done_tx, other_done_rx) = std::sync::mpsc::sync_channel(0);
        let other_state = std::sync::Arc::clone(&state);
        let second_session_id = second.session_id.clone();
        let third_path_for_thread = third_path.clone();
        let other_operations = std::thread::spawn(move || {
            let result = (|| -> Result<(), String> {
                append_business_export_stream(&other_state, &second_session_id, "second chunk")?;
                cancel_business_export_stream(&other_state, &second_session_id)?;
                let third = begin_business_export_stream(
                    &other_state,
                    BeginBusinessExportStreamPayload {
                        path: third_path_for_thread.to_string_lossy().to_string(),
                        expected_extension: "md".into(),
                        redaction_policy: "redacted".into(),
                    },
                )?;
                cancel_business_export_stream(&other_state, &third.session_id)
            })();
            other_done_tx.send(result).unwrap();
        });

        let other_result = other_done_rx.recv_timeout(std::time::Duration::from_millis(500));
        release_writer_tx.send(()).unwrap();
        let first_result = first_append.join().unwrap();
        other_operations.join().unwrap();

        assert!(
            registry_was_unlocked,
            "the slow writer must run after the global registry mutex is released"
        );
        other_result
            .expect("another session must finish before the slow writer is released")
            .unwrap();
        first_result.unwrap();
        cancel_business_export_stream(&state, &first.session_id).unwrap();
        assert_eq!(state.session_count(), 0);
        let _ = std::fs::remove_file(first_path);
        let _ = std::fs::remove_file(second_path);
        let _ = std::fs::remove_file(third_path);
    }

    #[test]
    fn cleanup_all_requests_slow_append_cancellation_without_waiting_for_the_writer() {
        let path = unique_temp_file("chatlog-search-slow-append-close.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();
        let (writer_ready_tx, writer_ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_writer_tx, release_writer_rx) = std::sync::mpsc::sync_channel(0);
        let append_state = std::sync::Arc::clone(&state);
        let session_id = opened.session_id.clone();
        let append = std::thread::spawn(move || {
            append_business_export_stream_with_writer(
                &append_state,
                &session_id,
                "private chunk",
                |file, bytes| {
                    writer_ready_tx.send(()).unwrap();
                    release_writer_rx.recv().unwrap();
                    file.write_all(bytes)
                },
            )
        });
        writer_ready_rx.recv().unwrap();

        let (cleanup_done_tx, cleanup_done_rx) = std::sync::mpsc::sync_channel(0);
        let cleanup_state = std::sync::Arc::clone(&state);
        let cleanup = std::thread::spawn(move || {
            cleanup_done_tx.send(cleanup_state.cleanup_all()).unwrap();
        });
        let cleanup_result = cleanup_done_rx.recv_timeout(std::time::Duration::from_millis(500));
        release_writer_tx.send(()).unwrap();
        let append_error = append
            .join()
            .unwrap()
            .expect_err("cleanup cancellation must win over the in-flight append");
        cleanup.join().unwrap();

        let cleanup_error = cleanup_result
            .expect("cleanup_all must return pending without waiting for slow append IO")
            .expect_err("close must remain deferred until append cleanup finishes");
        assert!(cleanup_error.contains("正在安全取消"));
        assert!(append_error.contains("取消"));
        assert!(!path.exists());
        assert!(!partial.exists());
        assert_eq!(state.session_count(), 0);
        state.cleanup_all().unwrap();
    }

    #[test]
    fn append_and_complete_on_the_same_session_are_linearized_without_leaks() {
        let path = unique_temp_file("chatlog-search-append-complete-race.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();
        let (writer_ready_tx, writer_ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_writer_tx, release_writer_rx) = std::sync::mpsc::sync_channel(0);
        let append_state = std::sync::Arc::clone(&state);
        let append_session_id = opened.session_id.clone();
        let append = std::thread::spawn(move || {
            append_business_export_stream_with_writer(
                &append_state,
                &append_session_id,
                "linearized chunk",
                |file, bytes| {
                    writer_ready_tx.send(()).unwrap();
                    release_writer_rx.recv().unwrap();
                    file.write_all(bytes)
                },
            )
        });
        writer_ready_rx.recv().unwrap();

        let (complete_done_tx, complete_done_rx) = std::sync::mpsc::sync_channel(0);
        let complete_state = std::sync::Arc::clone(&state);
        let complete_session_id = opened.session_id.clone();
        let complete = std::thread::spawn(move || {
            complete_done_tx
                .send(complete_business_export_stream(
                    &complete_state,
                    &complete_session_id,
                ))
                .unwrap();
        });
        assert!(
            complete_done_rx
                .recv_timeout(std::time::Duration::from_millis(100))
                .is_err(),
            "same-session completion must wait for the append linearization point"
        );
        release_writer_tx.send(()).unwrap();

        append.join().unwrap().unwrap();
        let completed = complete_done_rx
            .recv_timeout(std::time::Duration::from_secs(1))
            .unwrap()
            .unwrap();
        complete.join().unwrap();
        assert_eq!(completed.bytes_written, "linearized chunk".len());
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "linearized chunk");
        assert!(!partial.exists());
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        assert!(!path.exists());
        assert_eq!(state.session_count(), 0);
    }

    #[test]
    fn append_and_cancel_on_the_same_session_cancel_once_without_leaks() {
        let path = unique_temp_file("chatlog-search-append-cancel-race.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();
        let (writer_ready_tx, writer_ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_writer_tx, release_writer_rx) = std::sync::mpsc::sync_channel(0);
        let append_state = std::sync::Arc::clone(&state);
        let append_session_id = opened.session_id.clone();
        let append = std::thread::spawn(move || {
            append_business_export_stream_with_writer(
                &append_state,
                &append_session_id,
                "cancelled chunk",
                |file, bytes| {
                    writer_ready_tx.send(()).unwrap();
                    release_writer_rx.recv().unwrap();
                    file.write_all(bytes)
                },
            )
        });
        writer_ready_rx.recv().unwrap();

        let (cancel_done_tx, cancel_done_rx) = std::sync::mpsc::sync_channel(0);
        let cancel_state = std::sync::Arc::clone(&state);
        let cancel_session_id = opened.session_id.clone();
        let cancel = std::thread::spawn(move || {
            cancel_done_tx
                .send(cancel_business_export_stream(
                    &cancel_state,
                    &cancel_session_id,
                ))
                .unwrap();
        });
        let cancel_result = cancel_done_rx.recv_timeout(std::time::Duration::from_millis(500));
        release_writer_tx.send(()).unwrap();

        cancel_result
            .expect("cancel must signal an in-flight append without waiting for its writer")
            .unwrap();
        let append_error = append
            .join()
            .unwrap()
            .expect_err("cancel must win once it is accepted during append");
        cancel.join().unwrap();
        assert!(append_error.contains("取消"));
        assert!(!path.exists());
        assert!(!partial.exists());
        assert_eq!(state.session_count(), 0);
        let reopened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .expect("cancelled append must release its destination reservation");
        cancel_business_export_stream(&state, &reopened.session_id).unwrap();
    }

    #[test]
    fn cancel_after_append_check_cannot_restore_an_active_session() {
        let path = unique_temp_file("chatlog-search-append-cancel-after-check.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();
        let (after_check_tx, after_check_rx) = std::sync::mpsc::sync_channel(0);
        let (release_append_tx, release_append_rx) = std::sync::mpsc::sync_channel(0);
        let append_state = std::sync::Arc::clone(&state);
        let append_session_id = opened.session_id.clone();
        let append = std::thread::spawn(move || {
            append_business_export_stream_with_writer_and_after_cancellation_check(
                &append_state,
                &append_session_id,
                "cancelled after check",
                |file, bytes| file.write_all(bytes),
                || {
                    after_check_tx.send(()).unwrap();
                    release_append_rx.recv().unwrap();
                },
            )
        });
        after_check_rx
            .recv_timeout(std::time::Duration::from_secs(1))
            .expect("append must pause after its first cancellation check");

        cancel_business_export_stream(&state, &opened.session_id)
            .expect("cancel must be accepted while append awaits registry reacquisition");
        release_append_tx.send(()).unwrap();

        let append_error = append
            .join()
            .unwrap()
            .expect_err("an accepted cancel must win over append success");
        assert!(append_error.contains("取消"));
        assert!(!path.exists());
        assert!(!partial.exists());
        assert_eq!(state.session_count(), 0);
        cancel_business_export_stream(&state, &opened.session_id)
            .expect("accepted cancellation must remain idempotent after cleanup");
        let reopened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .expect("cancelled append must release its destination reservation");
        cancel_business_export_stream(&state, &reopened.session_id).unwrap();
    }

    #[test]
    fn append_write_and_cleanup_failure_remains_retriable() {
        let path = unique_temp_file("chatlog-search-append-write-cleanup-retry.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();

        let error = append_business_export_stream_with_writer_and_remover(
            &state,
            &opened.session_id,
            "failed chunk",
            |_, _| {
                Err(std::io::Error::new(
                    std::io::ErrorKind::WriteZero,
                    "synthetic write failure",
                ))
            },
            |_| {
                Err(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "synthetic locked partial",
                ))
            },
        )
        .expect_err("write cleanup failure must remain observable and retriable");

        assert!(error.contains("清理失败"));
        assert!(partial.exists());
        assert_eq!(state.session_count(), 1);
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        assert!(!partial.exists());
        assert_eq!(state.session_count(), 0);
        let reopened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .expect("successful retry cleanup must release the reservation");
        cancel_business_export_stream(&state, &reopened.session_id).unwrap();
    }

    #[test]
    fn cancel_and_cross_chunk_validation_remove_partial_output() {
        let cancelled_path = unique_temp_file("chatlog-search-cancel.csv");
        let _ = std::fs::remove_file(&cancelled_path);
        let state = BusinessExportStreamState::new();
        let cancelled = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: cancelled_path.to_string_lossy().to_string(),
                expected_extension: "csv".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let cancelled_partial = state.active_temp_path(&cancelled.session_id).unwrap();
        append_business_export_stream(&state, &cancelled.session_id, "header\n").unwrap();
        cancel_business_export_stream(&state, &cancelled.session_id).unwrap();
        cancel_business_export_stream(&state, &cancelled.session_id).unwrap();
        assert!(!cancelled_path.exists());
        assert!(!cancelled_partial.exists());

        let rejected_path = unique_temp_file("chatlog-search-rejected.json");
        let _ = std::fs::remove_file(&rejected_path);
        let rejected = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: rejected_path.to_string_lossy().to_string(),
                expected_extension: "json".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        let rejected_partial = state.active_temp_path(&rejected.session_id).unwrap();
        append_business_export_stream(&state, &rejected.session_id, "{\"value\":\"data").unwrap();
        let error =
            append_business_export_stream(&state, &rejected.session_id, "Key: synthetic\"}")
                .expect_err("sensitive markers split across chunks must be rejected");
        assert!(error.contains("已阻止写入"));
        assert!(!rejected_path.exists());
        assert!(!rejected_partial.exists());
        assert_eq!(state.active_count(), 0);
    }

    #[test]
    fn completion_replaces_an_existing_selected_file_without_publishing_partial_content() {
        let path = unique_temp_file("chatlog-search-replace.md");
        std::fs::write(&path, "old export").unwrap();
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "new safe export").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "old export");

        complete_business_export_stream(&state, &opened.session_id).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "new safe export");
        commit_business_export_stream(&state, &opened.session_id).unwrap();
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn cancellation_before_the_publish_boundary_prevents_final_output() {
        let path = unique_temp_file("chatlog-search-cancel-finalizing.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();
        let session_id = opened.session_id.clone();
        let complete_state = std::sync::Arc::clone(&state);
        let (ready_tx, ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_tx, release_rx) = std::sync::mpsc::sync_channel(0);
        let completion = std::thread::spawn(move || {
            complete_business_export_stream_with_hooks(
                &complete_state,
                &session_id,
                || {
                    ready_tx.send(()).unwrap();
                    release_rx.recv().unwrap();
                },
                || {},
                || {},
            )
        });

        ready_rx.recv().unwrap();
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        release_tx.send(()).unwrap();
        let error = completion
            .join()
            .unwrap()
            .expect_err("cancel must win before the atomic publish boundary");

        assert!(error.contains("取消"));
        assert!(
            !path.exists(),
            "cancelled completion must not publish a final file"
        );
        assert!(
            !partial.exists(),
            "cancelled completion must remove its partial file"
        );
        assert_eq!(state.active_count(), 0);
    }

    #[test]
    fn cancellation_after_the_publish_gate_still_prevents_final_output() {
        let path = unique_temp_file("chatlog-search-cancel-after-gate.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();
        let session_id = opened.session_id.clone();
        let complete_state = std::sync::Arc::clone(&state);
        let (ready_tx, ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_tx, release_rx) = std::sync::mpsc::sync_channel(0);
        let completion = std::thread::spawn(move || {
            complete_business_export_stream_with_hooks(
                &complete_state,
                &session_id,
                || {},
                || {
                    ready_tx.send(()).unwrap();
                    release_rx.recv().unwrap();
                },
                || {},
            )
        });

        ready_rx.recv().unwrap();
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        release_tx.send(()).unwrap();
        let error = completion
            .join()
            .unwrap()
            .expect_err("cancel after the publish gate must still revoke output");

        assert!(error.contains("取消"));
        assert!(!path.exists());
        assert!(!partial.exists());
        assert_eq!(state.active_count(), 0);
    }

    #[test]
    fn cancellation_after_rename_removes_the_revocable_final_output() {
        let path = unique_temp_file("chatlog-search-cancel-after-rename.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        let session_id = opened.session_id.clone();
        let complete_state = std::sync::Arc::clone(&state);
        let (ready_tx, ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_tx, release_rx) = std::sync::mpsc::sync_channel(0);
        let completion = std::thread::spawn(move || {
            complete_business_export_stream_with_hooks(
                &complete_state,
                &session_id,
                || {},
                || {},
                || {
                    ready_tx.send(()).unwrap();
                    release_rx.recv().unwrap();
                },
            )
        });

        ready_rx.recv().unwrap();
        assert!(
            path.exists(),
            "the hook must observe the revocable renamed output"
        );
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        release_tx.send(()).unwrap();
        let error = completion
            .join()
            .unwrap()
            .expect_err("cancel after rename must revoke the final output");

        assert!(error.contains("取消"));
        assert!(!path.exists());
        assert_eq!(state.active_count(), 0);
    }

    #[test]
    fn cancellation_after_rename_keeps_failed_cleanup_retriable_and_restores_original() {
        let path = unique_temp_file("chatlog-search-cancel-after-rename-retry.md");
        std::fs::write(&path, "original user file").unwrap();
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        let session_id = opened.session_id.clone();
        let complete_state = std::sync::Arc::clone(&state);
        let (ready_tx, ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_tx, release_rx) = std::sync::mpsc::sync_channel(0);
        let completion = std::thread::spawn(move || {
            complete_business_export_stream_with_hooks(
                &complete_state,
                &session_id,
                || {},
                || {},
                || {
                    ready_tx.send(()).unwrap();
                    release_rx.recv().unwrap();
                },
            )
        });

        ready_rx.recv().unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "private export");
        std::fs::remove_file(&path).unwrap();
        std::fs::create_dir(&path).unwrap();
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        release_tx.send(()).unwrap();

        let error = completion
            .join()
            .unwrap()
            .expect_err("failed post-rename cleanup must be propagated to the caller");
        assert!(error.contains("清理失败"));
        assert_eq!(state.session_count(), 1);

        std::fs::remove_dir(&path).unwrap();
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "original user file"
        );
        assert_eq!(state.session_count(), 0);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn commit_makes_a_published_stream_irrevocable_and_rejects_later_cancellation() {
        let path = unique_temp_file("chatlog-search-committed.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "safe export").unwrap();

        complete_business_export_stream(&state, &opened.session_id).unwrap();
        assert!(path.exists());
        assert_eq!(state.active_count(), 0);
        assert_eq!(state.session_count(), 1);
        commit_business_export_stream(&state, &opened.session_id).unwrap();
        commit_business_export_stream(&state, &opened.session_id).unwrap();
        assert_eq!(state.session_count(), 0);
        state.cleanup_all().unwrap();
        let error = cancel_business_export_stream(&state, &opened.session_id)
            .expect_err("cancellation must not report success after commit published the file");
        assert!(error.contains("已提交"));
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "safe export");
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn concurrent_native_commit_and_cancel_have_exactly_one_winner() {
        let path = unique_temp_file("chatlog-search-native-terminal-race.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        complete_business_export_stream(&state, &opened.session_id).unwrap();

        let barrier = std::sync::Arc::new(std::sync::Barrier::new(3));
        let commit_state = std::sync::Arc::clone(&state);
        let commit_barrier = std::sync::Arc::clone(&barrier);
        let commit_session_id = opened.session_id.clone();
        let commit = std::thread::spawn(move || {
            commit_barrier.wait();
            commit_business_export_stream(&commit_state, &commit_session_id)
        });
        let cancel_state = std::sync::Arc::clone(&state);
        let cancel_barrier = std::sync::Arc::clone(&barrier);
        let cancel_session_id = opened.session_id.clone();
        let cancel = std::thread::spawn(move || {
            cancel_barrier.wait();
            cancel_business_export_stream(&cancel_state, &cancel_session_id)
        });

        barrier.wait();
        let commit_result = commit.join().unwrap();
        let cancel_result = cancel.join().unwrap();

        assert_ne!(
            commit_result.is_ok(),
            cancel_result.is_ok(),
            "commit and cancel must never both report success"
        );
        if commit_result.is_ok() {
            assert_eq!(std::fs::read_to_string(&path).unwrap(), "private export");
            assert!(cancel_result.unwrap_err().contains("已提交"));
            let _ = std::fs::remove_file(path);
        } else {
            assert!(!path.exists());
            assert!(commit_result.unwrap_err().contains("已取消"));
        }
    }

    #[test]
    fn cancelling_a_replacement_restores_the_users_original_file() {
        let path = unique_temp_file("chatlog-search-replacement-cancel.md");
        std::fs::write(&path, "original user file").unwrap();
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "new export").unwrap();

        complete_business_export_stream(&state, &opened.session_id).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "new export");
        cancel_business_export_stream(&state, &opened.session_id).unwrap();

        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "original user file"
        );
        assert_eq!(state.session_count(), 0);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn cleanup_all_restores_an_original_file_replaced_by_an_uncommitted_export() {
        let path = unique_temp_file("chatlog-search-replacement-cleanup.md");
        std::fs::write(&path, "original user file").unwrap();
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "new export").unwrap();
        complete_business_export_stream(&state, &opened.session_id).unwrap();

        state.cleanup_all().unwrap();

        assert_eq!(
            std::fs::read_to_string(&path).unwrap(),
            "original user file"
        );
        assert_eq!(state.session_count(), 0);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn committing_a_replacement_keeps_the_export_and_discards_the_private_backup() {
        let path = unique_temp_file("chatlog-search-replacement-commit.md");
        std::fs::write(&path, "original user file").unwrap();
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "new export").unwrap();
        complete_business_export_stream(&state, &opened.session_id).unwrap();

        commit_business_export_stream(&state, &opened.session_id).unwrap();
        state.cleanup_all().unwrap();

        assert_eq!(std::fs::read_to_string(&path).unwrap(), "new export");
        let parent = path.parent().unwrap();
        let file_name = path.file_name().unwrap().to_string_lossy();
        let backup_prefix = format!(".{}.", file_name);
        assert!(
            std::fs::read_dir(parent)
                .unwrap()
                .filter_map(Result::ok)
                .all(|entry| {
                    let name = entry.file_name();
                    let name = name.to_string_lossy();
                    !(name.starts_with(&backup_prefix) && name.ends_with(".backup"))
                }),
            "commit must not leave the original file in a private backup"
        );
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn cleanup_all_revokes_a_published_stream_that_was_not_committed() {
        let path = unique_temp_file("chatlog-search-uncommitted.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        complete_business_export_stream(&state, &opened.session_id).unwrap();
        assert!(path.exists());

        state.cleanup_all().unwrap();

        assert!(!path.exists());
        assert_eq!(state.session_count(), 0);
    }

    #[test]
    fn cleanup_all_stops_a_committing_stream_before_it_can_rename() {
        let path = unique_temp_file("chatlog-search-cleanup-finalizing.md");
        let _ = std::fs::remove_file(&path);
        let state = std::sync::Arc::new(BusinessExportStreamState::new());
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();
        let session_id = opened.session_id.clone();
        let complete_state = std::sync::Arc::clone(&state);
        let reached_rename = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let reached_rename_for_thread = std::sync::Arc::clone(&reached_rename);
        let (ready_tx, ready_rx) = std::sync::mpsc::sync_channel(0);
        let (release_tx, release_rx) = std::sync::mpsc::sync_channel(0);
        let completion = std::thread::spawn(move || {
            complete_business_export_stream_with_hooks(
                &complete_state,
                &session_id,
                || {},
                || {
                    ready_tx.send(()).unwrap();
                    release_rx.recv().unwrap();
                },
                || {
                    reached_rename_for_thread.store(true, Ordering::Release);
                },
            )
        });

        ready_rx.recv().unwrap();
        let cleanup_error = state
            .cleanup_all()
            .expect_err("an in-flight finalization must keep application close pending");
        assert!(cleanup_error.contains("正在安全取消"));
        release_tx.send(()).unwrap();
        let error = completion
            .join()
            .unwrap()
            .expect_err("application cleanup must revoke an in-flight finalization");

        assert!(error.contains("取消"));
        assert!(!reached_rename.load(Ordering::Acquire));
        assert!(!path.exists());
        assert!(!partial.exists());
        assert_eq!(state.session_count(), 0);
        state.cleanup_all().unwrap();
    }

    #[test]
    fn published_delete_failure_keeps_the_session_retriable() {
        let path = unique_temp_file("chatlog-search-delete-retry.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        complete_business_export_stream(&state, &opened.session_id).unwrap();

        let error = cancel_business_export_stream_with_remover(&state, &opened.session_id, |_| {
            Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "locked",
            ))
        })
        .expect_err("a failed delete must remain observable");

        assert!(error.contains("清理失败"));
        assert!(path.exists());
        assert_eq!(state.session_count(), 1);
        cancel_business_export_stream(&state, &opened.session_id).unwrap();
        assert!(!path.exists());
        assert_eq!(state.session_count(), 0);
    }

    #[test]
    fn partial_delete_failure_is_reported_and_remains_retriable_for_cleanup_all() {
        let path = unique_temp_file("chatlog-search-partial-delete-retry.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private partial").unwrap();
        let partial = state.active_temp_path(&opened.session_id).unwrap();

        let error = cancel_business_export_stream_with_remover(&state, &opened.session_id, |_| {
            Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "synthetic locked partial",
            ))
        })
        .expect_err("partial deletion failure must not report successful cancellation");

        assert!(error.contains("清理失败"));
        assert!(partial.exists());
        assert_eq!(state.session_count(), 1);
        let cleanup_error = state
            .cleanup_all_with_remover(|_| {
                Err(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "synthetic locked partial",
                ))
            })
            .expect_err("application close cleanup must keep the partial retryable");
        assert!(cleanup_error.contains("清理失败"));
        assert_eq!(state.session_count(), 1);

        state.cleanup_all().unwrap();
        assert!(!partial.exists());
        assert_eq!(state.session_count(), 0);
    }

    #[test]
    fn published_cleanup_does_not_hold_the_registry_mutex_during_file_io() {
        let path = unique_temp_file("chatlog-search-cleanup-unlocked.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "redacted".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "safe export").unwrap();
        complete_business_export_stream(&state, &opened.session_id).unwrap();
        let observed_unlocked = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
        let observed_unlocked_for_remove = std::sync::Arc::clone(&observed_unlocked);

        cancel_business_export_stream_with_remover(&state, &opened.session_id, |target| {
            observed_unlocked_for_remove.store(state.registry_is_unlocked(), Ordering::Release);
            std::fs::remove_file(target)
        })
        .unwrap();

        assert!(
            observed_unlocked.load(Ordering::Acquire),
            "slow terminal path IO must execute after releasing the global registry mutex"
        );
    }

    #[test]
    fn terminal_idempotence_history_is_bounded() {
        let state = BusinessExportStreamState::new();
        let mut oldest_session_id = None;
        for index in 0..(TERMINAL_HISTORY_LIMIT + 5) {
            let path = unique_temp_file(&format!("chatlog-search-terminal-history-{index}.md"));
            let _ = std::fs::remove_file(&path);
            let opened = begin_business_export_stream(
                &state,
                BeginBusinessExportStreamPayload {
                    path: path.to_string_lossy().to_string(),
                    expected_extension: "md".into(),
                    redaction_policy: "redacted".into(),
                },
            )
            .unwrap();
            if oldest_session_id.is_none() {
                oldest_session_id = Some(opened.session_id.clone());
            }
            cancel_business_export_stream(&state, &opened.session_id).unwrap();
        }

        assert_eq!(state.session_count(), 0);
        assert!(state.terminal_count() <= TERMINAL_HISTORY_LIMIT);
        let error = cancel_business_export_stream(&state, &oldest_session_id.unwrap())
            .expect_err("evicted terminal ids must fail closed instead of growing forever");
        assert!(error.contains("已结束"));
    }

    #[test]
    fn cleanup_all_reports_a_published_delete_failure_and_keeps_it_retriable() {
        let path = unique_temp_file("chatlog-search-cleanup-delete-retry.md");
        let _ = std::fs::remove_file(&path);
        let state = BusinessExportStreamState::new();
        let opened = begin_business_export_stream(
            &state,
            BeginBusinessExportStreamPayload {
                path: path.to_string_lossy().to_string(),
                expected_extension: "md".into(),
                redaction_policy: "unredacted-confirmed".into(),
            },
        )
        .unwrap();
        append_business_export_stream(&state, &opened.session_id, "private export").unwrap();
        complete_business_export_stream(&state, &opened.session_id).unwrap();

        let error = state
            .cleanup_all_with_remover(|_| {
                Err(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "locked",
                ))
            })
            .expect_err("application cleanup must report a failed published delete");

        assert!(error.contains("清理失败"));
        assert!(path.exists());
        assert_eq!(state.session_count(), 1);
        state.cleanup_all().unwrap();
        assert!(!path.exists());
        assert_eq!(state.session_count(), 0);
    }

    fn unique_temp_file(file_name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "chatlog-ui-business-export-{}-{}",
            std::process::id(),
            file_name
        ))
    }
}
