import { pool } from './src/db/index';

async function checkSerialHistory() {
    const client = await pool.connect();
    try {
        console.log("Checking the most recent serials that have been manipulated...");

        let res = await client.query(`
            SELECT serial_id, serial_number, status, sold_type, item_id
            FROM serials
            ORDER BY serial_id DESC
            LIMIT 10
        `);
        console.log("\nLast 10 created/updated serials by ID:");
        console.table(res.rows);

        res = await client.query(`
            SELECT serial_id, serial_number, status, sold_type, item_id, sold_date
            FROM serials
            WHERE status = 'sold' OR status = 'available'
            ORDER BY sold_date DESC NULLS LAST
            LIMIT 5
        `);
        console.log("\nLast 5 items involved in sold operations:");
        console.table(res.rows);

    } catch (e: any) {
        console.error(e.message);
    } finally {
        client.release();
        process.exit();
    }
}
checkSerialHistory();
