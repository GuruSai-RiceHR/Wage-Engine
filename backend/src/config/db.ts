import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost") && !process.env.DATABASE_URL.includes("127.0.0.1")
    ? { rejectUnauthorized: false }
    : false,
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export const initDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    console.log("⚙️ Initializing PostgreSQL database tables...");

    // Create ENUM type for roles if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN 
          CREATE TYPE user_role AS ENUM ('USER', 'ADMIN'); 
        END IF; 
      END $$;
    `);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        company_name VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'USER',
        is_paid BOOLEAN DEFAULT FALSE,
        simple_trial_used INT DEFAULT 0,
        dynamic_trial_used INT DEFAULT 0,
        validation_count INT DEFAULT 0,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create validation_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS validation_history (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        mode VARCHAR(20) NOT NULL,
        components JSONB NOT NULL,
        status VARCHAR(50) NOT NULL,
        issues JSONB,
        suggestions JSONB,
        recommended_structure JSONB,
        financial_impact JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create validation_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS validation_logs (
        id SERIAL PRIMARY KEY,
        validation_id INT REFERENCES validation_history(id) ON DELETE SET NULL,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        browser VARCHAR(255),
        device VARCHAR(255),
        operating_system VARCHAR(255),
        ip_address VARCHAR(100),
        api_endpoint VARCHAR(255) NOT NULL,
        http_status INT NOT NULL,
        execution_time INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create login_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        login_status VARCHAR(50) NOT NULL,
        browser VARCHAR(255),
        device VARCHAR(255),
        operating_system VARCHAR(255),
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ PostgreSQL database initialization completed.");
  } catch (error) {
    console.error("❌ Failed to initialize database tables:", error);
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
