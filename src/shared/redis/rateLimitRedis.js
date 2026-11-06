
import { createClient } from 'redis';

const rateLimitRedisClient = createClient({
  socket: {
    host: process.env.REDIS_SERVER,
    port: process.env.REDIS_PORT,
  },
});

rateLimitRedisClient.on('error', (error) => {
  console.error('Rate limiter Redis error:', error);
});

// Connect before the application starts accepting requests.
await rateLimitRedisClient.connect();

export default rateLimitRedisClient;
