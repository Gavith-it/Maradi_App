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
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const seedUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Seeding test users...');
        const passwordAcc = '123456';
        const hashedPassword = yield bcrypt_1.default.hash(passwordAcc, 10);
        // 1. Internal User (Staff)
        const staffEmail = 'staff@maradi.com';
        const staffCheck = yield (0, db_1.query)('SELECT * FROM users WHERE email = $1', [staffEmail]);
        if (staffCheck.rows.length === 0) {
            yield (0, db_1.query)(`INSERT INTO users (email, password_hash, role, company_name, phone) 
                 VALUES ($1, $2, 'internal_user', 'Maradi Staff', '9876543210')`, [staffEmail, hashedPassword]);
            console.log(`Created Staff: ${staffEmail} / ${passwordAcc}`);
        }
        else {
            console.log(`Staff user already exists: ${staffEmail}`);
        }
        // 2. Customer User
        const custEmail = 'customer@gmail.com';
        const custCheck = yield (0, db_1.query)('SELECT * FROM users WHERE email = $1', [custEmail]);
        if (custCheck.rows.length === 0) {
            yield (0, db_1.query)(`INSERT INTO users (email, password_hash, role, company_name, phone, price_list) 
                 VALUES ($1, $2, 'customer', 'Test Retails', '9123456780', 'A')`, [custEmail, hashedPassword]);
            console.log(`Created Customer: ${custEmail} / ${passwordAcc}`);
        }
        else {
            console.log(`Customer user already exists: ${custEmail}`);
        }
    }
    catch (error) {
        console.error('Error seeding users:', error);
    }
    finally {
        yield db_1.pool.end();
    }
});
seedUsers();
