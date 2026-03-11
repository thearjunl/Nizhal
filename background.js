import { checkHeuristics } from './heuristics.js';
import { checkReputation } from './api.js';
import { getCachedResult, cacheResult } from './storage.js';

console.log('Nizhal Service Worker Loaded.');

// Atomic counter increment to prevent race conditions with concurrent navigations
async function incrementStat(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            const current = result[key] || 0;
            chrome.storage.local.set({ [key]: current + 1 }, resolve);
        });
    });
}

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const { url, tabId } = details;

    // Ignore internal pages and extension resources to prevent blocking the warning page itself
    if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) return;

    // Check if Nizhal is active
    const storageData = await chrome.storage.local.get(['nizhal_active', 'nizhal_whitelist']);
    if (storageData.nizhal_active === false) return;

    // Check Whitelist
    try {
        const host = new URL(url).hostname;
        const whitelist = storageData.nizhal_whitelist || [];
        if (whitelist.includes(host)) {
            console.log(`[Nizhal] Bypassing scan for whitelisted host: ${host}`);
            return;
        }
    } catch (e) {
        return; // Invalid URL
    }

    // Increment Total Scans (atomic)
    await incrementStat('stats_scans');

    console.log(`[Nizhal] Analyzing: ${url}`);

    // Run Heuristics
    const heuristicResult = checkHeuristics(url);
    console.log('[Nizhal] Heuristic Result:', heuristicResult);

    if (heuristicResult.suspicious) {
        console.warn(`[Nizhal] THREAT DETECTED for ${url}`);

        await incrementStat('stats_threats');

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

            await incrementStat('stats_threats');

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

        await incrementStat('stats_threats');

        const warningUrl = chrome.runtime.getURL('warning.html') +
            `?url=${encodeURIComponent(url)}&type=${encodeURIComponent('Reputation Engine')}&reason=${encodeURIComponent('Flagged by ML Backend')}`;
        chrome.tabs.update(tabId, { url: warningUrl });
    }
});
