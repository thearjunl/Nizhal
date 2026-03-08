document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const toggleProtection = document.getElementById('toggle-protection');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const statScans = document.getElementById('stat-scans');
    const statThreats = document.getElementById('stat-threats');

    // Default Load State
    chrome.storage.local.get(['nizhal_active', 'stats_scans', 'stats_threats'], (result) => {
        // Active status
        const isActive = result.nizhal_active !== false; // Default true
        toggleProtection.checked = isActive;
        updateStatusUI(isActive);

        // Stats
        statScans.textContent = result.stats_scans || 0;
        statThreats.textContent = result.stats_threats || 0;
    });

    // Toggle Listener
    toggleProtection.addEventListener('change', (e) => {
        const isActive = e.target.checked;
        chrome.storage.local.set({ nizhal_active: isActive });
        updateStatusUI(isActive);
    });

    function updateStatusUI(isActive) {
        if (isActive) {
            statusText.textContent = "Protection Active";
            statusDot.classList.add('active');
        } else {
            statusText.textContent = "Protection Disabled";
            statusDot.classList.remove('active');
        }
    }
});
