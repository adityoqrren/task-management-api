# Member Task Summary API Guide (Verified)

> **Verification status:** verified against the running development API on **2026-11-16**.
> Test script: `verify_member_task_summary.js` — **5/5 checks passed**.
>
> The request and response examples below are real captured output from that run. Temporary test
> users, projects, and tasks were removed by the script; the UUIDs below are historical examples.
>
> Captured output: `scratch/member-task-summary-captured.json`.

---

## Purpose

Show a project member's task totals before deactivating the member.

- **Unfinished tasks** = `TODO` + `IN_PROGRESS`
- **Completed tasks** = `DONE`
- Deleted tasks are excluded.
- Active, manually archived, and project-archived tasks are all included.

This matches the member-inactivation rule: only non-DONE assignments are released on deactivation.

> **Note:** soft-deleted tasks are intentionally excluded from this summary. Deactivation also
> releases soft-deleted `TODO` / `IN_PROGRESS` assignments, so `releasedTaskCount` in the
> deactivation response can be higher than `unfinishedTasks.total`.

---

## Endpoint

### `GET /api/projects/:projectId/members/:memberId/task-summary`

**Permission:** project `LEADER`.

**Path parameters:**

| Name | Description |
|---|---|
| `projectId` | Project ID |
| `memberId` | Project member ID (`ProjectMembers.id`, not the user ID) |

**Request:**

```bash
curl "http://localhost:3000/api/projects/<project-id>/members/<member-id>/task-summary" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": {
    "memberId": "0380dbd7-d136-426d-a60b-35b1e24fb3da",
    "projectId": "ce88ef64-df51-479a-89ec-048f62703376",
    "unfinishedTasks": {
      "total": 3,
      "todo": 2,
      "inProgress": 1
    },
    "completedTasks": {
      "total": 2
    }
  }
}
```

In the verified run, this member had:

- 2 `TODO` tasks (1 active, 1 manually archived)
- 1 `IN_PROGRESS` task (active)
- 2 `DONE` tasks (1 active, 1 manually archived)
- 1 deleted `TODO` task, which was excluded
- 1 task assigned to another member, which was excluded

---

## Another member in the same project

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": {
    "memberId": "eadf1dcb-abd7-43bd-b132-a6c30410a6eb",
    "projectId": "ce88ef64-df51-479a-89ec-048f62703376",
    "unfinishedTasks": {
      "total": 1,
      "todo": 1,
      "inProgress": 0
    },
    "completedTasks": {
      "total": 0
    }
  }
}
```

Counts are scoped to the requested member; another member's tasks are not included.

---

## Project-archived tasks are included

After the project was archived, the same member summary returned the same counts. Tasks archived by
the project cascade are still counted because the summary has no `archivedAt` filter.

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": {
    "memberId": "0380dbd7-d136-426d-a60b-35b1e24fb3da",
    "projectId": "ce88ef64-df51-479a-89ec-048f62703376",
    "unfinishedTasks": {
      "total": 3,
      "todo": 2,
      "inProgress": 1
    },
    "completedTasks": {
      "total": 2
    }
  }
}
```

---

## Errors

### Non-leader requests the summary

**Verified error — 403 Forbidden:**

```json
{
  "status": "fail",
  "message": "You are not authorized to perform this action"
}
```

### Member does not exist in the project

**Verified error — 404 Not Found:**

```json
{
  "status": "fail",
  "message": "Member not found in this project"
}
```

---

## Verification command

> Run only after the API and its dependencies (Postgres, Redis, RabbitMQ) are running.

```powershell
node --env-file=.env.dev verify_member_task_summary.js
```
