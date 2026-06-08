const { Pool } = require('pg');

const useDiscreteConfig = Boolean(
  process.env.DB_HOST &&
  process.env.DB_USER &&
  process.env.DB_PASSWORD &&
  process.env.DB_NAME
);

const sslEnabled = process.env.DB_SSL === 'true';

const poolConfig = useDiscreteConfig
  ? {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    }
  : {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : false,
    };

const pool = new Pool(poolConfig);

module.exports = pool;
