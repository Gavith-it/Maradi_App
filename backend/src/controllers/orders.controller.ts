import { Request, Response } from 'express';
import { query } from '../db';
import { AuthRequest } from '../utils/auth';

export const placeOrder = async (req: AuthRequest, res: Response) => {
    const user_id = req.user.id;
    const { notes } = req.body;

    // Use a transaction for data integrity
    const client = await (await import('../db')).pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get cart items
        const cartItemsResult = await client.query(`
            SELECT c.*, s.item_id, s.serial_number, i.master_price 
            FROM cart c
            JOIN serials s ON c.serial_id = s.serial_id
            JOIN items i ON s.item_id = i.item_id
            WHERE c.customer_id = $1 AND c.expires_at > NOW()
        `, [user_id]);

        if (cartItemsResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cart is empty or items expired' });
        }

        const cartItems = cartItemsResult.rows;
        const totalAmount = cartItems.reduce((sum: number, item: any) => sum + Number(item.master_price), 0);

        // 2. Create Order
        const orderNumber = `ORD-${Date.now()}`; // Simple generation for MVP
        const orderResult = await client.query(`
            INSERT INTO orders (order_number, customer_id, total_amount, notes, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING order_id
        `, [orderNumber, user_id, totalAmount, notes]);

        const orderId = orderResult.rows[0].order_id;

        // 3. Move items to order_items and update serial status
        for (const item of cartItems) {
            // Add to order_items
            await client.query(`
                INSERT INTO order_items (order_id, item_id, serial_id, quantity, price)
                VALUES ($1, $2, $3, $4, $5)
            `, [orderId, item.item_id, item.serial_id, 1, item.master_price]);

            // Mark serial as sold
            await client.query(`
                UPDATE serials SET status = 'sold', sold_date = NOW(), sold_to = $1, sold_type = 'b2b'
                WHERE serial_id = $2
            `, [user_id, item.serial_id]);
        }

        // 4. Clear Cart
        await client.query('DELETE FROM cart WHERE customer_id = $1', [user_id]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Order placed successfully', orderId, orderNumber });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error during checkout' });
    } finally {
        client.release();
    }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
    const user_id = req.user.id;
    try {
        const result = await query(`
            SELECT o.*, 
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) as item_count
            FROM orders o 
            WHERE o.customer_id = $1 
            ORDER BY o.order_date DESC
        `, [user_id]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAllOrders = async (req: AuthRequest, res: Response) => {
    // Role check (simple version, ideally in middleware)
    if (req.user.role === 'customer') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const result = await query(`
            SELECT o.*, u.email as customer_email, u.company_name,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) as item_count
            FROM orders o
            JOIN users u ON o.customer_id = u.user_id
            WHERE o.status = 'pending'
            ORDER BY o.order_date DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getOrderDetails = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;

    try {
        // Fetch Order
        const orderResult = await query(`
            SELECT o.*, u.email as customer_email, u.company_name, u.phone
            FROM orders o
            JOIN users u ON o.customer_id = u.user_id
            WHERE o.order_id = $1
        `, [id]);

        if (orderResult.rows.length === 0) return res.status(404).json({ message: 'Order not found' });

        const order = orderResult.rows[0];

        // Access Control
        if (user_role === 'customer' && order.customer_id !== user_id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Fetch Items
        const itemsResult = await query(`
            SELECT oi.*, i.item_name, i.item_code, s.serial_number, s.image_url
            FROM order_items oi
            JOIN items i ON oi.item_id = i.item_id
            JOIN serials s ON oi.serial_id = s.serial_id
            WHERE oi.order_id = $1
        `, [id]);

        res.json({ ...order, items: itemsResult.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const user_role = req.user.role;

    // Only internal users can update status for now
    if (user_role === 'customer') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        await query('UPDATE orders SET status = $1 WHERE order_id = $2', [status, id]);
        res.json({ message: 'Order status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateOrderItemStatus = async (req: AuthRequest, res: Response) => {
    const { itemId } = req.params; // This is order_item_id
    const { status } = req.body;
    const user_role = req.user.role;

    if (user_role === 'customer') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const client = await (await import('../db')).pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update Order Item Status
        const result = await client.query(
            'UPDATE order_items SET status = $1 WHERE order_item_id = $2 RETURNING serial_id, order_id, price',
            [status, itemId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Order item not found' });
        }

        const { serial_id: serialId, order_id: orderId, price } = result.rows[0];

        // 2. If rejected, release stock (Serial) and deduct price from total
        if (status === 'rejected') {
            if (serialId) {
                await client.query(`
                    UPDATE serials 
                    SET status = 'available', sold_to = NULL, sold_date = NULL, sold_type = NULL
                    WHERE serial_id = $1
                `, [serialId]);
            }

            // Deduct the price from the order's total amount
            await client.query(`
                UPDATE orders 
                SET total_amount = total_amount - $1 
                WHERE order_id = $2
            `, [price, orderId]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Item status updated' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};
