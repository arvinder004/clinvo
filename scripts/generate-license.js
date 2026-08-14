const crypto = require('crypto');

// This must match the SECRET_SALT in electron/main.ts
const SECRET_SALT = 'CLINVO-OFFLINE-LICENSE-2024-X99';

function generateKey(days) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + parseInt(days, 10));
  
  const payload = { exp: expiryDate.getTime() };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');

  const hmac = crypto.createHmac('sha256', SECRET_SALT);
  hmac.update(payloadB64);
  const signature = hmac.digest('base64url');

  const key = `DOC-${payloadB64}.${signature}`;
  
  console.log(`\n✅ Generated License Key for ${days} days`);
  console.log(`📅 Expiry Date: ${expiryDate.toLocaleString()}`);
  console.log(`🔑 Key:\n\n${key}\n`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node generate-license.js <days>');
  console.log('Example: node generate-license.js 365');
  process.exit(1);
}

generateKey(args[0]);
