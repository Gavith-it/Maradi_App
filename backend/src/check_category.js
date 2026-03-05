require('dotenv').config();
const { Pool } = require('pg');

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
        const result = await pool.query("SELECT * FROM items WHERE item_code = 'FG-D00028-C8S1CT'");
        console.log(result.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
