import { Request, Response } from 'express';
import { query, pool } from '../db';

export const getItems = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id; // Assuming authenticateToken sets req.user.id

        // Join to check if the user has a price_list_id, and if so, fetch their custom price.
        // We use COALESCE to fallback to the master_price if no custom price exists.
        const result = await query(`
            SELECT 
                i.*, 
                COALESCE(pli.price, i.master_price) AS master_price,
                COALESCE(s_count.cnt, 0)::int as stock_quantity,
                s_img.image_url
            FROM items i
            LEFT JOIN users u ON u.user_id = $1
            LEFT JOIN price_list_items pli ON pli.item_id = i.item_id AND pli.price_list_id = u.price_list_id
            LEFT JOIN (
                SELECT item_id, COUNT(*) as cnt 
                FROM serials 
                WHERE status = 'available' 
                GROUP BY item_id
            ) s_count ON i.item_id = s_count.item_id
            LEFT JOIN (
                SELECT DISTINCT ON (item_id) item_id, image_url 
                FROM serials 
                ORDER BY item_id, date_added DESC
            ) s_img ON i.item_id = s_img.item_id
            WHERE i.is_active = true
            ORDER BY i.created_at DESC
        `, [userId || null]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getInStockItems = async (req: Request, res: Response) => {
    try {
        const result = await query(`
            SELECT 
                i.*, 
                COALESCE(s_count.cnt, 0)::int as stock_quantity,
                s_img.image_url
            FROM items i
            INNER JOIN (
                SELECT item_id, COUNT(*) as cnt 
                FROM serials 
                WHERE status = 'available' 
                GROUP BY item_id
            ) s_count ON i.item_id = s_count.item_id
            LEFT JOIN (
                SELECT DISTINCT ON (item_id) item_id, image_url 
                FROM serials 
                WHERE status = 'available'
                ORDER BY item_id, date_added DESC
            ) s_img ON i.item_id = s_img.item_id
            WHERE i.is_active = true AND s_count.cnt > 0
            ORDER BY i.item_name ASC
        `, []);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching in-stock items' });
    }
};

export const getItemByCode = async (req: Request, res: Response) => {
    const { code } = req.params;
    try {
        const result = await query('SELECT * FROM items WHERE item_code = $1', [code]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const addStock = async (req: Request, res: Response) => {
    // Workflow: 
    // 1. Receive Item Code + Serial Number + Image
    // 2. Validate Item exists
    // 3. Insert Serial

    const { item_code, serial_number, image_url, user_id, item_name } = req.body;

    try {
        // 1. Check if item exists
        let itemId;
        const itemResult = await query('SELECT item_id FROM items WHERE item_code = $1', [item_code]);

        if (itemResult.rows.length === 0) {
            // Logic requested by user: If item doesn't exist, create it automatically.
            console.log(`Item master not found for ${item_code}. Auto-creating...`);

            // Use the provided name or fallback if unknown.
            const nameToUse = item_name || `Item ${item_code}`;

            const newItemResult = await query(
                `INSERT INTO items (item_code, item_name, category, master_price)
                 VALUES ($1, $2, 'Uncategorized', 0) RETURNING item_id`,
                [item_code, nameToUse]
            );
            itemId = newItemResult.rows[0].item_id;
        } else {
            itemId = itemResult.rows[0].item_id;
        }

        // 2. Check duplicate serial
        const serialCheck = await query('SELECT serial_id FROM serials WHERE serial_number = $1', [serial_number]);
        if (serialCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Serial number already exists' });
        }

        // 3. Insert Serial
        const result = await query(
            `INSERT INTO serials (item_id, serial_number, image_url, added_by, status)
       VALUES ($1, $2, $3, $4, 'available') RETURNING *`,
            [itemId, serial_number, image_url, user_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update Item Master
export const updateItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { item_name, master_price, category } = req.body;

    try {
        const result = await query(
            `UPDATE items SET item_name = $1, master_price = $2, category = $3 
             WHERE item_id = $4 RETURNING *`,
            [item_name, master_price, category, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete Item (and cascade delete serials)
export const deleteItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM items WHERE item_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get ALL Serials for Admin (Available + Sold)
export const getAllItemSerials = async (req: Request, res: Response) => {
    const { code } = req.params;
    try {
        const result = await query(`
        SELECT s.*, i.item_name, u.company_name as sold_to_name
        FROM serials s
        JOIN items i ON s.item_id = i.item_id
        LEFT JOIN users u ON s.sold_to = u.user_id
        WHERE i.item_code = $1
        ORDER BY s.date_added DESC
     `, [code]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAvailableSerials = async (req: Request, res: Response) => {
    const { code } = req.params;
    try {
        const result = await query(`
        SELECT s.*, i.item_name, i.master_price 
        FROM serials s
        JOIN items i ON s.item_id = i.item_id
        WHERE i.item_code = $1 AND s.status = 'available'
     `, [code]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create Item Master manually (and optionally add initial stock)
export const createItem = async (req: Request, res: Response) => {
    const { item_code, item_name, category, master_price, image_url, serial_number } = req.body;
    const userId = (req as any).user?.user_id || 1; // Default to 1 if not set (for safety, though auth should handle it)

    if (!serial_number) {
        return res.status(400).json({ message: 'Serial number is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check uniqueness of Item Code
        const check = await client.query('SELECT item_id FROM items WHERE item_code = $1', [item_code]);
        if (check.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Item code already exists' });
        }

        // Insert Item Master
        const result = await client.query(
            `INSERT INTO items (item_code, item_name, category, master_price, is_active)
             VALUES ($1, $2, $3, $4, true) RETURNING *`,
            [item_code, item_name, category, master_price]
        );
        const newItem = result.rows[0];

        // Insert Serial Number (Mandatory now)
        const serialCheck = await client.query('SELECT serial_id FROM serials WHERE serial_number = $1', [serial_number]);
        if (serialCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Serial number already exists' });
        }

        await client.query(
            `INSERT INTO serials (item_id, serial_number, image_url, added_by, status)
                 VALUES ($1, $2, $3, $4, 'available')`,
            [newItem.item_id, serial_number, image_url, userId]
        );

        await client.query('COMMIT');
        res.status(201).json(newItem);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

// Simplified Image Upload (Placeholder for S3)
export const getUploadUrl = async (req: Request, res: Response) => {
    // In production, return a pre-signed S3 URL
    // For MVP local dev, we might accept base64 or a direct file POST 
    // user would POST image to /api/upload
    res.json({ uploadUrl: 'http://localhost:5000/uploads/placeholder.jpg', key: 'placeholder.jpg' });
};
