# Archive & Member Inactivation API Guide (Verified)

> **Verification status:** verified against the running development API on **2026-11-16**
> (captured test timestamps are `2026-11-15T20:06Z`).
>
> **Test scripts and results:**
> - `verify_archive_feature.js` — **13/13 checks passed**
> - `verify_member_inactivation.js` — **10/10 checks passed**
>
> The requests and responses below are real captured output from those runs. Temporary test users,
> projects, tasks, comments, and attachments were removed by the scripts in `finally`; the UUIDs
> below are historical examples.
>
> **Endpoint surface:** no new route was added. This guide documents the verified behaviour of the
> existing endpoints affected by the implementation plan
> `planning/archive-member-inactivation-plan.md`.
>
> The presigned `fileUrl` in the attachment example has its signature query string redacted.

---

## Common headers

```
Authorization: Bearer <access-token>
Content-Type: application/json
```

Success responses use the standard envelope:

```json
{
  "status": "success",
  "message": "...",
  "data": {}
}
```

Errors use:

```json
{
  "status": "fail",
  "message": "..."
}
```

---

## Endpoint summary

| Method | Path | Permission | Verified behaviour |
|---|---|---|---|
| `PATCH` | `/api/projects/:id/archive` | project `LEADER` | Archive project and cascade-archive tasks |
| `PATCH` | `/api/projects/:id/unarchive` | project `LEADER` | Unarchive project and restore only `PROJECT`-archived tasks |
| `PATCH` | `/api/tasks/:taskId/archive` | project `LEADER` | Manually archive a task (`archiveSource = MANUAL`) |
| `PATCH` | `/api/tasks/:taskId/unarchive` | project `LEADER` | Unarchive a task; DONE assignee is preserved; legacy non-DONE inactive assignee may require confirmation |
| `PATCH` | `/api/projects/:projectId/members/:memberId/active` | project `LEADER` | Deactivate/activate a member; deactivation releases non-DONE assignments |
| `PATCH` | `/api/tasks/:taskId/assign` | project `LEADER` | Rejects an inactive target member |
| `PATCH` | `/api/tasks/:taskId/progress` | project `LEADER` / assigned `MEMBER` | Blocked for inactive members; DONE reopen blocked for inactive assignee |
| `PATCH` | `/api/tasks/:taskId/completed` | project `LEADER` / assigned `MEMBER` | Same DONE reopen guard |
| `PATCH` | `/api/tasks/:taskId` | project `LEADER` | Archived task and DONE reopen guards |
| `DELETE` | `/api/tasks/:taskId` | project `LEADER` | Permanent delete blocked while the parent project is archived |
| `PATCH` | `/api/tasks/:taskId/comments/:commentId` | comment owner | Archived task and inactive-member guards |
| `DELETE` | `/api/tasks/:taskId/comments/:commentId` | `LEADER` or comment owner | Archived task and inactive-member guards |

---

## 1. Project archive / unarchive

### `PATCH /api/projects/:id/archive`

```bash
curl -X PATCH "http://localhost:3000/api/projects/<project-id>/archive" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "project has been archived",
  "data": {
    "projectId": "cb267758-cbd5-4cfe-a215-3aa5c40e36b0",
    "archivedAt": "2026-11-15T20:06:39.321Z"
  }
}
```

### `PATCH /api/projects/:id/unarchive`

```bash
curl -X PATCH "http://localhost:3000/api/projects/<project-id>/unarchive" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "project has been unarchived",
  "data": {
    "projectId": "cb267758-cbd5-4cfe-a215-3aa5c40e36b0",
    "archivedAt": null
  }
}
```

An archived project is read-only. Restoring a deleted task while the project is archived is
rejected:

**Verified error — 403 Forbidden:**

```json
{
  "status": "fail",
  "message": "PROJECT_ARCHIVED: restore the project before restoring this task"
}
```

---

## 2. Task archive / unarchive

### `PATCH /api/tasks/:taskId/archive`

```bash
curl -X PATCH "http://localhost:3000/api/tasks/<task-id>/archive" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "task has been archived",
  "data": {
    "taskId": "df056c49-f146-4509-a046-5a1975784e2f",
    "archivedAt": "2026-11-15T20:06:39.278Z",
    "archiveSource": "MANUAL"
  }
}
```

### `PATCH /api/tasks/:taskId/unarchive` — DONE task with inactive assignee

A DONE task keeps its assignee as a historical record. The request does **not** need
`confirmAssigneeRemoval` and the response still contains the assignee.

**Request body:** none (or `{}`).

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "task has been unarchived",
  "data": {
    "taskId": "09160fe0-5866-4a4b-b4f5-194c9d5c031b",
    "archivedAt": null,
    "archiveSource": null,
    "assigneeId": "8b7baddb-ba8e-4b7c-a03b-ce3225dc4829"
  }
}
```

### `PATCH /api/tasks/:taskId/unarchive` — legacy non-DONE inactive assignee

For a legacy non-DONE task that still references an inactive member, confirmation is required.

**Verified error — 400 Bad Request:**

```json
{
  "status": "fail",
  "message": "ASSIGNEE_INACTIVE_CONFIRMATION_REQUIRED"
}
```

**Request body:**

```json
{
  "confirmAssigneeRemoval": true
}
```

**Verified response — 200 OK (assignee cleared):**

```json
{
  "status": "success",
  "message": "task has been unarchived",
  "data": {
    "taskId": "0d521105-6b36-4b18-ac9b-e0d4d93a354d",
    "archivedAt": null,
    "archiveSource": null,
    "assigneeId": null
  }
}
```

---

## 3. Member deactivation

### `PATCH /api/projects/:projectId/members/:memberId/active`

**Permission:** project `LEADER`.

**Request body:**

```json
{
  "isActive": false
}
```

Deactivation now releases every `TODO` / `IN_PROGRESS` assignment in the project, including archived
and soft-deleted tasks. `DONE` assignments are kept as historical records. Task statuses do not change.

To preview the affected counts before deactivating, use:
`GET /api/projects/:projectId/members/:memberId/task-summary`. See
`docs/member-task-summary-api-guide.md` for verified examples.

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "member has been inactivated",
  "data": {
    "memberId": "7c881f47-37fc-4afe-9fd3-9ef24d69f989",
    "projectId": "e4d29c6c-167a-4100-b7b8-aefc7a52e3d0",
    "userId": "5754a001-1c1e-4d08-937b-41344dc0341f",
    "role": "MEMBER",
    "joinedAt": "2026-11-15T20:06:47.957Z",
    "isActive": false,
    "releasedTaskCount": 4
  }
}
```

In the verified run, the 4 released assignments were: an active `TODO` task, an active
`IN_PROGRESS` task, a manually archived `TODO` task, and a soft-deleted `TODO` task. The two `DONE`
tasks in the same project kept their assignee.

---

## 4. Member reactivation

### `PATCH /api/projects/:projectId/members/:memberId/active`

**Request body:**

```json
{
  "isActive": true
}
```

Reactivation only changes membership state. Previously released assignments are **not** restored.

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "member has been activated",
  "data": {
    "memberId": "7c881f47-37fc-4afe-9fd3-9ef24d69f989",
    "projectId": "e4d29c6c-167a-4100-b7b8-aefc7a52e3d0",
    "userId": "5754a001-1c1e-4d08-937b-41344dc0341f",
    "role": "MEMBER",
    "joinedAt": "2026-11-15T20:06:47.957Z",
    "isActive": true,
    "releasedTaskCount": 0
  }
}
```

---

## 5. DONE task with an inactive assignee

While the assignee remains inactive, moving a `DONE` task back to `TODO` or `IN_PROGRESS` is
rejected.

### `PATCH /api/tasks/:taskId/progress`

**Request body:**

```json
{
  "status": "IN_PROGRESS"
}
```

**Verified error — 400 Bad Request:**

```json
{
  "status": "fail",
  "message": "TASK_ASSIGNEE_INACTIVE: cannot reopen a DONE task while its assignee is inactive; reactivate the member or assign another active member"
}
```

### `PATCH /api/tasks/:taskId/completed`

**Request body:**

```json
{
  "completed": false
}
```

**Verified error — 400 Bad Request:**

```json
{
  "status": "fail",
  "message": "TASK_ASSIGNEE_INACTIVE: cannot reopen a DONE task while its assignee is inactive; reactivate the member or assign another active member"
}
```

### Reassign to an active member, then reopen

After assigning the task to another active project member, reopening succeeds.

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "task progress success changed",
  "data": {
    "taskId": "3111548b-8b83-491e-8336-e6610bcdebef",
    "projectId": "a982bef0-1c22-4d07-8876-44cd2d9b00b9",
    "title": "Done Guard Task 73207522",
    "description": "",
    "picId": "21917dfc-6e0f-42b0-aebf-4b30a92b0b37",
    "completed": false,
    "status": "IN_PROGRESS",
    "priority": "MEDIUM",
    "startDate": "2026-11-15T20:06:49.649Z",
    "dueDate": null
  }
}
```

---

## 6. Assigning to an inactive member

### `PATCH /api/tasks/:taskId/assign`

**Request body:**

```json
{
  "memberId": "<inactive-member-id>"
}
```

**Verified error — 400 Bad Request:**

```json
{
  "status": "fail",
  "message": "ASSIGNEE_INACTIVE: cannot assign a task to an inactive project member"
}
```

---

## 7. Inactive member mutations

An inactive member cannot update task status or mutate their own comments.

### `PATCH /api/tasks/:taskId/progress`

**Verified error — 403 Forbidden:**

```json
{
  "status": "fail",
  "message": "Inactive member of this project"
}
```

### `PATCH /api/tasks/:taskId/comments/:commentId`

**Verified error — 403 Forbidden:**

```json
{
  "status": "fail",
  "message": "Inactive member of this project"
}
```

### `DELETE /api/tasks/:taskId/comments/:commentId`

**Verified error — 403 Forbidden:**

```json
{
  "status": "fail",
  "message": "Inactive member of this project"
}
```

The verification also asserted that the comment still existed and its content was unchanged after
both blocked comment mutations.

---

## 8. Archived task and its relations are read-only

After `PATCH /api/tasks/:taskId/archive`, every task relation mutation below returned the same
verified error. The verification also asserted that no comment or attachment row was created,
updated, or deleted.

| Endpoint | Verified result |
|---|---|
| `PATCH /api/tasks/:taskId` | `400 TASK_ARCHIVED: task is read-only` |
| `PATCH /api/tasks/:taskId/progress` | `400 TASK_ARCHIVED: task is read-only` |
| `PATCH /api/tasks/:taskId/assign` | `400 TASK_ARCHIVED: task is read-only` |
| `POST /api/tasks/:taskId/comments` | `400 TASK_ARCHIVED: task is read-only` |
| `PATCH /api/tasks/:taskId/comments/:commentId` | `400 TASK_ARCHIVED: task is read-only` |
| `DELETE /api/tasks/:taskId/comments/:commentId` | `400 TASK_ARCHIVED: task is read-only` |
| `POST /api/tasks/:taskId/attachments/files` | `400 TASK_ARCHIVED: task is read-only` |
| `DELETE /api/tasks/:taskId/attachments/:attachmentId` | `400 TASK_ARCHIVED: task is read-only` |

**Verified error body (same for all rows above):**

```json
{
  "status": "fail",
  "message": "TASK_ARCHIVED: task is read-only"
}
```

### Viewing an archived task is still allowed

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": {
    "taskId": "fef6d655-c0e7-4423-a1a3-056c3c855488",
    "projectId": "4a2a38a2-a20a-4bb0-b115-280dd63f6b01",
    "project": {
      "id": "4a2a38a2-a20a-4bb0-b115-280dd63f6b01",
      "name": "Member Archived Relations 73207522"
    },
    "title": "Archived Relations Task 73207522",
    "description": "",
    "picId": null,
    "completed": false,
    "status": "TODO",
    "priority": "MEDIUM",
    "startDate": "2026-11-15T20:06:51.186Z",
    "dueDate": null,
    "createdAt": "2026-11-15T20:06:51.194Z",
    "updatedAt": "2026-11-15T20:06:51.279Z",
    "archivedAt": "2026-11-15T20:06:51.278Z",
    "archiveSource": "MANUAL",
    "deletedAt": null,
    "deleteSource": null,
    "assignee": null
  }
}
```

### Viewing comments of an archived task

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": [
    {
      "id": "9563c2d6-ec89-46c0-b3c4-eea54a7d467d",
      "taskId": "fef6d655-c0e7-4423-a1a3-056c3c855488",
      "userId": "0eda1640-78ad-40d6-be64-336230f1c134",
      "content": "original comment",
      "createdAt": "2026-11-15T20:06:51.230Z",
      "updatedAt": "2026-11-15T20:06:51.230Z",
      "user": {
        "id": "0eda1640-78ad-40d6-be64-336230f1c134",
        "name": "Member Inactivation Leader"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 5,
    "nextCursor": null
  }
}
```

### Viewing attachments of an archived task

**Verified response — 200 OK (presigned URL redacted):**

```json
{
  "status": "success",
  "message": "Task attachments retrieved successfully",
  "data": [
    {
      "id": "3224227d-ed79-4bcf-a6e5-eb55cafb1617",
      "taskId": "fef6d655-c0e7-4423-a1a3-056c3c855488",
      "userId": "0eda1640-78ad-40d6-be64-336230f1c134",
      "fileName": "original-73207522.txt",
      "originalFileName": "original-73207522.txt",
      "mimeType": "text/plain",
      "size": 5,
      "createdAt": "2026-11-15T20:06:51.261Z",
      "updatedAt": "2026-11-15T20:06:51.261Z",
      "user": {
        "id": "0eda1640-78ad-40d6-be64-336230f1c134",
        "username": "mileader73207522",
        "name": "Member Inactivation Leader"
      },
      "fileUrl": "https://test-bucket.<account-id>.r2.cloudflarestorage.com/uploads/original-73207522.txt?<redacted>"
    }
  ]
}
```

---

## 9. Permanent delete in an archived project

### `DELETE /api/tasks/:taskId`

**Verified error — 403 Forbidden:**

```json
{
  "status": "fail",
  "message": "PROJECT_ARCHIVED: project is read-only"
}
```

---

## 10. Archived task soft delete / restore

An archived task can be soft-deleted while its parent project is active. Restoring it returns the
task to the archived state and preserves `archivedAt` / `archiveSource`.

### `PATCH /api/tasks/:taskId/soft-delete`

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "task success deleted"
}
```

### `PATCH /api/tasks/restore/:taskId`

**Verified response — 200 OK (archive state preserved):**

```json
{
  "status": "success",
  "message": "success restoring deleted task",
  "data": {
    "id": "cab935cb-f1c5-4567-aa7a-05c380e7dafc",
    "title": "Archive State Task 73207522",
    "description": "",
    "completed": false,
    "status": "TODO",
    "assigneeId": null,
    "projectId": "bbee27dc-0358-4165-b97a-7226bf63efdc",
    "priority": "MEDIUM",
    "startDate": "2026-11-15T20:06:51.531Z",
    "dueDate": null,
    "createdAt": "2026-11-15T20:06:51.543Z",
    "updatedAt": "2026-11-15T20:06:51.678Z",
    "archivedAt": "2026-11-15T20:06:51.589Z",
    "archiveSource": "MANUAL",
    "deletedAt": null,
    "deleteSource": null,
    "taskAttachments": [],
    "assignee": null,
    "project": {
      "name": "Member Archive State 73207522",
      "owner": "0eda1640-78ad-40d6-be64-336230f1c134"
    }
  }
}
```

---

## 11. Restoring deleted tasks with inactive assignees

### Non-DONE assignee is cleared on restore

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "success restoring deleted task",
  "data": {
    "id": "01f85aaa-b581-49d3-8be4-1cf2fd2aa9eb",
    "title": "Restore TODO Assignee 73207522",
    "description": "",
    "completed": false,
    "status": "TODO",
    "assigneeId": null,
    "projectId": "cdfa28d3-45da-4312-a21b-e0b733bfb61c",
    "priority": "MEDIUM",
    "startDate": "2026-11-15T20:06:51.796Z",
    "dueDate": null,
    "createdAt": "2026-11-15T20:06:51.806Z",
    "updatedAt": "2026-11-15T20:06:52.373Z",
    "archivedAt": null,
    "archiveSource": null,
    "deletedAt": null,
    "deleteSource": null,
    "taskAttachments": [],
    "assignee": null,
    "project": {
      "name": "Member Restore Assignee 73207522",
      "owner": "0eda1640-78ad-40d6-be64-336230f1c134"
    }
  }
}
```

### DONE assignee is preserved on restore

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "success restoring deleted task",
  "data": {
    "id": "bb55297a-c5a8-4939-978f-88e8e6ff33d1",
    "title": "Restore DONE Assignee 73207522",
    "description": "",
    "completed": true,
    "status": "DONE",
    "assigneeId": "dc56221c-6d6c-495a-94d5-03ddf525fc82",
    "projectId": "cdfa28d3-45da-4312-a21b-e0b733bfb61c",
    "priority": "MEDIUM",
    "startDate": "2026-11-15T20:06:51.839Z",
    "dueDate": null,
    "createdAt": "2026-11-15T20:06:51.848Z",
    "updatedAt": "2026-11-15T20:06:52.401Z",
    "archivedAt": null,
    "archiveSource": null,
    "deletedAt": null,
    "deleteSource": null,
    "taskAttachments": [],
    "assignee": {
      "userId": "5754a001-1c1e-4d08-937b-41344dc0341f",
      "role": "MEMBER",
      "user": {
        "email": "mi_member_73207522@test.local"
      }
    },
    "project": {
      "name": "Member Restore Assignee 73207522",
      "owner": "0eda1640-78ad-40d6-be64-336230f1c134"
    }
  }
}
```

---

## 12. Verified behaviour matrix

| Check | Result |
|---|---|
| Deactivation releases active `TODO` / `IN_PROGRESS` assignments | PASS |
| Deactivation releases archived `TODO` / `IN_PROGRESS` assignments | PASS |
| Deactivation releases soft-deleted `TODO` / `IN_PROGRESS` assignments | PASS |
| Deactivation keeps `DONE` assignees (active and archived) | PASS |
| Deactivation does not change task statuses or archive/delete state | PASS |
| Reactivation does not restore released assignments | PASS |
| DONE task archive/unarchive keeps an inactive assignee | PASS |
| DONE → `IN_PROGRESS` / `TODO` blocked while assignee is inactive | PASS |
| DONE task can be reopened after assigning an active member | PASS |
| Assigning to an inactive member is rejected | PASS |
| Inactive member cannot update status or mutate comments | PASS |
| Archived task fields/status/assignee cannot be changed | PASS |
| Archived task comments cannot be created, updated, or deleted | PASS |
| Archived task attachments cannot be uploaded or deleted | PASS |
| Archived task, comments, and attachments remain viewable | PASS |
| Permanent delete is blocked in an archived project | PASS |
| Archived task soft delete/restore preserves archive state | PASS |
| Restore clears inactive non-DONE assignees and keeps DONE assignees | PASS |
| Archive regression suite (13 checks) | PASS |
| Member inactivation suite (8 checks) | PASS |

---

## 13. Verification commands

> Run only after the API and its dependencies (Postgres, Redis, RabbitMQ) are running.

```powershell
node --env-file=.env.dev verify_archive_feature.js
node --env-file=.env.dev verify_member_inactivation.js
```

Both scripts create temporary users/projects/tasks, run the scenarios, write captured responses to
`scratch/`, and remove the temporary data at the end.
