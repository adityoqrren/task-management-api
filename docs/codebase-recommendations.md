# Codebase Analysis & Future Improvement Recommendations

This document outlines key findings from analyzing the codebase and testing endpoints, highlighting critical bugs, architectural recommendations, and testing improvements.

---

## 1. Critical Bugs & Stability Issues

### 🚨 Potential Crash in Task Status Middleware (`checkProjectRoleForUpdateStatusTask`)
* **File:** `src/shared/middlewares/checkProjectRole.js` (Line 107)
* **Issue:** 
  ```javascript
  if (member.role == "MEMBER" && userId != task.assignee.userId) { ... }
  ```
  If a task is unassigned, `task.assignee` is `null`. Accessing `task.assignee.userId` will throw a `TypeError: Cannot read properties of null (reading 'userId')` and result in a 500 Internal Server Error instead of a proper validation response.
* **Recommendation:** Use optional chaining to safely read the assignee's ID:
  ```javascript
  if (member.role == "MEMBER" && userId !== task.assignee?.userId) { ... }
  ```

### 🚨 Broken Bulk Operations in Task Repository (`taskRepository.js`)
* **File:** `src/modules/task/repository/taskRepository.js` (Lines 253 and 267)
* **Issue:**
  ```javascript
  export const bulkSoftDeleteTasks = async (userId, taskIds) => {
    return await prisma.task.updateMany({ ... });
  };
  ```
  The Prisma model is defined as `Tasks` (plural), and other parts of the repository correctly call `prisma.tasks`. Calling `prisma.task` (singular) is undefined and will throw an error when bulk soft-delete or bulk complete operations are executed.
* **Recommendation:** Change `prisma.task.updateMany` to `prisma.tasks.updateMany` in both `bulkSoftDeleteTasks` and `bulkMarkTasksCompleted`.

### 🚨 Hardcoded Credentials in RabbitMQ Initialization (`queueService.js`)
* **File:** `src/queue/queueService.js` (Line 7)
* **Issue:** The RabbitMQ connection string `amqp://admin:admin@localhost:5672` is hardcoded. This exposes configuration details and credentials in the codebase, making environment-specific deployment difficult.
* **Recommendation:** Load the connection string from environment variables:
  ```javascript
  connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
  ```

---

## 2. Architectural Improvements

### 🏗️ Avoid Instantiating Multiple Cache Connections
* **File:** `src/cache/cacheService.js` and Service Files
* **Issue:** In the constructor of `CacheService`, a new Redis client is created and connected. Every service importing it instantiates a new class instance (`const redisClient = new CacheService();`). While Node's module caching limits this somewhat, it's an anti-pattern that can lead to database connection leaks if instances are created per request or across many files.
* **Recommendation:** Refactor `CacheService` to export a single instance (Singleton Pattern) or share a single Redis client:
  ```javascript
  // cacheService.js
  class CacheService { ... }
  export const cacheServiceInstance = new CacheService();
  ```

### 🏗️ High Database Overhead in Project Role Middlewares
* **File:** `src/shared/middlewares/checkProjectRole.js`
* **Issue:** Middlewares query the database multiple times consecutively (e.g. checking task, then project, then member). For a single API request, this causes up to 3 separate database calls, creating significant latency.
* **Recommendation:** Consolidate membership and task permission checks into a single query using Prisma's nested includes. For instance, query `projectMembers` and check if they belong to the project with the given task in a single database round-trip.

### 🏗️ Separation of Caching Concerns
* **File:** `src/modules/task/service/taskService.js`
* **Issue:** Business services handle cache invalidation, key generation, and TTL management directly. This violates the Single Responsibility Principle and clutters service logic.
* **Recommendation:** Move caching logic out of the services. Use custom route-level caching middlewares or repository-level proxies/decorators to handle caching transparently.

---

## 3. Testing Infrastructure Recommendations

### 🧪 Setting Up a Formal Testing Framework
* **Current State:** The project currently uses standalone test files (`verify_*.js`) in the root directory that use native `fetch` and `assert` against a running server. 
* **Issues:**
  1. Cannot run tests automatically in a CI/CD pipeline without manually orchestrating the server and dependencies.
  2. Side effects (tests create users and projects in the local dev database without clean teardown).
  3. No coverage reports or unit tests for individual functions (Repository/Service).
* **Recommendation:**
  - Introduce **Vitest** or **Jest** as the runner.
  - Use **Supertest** to test Express routes without having to start the network listener.
  - Setup a dedicated test database (e.g. using `dotenv` with `.env.test`) and run database migrations/seeding before test suites, and truncate tables after each test run.
  - Mock external services (Redis and RabbitMQ) using tools like `redis-mock` or mock libraries to ensure test suites can run offline and fast.

---

## 4. Security & Best Practices

### 🔒 Secure Cookie Settings
* **File:** Auth controller
* **Issue:** Access tokens and refresh tokens should be stored in cookies with secure configurations.
* **Recommendation:** Ensure cookies are set with:
  - `httpOnly: true` (prevents XSS attacks from reading the token).
  - `secure: true` (ensures cookies are only sent over HTTPS).
  - `sameSite: 'strict'` or `'lax'` (prevents CSRF attacks).

### 📖 Modularize API Documentation (Swagger)
* **File:** `src/modules/task/taskRoutes.js` and other routes
* **Issue:** Extensive Swagger JSDoc comments are placed inside the routing files, making them very long and hard to navigate.
* **Recommendation:** Move Swagger API definitions into dedicated JSON/YAML schema files or a separate documentation directory to keep routing files clean.

### 🔒 Consistent Cookie Clearing (Logout)
* **File:** `src/modules/auth/controller/authController.js` (Lines 134-144)
* **Issue:** When logging out, cookies are cleared with `secure: true` hardcoded. However, when logging in, the `secure` flag is set conditionally based on environment (`process.env.NODE_ENV === 'production'`). In local non-HTTPS development, this inconsistency can prevent some browsers from successfully clearing the cookie upon logout.
* **Recommendation:** Use the same environment check for the `secure` flag when clearing cookies.

---

## 5. Middleware & Schema Validation Improvements

### ⚠️ Zod Schema Parsing Data Loss in `validateRequest` Middleware
* **File:** `src/shared/middlewares/validateRequest.js`
* **Issue:** The validation middleware runs `schema.parse(data)`, which performs Zod validation, default assignments, and schema transformations (e.g., transforming priority strings to uppercase). However, the parsed result is never assigned back to the Express request object (`req.body`, `req.query`, `req.params`). Consequently, all transformations and default values generated by Zod are discarded, forcing the controllers and services to manually duplicate validation and defaulting logic.
* **Recommendation:** Update the validation middleware to assign the parsed values back to the request object:
  ```javascript
  const parsed = schema.parse(data);
  req.body = parsed.body;
  req.query = parsed.query;
  req.params = parsed.params;
  ```

---

## 6. Database & Dependency Cleanups [DONE]

### ⚡ Missing Database Indices on Tasks Table [DONE]
* **File:** `prisma/schema.prisma`
* **Issue:** The `Tasks` table is frequently queried with soft-delete checks (`deletedAt: null`), task status, and due date filters (like `dueSoon` and `overdue`). Currently, there are no indices on `deletedAt` or `dueDate`, which will lead to full-table scans and performance degradation as the tasks dataset grows.
* **Recommendation:** Add indices to query-heavy columns:
  - `@@index([deletedAt])` (or composite `@@index([projectId, deletedAt])`)
  - `@@index([dueDate])`

### 🧹 Unused Dependency Cleanup (`bcryptjs`) [DONE]
* **File:** `package.json`
* **Issue:** The project lists both `bcrypt` and `bcryptjs` as dependencies. The codebase currently only uses `bcrypt` (`import bcrypt from 'bcrypt'`). Keeping `bcryptjs` adds unnecessary bloat.
* **Recommendation:** Uninstall `bcryptjs` if native `bcrypt` works well in all deployment environments, or switch to pure-JS `bcryptjs` entirely for better portability across different server architectures.

---

## 7. Feature Improvement Recommendations

Here are some feature enhancements that can be introduced to turn the task management API into a enterprise-ready application:

### 🔌 Real-time Updates using WebSockets (Socket.io)
* **Description:** Currently, domain events are generated and processed in background queues, and notifications are saved to the database. However, users must refresh their UI or poll the API to see new notifications or status changes.
* **Implementation:** Integrate `socket.io` or standard `ws` to push real-time events to authenticated clients when:
  - A task is assigned to them.
  - A task's status is changed by a collaborator.
  - A new member joins the project.

### 💬 Task Comments and User Mentions
* **Description:** Collaborators currently cannot discuss tasks inside the platform.
* **Implementation:** 
  - Create a `Comments` model associated with `Tasks` and `Users`.
  - Add basic CRUD endpoints for task comments.
  - Implement a mention system (e.g., parsing `@username` in descriptions or comments) which automatically generates database/email notifications for the mentioned user.

### 📋 Task Checklists (Sub-tasks)
* **Description:** Some tasks are large and need to be broken down into smaller, checkable list items.
* **Implementation:**
  - Create a `ChecklistItems` model with a self-relation or directly mapped to a `Tasks` model.
  - Expose API endpoints to add, delete, toggle, and reorder checklist items.
  - Prevent completing a Task if it has uncompleted checklist items (configurable).

### 🎛️ Kanban Board Support (Task Ordering)
* **Description:** Frontend clients rendering Kanban boards need a way to track the vertical order/position of tasks within a status column.
* **Implementation:**
  - Add a `position` or `order` field (float or integer) to the `Tasks` table.
  - When dragging and dropping a task, the client sends a `PATCH` request to update its status and position.
  - Implement a position calculation algorithm (e.g. fractional indexing) to avoid rewriting positions for all other tasks in the column.

### 👥 Expanded Roles (RBAC)
* **Description:** The system currently only has two roles: `LEADER` (full project management control) and `MEMBER` (can update progress, upload images, get tasks).
* **Implementation:**
  - Add `GUEST` or `VIEWER` (read-only access to tasks and members).
  - Add `MANAGER` (can create/edit tasks and edit members, but cannot delete the project or change project ownership).
  - Update `checkProjectRole` middleware to support these fine-grained roles.

### 🔗 Task Dependencies
* **Description:** Complex tasks sometimes depend on the completion of other tasks (e.g., Task B is blocked by Task A).
* **Implementation:**
  - Create a join table/relation representing task blocks (e.g., `TaskDependencies` or self-relation `blockedBy`).
  - Implement validation preventing a user from setting a task status to `DONE` if its blocker tasks are still in `TODO` or `IN_PROGRESS`.


