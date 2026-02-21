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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCustomer = exports.createCustomer = exports.getCustomers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const getCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)(`
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching customers' });
    }
});
exports.getCustomers = getCustomers;
const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, company_name, phone, price_list_id, status } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const existingUser = yield (0, db_1.query)('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const result = yield (0, db_1.query)(`INSERT INTO users (email, password_hash, role, company_name, phone, price_list_id, status) 
             VALUES ($1, $2, 'customer', $3, $4, $5, $6) RETURNING user_id, email, company_name, status`, [email, hashedPassword, company_name, phone, price_list_id || null, status || 'active']);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating customer' });
    }
});
exports.createCustomer = createCustomer;
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { company_name, phone, price_list_id, status } = req.body;
    try {
        const result = yield (0, db_1.query)(`UPDATE users 
             SET company_name = $1, phone = $2, price_list_id = $3, status = $4
             WHERE user_id = $5 AND role = 'customer'
             RETURNING user_id, email, company_name, phone, price_list_id, status`, [company_name, phone, price_list_id || null, status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating customer' });
    }
});
exports.updateCustomer = updateCustomer;
