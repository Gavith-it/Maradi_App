require('dotenv').config({ path: '../.env' });
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
        const itemResult = await pool.query("SELECT * FROM items WHERE item_code = 'FG-D00061-C8S1CW'");
        console.log('Item:', itemResult.rows);

        const serialResult = await pool.query("SELECT * FROM serials WHERE serial_number = 'E6441'");
        console.log('Serial Image:', serialResult.rows[0]?.image_url?.substring(0, 50) + '...');

        const imagesResult = await pool.query("SELECT image_type, LEFT(image_url, 30) as url_start FROM item_images WHERE item_id = $1", [itemResult.rows[0]?.item_id]);
        console.log('Master Images:', imagesResult.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
