import { Router } from 'express';
import {
    getItems,
    getInStockItems,
    getItemByCode,
    createItem,
    addStock,
    getUploadUrl,
    getAvailableSerials,
    getAllItemSerials,
    updateItem,
    deleteItem
} from '../controllers/items.controller';
import { authenticateToken } from '../utils/auth';

const router = Router();

router.get('/', authenticateToken, getItems);
router.get('/in-stock', authenticateToken, getInStockItems); // Must go before /:code
router.get('/:code/serials', authenticateToken, getAvailableSerials); // For customer app
router.get('/:code/all-serials', authenticateToken, getAllItemSerials); // For admin
router.get('/:code', authenticateToken, getItemByCode);
router.post('/stock', authenticateToken, addStock);
router.get('/upload-url', authenticateToken, getUploadUrl);

// Admin Routes
router.post('/', authenticateToken, createItem);
router.put('/:id', authenticateToken, updateItem);
router.delete('/:id', authenticateToken, deleteItem);

export default router;
