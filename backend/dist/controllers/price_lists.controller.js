"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePriceListItems = exports.getPriceListItems = exports.createPriceList = exports.getPriceLists = void 0;
const db_1 = require("../db");
const getPriceLists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)('SELECT * FROM price_lists ORDER BY created_at DESC', []);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getPriceLists = getPriceLists;
const createPriceList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description } = req.body;
    try {
        const result = yield (0, db_1.query)('INSERT INTO price_lists (name, description) VALUES ($1, $2) RETURNING *', [name, description]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        if (error.code === '23505') { // unique violation
            return res.status(400).json({ message: 'A price list with this name already exists' });
        }
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.createPriceList = createPriceList;
const getPriceListItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Fetch all items and left join with price_list_items for the specific price list
        const result = yield (0, db_1.query)(`
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
            ORDER BY i.item_name ASC
        `, [id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getPriceListItems = getPriceListItems;
const updatePriceListItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params; // price_list_id
    const { items } = req.body; // Array of { item_id, price }
    if (!Array.isArray(items)) {
        return res.status(400).json({ message: 'Items must be an array' });
    }
    try {
        const deleteItemIds = [];
        const upsertItemIds = [];
        const upsertPrices = [];
        for (const item of items) {
            if (item.price === null || item.price === undefined || item.price === '') {
                deleteItemIds.push(item.item_id);
            }
            else {
                upsertItemIds.push(item.item_id);
                upsertPrices.push(parseFloat(item.price));
            }
        }
        // Begin transaction
        yield (0, db_1.query)('BEGIN', []);
        if (deleteItemIds.length > 0) {
            yield (0, db_1.query)('DELETE FROM price_list_items WHERE price_list_id = $1 AND item_id = ANY($2::int[])', [id, deleteItemIds]);
        }
        if (upsertItemIds.length > 0) {
            yield (0, db_1.query)(`
                INSERT INTO price_list_items (price_list_id, item_id, price)
                SELECT $1, unnest($2::int[]), unnest($3::numeric[])
                ON CONFLICT (price_list_id, item_id) DO UPDATE SET price = EXCLUDED.price
            `, [id, upsertItemIds, upsertPrices]);
        }
        yield (0, db_1.query)('COMMIT', []);
        res.json({ message: 'Price list updated successfully' });
    }
    catch (error) {
        yield (0, db_1.query)('ROLLBACK', []);
        console.error(error);
        res.status(500).json({ message: 'Server error during bulk update' });
    }
});
exports.updatePriceListItems = updatePriceListItems;
