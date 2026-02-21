import { query, pool } from '../db';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const migrate = async () => {
    try {
        console.log('Starting migration...');

        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema.sql...');
        await query(schema);

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
};

migrate();
