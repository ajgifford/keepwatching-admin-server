module.exports = {
  apps: [
    {
      name: 'keepwatching-admin-server',
      script: 'dist/server.mjs',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3034,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3034,
      },
      merge_logs: true,
    },
    {
      name: 'keepwatching-admin-server-dev',
      script: 'tsx',
      args: 'watch src/server.ts',
      instances: 1,
      exec_mode: 'fork',
      watch: ['src'],
      ignore_watch: ['node_modules', 'dist', 'logs', 'uploads'],
      watch_options: {
        followSymlinks: false,
      },
      env: {
        NODE_ENV: 'development',
        PORT: 3034,
      },
      merge_logs: true,
    },
  ],
};
