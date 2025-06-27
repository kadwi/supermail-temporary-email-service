// In-memory cache implementation
const cache = new Map();

// Cache duration in seconds (5 minutes for more real-time updates)
const CACHE_DURATION = 300;

function setCache(key, data) {
  return new Promise((resolve) => {
    const item = {
      data,
      timestamp: Date.now(),
      expiresIn: CACHE_DURATION * 1000
    };
    cache.set(key, item);
    console.log(`Cached ${Array.isArray(data) ? data.length : 'data'} items for key: ${key}`);
    resolve();
  });
}

function getCache(key) {
  return new Promise((resolve) => {
    const item = cache.get(key);
    if (!item) {
      resolve(null);
      return;
    }

    const now = Date.now();
    if (now - item.timestamp > item.expiresIn) {
      cache.delete(key);
      console.log(`Cache expired for key: ${key}`);
      resolve(null);
      return;
    }

    console.log(`Cache hit for key: ${key}`);
    resolve(item.data);
  });
}

function deleteCache(key) {
  return new Promise((resolve) => {
    const deleted = cache.delete(key);
    if (deleted) {
      console.log(`Cache deleted for key: ${key}`);
    }
    resolve();
  });
}

// Clean up expired items periodically
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp > item.expiresIn) {
      cache.delete(key);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired cache items`);
  }
}, 60000); // Clean up every minute

module.exports = {
  setCache,
  getCache,
  deleteCache
};
