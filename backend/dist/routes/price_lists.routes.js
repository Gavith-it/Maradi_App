"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const price_lists_controller_1 = require("../controllers/price_lists.controller");
const auth_1 = require("../utils/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', price_lists_controller_1.getPriceLists);
router.post('/', price_lists_controller_1.createPriceList);
router.get('/:id/items', price_lists_controller_1.getPriceListItems);
router.put('/:id/items', price_lists_controller_1.updatePriceListItems);
exports.default = router;
