import express from 'express';
import { authenticate } from '../../shared/middlewares/authMiddlewares.js';
import { handleAddProjectMember, handlePostProject, handleDeleteProject, handleGetProjectById, handleGetProjectMembers, handleGetProjects, handleUpdateProject, handleUpdateActiveProjectMember, handleSoftDeleteProject, handleGetProjectByIdFromAll, handleGetProjectTasks, handleRestoreSoftDeletedProject } from './controller/projectController.js';
import { checkProjectRole } from '../../shared/middlewares/checkProjectRole.js';
import { validateRequest } from '../../shared/middlewares/validateRequest.js';
import { postMemberSchema, postProjectSchema, updateMemberActiveStatusSchema } from './projectValidation.js';;

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "My New Project"
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "project has been created"
 *               data:
 *                 projectId: "uuid-project-id"
 *                 name: "My New Project"
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get all projects for current user
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of projects retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - id: "uuid-project-1"
 *                   name: "Project A"
 *                   owner: "owner-id"
 *                   role: "LEADER"
 *               pagination:
 *                 total: 1
 *                 page: 1
 *                 totalPages: 1
 *                 limit: 10
 *                 hasPrev: false
 *                 hasNext: false
 */
router.post('/', validateRequest(postProjectSchema), handlePostProject);
router.get('/', handleGetProjects);
// router.get('/all', handleGetProjectsFromAll);
router.get('/all/:id', handleGetProjectByIdFromAll);
/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 id: "uuid"
 *                 name: "My Project"
 *                 members: []
 */
router.get('/:id', handleGetProjectById);

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update project details
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "project has been edited"
 *               data:
 *                 projectId: "uuid-project-id"
 *                 name: "Updated Project Name"
 *   delete:
 *     summary: Delete project permanently
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "project is success deleted"
 */
router.patch('/:id', validateRequest(postProjectSchema), handleUpdateProject);
router.patch('/:id/soft-delete', checkProjectRole(['LEADER']), handleSoftDeleteProject);
router.patch('/:id/restore', checkProjectRole(['LEADER'], true), handleRestoreSoftDeletedProject);
router.delete('/:id', checkProjectRole(['LEADER'], true), handleDeleteProject);

/**
 * @swagger
 * /api/projects/{id}/tasks:
 *   get:
 *     summary: Get all tasks in a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of tasks retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - id: "uuid-task-1"
 *                   title: "Task in Project"
 *                   completed: false
 *               pagination:
 *                 total: 1
 *                 page: 1
 *                 totalPages: 1
 *                 limit: 10
 *                 hasPrev: false
 *                 hasNext: false
 */
router.get('/:id/tasks/', checkProjectRole(['LEADER', 'MEMBER']), handleGetProjectTasks);

/**
 * @swagger
 * /api/projects/members:
 *   post:
 *     summary: Add member to project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - userId
 *             properties:
 *               projectId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Member added successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               message: "member has been added"
 *               data:
 *                 id: "uuid-member"
 *                 userId: "uuid-user"
 *                 projectId: "uuid-project"
 */
router.post('/members', validateRequest(postMemberSchema), checkProjectRole(['LEADER']), handleAddProjectMember);

/**
 * @swagger
 * /api/projects/{id}/members:
 *   get:
 *     summary: Get project members
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: List of members retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               data:
 *                 - id: "uuid-member-1"
 *                   userId: "uuid-user-1"
 *                   role: "MEMBER"
 */
router.get('/:id/members/', checkProjectRole(['LEADER', 'MEMBER']), handleGetProjectMembers);

router.patch('/:projectId/members/:memberId/active', validateRequest(updateMemberActiveStatusSchema), checkProjectRole(['LEADER']), handleUpdateActiveProjectMember);

export default router;