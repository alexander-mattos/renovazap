module.exports = {
  apps: [
    {
      name: 'renovazap-backend',
      script: 'npm',
      args: 'run dev:backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      }
    },
    {
      name: 'renovazap-frontend',
      script: 'npm',
      args: 'run dev:frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5173,
        VITE_API_URL: 'http://localhost:3001'
      }
    }
  ]
};