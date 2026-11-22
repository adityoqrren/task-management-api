# Archive / Restore API Guide (Verified)

> **Verification status:** re-verified against the running development API on **2026-11-17**.
> Automated suite result: **14/14 checks passed**, including scenarios A–E from
> `planning/scenario/add-archive-feature-scenario.md`.
>
> The requests and responses below are real captured output from those runs. Test users and
> projects were removed by the verification script afterwards, so the UUIDs below are
> historical examples.
>
> Implementation plans: `planning/add-archive-feature-plan.md`,
> `planning/archive-member-inactivation-plan.md`.
> Verification scripts: `verify_archive_feature.js`, `verify_member_inactivation.js`
> (gitignored, local only).

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

## 1. Project archive

### `PATCH /api/projects/:id/archive`

**Permission:** project `LEADER`.

**Request body:** none.

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
    "projectId": "7e819be9-fc68-4910-9d9e-bc5287e1bffd",
    "archivedAt": "2026-11-09T16:15:50.139Z"
  }
}
```

---

## 2. Project unarchive

### `PATCH /api/projects/:id/unarchive`

**Permission:** project `LEADER`.

**Request body:** none.

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
    "projectId": "7e819be9-fc68-4910-9d9e-bc5287e1bffd",
    "archivedAt": null
  }
}
```

---

## 3. Project soft delete (existing, now transactional)

### `PATCH /api/projects/:id/soft-delete`

**Permission:** project `LEADER`.

**Request body:** none.

```bash
curl -X PATCH "http://localhost:3000/api/projects/<project-id>/soft-delete" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "project has been soft deleted"
}
```

---

## 4. Project restore from Trash (existing, now transactional)

### `PATCH /api/projects/:id/restore`

**Permission:** project `LEADER`.

**Request body:** none.

```bash
curl -X PATCH "http://localhost:3000/api/projects/<project-id>/restore" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "project has been restored"
}
```

---

## 5. Project detail

### `GET /api/projects/:id`

**Permission:** any active project member (`LEADER` or `MEMBER`).

Returns the project detail, including `archivedAt` and `deletedAt`, so the client can tell
whether the project is archived.

**Request body:** none.

```bash
curl "http://localhost:3000/api/projects/<project-id>" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK (active project):**

```json
{
  "status": "success",
  "data": {
    "owner": "c1a3adae-acef-4280-9c18-5b69cc623180",
    "projectId": "c3df00ed-8d6a-4641-9307-26f4b13434b2",
    "name": "Project Detail 34332595",
    "description": null,
    "createdAt": "2026-11-17T16:52:17.590Z",
    "updatedAt": "2026-11-17T16:52:17.590Z",
    "lastActivityAt": "2026-11-17T16:52:17.590Z",
    "archivedAt": null,
    "deletedAt": null
  }
}
```

**Verified response — 200 OK (archived project):**

```json
{
  "status": "success",
  "data": {
    "owner": "c1a3adae-acef-4280-9c18-5b69cc623180",
    "projectId": "c3df00ed-8d6a-4641-9307-26f4b13434b2",
    "name": "Project Detail 34332595",
    "description": null,
    "createdAt": "2026-11-17T16:52:17.590Z",
    "updatedAt": "2026-11-17T16:52:17.619Z",
    "lastActivityAt": "2026-11-17T16:52:17.618Z",
    "archivedAt": "2026-11-17T16:52:17.618Z",
    "deletedAt": null
  }
}
```

This endpoint filters out soft-deleted projects: fetching a deleted project returns `404`.
Use `GET /api/projects/all/:id` (project owner only) when you need the detail of a deleted
project.

---

## 6. Task manual archive

### `PATCH /api/tasks/:taskId/archive`

**Permission:** project `LEADER`.

**Request body:** none.

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
    "taskId": "3036efa4-9574-453e-96b2-20edbfd13052",
    "archivedAt": "2026-11-09T16:15:50.098Z",
    "archiveSource": "MANUAL"
  }
}
```

---

## 7. Task manual unarchive

### `PATCH /api/tasks/:taskId/unarchive`

**Permission:** project `LEADER`.

```bash
curl -X PATCH "http://localhost:3000/api/tasks/<task-id>/unarchive" \
  -H "Authorization: Bearer <access-token>"
```

**DONE task with an inactive assignee:** no confirmation is required. The assignee is preserved as
a historical record.

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

**Legacy non-DONE task with an inactive assignee:** confirmation is still required before the
assignment is released.

**Request body:**

```json
{
  "confirmAssigneeRemoval": true
}
```

**Verified error — 400 Bad Request when confirmation is missing:**

```json
{
  "status": "fail",
  "message": "ASSIGNEE_INACTIVE_CONFIRMATION_REQUIRED"
}
```

**Verified response — 200 OK after confirmation (assignee cleared):**

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

> See the full verified member-inactivation and archive-relation guide:
> `docs/archive-member-inactivation-api-guide.md`.

---

## 8. Task soft delete (existing, now sets deleteSource)

### `PATCH /api/tasks/:taskId/soft-delete`

**Permission:** project `LEADER`.

**Request body:** none.

```bash
curl -X PATCH "http://localhost:3000/api/tasks/<task-id>/soft-delete" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "message": "task success deleted"
}
```

This works both for an active task and for an archived task while its parent project is
active. Archive fields are preserved.

---

## 9. Task restore from Trash (existing, new project-state guard)

### `PATCH /api/tasks/restore/:taskId`

**Permission:** project `LEADER`.

**Request body:** none.

```bash
curl -X PATCH "http://localhost:3000/api/tasks/restore/<task-id>" \
  -H "Authorization: Bearer <access-token>"
```

**Verified response — 200 OK (task was archived before deletion):**

```json
{
  "status": "success",
  "message": "success restoring deleted task",
  "data": {
    "id": "2061c722-2b6e-466d-bf80-933ece1a338f",
    "title": "Scenario D Task 40949178",
    "description": "",
    "completed": false,
    "status": "TODO",
    "assigneeId": null,
    "projectId": "621053cc-a57b-4a22-8c0d-86bef1b8ea7f",
    "priority": "MEDIUM",
    "startDate": "2026-11-09T16:15:50.351Z",
    "dueDate": null,
    "createdAt": "2026-11-09T16:15:50.362Z",
    "updatedAt": "2026-11-09T16:15:50.592Z",
    "archivedAt": "2026-11-09T16:15:50.413Z",
    "archiveSource": "MANUAL",
    "deletedAt": null,
    "deleteSource": null,
    "taskAttachments": [],
    "assignee": null,
    "project": {
      "name": "Archive Scenario D 40949178",
      "owner": "ff5af849-55d9-4c0f-9ef4-8e40a44fdc2d"
    }
  }
}
```

**Verified error — 403 Forbidden when the parent project is archived:**

```json
{
  "status": "fail",
  "message": "PROJECT_ARCHIVED: restore the project before restoring this task"
}
```

---

## 10. List filters

The `status` query parameter on the project list and both task lists supports four
lifecycle states.

**Project-scoped task list (`GET /api/projects/:id/tasks`):**

- `active` — `deletedAt = null` AND (`archiveSource = null` OR `archiveSource != MANUAL`).
  Tasks archived only because their parent project was archived (`archiveSource = PROJECT`)
  are treated as **active**.
- `archived` — `deletedAt = null` AND `archiveSource = MANUAL`. Only manually archived
  tasks appear here.
- `deleted` — `deletedAt != null`.
- `all` — no lifecycle filter.

**My Tasks (`GET /api/tasks/me`):**

- Uses the same lifecycle rules as above, **plus** `project.archivedAt = null`.
  This means tasks from an archived project never appear in `/tasks/me`, in any status.
- `/tasks/me` also only contains tasks assigned to the current user.

**Counts (`GET /api/tasks/me/counts`) and dashboard statistics:**

- Stay based on `archivedAt = null` and `deletedAt = null`, i.e. **actionable active work**.
- They intentionally do not include PROJECT-archived tasks, so counts can be smaller than
  the `active` list total.

### `GET /api/projects?status=archived`

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": [
    {
      "projectId": "a34dd39e-99a6-4a73-b9e3-52e525c4c558",
      "name": "Archive Readonly 15094297",
      "description": null,
      "role": "LEADER",
      "createdAt": "2026-11-11T16:38:16.038Z",
      "updatedAt": "2026-11-11T16:38:16.219Z",
      "lastActivityAt": "2026-11-11T16:38:16.218Z",
      "archivedAt": "2026-11-11T16:38:16.218Z",
      "deletedAt": null
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

### `GET /api/projects?status=deleted`

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": [
    {
      "projectId": "33e9c3fa-02a3-4957-8ae5-7893e56b00c4",
      "name": "Archive Scenario A 15094297",
      "description": null,
      "role": "LEADER",
      "createdAt": "2026-11-11T16:38:14.764Z",
      "updatedAt": "2026-11-11T16:38:14.897Z",
      "lastActivityAt": "2026-11-11T16:38:14.895Z",
      "archivedAt": null,
      "deletedAt": "2026-11-11T16:38:14.895Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

### `GET /api/projects/:id/tasks?status=archived`

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": [
    {
      "taskId": "e3c0b4c0-6639-4255-ba58-d1eabe69d175",
      "projectId": "665dc3d9-360a-4b55-bc4b-1da5fb6a97b9",
      "project": {
        "id": "665dc3d9-360a-4b55-bc4b-1da5fb6a97b9",
        "name": "Archive Lists 40949178"
      },
      "title": "List Archived 40949178",
      "description": "",
      "picId": null,
      "completed": false,
      "status": "TODO",
      "priority": "MEDIUM",
      "startDate": "2026-11-09T16:15:52.157Z",
      "dueDate": null,
      "archivedAt": "2026-11-09T16:15:52.265Z",
      "archiveSource": "MANUAL",
      "deletedAt": null,
      "deleteSource": null
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

### `GET /api/projects/:id/tasks?status=deleted`

**Verified response — 200 OK:**

```json
{
  "status": "success",
  "data": [
    {
      "taskId": "b2454a0e-29c6-4ca5-aee3-b514b5427636",
      "projectId": "665dc3d9-360a-4b55-bc4b-1da5fb6a97b9",
      "project": {
        "id": "665dc3d9-360a-4b55-bc4b-1da5fb6a97b9",
        "name": "Archive Lists 40949178"
      },
      "title": "List Deleted 40949178",
      "description": "",
      "picId": null,
      "completed": false,
      "status": "TODO",
      "priority": "MEDIUM",
      "startDate": "2026-11-09T16:15:52.205Z",
      "dueDate": null,
      "archivedAt": null,
      "archiveSource": null,
      "deletedAt": "2026-11-09T16:15:52.307Z",
      "deleteSource": "MANUAL"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

### `GET /api/projects/:id/tasks?status=all`

**Verified response — 200 OK (returns all three lifecycle states):**

```json
{
  "status": "success",
  "data": [
    {
      "taskId": "b2454a0e-29c6-4ca5-aee3-b514b5427636",
      "title": "List Deleted 40949178",
      "archivedAt": null,
      "archiveSource": null,
      "deletedAt": "2026-11-09T16:15:52.307Z",
      "deleteSource": "MANUAL"
    },
    {
      "taskId": "e3c0b4c0-6639-4255-ba58-d1eabe69d175",
      "title": "List Archived 40949178",
      "archivedAt": "2026-11-09T16:15:52.265Z",
      "archiveSource": "MANUAL",
      "deletedAt": null,
      "deleteSource": null
    },
    {
      "taskId": "bd613dbe-c969-4921-be11-e54644a6088a",
      "title": "List Active 40949178",
      "archivedAt": null,
      "archiveSource": null,
      "deletedAt": null,
      "deleteSource": null
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

> The `all` example above is abbreviated to the lifecycle fields for readability; the real
> response also contains the same task fields shown in the other list examples.

### `GET /api/projects/:id/tasks?status=active` on an archived project

A task archived only because its project was archived (`archiveSource = PROJECT`) is
returned as **active**:

```json
{
  "status": "success",
  "data": [
    {
      "taskId": "31ed7058-3152-4063-befe-a26b34de7dd2",
      "projectId": "5159f40a-ee82-418f-ad5c-278d7808d8f1",
      "project": {
        "id": "5159f40a-ee82-418f-ad5c-278d7808d8f1",
        "name": "My Tasks Archived 67727923"
      },
      "title": "M2 Project Archived 67727923",
      "description": "",
      "picId": "66e07c7b-a342-45eb-ad37-8ce1d27233cb",
      "completed": false,
      "status": "TODO",
      "priority": "MEDIUM",
      "startDate": "2026-11-13T11:02:13.173Z",
      "dueDate": null,
      "archivedAt": "2026-11-13T11:02:13.930Z",
      "archiveSource": "PROJECT",
      "deletedAt": null,
      "deleteSource": null
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

The same project's `status=archived` list contains only the manually archived task:

```json
{
  "status": "success",
  "data": [
    {
      "taskId": "f0366190-4f1e-4b75-82fb-c82289535b2c",
      "title": "M2 Manual 67727923",
      "archivedAt": "2026-11-13T11:02:13.828Z",
      "archiveSource": "MANUAL",
      "deletedAt": null,
      "deleteSource": null
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

### `GET /api/tasks/me?status=active`

Only tasks from non-archived projects appear. The PROJECT-archived task above is absent:

```json
{
  "status": "success",
  "data": [
    {
      "taskId": "8256679f-1c02-4b55-9030-586a1a333412",
      "projectId": "0899d9c9-7d43-4e80-892d-e793cdf50f30",
      "project": {
        "id": "0899d9c9-7d43-4e80-892d-e793cdf50f30",
        "name": "My Tasks Active 67727923"
      },
      "title": "M1 Active 67727923",
      "picId": "55183d35-9457-4b77-a88b-bd3ec9ad7c4f",
      "completed": false,
      "status": "TODO",
      "priority": "MEDIUM",
      "archivedAt": null,
      "archiveSource": null,
      "deletedAt": null,
      "deleteSource": null
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

### `GET /api/tasks/me?status=archived`

Shows the manually archived task from the active project. The manually archived task from
the archived project is excluded:

```json
{
  "status": "success",
  "data": [
    {
      "taskId": "1a5f174c-c0ba-4ea2-b71e-790eca6c8349",
      "projectId": "0899d9c9-7d43-4e80-892d-e793cdf50f30",
      "project": {
        "id": "0899d9c9-7d43-4e80-892d-e793cdf50f30",
        "name": "My Tasks Active 67727923"
      },
      "title": "M1 Manual 67727923",
      "archiveSource": "MANUAL",
      "archivedAt": "2026-11-13T11:02:13.014Z",
      "deletedAt": null,
      "deleteSource": null
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

### `GET /api/tasks/me/counts`

Counts represent actionable active work only. PROJECT-archived tasks are excluded even
though they appear in the active list:

```json
{
  "status": "success",
  "counts": {
    "all": 1,
    "todo": 1,
    "inProgress": 0,
    "dueSoon": 0,
    "overdue": 0,
    "done": 0
  }
}
```

### Sorting by `archivedAt` and `deletedAt`

Both task list endpoints accept:

- `GET /api/projects/:id/tasks?sortBy=archivedAt&order=asc|desc`
- `GET /api/projects/:id/tasks?sortBy=deletedAt&order=asc|desc`
- `GET /api/tasks/me?sortBy=archivedAt&order=asc|desc`
- `GET /api/tasks/me?sortBy=deletedAt&order=asc|desc`

Verified order for `GET /api/projects/:id/tasks?status=archived&sortBy=archivedAt&order=asc`
(the tasks were archived in the order 2, 1, 3):

```text
Sort Archived 2 — archivedAt 2026-11-13T17:55:24.588Z
Sort Archived 1 — archivedAt 2026-11-13T17:55:24.665Z
Sort Archived 3 — archivedAt 2026-11-13T17:55:24.727Z
```

Verified order for `GET /api/projects/:id/tasks?status=deleted&sortBy=deletedAt&order=desc`
(the tasks were deleted in the order 3, 1, 2):

```text
Sort Deleted 2 — deletedAt 2026-11-13T17:55:25.494Z
Sort Deleted 1 — deletedAt 2026-11-13T17:55:25.423Z
Sort Deleted 3 — deletedAt 2026-11-13T17:55:25.341Z
```

The same ordering was verified on `GET /api/tasks/me`.

---

## 11. Verified behaviour matrix

| Check | Result |
|---|---|
| Scenario A — manual delete survives project delete/restore | PASS |
| Scenario B — project-deleted task restored with project | PASS |
| Scenario C — archived project delete/restore then unarchive | PASS |
| Scenario D — manual archive survives project delete/restore | PASS |
| Scenario E — archive state cleared without touching delete state | PASS |
| Archived project is read-only and viewable | PASS |
| Archived task is read-only, deletable and restorable | PASS |
| DONE task with inactive assignee keeps assignee through archive and unarchive | PASS |
| Legacy non-DONE inactive assignee requires confirmation on unarchive | PASS |
| Member cannot archive project or task | PASS |
| My Tasks excludes archived projects; project list treats PROJECT archive as active | PASS |
| Project detail exposes archive state | PASS |
| Sorting by archivedAt and deletedAt on both task list endpoints | PASS |
| List filters distinguish active/archived/deleted/all | PASS |

---

## 12. Verification commands

> Run these only after the API and its dependencies (Postgres, Redis, RabbitMQ) are running.

```powershell
node --env-file=.env.dev verify_archive_feature.js
```

The script creates temporary users/projects/tasks, runs all scenarios, captures responses,
and removes the temporary data at the end.
