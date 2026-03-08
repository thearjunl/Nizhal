import { checkHeuristics } from './heuristics.js';
import { checkReputation } from './api.js';
import { getCachedResult, cacheResult } from './storage.js';

console.log('Nizhal Service Worker Loaded.');

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const { url, tabId } = details;

    // Ignore internal pages and extension resources to prevent blocking the warning page itself
    if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) return;

    console.log(`[Nizhal] Analyzing: ${url}`);

    // Run Heuristics
    const heuristicResult = checkHeuristics(url);
    console.log('[Nizhal] Heuristic Result:', heuristicResult);

    if (heuristicResult.suspicious) {
        console.warn(`[Nizhal] THREAT DETECTED for ${url}`);
        const warningUrl = chrome.runtime.getURL('warning.html') +
            `?url=${encodeURIComponent(url)}&type=${encodeURIComponent('Heuristic Vibe Check')}&reason=${encodeURIComponent(heuristicResult.reason || 'Flagged by Heuristics')}`;
        chrome.tabs.update(tabId, { url: warningUrl });
        return;
    }

    // Check Cache
    const cachedResult = await getCachedResult(url);
    if (cachedResult) {
        console.log('[Nizhal] Cache Hit:', cachedResult);
        if (cachedResult.isMalicious) {
            console.warn(`[Nizhal] THREAT DETECTED (Cached) for ${url}`);
            const warningUrl = chrome.runtime.getURL('warning.html') +
                `?url=${encodeURIComponent(url)}&type=${encodeURIComponent('Reputation Engine (Cached)')}&reason=${encodeURIComponent(cachedResult.reason)}`;
            chrome.tabs.update(tabId, { url: warningUrl });
        }
        return;
    }

    // Run Reputation Check
    const reputationResult = await checkReputation(url);
    console.log('[Nizhal] Reputation Result:', reputationResult);

    // Cache the result
    await cacheResult(url, {
        isMalicious: reputationResult.isMalicious,
        reason: reputationResult.isMalicious ? 'Flagged by ML Backend' : 'Safe'
    });

    // If flagged by API, redirect to warning page
    if (reputationResult.isMalicious) {
        console.warn(`[Nizhal] THREAT DETECTED for ${url}`);
        const warningUrl = chrome.runtime.getURL('warning.html') +
            `?url=${encodeURIComponent(url)}&type=${encodeURIComponent('Reputation Engine')}&reason=${encodeURIComponent('Flagged by ML Backend')}`;
        chrome.tabs.update(tabId, { url: warningUrl });
    }
});
