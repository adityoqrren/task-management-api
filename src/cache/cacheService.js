import redis from 'redis';

export default class CacheService {
  constructor() {
    this._client = redis.createClient({
      socket: {
        host: process.env.REDIS_SERVER,
        port: process.env.REDIS_PORT,
      },
    });
    this._client.on('error', (error) => {
      console.error(error);
    });
    this._client.connect();
  }

  async set(key, value, expirationInSecond = 150) {
    await this._client.set(key, value, {
      EX: expirationInSecond,
    });
  }

  async get(key) {
    const result = await this._client.get(key);
    // if (result === null) throw new Error('Cache not found');
    return result;
  }

  // save to set in redis (cache group)
  async saveToCacheGroup(key, cacheKeyToSave) {
    await this._client.sAdd(key, cacheKeyToSave);
  }

  async getCacheGroup(key) {
    const result = await this._client.sMembers(key);
    return result;
  }

  async delete(key) {
    return await this._client.del(key);
  }
}