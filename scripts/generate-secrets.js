/**
 * Generate random base64 secrets for JWT_SECRET and NEXTAUTH_SECRET.
 * Run: node scripts/generate-secrets.js   atau: bun scripts/generate-secrets.js
 */
const crypto = require('crypto');
const jwt = crypto.randomBytes(32).toString('base64');
const auth = crypto.randomBytes(32).toString('base64');
console.log('\n=== Copy nilai di bawah ke Railway Variables ===\n');
console.log('JWT_SECRET=' + jwt);
console.log('NEXTAUTH_SECRET=' + auth);
console.log('\n=================================================\n');
