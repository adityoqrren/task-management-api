import express from 'express';
import authRoutes from './auth/authRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import projectRoutes from './project/projectRoutes.js';
import taskRoutes from './task/taskRoutes.js';
import userRoutes from './user/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
