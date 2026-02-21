import { query } from '../db';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from root of backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const seedAdmin = async () => {
    try {
        console.log('Seeding admin user...');

        const email = 'owner@maradi.com';
        const password = 'owner123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const checkUser = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            console.log('Admin user already exists.');
            return;
        }

        // Create user
        await query(
            `INSERT INTO users (email, password_hash, role, company_name, phone) 
             VALUES ($1, $2, 'owner', 'Maradi Owner', '9999999999')`,
            [email, hashedPassword]
        );

        console.log(`Admin user created: ${email} / ${password}`);
    } catch (error) {
        console.error('Error seeding admin:', error);
    } finally {
        process.exit();
    }
};

seedAdmin();
