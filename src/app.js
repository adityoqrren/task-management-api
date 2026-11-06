import express from 'express';
import errorHandler from './shared/middlewares/errorHandler.js';
import authRoutes from './modules/auth/authRoutes.js';
import websocketRoutes from './modules/websocket/websocketRoutes.js';
import projectRoutes from './modules/project/projectRoutes.js';
import taskRoutes from './modules/task/taskRoutes.js';
import userRoutes from './modules/user/userRoutes.js';
import notificationRoutes from './modules/notification/notificationRoutes.js';
import activityLogRoutes from './modules/activitylog/activityLogRoutes.js';
import dashboardRoutes from './modules/dashboard/dashboardRoutes.js';
import { initRabbit } from './queue/queueService.js';
import swaggerUi from 'swagger-ui-express';
import specs from './shared/config/swagger.js';
import cors from "cors";
import cookieParser from 'cookie-parser';


const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy : using remoteAddress

if (process.env.NODE_ENV === 'production') {
  app.set("trust proxy", process.env.REMOTE_ADDRESS);
}

const allowedOrigins = [
  "http://localhost:3001",
  "https://taskflow.adityop.web.id",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// temporary middleare to get container address for trust proxy and check if ip is real ip
// app.use((req, res, next) => {
//     console.log({
//         remoteAddress: req.socket.remoteAddress,
//         ip: req.ip,
//         xForwardedFor: req.headers["x-forwarded-for"],
//     });

//     next();
// });


await initRabbit();

app.use(cookieParser());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/api/auth', authRoutes);
app.use('/api/websocket', websocketRoutes)
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT} in env : ${process.env.NODE_ENV}`);
});
