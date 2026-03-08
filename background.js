import { checkHeuristics } from './heuristics.js';
import { checkReputation } from './api.js';
import { getCachedResult, cacheResult } from './storage.js';

console.log('Nizhal Service Worker Loaded.');

// Listen for navigation events
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    const { url, tabId } = details;

    // Ignore internal pages and extension resources to prevent blocking the warning page itself
    if (!url || url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) return;

    // Check if Nizhal is active
    const storageData = await chrome.storage.local.get(['nizhal_active', 'nizhal_whitelist', 'stats_scans', 'stats_threats']);
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

    // Increment Total Scans
    const currentScans = storageData.stats_scans || 0;
    chrome.storage.local.set({ stats_scans: currentScans + 1 });

    console.log(`[Nizhal] Analyzing: ${url}`);

    // Run Heuristics
    const heuristicResult = checkHeuristics(url);
    console.log('[Nizhal] Heuristic Result:', heuristicResult);

    if (heuristicResult.suspicious) {
        console.warn(`[Nizhal] THREAT DETECTED for ${url}`);

        const currentThreats = (await chrome.storage.local.get('stats_threats')).stats_threats || 0;
        chrome.storage.local.set({ stats_threats: currentThreats + 1 });

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

            const currentThreats = (await chrome.storage.local.get('stats_threats')).stats_threats || 0;
            chrome.storage.local.set({ stats_threats: currentThreats + 1 });

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

        const currentThreats = (await chrome.storage.local.get('stats_threats')).stats_threats || 0;
        chrome.storage.local.set({ stats_threats: currentThreats + 1 });

        const warningUrl = chrome.runtime.getURL('warning.html') +
            `?url=${encodeURIComponent(url)}&type=${encodeURIComponent('Reputation Engine')}&reason=${encodeURIComponent('Flagged by ML Backend')}`;
        chrome.tabs.update(tabId, { url: warningUrl });
    }
});
