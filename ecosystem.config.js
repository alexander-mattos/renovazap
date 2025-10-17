module.exports = {
  apps: [
    {
      name: 'renovazap',
      script: './server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://user:password@localhost:5432/renovazap_prod',
        JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production',
        // Adicione outras variáveis de ambiente necessárias
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://user:password@localhost:5432/renovazap_prod',
        JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production',
      },
      // Configurações de log
      log_file: './logs/renovazap.log',
      out_file: './logs/renovazap-out.log',
      error_file: './logs/renovazap-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart automático
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      
      // Configurações de ambiente
      merge_logs: true,
      kill_timeout: 5000,
    }
  ]
};