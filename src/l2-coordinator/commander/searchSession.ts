interface Cancellable {
  cancel: () => void;
}

export function clearSearchSession(pendingSearch: Cancellable, clear: () => void): void {
  pendingSearch.cancel();
  clear();
}
