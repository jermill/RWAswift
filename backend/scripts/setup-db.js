/**
 * Database Setup Script
 * Initializes database, runs migrations, and optionally seeds test data
 */

require('dotenv').config();
const { testConnection, runMigrations, checkTablesExist, query, close } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');
  
  try {
    // Step 1: Test connection
    console.log('📡 Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }
    console.log('');
    
    // Step 2: Check existing tables
    console.log('🔍 Checking existing tables...');
    const tablesExist = await checkTablesExist();
    console.log('');
    
    // Step 3: Run migrations
    if (!tablesExist || process.argv.includes('--force')) {
      await runMigrations();
      console.log('');
    } else {
      console.log('ℹ️  Tables already exist. Use --force to re-run migrations\n');
    }
    
    // Step 4: Seed test data (only if --seed flag is provided)
    if (process.argv.includes('--seed')) {
      console.log('🌱 Seeding test data...');
      const seedFile = path.join(__dirname, '../../database/seeds/001_test_data.sql');
      
      if (fs.existsSync(seedFile)) {
        const sql = fs.readFileSync(seedFile, 'utf8');
        await query(sql);
        console.log('✅ Test data seeded\n');
      } else {
        console.log('⚠️  Seed file not found\n');
      }
    }
    
    // Step 5: Verify setup
    console.log('✅ Verifying setup...');
    const verification = await query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
        (SELECT COUNT(*) FROM organizations) as org_count,
        (SELECT COUNT(*) FROM verifications) as verification_count
    `);
    
    console.log('📊 Database statistics:');
    console.log(`   Tables: ${verification.rows[0].table_count}`);
    console.log(`   Organizations: ${verification.rows[0].org_count}`);
    console.log(`   Verifications: ${verification.rows[0].verification_count}`);
    console.log('');
    
    console.log('🎉 Database setup complete!\n');
    
    // Display test organization API key if seeded
    if (process.argv.includes('--seed')) {
      console.log('🔑 Test API Key: rwa_test_sk_1234567890abcdef');
      console.log('🔑 Test Organization ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11\n');
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await close();
  }
}

// Run setup
setupDatabase();

