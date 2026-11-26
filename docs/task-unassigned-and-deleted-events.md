# Task Unassigned & Deleted Events (API → Workers)

This document describes the domain events emitted when a task is unassigned and when it is
soft-deleted. It exists so the activity-log and notification workers implement the same contract.

The API publishes to the RabbitMQ topic exchange `domain-events`. Workers consume the events and
persist `ActivityLogs` and `Notifications`.

> **Verification status:** verified end-to-end on **2026-11-24** with
> `verify_task_unassigned_deleted_notifications.js` — **6/6 checks passed**. The activity-log and
> notification workers must be running for the persistence checks.

## Event envelope

```json
{
  "id": "event-<generated-id>",
  "type": "<event-type>",
  "actorId": "<user-id>",
  "occurredAt": "<ISO-8601>",
  "payload": {}
}
```

`actorId` is the authenticated user who performed the action.

## Event types

| Type | Emitted when | Assignee notified? | Activity logged? |
|---|---|---|---|
| `task.unassigned` | A leader unassigns a task via `PATCH /api/tasks/:taskId/assign` with `{ "memberId": null }` | Yes — the previous assignee | Yes |
| `task.deleted` | A leader soft-deletes a task via `PATCH /api/tasks/:taskId/soft-delete` | Yes — the task assignee | Yes |

`task.unassigned` is **only** emitted from the explicit unassign endpoint. Project member
deactivation continues to emit `project.member.deactivated` and does not emit per-task
`task.unassigned` events.

## Payloads

### `task.unassigned`

```json
{
  "taskId": "<task-id>",
  "taskTitle": "<task-title>",
  "projectId": "<project-id>",
  "projectName": "<project-name>",
  "assignedUserId": "<previous-assignee-user-id>",
  "ownerId": "<project-owner-user-id>"
}
```

The event is only published when a previous assignee existed.

### `task.deleted`

```json
{
  "taskId": "<task-id>",
  "taskTitle": "<task-title>",
  "projectId": "<project-id>",
  "projectName": "<project-name>",
  "assignedUserId": "<assignee-user-id-or-null>",
  "ownerId": "<project-owner-user-id-or-null>"
}
```

## Notification recipients

| Event type | Who receives a notification | How the worker resolves them |
|---|---|---|
| `task.unassigned` | The previous assignee | `payload.assignedUserId` |
| `task.deleted` | The task assignee | `payload.assignedUserId` |

Rules:

- Notify `payload.assignedUserId` only.
- Skip when `assignedUserId` is `null` (unassigned task or task deleted without an assignee).
- Never notify `actorId` (the user who performed the action).
- The `Notifications` unique constraint `(eventId, recipientId)` provides idempotency.

## Activity-log mapping

| `ActivityLogs` field | `task.unassigned` | `task.deleted` |
|---|---|---|
| `eventId` | `event.id` | `event.id` |
| `type` | `event.type` | `event.type` |
| `actorId` | `event.actorId` | `event.actorId` |
| `targetUserId` | `payload.assignedUserId` | `payload.assignedUserId` |
| `entityType` | `"task"` | `"task"` |
| `entityId` | `payload.taskId` | `payload.taskId` |
| `entityTitle` | `payload.taskTitle` | `payload.taskTitle` |
| `projectId` / `projectName` | from payload | from payload |
| `taskId` | `payload.taskId` | `payload.taskId` |

## Worker routing

Both workers already bind `task.#`, so these events arrive without new bindings. The activity-log
worker persists both event types. The notification worker creates one notification per event for
`payload.assignedUserId` when it is non-null and differs from the actor.

## Verification

Run only after the API, RabbitMQ, PostgreSQL, and both workers are running:

```powershell
node --env-file=.env.dev verify_task_unassigned_deleted_notifications.js
```

The script assigns a task to a member, unassigns it, and soft-deletes it, then asserts the emitted
events, the persisted activity logs, and the assignee notifications. It also asserts that deleting
an unassigned task creates no notification, writes captured data to `scratch/`, and cleans up.
