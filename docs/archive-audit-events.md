# Archive Audit Events (API → Workers)

This document describes the domain events emitted by this API for project/task archive and
unarchive. It exists so the activity-log and notification workers can be updated in a later step.

> **Verification status:** last verified on **2026-11-16** with
> `verify_project_archive_audit_events.js` — **3/3 checks passed**.
> Captured events: `scratch/project-archive-audit-events-captured.json`.
> **The captured examples below predate the soft-deleted-task exclusion.** The verification script
> and captured counts must be re-run after that change; a manually archived task is still excluded
> and receives no `*.by_project` event.

## Event envelope

All events use the existing `domain-events` topic exchange and the standard envelope:

```json
{
  "id": "event-<generated-id>",
  "type": "<event-type>",
  "actorId": "<user-id>",
  "occurredAt": "<ISO-8601>",
  "payload": {}
}
```

## Event types

| Type | Emitted when | Notify? | Purpose |
|---|---|---|---|
| `project.archived` | A leader archives a project | Yes — active project members (see below) | Project audit log / notification |
| `project.unarchived` | A leader unarchives a project | Yes — active project members (see below) | Project audit log / notification |
| `task.archived` | A leader **manually** archives a task | Yes — assignee + project owner (see below) | Manual task archive audit log / notification |
| `task.unarchived` | A leader **manually** unarchives a task | Yes — assignee + project owner (see below) | Manual task unarchive audit log / notification |
| `task.archived.by_project` | A project archive cascades to a task | **No** | Audit log only |
| `task.unarchived.by_project` | A project unarchive cascades to a task | **No** | Audit log only |

## Notification recipients

> Event handling is **not implemented yet**. This section is the recipient contract for the
> notification worker; it describes intended behaviour, not current runtime behaviour.

Common rules:

- Never notify `actorId` (the user who performed the action).
- Only **active** project members (`ProjectMembers.isActive = true`) are eligible.
- De-duplicate recipients when one user matches several rules.
- Resolve membership-based recipients from `payload.projectId`; the project events do not
  carry a member list.

| Event type | Who receives a notification | How the worker resolves them |
|---|---|---|
| `project.archived` | Every active member of the archived project, except the actor | `payload.projectId` → active `ProjectMembers` |
| `project.unarchived` | Every active member of the unarchived project, except the actor | `payload.projectId` → active `ProjectMembers` |
| `task.archived` | `payload.assignedUserId` (assignee) and `payload.ownerId` (project owner), each only when non-null and not the actor | payload fields only |
| `task.unarchived` | Same as `task.archived` | payload fields only |
| `task.archived.by_project` | **Nobody** — audit log only | — |
| `task.unarchived.by_project` | **Nobody** — audit log only | — |

Recipient gaps in the current payloads (must be handled by the worker or fixed before the
worker is built):

- `project.archived` / `project.unarchived` carry only `projectId`, `projectName`, and the
  affected task count. They carry **no** `ownerId` and no member list, so the worker must
  query project membership by `projectId`.
- Project archive/unarchive is owner-only (`project.owner === userId`), so `actorId` is the
  project owner. Under the "never notify the actor" rule the owner will not receive these
  project notifications.
- `task.archived` / `task.unarchived` carry both `assignedUserId` and `ownerId`, so no
  membership lookup is needed. If the owner performs the manual archive, the owner is the
  actor and only the assignee is notified.
- `task.unarchived` may clear the assignee when an inactive non-DONE assignee is released
  (`confirmAssigneeRemoval`). The payload then has `assignedUserId: null`, and the previous
  assignee is not included, so the released assignee cannot be notified from the event.
- The `*.by_project` payloads do include `assignedUserId` and `ownerId`, but they are
  `auditOnly: true`; the notification worker must not create notifications from them.

## Verified captured examples

These are real captured events from the verification run.

**Manual task archive (`archiveSource: MANUAL`, no cascade flags):**

```json
{
  "id": "event-8a2e532e-4d98-4086-89fc-02d8d5c39f90",
  "type": "task.archived",
  "actorId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
  "occurredAt": "2026-11-15T20:25:00.040Z",
  "payload": {
    "taskId": "9523c7ff-341e-4c78-be9d-3aca84d9b570",
    "taskTitle": "Audit Manual Archive 74298094",
    "projectId": "0ae7edf0-3b35-477a-bc78-871fd94bcec0",
    "projectName": "Audit Archive 74298094",
    "assignedUserId": "6f3be8b2-2390-4cad-be8d-06e26464f9b5",
    "ownerId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
    "archiveSource": "MANUAL"
  }
}
```

**Project archive (includes affected task count):**

```json
{
  "id": "event-7e0d1c18-df77-4908-be69-43f18f74c762",
  "type": "project.archived",
  "actorId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
  "occurredAt": "2026-11-15T20:25:01.626Z",
  "payload": {
    "projectId": "0ae7edf0-3b35-477a-bc78-871fd94bcec0",
    "projectName": "Audit Archive 74298094",
    "archivedTaskCount": 3
  }
}
```

**Task archived by project cascade (audit-only):**

```json
{
  "id": "event-ab73a9b0-ba8f-4f35-a29c-7573b47df4fc",
  "type": "task.archived.by_project",
  "actorId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
  "occurredAt": "2026-11-15T20:25:01.628Z",
  "payload": {
    "taskId": "01a91636-8b65-452c-9248-1b6fc562ad32",
    "taskTitle": "Audit Active TODO 74298094",
    "projectId": "0ae7edf0-3b35-477a-bc78-871fd94bcec0",
    "projectName": "Audit Archive 74298094",
    "assignedUserId": "6f3be8b2-2390-4cad-be8d-06e26464f9b5",
    "ownerId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
    "archiveSource": "PROJECT",
    "cascade": true,
    "auditOnly": true
  }
}
```

**Project unarchive:**

```json
{
  "id": "event-57b5cf16-9e2f-43c7-8dfc-94fba2f9b1d7",
  "type": "project.unarchived",
  "actorId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
  "occurredAt": "2026-11-15T20:25:03.395Z",
  "payload": {
    "projectId": "0ae7edf0-3b35-477a-bc78-871fd94bcec0",
    "projectName": "Audit Archive 74298094",
    "unarchivedTaskCount": 3
  }
}
```

**Task unarchived by project cascade (audit-only):**

```json
{
  "id": "event-5b67b710-7928-4e61-a2cd-32a325f315c7",
  "type": "task.unarchived.by_project",
  "actorId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
  "occurredAt": "2026-11-15T20:25:03.397Z",
  "payload": {
    "taskId": "01a91636-8b65-452c-9248-1b6fc562ad32",
    "taskTitle": "Audit Active TODO 74298094",
    "projectId": "0ae7edf0-3b35-477a-bc78-871fd94bcec0",
    "projectName": "Audit Archive 74298094",
    "assignedUserId": "6f3be8b2-2390-4cad-be8d-06e26464f9b5",
    "ownerId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
    "archiveSource": "PROJECT",
    "cascade": true,
    "auditOnly": true
  }
}
```

## Cascade rules

### `task.archived.by_project`

- Emitted once per task that the project archive actually changes.
- Included tasks: `archivedAt = null` **and** `deletedAt = null` before the project archive.
- Excluded tasks:
  - tasks already manually archived (`archivedAt != null` / `archiveSource = MANUAL`);
  - soft-deleted tasks (`deletedAt != null`).
- Payload:

```json
{
  "taskId": "<task-id>",
  "taskTitle": "<task-title>",
  "projectId": "<project-id>",
  "projectName": "<project-name>",
  "assignedUserId": "<user-id-or-null>",
  "ownerId": "<project-owner-id>",
  "archiveSource": "PROJECT",
  "cascade": true,
  "auditOnly": true
}
```

### `task.unarchived.by_project`

- Emitted once per task that the project unarchive actually changes.
- Included tasks: `archiveSource = 'PROJECT'` **and** `deletedAt = null` before the project
  unarchive.
- Excluded tasks:
  - manually archived tasks (`archiveSource = MANUAL`);
  - soft-deleted tasks (`deletedAt != null`).
- Payload:

```json
{
  "taskId": "<task-id>",
  "taskTitle": "<task-title>",
  "projectId": "<project-id>",
  "projectName": "<project-name>",
  "assignedUserId": "<user-id-or-null>",
  "ownerId": "<project-owner-id>",
  "archiveSource": "PROJECT",
  "cascade": true,
  "auditOnly": true
}
```

## Manual task events

Manual task archive/unarchive events now also carry the source so logs can distinguish them:

```json
{
  "archiveSource": "MANUAL"
}
```

They do **not** carry `cascade: true` or `auditOnly: true`.

## Worker routing guidance

- The activity-log worker should consume:
  - `task.archived.by_project`
  - `task.unarchived.by_project`
- The notification worker must **not** create notifications from the `*.by_project` event types.
  Its `task.#` binding delivers these events to the queue, so the worker must explicitly ignore
  them before the event switch. Project cascade actions must not create notifications for affected
  tasks.
- Project-level notifications remain on `project.archived` / `project.unarchived`; recipients
  are defined in **Notification recipients**.
- Manual task notifications remain on `task.archived` / `task.unarchived`; recipients are
  defined in **Notification recipients**.

## Counts in project events

The project events include the number of affected tasks for audit convenience:

| Type | Extra payload field |
|---|---|
| `project.archived` | `archivedTaskCount` |
| `project.unarchived` | `unarchivedTaskCount` |

## Verification

```powershell
node --env-file=.env.dev verify_project_archive_audit_events.js
```

The script creates a temporary queue on `domain-events`, binds the archive event types, triggers
project archive/unarchive through the HTTP API, asserts the event contract, and cleans up.
