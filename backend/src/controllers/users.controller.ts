import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db';

export const getCustomers = async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT 
                u.user_id, 
                u.email, 
                u.company_name, 
                u.phone, 
                u.status, 
                u.price_list_id,
                p.name as price_list_name,
                u.created_at
            FROM users u
            LEFT JOIN price_lists p ON u.price_list_id = p.price_list_id
            WHERE u.role = 'customer'
            ORDER BY u.created_at DESC
        `, []);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching customers' });
    }
};

export const createCustomer = async (req: Request, res: Response) => {
    const { email, password, company_name, phone, price_list_id, status } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO users (email, password_hash, role, company_name, phone, price_list_id, status) 
             VALUES ($1, $2, 'customer', $3, $4, $5, $6) RETURNING user_id, email, company_name, status`,
            [email, hashedPassword, company_name, phone, price_list_id || null, status || 'active']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating customer' });
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { company_name, phone, price_list_id, status } = req.body;

    try {
        const result = await query(
            `UPDATE users 
             SET company_name = $1, phone = $2, price_list_id = $3, status = $4
             WHERE user_id = $5 AND role = 'customer'
             RETURNING user_id, email, company_name, phone, price_list_id, status`,
            [company_name, phone, price_list_id || null, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating customer' });
    }
};
