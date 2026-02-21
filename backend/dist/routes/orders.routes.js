"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_controller_1 = require("../controllers/orders.controller");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateToken, orders_controller_1.placeOrder);
router.get('/', auth_1.authenticateToken, orders_controller_1.getOrders);
exports.default = router;
