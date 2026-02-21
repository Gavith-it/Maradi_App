import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { generateToken } from '../utils/auth';

export const register = async (req: Request, res: Response) => {
    const { email, password, role, company_name, phone, price_list_id } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO users (email, password_hash, role, company_name, phone, price_list_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, email, role, price_list_id`,
            [email, hashedPassword, role, company_name, phone, price_list_id || null]
        );

        const user = result.rows[0];
        const token = generateToken({ id: user.user_id, role: user.role });

        res.status(201).json({ user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = generateToken({ id: user.user_id, role: user.role });
        res.json({ user: { id: user.user_id, email: user.email, role: user.role }, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
