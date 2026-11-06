
import { createHmac } from 'node:crypto';
import rateLimitRedisClient from '../redis/rateLimitRedis.js';

const FAILURE_LIMIT = 5;
const FAILURE_TTL = 30 * 60;
const PROTECTION_TTL = 15 * 60;
const KEY_PREFIX = 'rl:login:account:';

const generateAccountKey = (userId) => {
  const secret = process.env.LOGIN_RATE_LIMIT_SECRET;

  if (!secret) {
    throw new Error('LOGIN_RATE_LIMIT_SECRET is not configured');
  }

  return createHmac('sha256', secret)
    .update(userId)
    .digest('hex');
};

const getAccountKeys = (userId) => {
  const accountKey = generateAccountKey(userId);

  return {
    failureKey: `${KEY_PREFIX}fail:${accountKey}`,
    protectionKey: `${KEY_PREFIX}protection:${accountKey}`,
  };
};

// Atomically increment failures and activate protection at the threshold.
const RECORD_FAILURE_SCRIPT = `
  local count = redis.call('INCR', KEYS[1])

  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end

  if count >= tonumber(ARGV[2]) then
    redis.call('SET', KEYS[2], '1', 'EX', ARGV[3], 'NX')
  end

  local protectionTtl = redis.call('TTL', KEYS[2])

  return { count, protectionTtl }
`;

export const getLoginProtectionStatusService = async (userId) => {
  const { protectionKey } = getAccountKeys(userId);

  const ttl = await rateLimitRedisClient.ttl(protectionKey);

  return {
    required: ttl > 0,
    remainingSeconds: Math.max(ttl, 0),
  };
};

export const recordLoginFailureService = async (userId) => {
  const { failureKey, protectionKey } = getAccountKeys(userId);

  const result = await rateLimitRedisClient.eval(
    RECORD_FAILURE_SCRIPT,
    {
      keys: [failureKey, protectionKey],
      arguments: [
        String(FAILURE_TTL),
        String(FAILURE_LIMIT),
        String(PROTECTION_TTL),
      ],
    },
  );

  return {
    failureCount: Number(result[0]),
    protectionRequired: Number(result[1]) > 0,
  };
};

export const resetLoginAttemptsService = async (userId) => {
  const { failureKey, protectionKey } = getAccountKeys(userId);

  await rateLimitRedisClient.del([failureKey, protectionKey]);
};
