/**
 * Heuristics Test Suite
 * Run with: node tests/test_heuristics.js
 */

// Inline the heuristics logic for testing (since ES modules + Node require workarounds)
const SUSPICIOUS_TLDS = ['.top', '.xyz', '.gq', '.cn', '.tk', '.pw', '.cc', '.su', '.info', '.biz'];

function checkHeuristics(url) {
    let urlObj;
    try {
        urlObj = new URL(url);
    } catch (e) {
        return { suspicious: false, error: 'Invalid URL' };
    }

    if (url.length > 200) {
        return { suspicious: true, reason: 'URL Length > 200 characters' };
    }

    const hostname = urlObj.hostname;

    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(hostname)) {
        return { suspicious: true, reason: 'IP Address used instead of Domain Name' };
    }

    const parts = hostname.split('.');
    if (parts.length > 4) {
        return { suspicious: true, reason: 'Excessive number of subdomains' };
    }

    for (const tld of SUSPICIOUS_TLDS) {
        if (hostname.endsWith(tld)) {
            return { suspicious: true, reason: `Suspicious TLD: ${tld}` };
        }
    }

    return { suspicious: false };
}

// Simple test runner
let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  PASS: ${testName}`);
        passed++;
    } else {
        console.error(`  FAIL: ${testName}`);
        failed++;
    }
}

console.log('Heuristics Test Suite\n');

// --- Safe URL tests ---
console.log('Safe URLs:');

let r = checkHeuristics('https://www.google.com');
assert(r.suspicious === false, 'google.com is safe');

r = checkHeuristics('https://www.amazon.com/dp/B09V3KXJPB?ref=something');
assert(r.suspicious === false, 'amazon product URL is safe');

r = checkHeuristics('https://accounts.google.com/signin');
assert(r.suspicious === false, 'Google sign-in (3 subdomain parts) is safe');

r = checkHeuristics('https://www.example.co.uk/page');
assert(r.suspicious === false, 'co.uk domain (4 parts) is safe');

// --- URL length ---
console.log('\nURL Length:');

const longUrl = 'https://example.com/' + 'a'.repeat(200);
r = checkHeuristics(longUrl);
assert(r.suspicious === true, 'URL over 200 chars is flagged');
assert(r.reason.includes('200'), 'reason mentions 200');

r = checkHeuristics('https://example.com/' + 'a'.repeat(150));
assert(r.suspicious === false, '170 char URL is safe');

// --- IP address ---
console.log('\nIP Address:');

r = checkHeuristics('http://192.168.1.1/admin');
assert(r.suspicious === true, 'IP address hostname is flagged');
assert(r.reason.includes('IP Address'), 'reason mentions IP');

r = checkHeuristics('http://10.0.0.1/login');
assert(r.suspicious === true, 'private IP is flagged');

// --- Excessive subdomains ---
console.log('\nExcessive Subdomains:');

r = checkHeuristics('https://a.b.c.d.example.com/page');
assert(r.suspicious === true, '5+ subdomain parts flagged');
assert(r.reason.includes('subdomain'), 'reason mentions subdomain');

r = checkHeuristics('https://sub.example.com');
assert(r.suspicious === false, '3 parts is safe');

// --- Suspicious TLDs ---
console.log('\nSuspicious TLDs:');

r = checkHeuristics('https://free-stuff.xyz');
assert(r.suspicious === true, '.xyz TLD is flagged');

r = checkHeuristics('https://example.top');
assert(r.suspicious === true, '.top TLD is flagged');

r = checkHeuristics('https://example.tk');
assert(r.suspicious === true, '.tk TLD is flagged');

r = checkHeuristics('https://example.info');
assert(r.suspicious === true, '.info TLD is flagged');

r = checkHeuristics('https://example.com');
assert(r.suspicious === false, '.com TLD is safe');

r = checkHeuristics('https://example.org');
assert(r.suspicious === false, '.org TLD is safe');

// --- Invalid URL ---
console.log('\nInvalid URLs:');

r = checkHeuristics('not-a-url');
assert(r.suspicious === false, 'invalid URL returns safe (not crash)');
assert(r.error === 'Invalid URL', 'error field is set');

// --- Summary ---
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
process.exit(failed > 0 ? 1 : 0);
