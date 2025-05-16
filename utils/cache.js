import cache from 'memory-cache';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000; 

export const cachedFetch = async (key, fetchFn) => {
  const cachedData = cache.get(key);
  if (cachedData) {
    return cachedData;
  }
  
  const freshData = await fetchFn();
  cache.put(key, freshData, CACHE_DURATION);
  return freshData;
};

export const clearCache = (key) => {
  cache.del(key);
};