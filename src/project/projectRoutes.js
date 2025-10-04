import express from 'express';
import { authenticate } from '../middlewares/authMiddlewares.js';
import { handleAddProjectMember, handlePostProject, handleDeleteProject, handleGetProjectById, handleGetProjectMembers, handleGetProjects, handleUpdateProject, handleUpdateActiveProjectMember, handleSoftDeleteProject, handleGetProjectByIdFromAll, handleGetProjectsFromAll, handleGetProjectTasks, handleRestoreSoftDeletedProject } from './controller/projectController.js';
import { checkProjectRole } from '../middlewares/checkProjectRole.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { postMemberSchema, postProjectSchema, updateMemberActiveStatusSchema } from './projectValidation.js';;

const router = express.Router();

router.use(authenticate);

router.post('/', validateRequest(postProjectSchema), handlePostProject);
router.get('/', handleGetProjects);
router.get('/all', handleGetProjectsFromAll);
router.get('/all/:id', handleGetProjectByIdFromAll);
router.get('/:id', handleGetProjectById);
router.patch('/:id', validateRequest(postProjectSchema), handleUpdateProject);
router.patch('/:id/soft-delete', checkProjectRole(['LEADER']), handleSoftDeleteProject);
router.patch('/:id/restore', checkProjectRole(['LEADER'], true), handleRestoreSoftDeletedProject);
router.delete('/:id', checkProjectRole(['LEADER'], true), handleDeleteProject);

router.get('/:id/tasks/', checkProjectRole(['LEADER', 'MEMBER']), handleGetProjectTasks);

router.post('/members', validateRequest(postMemberSchema), checkProjectRole(['LEADER']), handleAddProjectMember);
router.get('/:id/members/', checkProjectRole(['LEADER', 'MEMBER']), handleGetProjectMembers);

router.patch('/:projectId/members/:memberId/active', validateRequest(updateMemberActiveStatusSchema), checkProjectRole(['LEADER']), handleUpdateActiveProjectMember);

export default router;