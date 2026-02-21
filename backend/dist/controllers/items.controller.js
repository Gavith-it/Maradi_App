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
exports.getUploadUrl = exports.getAvailableSerials = exports.addStock = exports.getItemByCode = exports.getItems = void 0;
const db_1 = require("../db");
const getItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)('SELECT * FROM items WHERE is_active = true');
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getItems = getItems;
const getItemByCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.params;
    try {
        const result = yield (0, db_1.query)('SELECT * FROM items WHERE item_code = $1', [code]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getItemByCode = getItemByCode;
const addStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Workflow: 
    // 1. Receive Item Code + Serial Number + Image
    // 2. Validate Item exists
    // 3. Insert Serial
    const { item_code, serial_number, image_url, user_id } = req.body;
    try {
        // 1. Check if item exists
        const itemResult = yield (0, db_1.query)('SELECT item_id FROM items WHERE item_code = $1', [item_code]);
        if (itemResult.rows.length === 0) {
            // Option: Auto-create item if master data doesn't exist? 
            // For MVP, we'll assume item master exists or reject.
            return res.status(400).json({ message: 'Item Master not found. Please create item first.' });
        }
        const itemId = itemResult.rows[0].item_id;
        // 2. Check duplicate serial
        const serialCheck = yield (0, db_1.query)('SELECT serial_id FROM serials WHERE serial_number = $1', [serial_number]);
        if (serialCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Serial number already exists' });
        }
        // 3. Insert Serial
        const result = yield (0, db_1.query)(`INSERT INTO serials (item_id, serial_number, image_url, added_by, status)
       VALUES ($1, $2, $3, $4, 'available') RETURNING *`, [itemId, serial_number, image_url, user_id]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.addStock = addStock;
const getAvailableSerials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.params;
    try {
        const result = yield (0, db_1.query)(`
        SELECT s.*, i.item_name, i.master_price 
        FROM serials s
        JOIN items i ON s.item_id = i.item_id
        WHERE i.item_code = $1 AND s.status = 'available'
     `, [code]);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getAvailableSerials = getAvailableSerials;
// Simplified Image Upload (Placeholder for S3)
const getUploadUrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // In production, return a pre-signed S3 URL
    // For MVP local dev, we might accept base64 or a direct file POST 
    // user would POST image to /api/upload
    res.json({ uploadUrl: 'http://localhost:5000/uploads/placeholder.jpg', key: 'placeholder.jpg' });
});
exports.getUploadUrl = getUploadUrl;
