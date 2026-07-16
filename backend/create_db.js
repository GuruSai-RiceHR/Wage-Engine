const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const connectionString = process.env.DATABASE_URL.replace(/\/wage_engine$/, '/postgres');

console.log("Connecting to:", connectionString);
const client = new Client({ connectionString });

client.connect()
  .then(async () => {
    console.log("Connected to PostgreSQL system database.");
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname='wage_engine'");
    if (res.rowCount === 0) {
      await client.query("CREATE DATABASE wage_engine");
      console.log("Database 'wage_engine' created successfully!");
    } else {
      console.log("Database 'wage_engine' already exists.");
    }
    await client.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Error creating database:", err);
    process.exit(1);
  });
