import { Request, Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../utils/auth';

export const addToCart = async (req: AuthRequest, res: Response) => {
    const { serial_id, quantity } = req.body;
    const user_id = req.user.id;

    try {
        // 1. Check if serial is available
        const serialCheck = await query('SELECT status FROM serials WHERE serial_id = $1', [serial_id]);
        if (serialCheck.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
        if (serialCheck.rows[0].status !== 'available') return res.status(400).json({ message: 'Item already sold or reserved' });

        // 2. Add to cart with expiry (15 mins from now)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Upsert logic (if user has item, update qty/time) - simplified for unique serials
        await query(
            `INSERT INTO cart (customer_id, serial_id, quantity, expires_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (customer_id, serial_id) 
             DO UPDATE SET expires_at = $4`,
            [user_id, serial_id, quantity || 1, expiresAt]
        );

        // 3. Mark serial as 'reserved' to prevent others from taking it
        await query('UPDATE serials SET status = $1 WHERE serial_id = $2', ['reserved', serial_id]);

        res.status(201).json({ message: 'Item added to cart', expires_at: expiresAt });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getCart = async (req: AuthRequest, res: Response) => {
    const user_id = req.user.id;
    try {
        // Clean up expired items first
        await query(`
            UPDATE serials SET status = 'available' 
            WHERE serial_id IN (SELECT serial_id FROM cart WHERE expires_at < NOW() AND customer_id = $1)
        `, [user_id]);

        await query('DELETE FROM cart WHERE expires_at < NOW() AND customer_id = $1', [user_id]);

        // Fetch valid cart items
        const result = await query(`
            SELECT c.cart_id, c.expires_at, s.serial_number, s.image_url, i.item_name, i.item_code, i.master_price 
            FROM cart c
            JOIN serials s ON c.serial_id = s.serial_id
            JOIN items i ON s.item_id = i.item_id
            WHERE c.customer_id = $1
        `, [user_id]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const removeFromCart = async (req: AuthRequest, res: Response) => {
    const { cart_id } = req.params;
    try {
        // Release reservation
        const cartItem = await query('SELECT serial_id FROM cart WHERE cart_id = $1', [cart_id]);
        if (cartItem.rows.length > 0) {
            await query('UPDATE serials SET status = $1 WHERE serial_id = $2', ['available', cartItem.rows[0].serial_id]);
        }

        await query('DELETE FROM cart WHERE cart_id = $1', [cart_id]);
        res.json({ message: 'Removed from cart' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
