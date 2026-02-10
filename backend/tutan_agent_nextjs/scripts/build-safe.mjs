import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = {
  ...process.env,
  USERPROFILE: __dirname,
  HOME: __dirname,
  NEXT_PRIVATE_LOCAL_NFT: '1'
};

console.log(`[Build] Starting Next.js build with restricted root: ${__dirname}`);

const child = spawn('npx', ['next', 'build'], {
  stdio: 'inherit',
  env,
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
