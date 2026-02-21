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
exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../db");
const auth_1 = require("../utils/auth");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, role, company_name, phone } = req.body;
    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    try {
        const existingUser = yield (0, db_1.query)('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const result = yield (0, db_1.query)(`INSERT INTO users (email, password_hash, role, company_name, phone) 
       VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email, role`, [email, hashedPassword, role, company_name, phone]);
        const user = result.rows[0];
        const token = (0, auth_1.generateToken)({ id: user.user_id, role: user.role });
        res.status(201).json({ user, token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const result = yield (0, db_1.query)('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }
        const user = result.rows[0];
        const validPassword = yield bcrypt_1.default.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = (0, auth_1.generateToken)({ id: user.user_id, role: user.role });
        res.json({ user: { id: user.user_id, email: user.email, role: user.role }, token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.login = login;
