/**
 * PM2 Ecosystem Configuration for Hostinger Deployment
 *
 * PM2 is a production process manager for Node.js applications.
 * Hostinger's Node.js hosting uses PM2 to run your application.
 */

module.exports = {
  apps: [
    {
      name: 'mavesoj',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
