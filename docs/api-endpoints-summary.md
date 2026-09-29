# API Endpoints Summary (Verified Outputs)

This document provides a summary of the newly added/modified endpoints along with actual, verified input payloads and output responses from the test environment.

---

## 1. Project Retrieval with Description Field

Existing project retrieval endpoints have been updated to return the recently added `description` field.

### POST /api/projects (Create Project)
* **Headers**: `Authorization: Bearer <token>`
* **Input Payload**:
```json
{
  "name": "Stats & Recent Project",
  "description": "Real verified description"
}
```
* **Verified Response (201 Created)**:
```json
{
  "status": "success",
  "message": "project has been created",
  "data": {
    "projectId": "dc135aa4-7618-4a23-9a8e-235289143b8e",
    "name": "Stats & Recent Project",
    "description": "Real verified description"
  }
}
```

### GET /api/projects (List Projects)
* **Headers**: `Authorization: Bearer <token>`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "data": [
    {
      "projectId": "dc135aa4-7618-4a23-9a8e-235289143b8e",
      "name": "Stats & Recent Project",
      "description": "Real verified description",
      "role": "LEADER",
      "createdAt": "2026-06-22T14:07:27.393Z",
      "updatedAt": "2026-06-22T14:07:27.393Z"
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

### GET /api/projects/:id (Get Project Details)
* **Headers**: `Authorization: Bearer <token>`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "owner": "e93da8f1-8e32-4780-81b0-a639c6caee69",
    "projectId": "dc135aa4-7618-4a23-9a8e-235289143b8e",
    "name": "Stats & Recent Project",
    "description": "Real verified description",
    "createdAt": "2026-06-22T14:07:27.393Z",
    "updatedAt": "2026-06-22T14:07:27.393Z"
  }
}
```

---

## 2. Project Statistics

### GET /api/projects/:id/statistics
Returns the counts of active tasks in a project grouped by status (`TODO`, `IN_PROGRESS`, `DONE`).

* **Headers**: `Authorization: Bearer <token>`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "projectId": "dc135aa4-7618-4a23-9a8e-235289143b8e",
  "statistics": {
    "totalTasks": 3,
    "todo": 1,
    "inProgress": 1,
    "done": 1
  }
}
```

---

## 3. Recent Tasks

### GET /api/projects/:id/tasks/recent?limit=n
Returns the last `n` active tasks in a project, ordered by `updatedAt` descending.

* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**: `limit=2`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "totalRecent": 2,
  "data": [
    {
      "taskId": "70aeded6-98a9-4300-8e64-f6ba6531d716",
      "projectId": "dc135aa4-7618-4a23-9a8e-235289143b8e",
      "project": {
        "id": "dc135aa4-7618-4a23-9a8e-235289143b8e",
        "name": "Stats & Recent Project"
      },
      "title": "Real Task One Updated",
      "description": "",
      "picId": null,
      "completed": false,
      "status": "TODO",
      "priority": "MEDIUM",
      "startDate": "2026-06-22T14:07:27.447Z",
      "dueDate": null
    },
    {
      "taskId": "13847b0b-7b23-4153-868c-059b1265c1ab",
      "projectId": "dc135aa4-7618-4a23-9a8e-235289143b8e",
      "project": {
        "id": "dc135aa4-7618-4a23-9a8e-235289143b8e",
        "name": "Stats & Recent Project"
      },
      "title": "Real Task Three",
      "description": "",
      "picId": null,
      "completed": true,
      "status": "DONE",
      "priority": "MEDIUM",
      "startDate": "2026-06-22T14:07:27.516Z",
      "dueDate": null
    }
  ]
}
```

---

## 4. Dashboard Statistics

### GET /api/dashboard/statistics
Returns summary statistics for the currently authenticated user, including the number of active projects, assigned uncompleted tasks, tasks due soon (within 3 days), and overdue tasks.

* **Headers**: `Authorization: Bearer <token>`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "statistics": {
    "projects": 1,
    "assignedTasks": 3,
    "dueSoon": 1,
    "overdue": 1
  }
}
```

---

## 5. Task Due Date Filtering

Allows filtering task lists based on due date criteria (`dueSoon` or `overdue`).
- `dueSoon`: Tasks with a due date within 3 days from now, but not in the past (`dueDate >= now` AND `dueDate <= now + 3 days`).
- `overdue`: Tasks where the due date has already passed (`dueDate < now`).

### GET /api/tasks/me?dueFilter=dueSoon
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**: `dueFilter=dueSoon`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "data": [
    {
      "taskId": "b91ff301-5fc5-4c2e-bfd7-3adcc13def58",
      "projectId": "3b9e846a-d60e-460a-a5b1-2677d4c803db",
      "project": {
        "id": "3b9e846a-d60e-460a-a5b1-2677d4c803db",
        "name": "Due Filter Project"
      },
      "title": "Task C",
      "description": "",
      "picId": "7ffeed0f-c734-4034-8b1e-50d5c884e3f7",
      "completed": false,
      "status": "TODO",
      "priority": "MEDIUM",
      "startDate": "2026-06-28T10:42:38.000Z",
      "dueDate": "2026-06-30T10:42:38.000Z"
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

### GET /api/projects/:id/tasks?dueFilter=overdue
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**: `dueFilter=overdue`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "data": [
    {
      "taskId": "18f8e4e9-e33a-4e78-a83d-3b7c9ad1d0b1",
      "projectId": "3b9e846a-d60e-460a-a5b1-2677d4c803db",
      "project": {
        "id": "3b9e846a-d60e-460a-a5b1-2677d4c803db",
        "name": "Due Filter Project"
      },
      "title": "Task A",
      "description": "",
      "picId": "7ffeed0f-c734-4034-8b1e-50d5c884e3f7",
      "completed": false,
      "status": "TODO",
      "priority": "MEDIUM",
      "startDate": "2026-06-28T10:42:38.000Z",
      "dueDate": "2026-06-23T10:42:38.000Z"
    },
    {
      "taskId": "e458319a-9e73-4530-8bb1-21c64d85e78a",
      "projectId": "3b9e846a-d60e-460a-a5b1-2677d4c803db",
      "project": {
        "id": "3b9e846a-d60e-460a-a5b1-2677d4c803db",
        "name": "Due Filter Project"
      },
      "title": "Task B",
      "description": "",
      "picId": "7ffeed0f-c734-4034-8b1e-50d5c884e3f7",
      "completed": false,
      "status": "TODO",
      "priority": "MEDIUM",
      "startDate": "2026-06-28T10:42:38.000Z",
      "dueDate": "2026-06-28T09:42:38.000Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

---

## 6. Task Counts for Authenticated User

### GET /api/tasks/me/counts
Returns summary metrics for all active tasks assigned to the currently authenticated user (`deletedAt: null`).

* **Headers**: `Authorization: Bearer <token>`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "counts": {
    "all": 4,
    "todo": 2,
    "inProgress": 1,
    "dueSoon": 1,
    "overdue": 1,
    "done": 1
  }
}
```

---

## 7. Project lastActivityAt Tracking and Sorting

### GET /api/projects?sortBy=lastActivityAt&order=desc
Returns projects sorted by their latest activity timestamp (`lastActivityAt`), which is automatically updated upon mutations to the project, its members, or its tasks.

* **Headers**: `Authorization: Bearer <token>`
* **Verified Response (200 OK)**:
```json
{
  "status": "success",
  "data": [
    {
      "projectId": "66f3606e-e9da-4623-a751-6cdf39330844",
      "name": "Project Alpha",
      "description": null,
      "role": "LEADER",
      "createdAt": "2026-06-28T16:02:19.026Z",
      "updatedAt": "2026-06-28T16:02:22.106Z",
      "lastActivityAt": "2026-06-28T16:02:22.104Z"
    },
    {
      "projectId": "e4c5490f-ad50-4640-a715-e0d04474a03f",
      "name": "Project Beta",
      "description": null,
      "role": "LEADER",
      "createdAt": "2026-06-28T16:02:20.556Z",
      "updatedAt": "2026-06-28T16:02:20.556Z",
      "lastActivityAt": "2026-06-28T16:02:20.556Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "totalPages": 1,
    "limit": 0,
    "hasPrev": false,
    "hasNext": false
  }
}
```

