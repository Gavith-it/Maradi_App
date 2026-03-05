const { Client } = require('pg');
const bcrypt = require('bcrypt');
const client = new Client({
    user: 'postgres.aqmlfhxwicxrskdxeyoc',
    host: 'aws-1-ap-northeast-1.pooler.supabase.com',
    database: 'postgres',
    password: 'Properdataapp1911',
    port: 6543
});

client.connect().then(async () => {
    try {
        const hash = await bcrypt.hash('password123', 10);
        await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [hash, 'owner@maradi.com']);
        console.log('Password updated for owner@maradi.com to password123');
        const res = await client.query('SELECT user_id, email, role FROM users WHERE email=$1', ['owner@maradi.com']);
        console.log(res.rows[0]);
    } catch (e) {
        console.error(e);
    }
}).finally(() => client.end());
