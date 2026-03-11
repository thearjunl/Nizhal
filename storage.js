/**
 * Storage Module
 * Helper functions to interact with chrome.storage.local
 */

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 500;

/**
 * Generates a short hash key from a URL to keep storage keys bounded.
 */
async function hashUrl(url) {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Evicts the oldest cache entries when the cache exceeds MAX_CACHE_ENTRIES.
 */
async function evictOldEntries() {
    const allData = await chrome.storage.local.get(null);
    const cacheEntries = [];

    for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('scan_') && value && value.timestamp) {
            cacheEntries.push({ key, timestamp: value.timestamp });
        }
    }

    if (cacheEntries.length <= MAX_CACHE_ENTRIES) return;

    // Sort oldest first and remove excess
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = cacheEntries.slice(0, cacheEntries.length - MAX_CACHE_ENTRIES);
    await chrome.storage.local.remove(toRemove.map(e => e.key));
}

/**
 * Saves a scan result for a URL.
 * @param {string} url - The URL string.
 * @param {Object} result - The result object (safe/unsafe, reason).
 */
export async function cacheResult(url, result) {
    const hash = await hashUrl(url);
    const key = `scan_${hash}`;
    const data = {
        result,
        timestamp: Date.now()
    };
    await chrome.storage.local.set({ [key]: data });
    await evictOldEntries();
}

/**
 * Retrieves a cached result if valid.
 * @param {string} url - The URL string.
 * @returns {Promise<Object|null>} - The cached result or null if missing/expired.
 */
export async function getCachedResult(url) {
    const hash = await hashUrl(url);
    const key = `scan_${hash}`;
    const stored = await chrome.storage.local.get([key]);
    const data = stored[key];

    if (!data) return null;

    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
        await chrome.storage.local.remove(key);
        return null;
    }

    return data.result;
}
