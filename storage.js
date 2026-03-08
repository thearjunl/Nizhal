/**
 * Storage Module
 * Helper functions to interact with chrome.storage.local
 */

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Saves a scan result for a URL.
 * @param {string} url - The URL string.
 * @param {Object} result - The result object (safe/unsafe, reason).
 */
export async function cacheResult(url, result) {
    const key = `scan_${url}`;
    const data = {
        result,
        timestamp: Date.now()
    };
    await chrome.storage.local.set({ [key]: data });
}

/**
 * Retrieves a cached result if valid.
 * @param {string} url - The URL string.
 * @returns {Promise<Object|null>} - The cached result or null if missing/expired.
 */
export async function getCachedResult(url) {
    const key = `scan_${url}`;
    const stored = await chrome.storage.local.get([key]);
    const data = stored[key];

    if (!data) return null;

    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
        await chrome.storage.local.remove(key);
        return null;
    }

    return data.result;
}
