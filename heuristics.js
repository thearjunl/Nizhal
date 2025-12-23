/**
 * Heuristics Module
 * Analyzes URLs for specific suspicious patterns.
 */

const SUSPICIOUS_TLDS = ['.top', '.xyz', '.gq', '.cn', '.tk'];

/**
 * Checks if a URL matches any suspicious heuristics.
 * @param {string} url - The URL string to analyze.
 * @returns {object} - Result object with status.
 */
export function checkHeuristics(url) {
    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (e) {
        return { suspicious: false, error: 'Invalid URL' };
    }

    // 1. Check URL Length
    if (url.length > 100) {
        return {
            suspicious: true,
            reason: 'URL Length > 100 characters'
        };
    }

    // 2. Check Suspicious TLDs
    const hostname = urlObj.hostname;
    for (const tld of SUSPICIOUS_TLDS) {
        if (hostname.endsWith(tld)) {
            return {
                suspicious: true,
                reason: `Suspicious TLD: ${tld}`
            };
        }
    }

    return { suspicious: false };
}
