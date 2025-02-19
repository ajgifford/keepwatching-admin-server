// src/config/database.ts
import { logger } from '../logger/logger';
import knex, { Knex } from 'knex';

// Database configuration
const dbConfig: Knex.Config = {
  client: 'mysql',
  connection: {
    host: process.env.MYSQL_HOST || '',
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PWD || '',
    database: process.env.MYSQL_DB || '',
    port: 3306,
  },
  pool: {
    min: 2,
    max: 10,
  },
  // Add debug logging in development
  debug: process.env.NODE_ENV === 'development',
};

// Create database instance
export const db = knex(dbConfig);

// Define transaction types
export type Transaction = Knex.Transaction;

// Enhanced transaction wrapper with proper typing
export const withTransaction = async <T>(handler: (trx: Transaction) => Promise<T>): Promise<T> => {
  const trx = await db.transaction();

  try {
    const result = await handler(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();

    // Log transaction error
    logger.error('Transaction failed', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
};

// Middleware to handle database connection errors
export const checkDatabaseConnection = async () => {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    const connectionConfig = dbConfig.connection;

    let connectionInfo: Record<string, unknown> = {};

    if (typeof connectionConfig === 'string') {
      connectionInfo = { connectionString: connectionConfig };
    } else if (typeof connectionConfig === 'object' && connectionConfig !== null) {
      // Extract relevant connection info based on the database client
      if ('host' in connectionConfig) connectionInfo.host = connectionConfig.host;
      if ('database' in connectionConfig) connectionInfo.database = connectionConfig.database;
      if ('port' in connectionConfig) connectionInfo.port = connectionConfig.port;
      if ('user' in connectionConfig) connectionInfo.user = connectionConfig.user;
    }

    logger.error('Database connection failed', {
      error,
      config: connectionInfo,
    });
    throw new Error('Unable to connect to the database');
  }
};

// Example usage with a repository pattern
export class BaseRepository {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // Method that uses transaction
  async createWithTransaction<T>(data: Partial<T>, trx?: Transaction): Promise<T> {
    const query = (trx || db)(this.tableName);
    const result = await query.insert(data).returning('*');

    return result[0] as T;
  }
}
