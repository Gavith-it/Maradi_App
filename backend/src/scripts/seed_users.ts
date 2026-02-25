import { query, pool } from '../db';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedUsers = async () => {
    try {
        console.log('Seeding test users...');
        const passwordAcc = 'SecureMaradi#2026!';
        const hashedPassword = await bcrypt.hash(passwordAcc, 10);

        // 1. Internal User (Staff)
        const staffEmail = 'staff@maradi.com';
        const staffCheck = await query('SELECT * FROM users WHERE email = $1', [staffEmail]);
        if (staffCheck.rows.length === 0) {
            await query(
                `INSERT INTO users (email, password_hash, role, company_name, phone) 
                 VALUES ($1, $2, 'internal_user', 'Maradi Staff', '9876543210')`,
                [staffEmail, hashedPassword]
            );
            console.log(`Created Staff: ${staffEmail} / ${passwordAcc}`);
        } else {
            await query(
                `UPDATE users SET password_hash = $1 WHERE email = $2`,
                [hashedPassword, staffEmail]
            );
            console.log(`Updated existing Staff password: ${staffEmail} / ${passwordAcc}`);
        }

        // 2. Customer User
        const custEmail = 'customer@gmail.com';
        const custCheck = await query('SELECT * FROM users WHERE email = $1', [custEmail]);
        if (custCheck.rows.length === 0) {
            await query(
                `INSERT INTO users (email, password_hash, role, company_name, phone, price_list) 
                 VALUES ($1, $2, 'customer', 'Test Retails', '9123456780', 'A')`,
                [custEmail, hashedPassword]
            );
            console.log(`Created Customer: ${custEmail} / ${passwordAcc}`);
        } else {
            await query(
                `UPDATE users SET password_hash = $1 WHERE email = $2`,
                [hashedPassword, custEmail]
            );
            console.log(`Updated existing Customer password: ${custEmail} / ${passwordAcc}`);
        }

    } catch (error) {
        console.error('Error seeding users:', error);
    } finally {
        await pool.end();
    }
};

seedUsers();
