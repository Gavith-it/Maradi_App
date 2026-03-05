import { pool } from './src/db/index';

async function reproduce() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("1. Simulating scanner with trailing space on an existing marked-sold item...");
        const item_code = 'TEST-ITEM-3 '; // Notice trailing space
        const item_name = 'Test 3';
        const category = 'Sarees - Zari Silk';
        let invType = 'serial';
        const serial_number = 'TEST-SERIAL-3 '; // Notice trailing space

        // Setup raw data via SQL (like the real DB setup)
        await client.query(`
            INSERT INTO items (item_code, item_name, category, inventory_type, master_price)
            VALUES ('TEST-ITEM-3', 'Test 3', 'Sarees - Zari Silk', 'serial', 0)
            ON CONFLICT (item_code) DO NOTHING
        `);
        // Get the ID
        const rawItem = await client.query(`SELECT item_id FROM items WHERE item_code = 'TEST-ITEM-3'`);
        const realItemId = rawItem.rows[0].item_id;

        await client.query(`DELETE FROM serials WHERE serial_number = 'TEST-SERIAL-3'`);
        await client.query(`
            INSERT INTO serials (item_id, serial_number, status) 
            VALUES ($1, 'TEST-SERIAL-3', 'sold')
        `, [realItemId]);

        console.log("2. Item and Serial set up in DB (WITHOUT SPACES): TEST-ITEM-3, TEST-SERIAL-3, status = sold");

        // NOW RUN ADD STOCK LOGIC WITH THE "SPACED" scanner payloads
        let itemId;
        const itemResult = await client.query('SELECT item_id, inventory_type FROM items WHERE item_code = $1', [item_code]);
        if (itemResult.rows.length === 0) {
            console.log(">> item_code mismatch! Trying to INSERT new item...");
            const newItemResult = await client.query(
                `INSERT INTO items (item_code, item_name, category, inventory_type, master_price)
                 VALUES ($1, $2, $3, $4, 0) RETURNING item_id`,
                [item_code, item_name, category, invType]
            );
            itemId = newItemResult.rows[0].item_id;
        } else {
            itemId = itemResult.rows[0].item_id;
        }

        const serialCheck = await client.query('SELECT serial_id, status FROM serials WHERE serial_number = $1', [serial_number]);
        if (serialCheck.rows.length > 0) {
            console.log(">> Found serial! Doing UPDATE...");
        } else {
            console.log(">> Serial mismatch! Trying to INSERT new serial...");
            await client.query(
                `INSERT INTO serials (item_id, serial_number, image_url, quantity, added_by, status)
                 VALUES ($1, $2, $3, 1, $4, 'available')`,
                [itemId, serial_number, null, null]
            );
        }

        await client.query('COMMIT');
        console.log("SUCCESS");
    } catch (e: any) {
        await client.query('ROLLBACK');
        console.error("ERROR CAUGHT:");
        console.error("Code:", e.code);
        console.error("Constraint:", e.constraint);
        console.error("Detail:", e.detail);
        console.error("Message:", e.message);
    } finally {
        await client.query(`DELETE FROM serials WHERE serial_number LIKE 'TEST-SERIAL-3%'`);
        await client.query(`DELETE FROM items WHERE item_code LIKE 'TEST-ITEM-3%'`);
        client.release();
        process.exit();
    }
}
reproduce();
