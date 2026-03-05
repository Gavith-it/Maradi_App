import { pool } from './src/db/index';

async function wipeInventory() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log("Wiping all inventory data...");
        // This will cascade and delete item_images, serials, order_items, cart, price_list_items, and audit_discrepancies
        await client.query(`TRUNCATE TABLE items CASCADE`);

        // Also wipe orders so we don't have dangling orders with no items
        await client.query(`TRUNCATE TABLE orders CASCADE`);

        await client.query('COMMIT');
        console.log("SUCCESS: Inventory data (items, serials, images, orders) has been completely wiped.");
    } catch (e: any) {
        await client.query('ROLLBACK');
        console.error("ERROR Wiping Inventory:", e.message);
    } finally {
        client.release();
        process.exit();
    }
}

wipeInventory();
