import { pool } from './src/db/index';

async function reproduceNewStock() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("1. Adding brand new stock via SQL to test new case parsing...");
        const item_code = 'NEW-ITEM-X';
        const item_name = 'New Item X';
        const category = 'Sarees - Zari Silk';
        // AddStock payload now upperCases the serial
        const serial_number = 'FRESH-SERIAL-123';

        await client.query(`
            INSERT INTO items (item_code, item_name, category, inventory_type, master_price)
            VALUES ($1, $2, $3, 'serial', 0)
            ON CONFLICT (item_code) DO NOTHING
        `, [item_code, item_name, category]);

        const rawItem = await client.query(`SELECT item_id FROM items WHERE item_code = $1`, [item_code]);
        const realItemId = rawItem.rows[0].item_id;

        await client.query(`DELETE FROM serials WHERE serial_number = $1`, [serial_number]);
        // Insert as freshly AVAILABLE
        await client.query(`
            INSERT INTO serials (item_id, serial_number, status) 
            VALUES ($1, $2, 'available')
        `, [realItemId, serial_number]);

        console.log("2. Item and Serial set up in DB: FRESH-SERIAL-123, status = available");
        await client.query('COMMIT');
    } catch (e: any) {
        await client.query('ROLLBACK');
        console.error("ERROR CAUGHT:", e);
    } finally {
        client.release();
    }
}
reproduceNewStock().then(() => process.exit());
