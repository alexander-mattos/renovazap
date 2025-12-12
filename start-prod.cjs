const { spawn } = require('child_process');
const path = require('path');

// Backend (produção)
const backend = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: 3001
    }
});

// Frontend (produção)
const frontend = spawn('npm', ['run', 'preview'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: 5173
    }
});

backend.on('error', (err) => {
    console.error('Backend error:', err);
    process.exit(1);
});

frontend.on('error', (err) => {
    console.error('Frontend error:', err);
    process.exit(1);
});

process.on('exit', () => {
    backend.kill();
    frontend.kill();
});