const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: './.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query('SELECT user_id, email, password_hash, company_name FROM users WHERE role=$1 ORDER BY created_at DESC LIMIT 5', ['customer']);
        fs.writeFileSync('users_out.json', JSON.stringify(res.rows, null, 2));
        console.log('Success, rows written to users_out.json');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
