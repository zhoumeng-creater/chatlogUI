---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include tests for changed contracts, L2 orchestration, state
normalization, sidecar/Tauri behavior, and regression-prone UI helpers. If a
feature spec explicitly excludes tests, record the verification commands that
replace them.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **L1 Entry**: `src/l1-entry/` for routes, view shells, layout, and event
  delegation only
- **L2 Coordinator**: `src/l2-coordinator/` for Commander, DataClerk,
  Diplomat, API contracts, retries, state normalization, and error translation
- **L3 Molecule**: `src/l3-molecule/` for reusable feature components that
  receive data/callbacks as props and do not call network atoms
- **L4 Atom**: `src/l4-atom/` for independent UI, network, and system atoms
- **Tauri Shell**: `src-tauri/` for sidecar lifecycle, native commands,
  capabilities, bundle config, CSP, and release packaging
- **Tests**: colocated `*.test.ts`/`*.test.tsx`, `src-tauri` Rust tests, or
  feature-specific tests described in `plan.md`

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T008 Configure error handling and logging infrastructure
- [ ] T009 Setup environment configuration management
- [ ] T010 Define or update L2 API contracts and error translations
- [ ] T011 Add secret/private-data redaction guardrails where logs or diagnostics are touched
- [ ] T012 Confirm sidecar/Tauri capability impact and package-time assumptions

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Contract or commander test for [endpoint/orchestration] in [test path]
- [ ] T014 [P] [US1] Integration/UI-state test for [user journey] in [test path]

### Implementation for User Story 1

- [ ] T015 [P] [US1] Implement or update L4 atom/API contract in [path]
- [ ] T016 [P] [US1] Implement or update L3 molecule state rendering in [path]
- [ ] T017 [US1] Implement L2 orchestration/state/error handling in [path] (depends on T015, T016)
- [ ] T018 [US1] Wire L1 layout/event delegation in [path]
- [ ] T019 [US1] Add loading, empty, error, and success states with retry/next-step guidance
- [ ] T020 [US1] Verify no secret, token, dataKey, or private chat content is logged

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [ ] T021 [P] [US2] Contract or commander test for [endpoint/orchestration] in [test path]
- [ ] T022 [P] [US2] Integration/UI-state test for [user journey] in [test path]

### Implementation for User Story 2

- [ ] T023 [P] [US2] Implement or update L4 atom/API contract in [path]
- [ ] T024 [US2] Implement L2 orchestration/state/error handling in [path]
- [ ] T025 [US2] Implement L3 molecule rendering in [path]
- [ ] T026 [US2] Integrate with User Story 1 components (if needed)
- [ ] T027 [US2] Add loading, empty, error, and success states with retry/next-step guidance

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [ ] T028 [P] [US3] Contract or commander test for [endpoint/orchestration] in [test path]
- [ ] T029 [P] [US3] Integration/UI-state test for [user journey] in [test path]

### Implementation for User Story 3

- [ ] T030 [P] [US3] Implement or update L4 atom/API contract in [path]
- [ ] T031 [US3] Implement L2 orchestration/state/error handling in [path]
- [ ] T032 [US3] Implement L3 molecule rendering in [path]
- [ ] T033 [US3] Add loading, empty, error, and success states with retry/next-step guidance

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional unit tests (if requested) in tests/unit/
- [ ] TXXX Security hardening
- [ ] TXXX Architecture boundary review for L1/L2/L3/L4 responsibilities
- [ ] TXXX Privacy/logging review for secrets, dataKey, tokens, and private chat content
- [ ] TXXX Tauri/sidecar packaging smoke check if `src-tauri/`, capabilities, CSP, or binaries changed
- [ ] TXXX Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`
- [ ] TXXX Run `pnpm verify`, `cd src-tauri && cargo test`, and `pnpm tauri build` for final delivery or sidecar/Tauri changes
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests or verification guards (if included) MUST be written and FAIL before implementation
- L4 API/system atoms before L2 orchestration that consumes them
- L2 orchestration/state/error handling before L1 wiring
- L3 presentational rendering before final L1 composition when possible
- Visible loading/empty/error/success states before story completion
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence,
  direct L1/L3 network calls, L4 atoms importing each other, and unredacted logs
