# Panduan Implementasi Consumer & Response Activity Logs

Dokumen ini berisi panduan untuk:
1. **Implementasi Listener / Consumer** di Log Server yang menerima event domain dari RabbitMQ, memetakan payload (*mapping*), dan menyimpannya ke tabel `ActivityLogs`.
2. **Step-by-Step Penyesuaian API Backend** agar response Activity Logs mengembalikan username & nama actor serta target yang paling terupdate untuk Front-End.

---

## Bagian 1: Panduan Saving Published Event ke Database (Consumer / Log Server)

Ketika service menerbitkan event via `publishEvent`, service (producer) **murni hanya mengirimkan data domain** (seperti `taskId`, `taskTitle`, `projectId`, `projectName`, `assignedUserId`, `memberUserId`). 

Log Server (consumer) bertugas mendengarkan event dari RabbitMQ dan memetakan data domain tersebut ke kolom-kolom tabel `ActivityLogs` (termasuk memetakan `entityType`, `entityId`, dan `entityTitle`).

### 1. Struktur Message Payload yang Diterima dari Producer

Contoh event dari Task Service:
```json
{
  "id": "event-uuid-12345",
  "type": "task.assigned",
  "actorId": "user-uuid-actor",
  "occurredAt": "2026-08-04T18:00:00.000Z",
  "payload": {
    "taskId": "task-uuid-001",
    "taskTitle": "Fix Login Bug",
    "projectId": "proj-uuid-100",
    "projectName": "Task Management API",
    "assignedUserId": "user-uuid-target"
  }
}
```

Contoh event dari Project Service:
```json
{
  "id": "event-uuid-67890",
  "type": "project.member.added",
  "actorId": "user-uuid-actor",
  "occurredAt": "2026-08-04T18:05:00.000Z",
  "payload": {
    "projectId": "proj-uuid-100",
    "projectName": "Task Management API",
    "memberUserId": "user-uuid-target"
  }
}
```

---

### 2. Logika Mapping di Log Server

Consumer di Log Server memetakan event payload ke tabel `ActivityLogs` menggunakan aturan berikut:

| Field Tabel `ActivityLogs` | Logika Pemetaan di Log Server | Keterangan |
| :--- | :--- | :--- |
| `eventId` | `event.id` | Idempotency Key (Unik) |
| `type` | `event.type` | Nama event (e.g. `task.updated`, `project.created`) |
| `actorId` | `event.actorId` | ID User pemrakarsa |
| `targetUserId` | `payload.assignedUserId \|\| payload.memberUserId \|\| payload.targetUserId \|\| null` | ID User target (opsional) |
| `entityType` | `type.startsWith('project') ? 'project' : 'task'` | Jenis entitas (`project` atau `task`) |
| `entityId` | `type.startsWith('project') ? payload.projectId : payload.taskId` | ID entitas terkait |
| `entityTitle` | `type.startsWith('project') ? payload.projectName : (payload.taskTitle \|\| payload.projectName)` | Snapshot judul entitas saat kejadian |
| `projectId` | `payload.projectId` | ID Project terkait |
| `projectName` | `payload.projectName` | Snapshot nama project saat kejadian |
| `createdAt` | `event.occurredAt` (atau `new Date()`) | Waktu kejadian |

---

### 3. Contoh Implementasi Event Handler (Consumer)

```javascript
import prisma from '../db/db.js';

export async function handleActivityLogEvent(eventMessage) {
  const { id: eventId, type, actorId, occurredAt, payload } = eventMessage;

  // 1. Ekstraksi otomatis entityType, entityId, dan entityTitle di Log Server
  const isProjectEvent = type.startsWith('project.');
  
  const entityType = isProjectEvent ? 'project' : 'task';
  const entityId = isProjectEvent ? payload.projectId : payload.taskId;
  const entityTitle = isProjectEvent ? payload.projectName : (payload.taskTitle || payload.projectName || null);
  
  // 2. Ekstraksi targetUserId jika event melibatkan user lain (misal: assign task / add member)
  const targetUserId = payload.assignedUserId || payload.memberUserId || payload.targetUserId || null;
  
  const projectId = payload.projectId;
  const projectName = payload.projectName || null;

  try {
    // 3. Simpan ke database dengan Idempotency (menggunakan eventId sebagai kunci unik)
    await prisma.activityLogs.upsert({
      where: { eventId },
      update: {}, // Jika eventId sudah pernah diproses, abaikan
      create: {
        eventId,
        type,
        actorId,
        targetUserId,
        entityType,
        entityId,
        entityTitle,
        projectId,
        projectName,
        createdAt: occurredAt ? new Date(occurredAt) : new Date(),
      },
    });
    console.log(`[Log Consumer] Successfully saved event ${eventId} (${type})`);
  } catch (error) {
    console.error(`[Log Consumer] Error saving event ${eventId}:`, error);
    throw error;
  }
}
```

---

## Bagian 2: Step-by-Step Penyesuaian API Backend untuk Response Log Terupdate

Agar Front-End mendapatkan data log yang dinamis dengan **username & name terbaru** dari actor maupun target user, berikut langkah-langkah penyesuaian yang dapat dilakukan pada codebase ini:

### Step 1: Update Repository (`src/modules/activitylog/repository/activityLogRepository.js`)
Tambahkan relasi `actor` dan `targetUser` (dengan memilih field `id`, `name`, `username`) pada Prisma query `findMany`:

```javascript
// Contoh penyesuaian pada findActivityLogsByProjectId:
export const findActivityLogsByProjectId = async ({ projectId, cursor, limit = 20 }) => {
  return prisma.activityLogs.findMany({
    where: { projectId },
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor.id },
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  });
};
```
*(Lakukan hal serupa untuk `findActivityLogsByTaskId` dan `findActivityLogsByUserId`)*.

---

### Step 2: Update Service (`src/modules/activitylog/service/activityLogService.js`)
Ubah mapper format data response agar mengembalikan informasi terstruktur yang mudah diproses Front-End:

```javascript
export const getProjectActivityLogsService = async ({ projectId, cursor, limit = 20 }) => {
  const logs = await findActivityLogsByProjectId({ projectId, cursor: cursor ? decodeCursor(cursor) : null, limit });
  const hasNext = logs.length === limit && logs.length > 0;
  const lastLog = hasNext ? logs[logs.length - 1] : null;

  return {
    data: logs.map((log) => ({
      id: log.id,
      type: log.type,
      createdAt: log.createdAt,
      actor: log.actor ? {
        id: log.actor.id,
        name: log.actor.name,
        username: log.actor.username,
      } : null,
      targetUser: log.targetUser ? {
        id: log.targetUser.id,
        name: log.targetUser.name,
        username: log.targetUser.username,
      } : null,
      entity: {
        id: log.entityId,
        type: log.entityType,
        title: log.entityTitle,
      },
      project: {
        id: log.projectId,
        name: log.projectName,
      },
    })),
    nextCursor: lastLog ? encodeCursor(lastLog) : null,
  };
};
```

---

### Step 3: Contoh Hasil JSON Response API untuk Front-End

Setiap item log akan menghasilkan format JSON seperti berikut:

```json
{
  "status": "success",
  "data": [
    {
      "id": "log-uuid-001",
      "type": "task.assigned",
      "createdAt": "2026-08-04T18:30:00.000Z",
      "actor": {
        "id": "user-uuid-1",
        "name": "Aditya Putra",
        "username": "adityo_new"
      },
      "targetUser": {
        "id": "user-uuid-2",
        "name": "Budi Santoso",
        "username": "budi_s"
      },
      "entity": {
        "id": "task-uuid-99",
        "type": "task",
        "title": "Fix Authentication Bug"
      },
      "project": {
        "id": "proj-uuid-10",
        "name": "Task Management API"
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTA0VDE4OjMwOjAwLjAwMFoiLCJpZCI6ImxvZy11dWlkLTAwMSJ9"
  }
}
```

#### Keunggulan Struktur Ini untuk Front-End:
- **Real-Time Profile Data**: Nama (`name`) dan username (`username`) actor & target senantiasa merefleksikan data profil terbaru di tabel `Users`.
- **Safe Historical Record**: Field `entity.title` dan `project.name` aman digunakan untuk membuat kalimat aktivitas (misal: *"Aditya Putra menugaskan Fix Authentication Bug kepada Budi Santoso"*) meskipun task atau project tersebut nantinya sudah dihapus.
