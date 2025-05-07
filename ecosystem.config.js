module.exports = {
  apps: [
    {
      name: 'keepwatching-admin-server',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/keepwatching-admin-server-error.log',
      out_file: 'logs/keepwatching-admin-server-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'keepwatching-admin-server-dev',
      script: 'tsx',
      args: 'watch src/server.ts',
      instances: 1,
      autorestart: true,
      watch: ['src'],
      ignore_watch: ['node_modules', 'dist', 'logs', 'uploads'],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/keepwatching-admin-server-dev-error.log',
      out_file: 'logs/keepwatching-admin-server-dev-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
