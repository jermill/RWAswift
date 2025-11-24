/**
 * Database Configuration and Connection
 * Handles PostgreSQL connection via pg library
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection can't be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Pool error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Pool connection event
pool.on('connect', (client) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ New database client connected');
  }
});

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Database query error:', {
      text,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise} Database client
 */
const getClient = async () => {
  const client = await pool.connect();
  
  // Add query method to client
  const originalQuery = client.query;
  const originalRelease = client.release;
  
  // Track if client has been released
  let isReleased = false;
  
  // Override query to log
  client.query = async (...args) => {
    const start = Date.now();
    try {
      const res = await originalQuery.apply(client, args);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { duration, rows: res.rowCount });
      }
      
      return res;
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    }
  };
  
  // Override release to prevent double-release
  client.release = () => {
    if (isReleased) {
      console.warn('Client already released');
      return;
    }
    isReleased = true;
    originalRelease.apply(client);
  };
  
  return client;
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    console.log('✅ Database connected:', {
      time: result.rows[0].now,
      version: result.rows[0].version.split(',')[0]
    });
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Close all database connections
 * @returns {Promise<void>}
 */
const close = async () => {
  try {
    await pool.end();
    console.log('✅ Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error.message);
    throw error;
  }
};

/**
 * Run database migrations
 * @returns {Promise<void>}
 */
const runMigrations = async () => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    console.log('🔄 Running database migrations...');
    
    const migrationsDir = path.join(__dirname, '../../../database/migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`  Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await query(sql);
        console.log(`  ✅ ${file} applied`);
      }
    }
    
    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
};

/**
 * Check if database tables exist
 * @returns {Promise<boolean>}
 */
const checkTablesExist = async () => {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'verifications', 'documents')
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log('📊 Existing tables:', tables.join(', '));
    
    return tables.length >= 3;
  } catch (error) {
    console.error('Error checking tables:', error.message);
    return false;
  }
};

module.exports = {
  query,
  getClient,
  pool,
  testConnection,
  close,
  runMigrations,
  checkTablesExist
};

