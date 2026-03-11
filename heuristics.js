/**
 * Heuristics Module
 * Analyzes URLs for specific suspicious patterns.
 */

const SUSPICIOUS_TLDS = ['.top', '.xyz', '.gq', '.cn', '.tk', '.pw', '.cc', '.su', '.info', '.biz'];

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
    if (url.length > 200) {
        return {
            suspicious: true,
            reason: 'URL Length > 200 characters'
        };
    }

    const hostname = urlObj.hostname;

    // 2. Check for IP Address in Hostname
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
        return {
            suspicious: true,
            reason: 'IP Address used instead of Domain Name'
        };
    }

    // 3. Check for Excessive Subdomains
    // A standard domain like www.example.com has 3 parts.
    // Anything with more than 4 parts is considered excessive.
    const parts = hostname.split('.');
    if (parts.length > 4) {
        return {
            suspicious: true,
            reason: 'Excessive number of subdomains'
        };
    }

    // 4. Check Suspicious TLDs
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
