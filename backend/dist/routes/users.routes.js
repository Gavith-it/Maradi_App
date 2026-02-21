"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const users_controller_1 = require("../controllers/users.controller");
const auth_1 = require("../utils/auth");
const router = express_1.default.Router();
// All user management routes require authentication
router.use(auth_1.authenticateToken);
router.get('/customers', users_controller_1.getCustomers);
router.post('/customers', users_controller_1.createCustomer);
router.put('/customers/:id', users_controller_1.updateCustomer);
exports.default = router;
