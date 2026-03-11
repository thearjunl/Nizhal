// Simple script to populate details from URL params
const params = new URLSearchParams(window.location.search);
document.getElementById('threat-type').textContent = params.get('type') || 'Unknown Threat';
document.getElementById('threat-reason').textContent = params.get('reason') || 'Detected by Nizhal heuristics.';
document.getElementById('threat-url').textContent = params.get('url') || '';

document.getElementById('btn-back').addEventListener('click', () => {
    history.back();
});

document.getElementById('btn-proceed').addEventListener('click', () => {
    const rawUrl = params.get('url');
    if (rawUrl) {
        try {
            const parsed = new URL(rawUrl);
            // Only allow http/https to prevent javascript: and other dangerous schemes
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                console.warn('[Nizhal] Blocked navigation to non-http(s) URL');
                return;
            }
            const host = parsed.hostname;
            chrome.storage.local.get(['nizhal_whitelist'], (result) => {
                const whitelist = result.nizhal_whitelist || [];
                if (!whitelist.includes(host)) {
                    whitelist.push(host);
                    chrome.storage.local.set({ nizhal_whitelist: whitelist }, () => {
                        window.location.href = rawUrl;
                    });
                } else {
                    window.location.href = rawUrl;
                }
            });
        } catch (e) {
            // URL parsing failed — do NOT navigate to prevent open redirect
            console.warn('[Nizhal] Blocked navigation to unparseable URL');
        }
    }
});
