import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // 👈 Required for Render Postgres connections
  }
});

const testDatabase = async () => {
  try {
   const result = await pool.query("SELECT current_database(), NOW()");
    console.log(`database Name: "${result.rows[0].current_database}"`);

  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

testDatabase();

export default pool;