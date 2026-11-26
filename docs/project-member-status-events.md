# Project Member Status Events (API → Workers)

This document describes the domain events the API emits when a project member is
deactivated or reactivated through `PATCH /api/projects/:projectId/members/:memberId/active`.

> **Verification status:** verified end-to-end on **2026-11-23** with
> `verify_member_status_events.js` — **5/5 checks passed**. The script captures the events from
> RabbitMQ and asserts the persisted `ActivityLogs` and `Notifications` rows. The activity-log and
> notification workers must be running for the persistence checks.
>
The API only **publishes** these events to the RabbitMQ topic exchange `domain-events`.
The activity-log and notification workers consume them and persist the `ActivityLogs` and
`Notifications` rows. See `readme.md` for the event-driven architecture.

## Event envelope

All events use the standard envelope:

```json
{
  "id": "event-<generated-id>",
  "type": "<event-type>",
  "actorId": "<user-id>",
  "occurredAt": "<ISO-8601>",
  "payload": {}
}
```

`actorId` is the project owner who performed the status change.

## Event types

| Type | Emitted when | Logged? | Notify? |
|---|---|---|---|
| `project.member.deactivated` | A project owner deactivates a member | Yes | Yes — the deactivated member |
| `project.member.reactivated` | A project owner reactivates a member | Yes | Yes — the reactivated member |

## Payload

```json
{
  "projectId": "<project-id>",
  "projectName": "<project-name>",
  "memberUserId": "<affected-user-id>",
  "releasedTaskCount": 4
}
```

- `memberUserId` is the affected member's **user** id (not the `ProjectMembers` row id).
- `releasedTaskCount` is `0` for reactivation and for a deactivation that released no
  assignments. It reports how many `TODO` / `IN_PROGRESS` assignments were cleared.

Example — member deactivation:

```json
{
  "id": "event-8f1c0d2a-3b4c-4d5e-8f90-123456789abc",
  "type": "project.member.deactivated",
  "actorId": "b1c66005-9e78-48a8-9f07-7033e8b30268",
  "occurredAt": "2026-11-23T09:15:00.000Z",
  "payload": {
    "projectId": "0ae7edf0-3b35-477a-bc78-871fd94bcec0",
    "projectName": "Website Redesign",
    "memberUserId": "6f3be8b2-2390-4cad-be8d-06e26464f9b5",
    "releasedTaskCount": 4
  }
}
```

## Activity-log mapping

Following the mapping rules in `docs/activity-log-guide.md`:

| `ActivityLogs` field | Value |
|---|---|
| `eventId` | `event.id` |
| `type` | `event.type` |
| `actorId` | `event.actorId` |
| `targetUserId` | `payload.memberUserId` |
| `entityType` | `"project"` |
| `entityId` | `payload.projectId` |
| `entityTitle` | `payload.projectName` |
| `projectId` | `payload.projectId` |
| `projectName` | `payload.projectName` |
| `createdAt` | `event.occurredAt` |

Because `event.type` starts with `project.`, the existing activity-log consumer already
derives the project entity fields and resolves `targetUserId` from `payload.memberUserId`.

## Notification recipients

| Event type | Who receives a notification | How the worker resolves them |
|---|---|---|
| `project.member.deactivated` | The deactivated member | `payload.memberUserId` |
| `project.member.reactivated` | The reactivated member | `payload.memberUserId` |

Rules:

- Notify only `payload.memberUserId`; no membership lookup is needed.
- Never notify `actorId` (the project owner). The owner cannot change their own status,
  so `memberUserId` never equals `actorId` for these events.
- De-duplicate by `(eventId, recipientId)` as the `Notifications` table already enforces.

## Worker routing guidance

The workers bind `project.#`, so these events arrive automatically. No new binding is
required. The activity-log worker should persist both event types. The notification worker
should create one notification per event for `payload.memberUserId`.

## Verification

Run only after the API, RabbitMQ, PostgreSQL, and both workers are running:

```powershell
node --env-file=.env.dev verify_member_status_events.js
```

The script creates temporary users, a project, a member, and two assigned tasks, then:

1. deactivates and reactivates the member through the HTTP API;
2. captures `project.member.deactivated` / `project.member.reactivated` from RabbitMQ and asserts
   the payload contract (`actorId`, `memberUserId`, `projectName`, `releasedTaskCount`);
3. waits for the workers and asserts the `ActivityLogs` row (`targetUserId = memberUserId`,
   `entityType = project`) and the `Notifications` row (`recipientId = memberUserId`, actor not
   notified);
4. writes captured data to `scratch/member-status-events-captured.json` and removes the temporary
   data.

