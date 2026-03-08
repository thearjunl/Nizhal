/**
 * API Module
 * Handles external requests to reputation engines.
 */

/**
 * Checks the URL against a reputation engine.
 * @param {string} url - The URL to check.
 * @returns {Promise<object>} - Reputation result.
 */
export async function checkReputation(url) {
    try {
        const response = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url })
        });
        
        if (!response.ok) {
            console.error('[Nizhal] API Response Error:', response.statusText);
            return { isMalicious: false, error: response.statusText };
        }
        
        const data = await response.json();
        return { isMalicious: data.isMalicious, source: 'ML Backend', confidence: data.confidence };
    } catch (error) {
        console.error('[Nizhal] API Fetch Error:', error);
        return { isMalicious: false, error: error.message };
    }
}
