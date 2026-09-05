const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
  console.log('🔄 Initializing DealFlow360 Database...');

  const host = process.env.MYSQL_HOST || 'localhost';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'dealflow360';

  console.log(`📡 Connecting to MySQL Server at ${host}:${port} as ${user}...`);

  let connection;
  try {
    // Step 1: Connect without database to ensure DB creation
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log(`✅ Connected! Ensuring database "${database}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);

    // Step 2: Execute schema.sql
    console.log('📜 Executing schema.sql (creating 37 relational tables)...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('✅ Schema created successfully!');

    // Step 3: Execute seed.sql
    console.log('🌱 Executing seed.sql (populating Gada Electronics data)...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    await connection.query(seedSql);
    console.log('✅ Seed data inserted successfully!');

    // Step 4: Verification count
    const [products] = await connection.query('SELECT COUNT(*) as count FROM products');
    const [customers] = await connection.query('SELECT COUNT(*) as count FROM customers');
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [warehouses] = await connection.query('SELECT COUNT(*) as count FROM warehouses');
    const [quotes] = await connection.query('SELECT COUNT(*) as count FROM quotations');

    console.log('\n📊 Database Initialization Summary:');
    console.log(`   - Users: ${users[0].count}`);
    console.log(`   - Customers: ${customers[0].count}`);
    console.log(`   - Products: ${products[0].count}`);
    console.log(`   - Warehouses: ${warehouses[0].count}`);
    console.log(`   - Seeded Quotations: ${quotes[0].count}`);
    console.log('\n🚀 DealFlow360 Database is fully initialized and ready!\n');
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
