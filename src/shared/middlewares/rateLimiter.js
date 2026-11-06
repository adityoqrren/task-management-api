import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import rateLimitRedisClient from '../redis/rateLimitRedis.js';

export const RATE_LIMITS = {
  projects: {
    windowMs: 60 * 1000,
    limit: 120,
    prefix: 'rl:projects:',
  },
  tasks: {
    windowMs: 60 * 1000,
    limit: 120,
    prefix: 'rl:tasks:',
  },
  users: {
    windowMs: 60 * 1000,
    limit: 60,
    prefix: 'rl:users:',
  },
  notifications: {
    windowMs: 60 * 1000,
    limit: 120,
    prefix: 'rl:notifications:',
  },
  activityLogs: {
    windowMs: 60 * 1000,
    limit: 60,
    prefix: 'rl:activity-logs:',
  },
  dashboard: {
    windowMs: 60 * 1000,
    limit: 60,
    prefix: 'rl:dashboard:',
  },
  login: {
    windowMs: 15 * 60 * 1000,
    limit: 50,
    prefix: 'rl:login:',
  },

  register: {
    windowMs: 60 * 60 * 1000,
    limit: 100,
    prefix: 'rl:register:',
  },

  unauthorized: {
    windowMs: 60 * 1000,
    limit: 60,
    prefix: 'rl:unauthorized:',
  },
};

const createRateLimiter = ({ windowMs, limit, prefix, keyGenerator, skipSuccessfulRequests }) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator && { keyGenerator }),
    ...(skipSuccessfulRequests !== undefined && { skipSuccessfulRequests }),
    store: new RedisStore({
      sendCommand: (...args) => rateLimitRedisClient.sendCommand(args),
      prefix,
    }),
    message: {
      status: 429,
      message: 'Too many requests, please try again later.',
    },
  });
};

// Authenticated limiters.
// Projects: 120 requests per minute.
export const projectsLimiter = createRateLimiter({
  ...RATE_LIMITS.projects,
  keyGenerator: (req) => req.user.id,
});

// Tasks and task comments: 120 requests per minute.
export const tasksLimiter = createRateLimiter({
  ...RATE_LIMITS.tasks,
  keyGenerator: (req) => req.user.id,
});

// Users: 60 requests per minute.
export const usersLimiter = createRateLimiter({
  ...RATE_LIMITS.users,
  keyGenerator: (req) => req.user.id,
});

// Notifications: 120 requests per minute.
export const notificationsLimiter = createRateLimiter({
  ...RATE_LIMITS.notifications,
  keyGenerator: (req) => req.user.id,
});

// Activity logs: 60 requests per minute.
export const activityLogsLimiter = createRateLimiter({
  ...RATE_LIMITS.activityLogs,
  keyGenerator: (req) => req.user.id,
});

// Dashboard: 60 requests per minute.
export const dashboardLimiter = createRateLimiter({
  ...RATE_LIMITS.dashboard,
  keyGenerator: (req) => req.user.id,
});

// Public limiters.
// Successful logins do not consume the brute-force budget, so shared/NAT
// networks are not locked out by legitimate traffic.
export const loginLimiter = createRateLimiter({
  ...RATE_LIMITS.login,
  skipSuccessfulRequests: true,
});

export const registerLimiter = createRateLimiter({
  ...RATE_LIMITS.register
});

// Failed/anonymous requests to protected routes (invalid or missing token).
// Keyed by IP because no authenticated user is available.
export const unauthorizedLimiter = createRateLimiter({
  ...RATE_LIMITS.unauthorized
});
