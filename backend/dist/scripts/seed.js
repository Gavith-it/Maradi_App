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
const db_1 = require("../db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env vars from root of backend
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const seedAdmin = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Seeding admin user...');
        const email = 'owner@maradi.com';
        const password = 'owner123';
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Check if user exists
        const checkUser = yield (0, db_1.query)('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            console.log('Admin user already exists.');
            return;
        }
        // Create user
        yield (0, db_1.query)(`INSERT INTO users (email, password_hash, role, company_name, phone) 
             VALUES ($1, $2, 'owner', 'Maradi Owner', '9999999999')`, [email, hashedPassword]);
        console.log(`Admin user created: ${email} / ${password}`);
    }
    catch (error) {
        console.error('Error seeding admin:', error);
    }
    finally {
        process.exit();
    }
});
seedAdmin();
