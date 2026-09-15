const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..', 'back');
const env = {
  ...process.env,
  PORT: '3001',
  DATA_FILE: path.join(__dirname, 'fixtures', 'data.json'),
  USERS_FILE: path.join(__dirname, 'fixtures', 'users.json'),
};

const child = spawn(process.execPath, [path.join(root, 'server.js')], {
  env,
  stdio: 'inherit',
  cwd: root,
});

child.on('exit', (code) => {
  console.log(`dev-backend saiu com código ${code}`);
});
