# Task Restored Event (API → Workers)

This document describes the `task.restored` domain event emitted when a soft-deleted task is
restored through `PATCH /api/tasks/restore/:taskId`.

The API publishes the event to the RabbitMQ topic exchange `domain-events`. The activity-log worker
persists it, and the notification worker notifies the restored task's assignee when that assignee is
still an **active** project member.

> **Verification status:** verified end-to-end on **2026-11-24** with
> `verify_task_restored_notification.js` — **4/4 checks passed**. The activity-log and notification
> workers must be running for the persistence checks.

## Event envelope

```json
{
  "id": "event-<generated-id>",
  "type": "task.restored",
  "actorId": "<user-id>",
  "occurredAt": "<ISO-8601>",
  "payload": {}
}
```

## Payload

```json
{
  "taskId": "<task-id>",
  "taskTitle": "<task-title>",
  "projectId": "<project-id>",
  "projectName": "<project-name>",
  "assignedUserId": "<assignee-user-id-or-null>",
  "ownerId": "<project-owner-user-id>"
}
```

`assignedUserId` is the assignee after the restore completes:

- For a non-DONE task with a missing or inactive assignee, the restore clears the assignment, so
  `assignedUserId` is `null`.
- For a DONE task, the assignee is kept as a historical record even when the member is inactive, so
  `assignedUserId` may reference an inactive member.

## Notification recipients

| Event type | Who receives a notification | How the worker resolves them |
|---|---|---|
| `task.restored` | The restored task's assignee, only if the assignee is an active project member | `payload.projectId` → active `ProjectMembers`, intersected with `payload.assignedUserId` |

Rules:

- Notify `payload.assignedUserId` only when it is non-null.
- The assignee must be an active member of `payload.projectId`.
- Never notify `actorId`.
- No notification is created for a restored task with no assignee, or when the retained assignee is
  inactive.
- The `Notifications` unique constraint `(eventId, recipientId)` provides idempotency.

## Activity-log mapping

The activity-log worker already handles `task.restored`:

| `ActivityLogs` field | Value |
|---|---|
| `eventId` | `event.id` |
| `type` | `event.type` |
| `actorId` | `event.actorId` |
| `targetUserId` | `payload.assignedUserId` |
| `entityType` | `"task"` |
| `entityId` | `payload.taskId` |
| `entityTitle` | `payload.taskTitle` |
| `projectId` / `projectName` | from payload |
| `taskId` | `payload.taskId` |

## Verification

Run only after the API, RabbitMQ, PostgreSQL, and both workers are running:

```powershell
node --env-file=.env.dev verify_task_restored_notification.js
```

The script soft-deletes and restores tasks with an active assignee, an inactive DONE assignee, and
no assignee, then asserts the emitted events, the activity logs, and the notification recipients.
