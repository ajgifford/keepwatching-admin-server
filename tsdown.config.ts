import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { server: 'src/server.ts' },
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  deps: {
    neverBundle: [
      '@ajgifford/keepwatching-common-server',
      '@ajgifford/keepwatching-types',
      'body-parser',
      'compression',
      'cors',
      'dotenv',
      'express',
      'express-async-handler',
      'express-rate-limit',
      'firebase-admin',
      'helmet',
      'knex',
      'morgan',
      'mysql2',
      'tail',
      'uuid',
      'winston',
      'winston-daily-rotate-file',
      'zod',
    ],
  },
});
