"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const items_controller_1 = require("../controllers/items.controller");
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, items_controller_1.getItems);
router.get('/in-stock', auth_1.authenticateToken, items_controller_1.getInStockItems); // Must go before /:code
router.get('/:code/serials', auth_1.authenticateToken, items_controller_1.getAvailableSerials); // For customer app
router.get('/:code/all-serials', auth_1.authenticateToken, items_controller_1.getAllItemSerials); // For admin
router.get('/:code', auth_1.authenticateToken, items_controller_1.getItemByCode);
router.post('/stock', auth_1.authenticateToken, items_controller_1.addStock);
router.get('/upload-url', auth_1.authenticateToken, items_controller_1.getUploadUrl);
// Admin Routes
router.post('/', auth_1.authenticateToken, items_controller_1.createItem);
router.put('/:id', auth_1.authenticateToken, items_controller_1.updateItem);
router.delete('/:id', auth_1.authenticateToken, items_controller_1.deleteItem);
exports.default = router;
