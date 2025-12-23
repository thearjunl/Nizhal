import { checkHeuristics } from './heuristics.js';
import { checkReputation } from './api.js';

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

    // Run Reputation Check
    const reputationResult = await checkReputation(url);
    console.log('[Nizhal] Reputation Result:', reputationResult);

    // If either flagged it, redirect to warning page
    if (heuristicResult.suspicious || reputationResult.isMalicious) {
        console.warn(`[Nizhal] THREAT DETECTED for ${url}`);

        const type = heuristicResult.suspicious ? 'Heuristic Vibe Check' : 'Reputation Engine';
        const reason = heuristicResult.reason || 'Flagged by Reputation Source';

        const warningUrl = chrome.runtime.getURL('warning.html') +
            `?url=${encodeURIComponent(url)}&type=${encodeURIComponent(type)}&reason=${encodeURIComponent(reason)}`;

        chrome.tabs.update(tabId, { url: warningUrl });
    }
});
