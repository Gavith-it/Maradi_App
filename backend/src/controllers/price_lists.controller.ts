import { Request, Response } from 'express';
import { query } from '../db';

export const getPriceLists = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM price_lists ORDER BY created_at DESC', []);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createPriceList = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    try {
        const result = await query(
            'INSERT INTO price_lists (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        if (error.code === '23505') { // unique violation
            return res.status(400).json({ message: 'A price list with this name already exists' });
        }
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getPriceListItems = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Fetch all items and left join with price_list_items for the specific price list
        const result = await query(`
            SELECT 
                i.item_id, 
                i.item_code, 
                i.item_name, 
                i.master_price, 
                pli.price AS current_price,
                (SELECT image_url FROM item_images WHERE item_id = i.item_id AND is_master = true LIMIT 1) as image_url
            FROM items i
            LEFT JOIN price_list_items pli 
                ON i.item_id = pli.item_id AND pli.price_list_id = $1
            ORDER BY i.created_at DESC
        `, [id]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updatePriceListItems = async (req: Request, res: Response) => {
    const { id } = req.params; // price_list_id
    const { items } = req.body; // Array of { item_id, price }

    if (!Array.isArray(items)) {
        return res.status(400).json({ message: 'Items must be an array' });
    }

    try {
        const deleteItemIds: number[] = [];
        const upsertItemIds: number[] = [];
        const upsertPrices: number[] = [];

        for (const item of items) {
            if (item.price === null || item.price === undefined || item.price === '') {
                deleteItemIds.push(item.item_id);
            } else {
                upsertItemIds.push(item.item_id);
                upsertPrices.push(parseFloat(item.price));
            }
        }

        // Begin transaction
        await query('BEGIN', []);

        if (deleteItemIds.length > 0) {
            await query(
                'DELETE FROM price_list_items WHERE price_list_id = $1 AND item_id = ANY($2::int[])',
                [id, deleteItemIds]
            );
        }

        if (upsertItemIds.length > 0) {
            await query(`
                INSERT INTO price_list_items (price_list_id, item_id, price)
                SELECT $1, unnest($2::int[]), unnest($3::numeric[])
                ON CONFLICT (price_list_id, item_id) DO UPDATE SET price = EXCLUDED.price
            `, [id, upsertItemIds, upsertPrices]);
        }

        await query('COMMIT', []);
        res.json({ message: 'Price list updated successfully' });
    } catch (error) {
        await query('ROLLBACK', []);
        console.error(error);
        res.status(500).json({ message: 'Server error during bulk update' });
    }
};
