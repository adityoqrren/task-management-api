import express from 'express';
import errorHandler from './shared/middlewares/errorHandler.js';
import authRoutes from './modules/auth/authRoutes.js';
import projectRoutes from './modules/project/projectRoutes.js';
import taskRoutes from './modules/task/taskRoutes.js';
import userRoutes from './modules/user/userRoutes.js';
import notificationRoutes from './modules/notification/notificationRoutes.js';
import activityLogRoutes from './modules/activitylog/activityLogRoutes.js';
import { initRabbit } from './queue/queueService.js';

const app = express();
const PORT = process.env.PORT || 3000;

await initRabbit();

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
