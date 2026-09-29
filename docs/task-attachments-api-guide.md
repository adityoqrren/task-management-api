# Task Attachments API Guide

This guide summarizes the Task Attachments feature, supporting image and file uploads for tasks, filtering attachments by type, and deleting attachments.

---

## Endpoint Summary

| Method | Endpoint | Description | Guard / Role | Body / Query |
|---|---|---|---|---|
| `POST` | `/api/tasks/:taskId/attachments/images` | Upload image attachment (JPEG, PNG, WEBP max 2MB) | `LEADER`, `MEMBER` | `multipart/form-data`: `file`, optional `fileName` |
| `POST` | `/api/tasks/:taskId/attachments/files` | Upload file attachment (PDF, DOC/DOCX, XLS/XLSX, CSV, TXT max 10MB) | `LEADER`, `MEMBER` | `multipart/form-data`: `file`, optional `fileName` |
| `GET` | `/api/tasks/:taskId/attachments?type=all\|image\|file` | Get task attachments (filtered by type; default `all`) | `LEADER`, `MEMBER` | Query: `type` (`all`, `image`, `file`) |
| `DELETE` | `/api/tasks/:taskId/attachments/:attachmentId` | Delete task attachment | `LEADER`, `MEMBER` | Path: `taskId`, `attachmentId` |
| `GET` | `/api/tasks/:taskId` | Get task details including `taskAttachments` array | `LEADER`, `MEMBER` | Path: `taskId` |

---

## Verified Endpoint Examples

### 1. Upload Image Attachment (`POST /api/tasks/:taskId/attachments/images`)
**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: `sample_screenshot.png` (binary, max 2MB)
- `fileName`: `"Sample Screenshot PNG"`

**Response (HTTP 201 Created):**
```json
{
  "status": "success",
  "message": "Task attachment uploaded successfully",
  "data": {
    "id": "a130a3dd-d01c-4764-8658-a9d0d11091eb",
    "taskId": "fcd8f01c-ad80-4453-a27d-cfc873eb301d",
    "userId": "39c42c55-f853-4cad-9a01-682f8165c169",
    "projectId": "9a9704b0-8b54-4a6e-9192-c802eb8dec20",
    "taskTitle": "Task with Attachments",
    "fileName": "Sample Screenshot PNG",
    "mimeType": "image/png",
    "size": 30,
    "fileUrl": "https://task-management-files.example.com/uploads/1787242645812_ouqsq8.png?X-Amz-Algorithm=...",
    "createdAt": "2026-08-20T16:17:27.704Z",
    "updatedAt": "2026-08-20T16:17:27.704Z"
  }
}
```

---

### 2. Upload Document File Attachment (`POST /api/tasks/:taskId/attachments/files`)
**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: `project_report.pdf` (binary, max 10MB)
- `fileName`: `"Project Report PDF"`

**Response (HTTP 201 Created):**
```json
{
  "status": "success",
  "message": "Task attachment uploaded successfully",
  "data": {
    "id": "19d6c6bb-9aab-4369-92c5-89d9b54136a8",
    "taskId": "fcd8f01c-ad80-4453-a27d-cfc873eb301d",
    "userId": "39c42c55-f853-4cad-9a01-682f8165c169",
    "projectId": "9a9704b0-8b54-4a6e-9192-c802eb8dec20",
    "taskTitle": "Task with Attachments",
    "fileName": "Project Report PDF",
    "mimeType": "application/pdf",
    "size": 25,
    "fileUrl": "https://task-management-files.example.com/uploads/1787242647725_588bzw.pdf?X-Amz-Algorithm=...",
    "createdAt": "2026-08-20T16:17:27.940Z",
    "updatedAt": "2026-08-20T16:17:27.940Z"
  }
}
```

---

### 3. Get Task Attachments (`GET /api/tasks/:taskId/attachments?type=all|image|file`)
**Headers:**
- `Authorization: Bearer <access_token>`

#### Example A: `type=all` (Default)
`GET /api/tasks/fcd8f01c-ad80-4453-a27d-cfc873eb301d/attachments?type=all`

**Response (HTTP 200 OK):**
```json
{
  "status": "success",
  "message": "Task attachments retrieved successfully",
  "data": [
    {
      "id": "19d6c6bb-9aab-4369-92c5-89d9b54136a8",
      "taskId": "fcd8f01c-ad80-4453-a27d-cfc873eb301d",
      "userId": "39c42c55-f853-4cad-9a01-682f8165c169",
      "fileName": "Project Report PDF",
      "mimeType": "application/pdf",
      "size": 25,
      "createdAt": "2026-08-20T16:17:27.940Z",
      "updatedAt": "2026-08-20T16:17:27.940Z",
      "fileUrl": "https://task-management-files.example.com/uploads/1787242647725_588bzw.pdf?X-Amz-Algorithm=..."
    },
    {
      "id": "a130a3dd-d01c-4764-8658-a9d0d11091eb",
      "taskId": "fcd8f01c-ad80-4453-a27d-cfc873eb301d",
      "userId": "39c42c55-f853-4cad-9a01-682f8165c169",
      "fileName": "Sample Screenshot PNG",
      "mimeType": "image/png",
      "size": 30,
      "createdAt": "2026-08-20T16:17:27.704Z",
      "updatedAt": "2026-08-20T16:17:27.704Z",
      "fileUrl": "https://task-management-files.example.com/uploads/1787242645812_ouqsq8.png?X-Amz-Algorithm=..."
    }
  ]
}
```

#### Example B: `type=image`
`GET /api/tasks/fcd8f01c-ad80-4453-a27d-cfc873eb301d/attachments?type=image`

**Response (HTTP 200 OK):**
```json
{
  "status": "success",
  "message": "Task attachments retrieved successfully",
  "data": [
    {
      "id": "a130a3dd-d01c-4764-8658-a9d0d11091eb",
      "taskId": "fcd8f01c-ad80-4453-a27d-cfc873eb301d",
      "userId": "39c42c55-f853-4cad-9a01-682f8165c169",
      "fileName": "Sample Screenshot PNG",
      "mimeType": "image/png",
      "size": 30,
      "createdAt": "2026-08-20T16:17:27.704Z",
      "updatedAt": "2026-08-20T16:17:27.704Z",
      "fileUrl": "https://task-management-files.example.com/uploads/1787242645812_ouqsq8.png?X-Amz-Algorithm=..."
    }
  ]
}
```

#### Example C: `type=file`
`GET /api/tasks/fcd8f01c-ad80-4453-a27d-cfc873eb301d/attachments?type=file`

**Response (HTTP 200 OK):**
```json
{
  "status": "success",
  "message": "Task attachments retrieved successfully",
  "data": [
    {
      "id": "19d6c6bb-9aab-4369-92c5-89d9b54136a8",
      "taskId": "fcd8f01c-ad80-4453-a27d-cfc873eb301d",
      "userId": "39c42c55-f853-4cad-9a01-682f8165c169",
      "fileName": "Project Report PDF",
      "mimeType": "application/pdf",
      "size": 25,
      "createdAt": "2026-08-20T16:17:27.940Z",
      "updatedAt": "2026-08-20T16:17:27.940Z",
      "fileUrl": "https://task-management-files.example.com/uploads/1787242647725_588bzw.pdf?X-Amz-Algorithm=..."
    }
  ]
}
```

---

### 4. Delete Attachment (`DELETE /api/tasks/:taskId/attachments/:attachmentId`)
**Headers:**
- `Authorization: Bearer <access_token>`

**Response (HTTP 200 OK):**
```json
{
  "status": "success",
  "message": "Task attachment deleted successfully"
}
```

---

### 5. Get Task Detail (`GET /api/tasks/:taskId?includeAttachments=true`)
**Query Parameters:**
- `includeAttachments` (boolean, optional, default: `false`): Set to `true` or use `include=attachments` to include attachment list with presigned URLs.

#### Default Response (HTTP 200 OK, `includeAttachments=false`):
```json
{
  "status": "success",
  "data": {
    "taskId": "8cbb2ae5-0927-4508-8485-9a2be796208e",
    "projectId": "5b26eaaa-d02c-4114-a60c-31b767336e43",
    "project": {
      "id": "5b26eaaa-d02c-4114-a60c-31b767336e43",
      "name": "Attachment Test Project"
    },
    "title": "Task with Attachments",
    "description": "",
    "picId": null,
    "completed": false,
    "status": "TODO",
    "priority": "MEDIUM",
    "startDate": "2026-08-20T16:32:16.334Z",
    "dueDate": null,
    "createdAt": "2026-08-20T16:32:16.348Z",
    "updatedAt": "2026-08-20T16:32:16.348Z",
    "deletedAt": null,
    "assignee": null
  }
}
```

#### Response with Attachments (HTTP 200 OK, `GET /api/tasks/:taskId?includeAttachments=true`):
```json
{
  "status": "success",
  "data": {
    "taskId": "8cbb2ae5-0927-4508-8485-9a2be796208e",
    "projectId": "5b26eaaa-d02c-4114-a60c-31b767336e43",
    "project": {
      "id": "5b26eaaa-d02c-4114-a60c-31b767336e43",
      "name": "Attachment Test Project"
    },
    "title": "Task with Attachments",
    "description": "",
    "picId": null,
    "completed": false,
    "status": "TODO",
    "priority": "MEDIUM",
    "startDate": "2026-08-20T16:32:16.334Z",
    "dueDate": null,
    "createdAt": "2026-08-20T16:32:16.348Z",
    "updatedAt": "2026-08-20T16:32:16.348Z",
    "deletedAt": null,
    "taskAttachments": [
      {
        "id": "033fcf73-31bc-47fe-8394-4d222d127fc8",
        "taskId": "8cbb2ae5-0927-4508-8485-9a2be796208e",
        "userId": "f6999cc0-23a4-49a8-9812-9f2151c07d66",
        "fileName": "Sample Screenshot PNG",
        "mimeType": "image/png",
        "size": 30,
        "createdAt": "2026-08-20T16:32:16.785Z",
        "updatedAt": "2026-08-20T16:32:16.785Z",
        "fileUrl": "https://task-management-files.example.com/uploads/1787243536401_0weem5.png?X-Amz-Algorithm=..."
      }
    ],
    "assignee": null
  }
}
```
