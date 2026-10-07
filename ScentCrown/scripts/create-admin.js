require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function main() {
  const name = String(process.env.ADMIN_NAME || 'ScentCrown Admin').trim();
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 72) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of 12–72 characters in .env before running npm run admin:create.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = 'admin'`,
    [name, email, passwordHash],
  );
  console.log(`Administrator account is ready for ${email}.`);
}

main()
  .catch((error) => {
    console.error('Unable to create administrator account.', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
