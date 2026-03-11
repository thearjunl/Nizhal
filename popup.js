document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const toggleProtection = document.getElementById('toggle-protection');
    const statusText = document.getElementById('status-text');
    const statusDot = document.getElementById('status-dot');
    const statScans = document.getElementById('stat-scans');
    const statThreats = document.getElementById('stat-threats');
    const btnOptions = document.getElementById('btn-options');
    const settingsPanel = document.getElementById('settings-panel');
    const whitelistContainer = document.getElementById('whitelist-container');
    const whitelistEmpty = document.getElementById('whitelist-empty');
    const btnClearStats = document.getElementById('btn-clear-stats');

    // Default Load State
    chrome.storage.local.get(['nizhal_active', 'stats_scans', 'stats_threats'], (result) => {
        if (chrome.runtime.lastError) {
            console.error('Failed to load state:', chrome.runtime.lastError.message);
            return;
        }
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

    // Settings Toggle
    btnOptions.addEventListener('click', () => {
        const isVisible = settingsPanel.style.display !== 'none';
        settingsPanel.style.display = isVisible ? 'none' : 'block';
        btnOptions.innerHTML = isVisible ? '<span class="btn-icon">&#9881;</span> Settings' : '<span class="btn-icon">&#10005;</span> Close Settings';
        if (!isVisible) loadWhitelist();
    });

    // Reset Statistics
    btnClearStats.addEventListener('click', () => {
        chrome.storage.local.set({ stats_scans: 0, stats_threats: 0 }, () => {
            statScans.textContent = '0';
            statThreats.textContent = '0';
        });
    });

    function loadWhitelist() {
        chrome.storage.local.get(['nizhal_whitelist'], (result) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to load whitelist:', chrome.runtime.lastError.message);
                return;
            }
            const whitelist = result.nizhal_whitelist || [];
            // Clear previous entries (keep the empty message element)
            whitelistContainer.querySelectorAll('.whitelist-item').forEach(el => el.remove());

            if (whitelist.length === 0) {
                whitelistEmpty.style.display = 'block';
                return;
            }
            whitelistEmpty.style.display = 'none';

            whitelist.forEach(domain => {
                const item = document.createElement('div');
                item.className = 'whitelist-item';

                const label = document.createElement('span');
                label.textContent = domain;

                const removeBtn = document.createElement('button');
                removeBtn.textContent = '\u00d7';
                removeBtn.className = 'btn-remove';
                removeBtn.addEventListener('click', () => {
                    chrome.storage.local.get(['nizhal_whitelist'], (res) => {
                        if (chrome.runtime.lastError) {
                            console.error('Failed to update whitelist:', chrome.runtime.lastError.message);
                            return;
                        }
                        const updated = (res.nizhal_whitelist || []).filter(d => d !== domain);
                        chrome.storage.local.set({ nizhal_whitelist: updated }, () => loadWhitelist());
                    });
                });

                item.appendChild(label);
                item.appendChild(removeBtn);
                whitelistContainer.appendChild(item);
            });
        });
    }

    function updateStatusUI(isActive) {
        const statusBar = document.getElementById('status-bar');
        if (isActive) {
            statusText.textContent = "Protection Active";
            statusDot.classList.add('active');
            statusBar.classList.add('active-glow');
        } else {
            statusText.textContent = "Protection Disabled";
            statusDot.classList.remove('active');
            statusBar.classList.remove('active-glow');
        }
    }
});
