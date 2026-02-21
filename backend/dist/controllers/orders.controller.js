"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getOrders = exports.placeOrder = void 0;
const db_1 = require("../db");
const placeOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user.id;
    const { notes } = req.body;
    // Use a transaction for data integrity
    const client = yield (yield Promise.resolve().then(() => __importStar(require('../db')))).pool.connect();
    try {
        yield client.query('BEGIN');
        // 1. Get cart items
        const cartItemsResult = yield client.query(`
            SELECT c.*, s.item_id, s.serial_number, i.master_price 
            FROM cart c
            JOIN serials s ON c.serial_id = s.serial_id
            JOIN items i ON s.item_id = i.item_id
            WHERE c.customer_id = $1 AND c.expires_at > NOW()
        `, [user_id]);
        if (cartItemsResult.rows.length === 0) {
            yield client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cart is empty or items expired' });
        }
        const cartItems = cartItemsResult.rows;
        const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.master_price), 0);
        // 2. Create Order
        const orderNumber = `ORD-${Date.now()}`; // Simple generation for MVP
        const orderResult = yield client.query(`
            INSERT INTO orders (order_number, customer_id, total_amount, notes, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING order_id
        `, [orderNumber, user_id, totalAmount, notes]);
        const orderId = orderResult.rows[0].order_id;
        // 3. Move items to order_items and update serial status
        for (const item of cartItems) {
            // Add to order_items
            yield client.query(`
                INSERT INTO order_items (order_id, item_id, serial_id, quantity, price)
                VALUES ($1, $2, $3, $4, $5)
            `, [orderId, item.item_id, item.serial_id, 1, item.master_price]);
            // Mark serial as sold
            yield client.query(`
                UPDATE serials SET status = 'sold', sold_date = NOW(), sold_to = $1, sold_type = 'b2b'
                WHERE serial_id = $2
            `, [user_id, item.serial_id]);
        }
        // 4. Clear Cart
        yield client.query('DELETE FROM cart WHERE customer_id = $1', [user_id]);
        yield client.query('COMMIT');
        res.status(201).json({ message: 'Order placed successfully', orderId, orderNumber });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error during checkout' });
    }
    finally {
        client.release();
    }
});
exports.placeOrder = placeOrder;
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user.id;
    try {
        const result = yield (0, db_1.query)(`
            SELECT * FROM orders WHERE customer_id = $1 ORDER BY order_date DESC
        `, [user_id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getOrders = getOrders;
