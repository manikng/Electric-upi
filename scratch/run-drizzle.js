const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const idx = trimmed.indexOf('=');
    if (idx === -1) return;

    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();

    // Remove wrapping quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    if (key === 'DATABASE_URL' && val.startsWith('postgresql://')) {
      try {
        const withoutPrefix = val.slice('postgresql://'.length);
        const lastAtIdx = withoutPrefix.lastIndexOf('@');
        if (lastAtIdx !== -1) {
          const userPass = withoutPrefix.slice(0, lastAtIdx);
          const hostDb = withoutPrefix.slice(lastAtIdx + 1);
          const colonIdx = userPass.indexOf(':');
          if (colonIdx !== -1) {
            const username = userPass.slice(0, colonIdx);
            const password = userPass.slice(colonIdx + 1);
            // URL-encode the password
            const encodedPassword = encodeURIComponent(password);
            val = `postgresql://${username}:${encodedPassword}@${hostDb}`;
            console.log('Encoded special characters in DATABASE_URL password for Drizzle-Kit.');
          }
        }
      } catch (err) {
        console.warn('Failed to parse and encode DATABASE_URL password:', err.message);
      }
    }

    env[key] = val;
  });

  // Inject env vars
  Object.assign(process.env, env);

  console.log('Successfully loaded environment variables. Running drizzle-kit push...');
  try {
    execSync('npx drizzle-kit push', { stdio: 'pipe', shell: true });
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('drizzle-kit stdout:', err.stdout?.toString());
    console.error('drizzle-kit stderr:', err.stderr?.toString());
    throw err;
  }
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
