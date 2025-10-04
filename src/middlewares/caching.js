// middleware/cache.js
import { redis } from '../config/redis.js';

export const cacheTasks = async (req, res, next) => {
  const userId = req.user.id;
  const projectId = req.query.projectId || '';

  const key = req.query.projectId?
    `tasks:${userId}:${projectId}` : `tasks:${userId}`;

  console.log(`key to cache : ${key}`)

  const cached = await redis.get(key);
  if (cached) {
    return res.json({ tasks: JSON.parse(cached).tasks, cached: true });
  }

  res.sendResponse = res.json; // simpan original res.json
  res.json = (body) => {
    redis.set(key, JSON.stringify(body), 'EX', 60); // TTL 60 detik (opsional)
    res.sendResponse(body);
  };
  
  next();
};
