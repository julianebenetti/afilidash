module.exports = {
  apps: [
    {
      name: 'financeiro-dashboard',
      script: './server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data'],
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true
    }
  ],
  deploy: {
    production: {
      user: 'root',
      host: 'seu-ip-vps',
      ref: 'origin/claude/deploy-financeiro-vps-o6isl9',
      repo: 'https://github.com/julianebenetti/afilidash.git',
      path: '/home/afilidash',
      'post-deploy': 'npm install && pm2 restart ecosystem.config.js --env production'
    }
  }
};
