"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orders_controller_1 = require("../controllers/orders.controller");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateToken, orders_controller_1.placeOrder);
router.get('/', auth_1.authenticateToken, orders_controller_1.getOrders);
router.get('/pending', auth_1.authenticateToken, orders_controller_1.getAllOrders);
router.get('/:id', auth_1.authenticateToken, orders_controller_1.getOrderDetails);
router.put('/:id/status', auth_1.authenticateToken, orders_controller_1.updateOrderStatus);
router.put('/items/:itemId/status', auth_1.authenticateToken, orders_controller_1.updateOrderItemStatus); // New route
exports.default = router;
