// config/redis.js
import { createClient } from 'redis';

export const redis = createClient();
redis.connect().catch(console.error);
