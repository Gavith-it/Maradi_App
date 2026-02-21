require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
    try {
        console.log('Creating price_lists table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS price_lists (
                price_list_id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Creating price_list_items table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS price_list_items (
                price_list_id INT REFERENCES price_lists(price_list_id) ON DELETE CASCADE,
                item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
                price DECIMAL(10, 2) NOT NULL,
                PRIMARY KEY (price_list_id, item_id)
            )
        `);

        console.log('Altering users table...');
        try {
            await pool.query(`
                ALTER TABLE users ADD COLUMN price_list_id INT REFERENCES price_lists(price_list_id) ON DELETE SET NULL
            `);
        } catch (err) {
            if (err.code === '42701') {
                console.log('Column price_list_id already exists on users table, skipping.');
            } else {
                throw err;
            }
        }

        console.log('Migration successful.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
