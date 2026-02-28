import { Request, Response } from 'express';
import { query, pool } from '../db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

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
                s_img.image_url,
                img_agg.master_images
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
            LEFT JOIN (
                SELECT item_id, json_agg(json_build_object('type', image_type, 'url', image_url)) as master_images
                FROM item_images
                GROUP BY item_id
            ) img_agg ON i.item_id = img_agg.item_id
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
                s_img.image_url,
                s_count.latest_addition,
                img_agg.master_images
            FROM items i
            INNER JOIN (
                SELECT item_id, COUNT(*) as cnt, MAX(date_added) as latest_addition
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
            LEFT JOIN (
                SELECT item_id, json_agg(json_build_object('type', image_type, 'url', image_url)) as master_images
                FROM item_images
                GROUP BY item_id
            ) img_agg ON i.item_id = img_agg.item_id
            WHERE i.is_active = true AND s_count.cnt > 0
            ORDER BY s_count.latest_addition DESC, i.created_at DESC
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
        const result = await query(`
            SELECT 
                i.*,
                img_agg.master_images
            FROM items i
            LEFT JOIN (
                SELECT item_id, json_agg(json_build_object('type', image_type, 'url', image_url)) as master_images
                FROM item_images
                GROUP BY item_id
            ) img_agg ON i.item_id = img_agg.item_id
            WHERE i.item_code = $1
        `, [code]);
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
    // Expected payload: { item_code, serial_number (optional), image_url: string, quantity (optional), user_id, item_name, category }

    const { item_code, serial_number, image_url, quantity, user_id, item_name, category } = req.body;
    const stockQuantity = quantity ? parseInt(quantity, 10) : 1;

    // Fallback if no image provided
    const serialImageUrl = image_url || 'https://via.placeholder.com/300';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check if item exists
        let itemId;
        let invType = 'serial';
        const itemResult = await client.query('SELECT item_id, inventory_type FROM items WHERE item_code = $1', [item_code]);

        if (itemResult.rows.length === 0) {
            console.log(`Item master not found for ${item_code}. Auto-creating...`);
            const nameToUse = item_name || `Item ${item_code}`;
            const catToUse = category || 'Uncategorized';

            // Infer inventory type from category if auto-creating
            if (catToUse === 'Sarees - Zari Silk') invType = 'serial';
            else if (catToUse === 'Fabrics') invType = 'batch';
            else if (['Sarees - Other Silk', 'Dothis', 'Accessories'].includes(catToUse)) invType = 'none';

            const newItemResult = await client.query(
                `INSERT INTO items (item_code, item_name, category, inventory_type, master_price)
                 VALUES ($1, $2, $3, $4, 0) RETURNING item_id`,
                [item_code, nameToUse, catToUse, invType]
            );
            itemId = newItemResult.rows[0].item_id;
        } else {
            itemId = itemResult.rows[0].item_id;
            invType = itemResult.rows[0].inventory_type;
        }

        // 2. Handle Serial / Batch / Bulk insertion
        let insertedSerialCode = serial_number;
        let customMessage = 'Stock added successfully';

        if (invType === 'serial') {
            if (!serial_number) throw new Error('Serial number is required for this category');
            const serialCheck = await client.query('SELECT serial_id, status FROM serials WHERE serial_number = $1', [serial_number]);

            if (serialCheck.rows.length > 0) {
                const existingSerial = serialCheck.rows[0];
                if (existingSerial.status === 'sold') {
                    // Handle Sales Return
                    await client.query(
                        `UPDATE serials 
                         SET status = 'available', 
                             sold_to = NULL, 
                             sold_date = NULL, 
                             sold_type = NULL, 
                             image_url = COALESCE($1, image_url),
                             item_id = $2,
                             date_added = CURRENT_TIMESTAMP,
                             added_by = $3
                         WHERE serial_number = $4`,
                        [serialImageUrl, itemId, user_id, serial_number]
                    );
                    customMessage = 'Sales Return processed successfully';
                } else {
                    throw new Error(`Serial number already exists and is currently ${existingSerial.status}`);
                }
            } else {
                await client.query(
                    `INSERT INTO serials (item_id, serial_number, image_url, quantity, added_by, status)
                     VALUES ($1, $2, $3, 1, $4, 'available')`,
                    [itemId, serial_number, serialImageUrl, user_id]
                );
            }
        } else if (invType === 'batch') {
            if (!serial_number) throw new Error('Batch number is required for this category');
            // For batch, the serial_number field holds the batch code. Multiple identical batches are summed up later or kept as separate entries.
            await client.query(
                `INSERT INTO serials (item_id, serial_number, batch_number, image_url, quantity, added_by, status)
                 VALUES ($1, $2, $2, $3, $4, $5, 'available')`,
                [itemId, serial_number, serialImageUrl, stockQuantity, user_id]
            );
        } else {
            // Non-tracked (none). Generate a fake serial number for bulk entry grouping, e.g., BULK-itemId-timestamp
            insertedSerialCode = serial_number || `BULK-${itemId}-${Date.now()}`;
            await client.query(
                `INSERT INTO serials (item_id, serial_number, image_url, quantity, added_by, status)
                 VALUES ($1, $2, $3, $4, $5, 'available')`,
                [itemId, insertedSerialCode, serialImageUrl, stockQuantity, user_id]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: customMessage, serial_number: insertedSerialCode });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error adding stock:', error);
        res.status(400).json({ message: error.message || 'Server error' });
    } finally {
        client.release();
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
        SELECT s.*, i.item_name, u.company_name as sold_to_name, img_agg.master_images
        FROM serials s
        JOIN items i ON s.item_id = i.item_id
        LEFT JOIN users u ON s.sold_to = u.user_id
        LEFT JOIN (
            SELECT item_id, json_agg(json_build_object('type', image_type, 'url', image_url)) as master_images
            FROM item_images
            GROUP BY item_id
        ) img_agg ON i.item_id = img_agg.item_id
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
        SELECT s.*, i.item_name, i.master_price, img_agg.master_images 
        FROM serials s
        JOIN items i ON s.item_id = i.item_id
        LEFT JOIN (
            SELECT item_id, json_agg(json_build_object('type', image_type, 'url', image_url)) as master_images
            FROM item_images
            GROUP BY item_id
        ) img_agg ON i.item_id = img_agg.item_id
        WHERE i.item_code = $1 AND s.status = 'available'
     `, [code]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const createItem = async (req: Request, res: Response) => {
    const { item_code, item_name, category, inventory_type, unit_of_measure, master_price, image_url, serial_number, quantity } = req.body;
    const userId = (req as any).user?.user_id || 1;

    const invType = inventory_type || 'serial';
    const initQuantity = quantity ? parseInt(quantity, 10) : 1;

    if (invType === 'serial' && !serial_number) {
        return res.status(400).json({ message: 'Serial number is required for serial-tracked items' });
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
            `INSERT INTO items (item_code, item_name, category, inventory_type, unit_of_measure, master_price, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
            [item_code, item_name, category, invType, unit_of_measure || 'Each', master_price]
        );
        const newItem = result.rows[0];

        // Insert Initial Stock
        let insertedSerialCode = serial_number;
        if (invType === 'serial') {
            const serialCheck = await client.query('SELECT serial_id FROM serials WHERE serial_number = $1', [serial_number]);
            if (serialCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Serial number already exists' });
            }
            await client.query(
                `INSERT INTO serials (item_id, serial_number, image_url, quantity, added_by, status) VALUES ($1, $2, $3, 1, $4, 'available')`,
                [newItem.item_id, serial_number, image_url, userId]
            );
        } else {
            insertedSerialCode = serial_number || `BULK-${newItem.item_id}-${Date.now()}`;
            await client.query(
                `INSERT INTO serials (item_id, serial_number, image_url, quantity, added_by, status) VALUES ($1, $2, $3, $4, $5, 'available')`,
                [newItem.item_id, insertedSerialCode, image_url, initQuantity, userId]
            );
        }

        await client.query('COMMIT');
        res.status(201).json(newItem);
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: error.message || 'Server error' });
    } finally {
        client.release();
    }
};

// Simplified Image Upload (Placeholder for S3)
export const getUploadUrl = async (req: Request, res: Response) => {
    try {
        const s3Client = new S3Client({
            region: process.env.AWS_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        // Determine the file type and generate a unique key
        const extension = req.query.extension ? String(req.query.extension) : 'jpg';
        const uniqueId = crypto.randomUUID();
        const key = `uploads/${uniqueId}.${extension}`; // e.g., uploads/abc-123.jpg

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
            // You can optionally pass ContentType if sent from the frontend
            // ContentType: req.query.contentType ? String(req.query.contentType) : 'image/jpeg'
        });

        // Presigned URL expires in 300 seconds (5 minutes)
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        // The URL pattern where the final image will permanently live
        const finalUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        res.json({ uploadUrl, finalUrl, key });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        res.status(500).json({ message: 'Error generating upload URL' });
    }
};

// Add/Update Master Images (Pallu, Body, Border, etc.)
export const addMasterImages = async (req: Request, res: Response) => {
    const { code } = req.params;
    const { images } = req.body; // Expected format: [{ type: 'pallu', url: 'https...' }, ...]

    if (!images || !Array.isArray(images)) {
        return res.status(400).json({ message: 'Images array is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get the item_id for this code
        const itemResult = await client.query('SELECT item_id FROM items WHERE item_code = $1', [code]);
        if (itemResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Item code not found' });
        }
        const itemId = itemResult.rows[0].item_id;

        // 2. Delete existing master images of these types for this item to avoid duplicates overlapping
        for (const img of images) {
            await client.query(
                'DELETE FROM item_images WHERE item_id = $1 AND image_type = $2 AND is_master = true',
                [itemId, img.type]
            );
        }

        // 3. Insert the new master images
        for (const img of images) {
            if (['pallu', 'body', 'border', 'general'].includes(img.type) && img.url) {
                await client.query(
                    `INSERT INTO item_images (item_id, image_type, image_url, is_master) VALUES ($1, $2, $3, true)`,
                    [itemId, img.type, img.url]
                );
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Master images updated successfully' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error saving master images:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    } finally {
        client.release();
    }
};

// PUT /api/items/serial/:id
// Edit an individual serial's number and/or image.
export const updateSerial = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { serial_number, image_url } = req.body;

    if (!serial_number) {
        return res.status(400).json({ message: 'Serial number is required' });
    }

    try {
        const result = await pool.query(
            `UPDATE serials 
             SET serial_number = $1, image_url = $2 
             WHERE serial_id = $3 
             RETURNING *`,
            [serial_number, image_url, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Serial not found' });
        }

        res.status(200).json({ message: 'Serial updated successfully', serial: result.rows[0] });
    } catch (error: any) {
        console.error('Error updating serial:', error);
        // Check for unique constraint violation on serial_number
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Serial number already exists' });
        }
        res.status(500).json({ message: 'Server error updating serial' });
    }
};

// PUT /api/items/serial/:id/sold
// Marks an individual serial as sold.
export const markSerialSold = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE serials 
             SET status = 'sold', sold_date = CURRENT_TIMESTAMP 
             WHERE serial_id = $1 AND status != 'sold'
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Serial not found or already sold' });
        }

        res.status(200).json({ message: 'Stock marked as sold successfully', serial: result.rows[0] });
    } catch (error: any) {
        console.error('Error marking serial sold:', error);
        res.status(500).json({ message: 'Server error marking serial sold' });
    }
};

// PUT /api/items/serial-number/:serialNumber/sold
// Marks an individual serial as sold using its string barcode
export const markSerialSoldByNumber = async (req: Request, res: Response) => {
    const { serialNumber } = req.params;

    try {
        const result = await pool.query(
            `UPDATE serials 
             SET status = 'sold', sold_date = CURRENT_TIMESTAMP 
             WHERE serial_number = $1 AND status != 'sold'
             RETURNING *`,
            [serialNumber]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Serial not found or already sold' });
        }

        res.status(200).json({ message: 'Stock marked as sold successfully', serial: result.rows[0] });
    } catch (error: any) {
        console.error('Error marking serial sold by number:', error);
        res.status(500).json({ message: 'Server error marking serial sold' });
    }
};
