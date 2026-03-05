import { pool } from './db';

async function checkUsers() {
    try {
        const res = await pool.query('SELECT user_id, email, role, password_hash, company_name FROM users ORDER BY created_at DESC LIMIT 5');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkUsers();
