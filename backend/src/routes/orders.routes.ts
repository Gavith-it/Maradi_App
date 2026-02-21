import { Router } from 'express';
import { placeOrder, getOrders, getAllOrders, getOrderDetails, updateOrderStatus, updateOrderItemStatus } from '../controllers/orders.controller';
import { authenticateToken } from '../utils/auth';

const router = Router();

router.post('/', authenticateToken, placeOrder);
router.get('/', authenticateToken, getOrders);
router.get('/pending', authenticateToken, getAllOrders);
router.get('/:id', authenticateToken, getOrderDetails);
router.put('/:id/status', authenticateToken, updateOrderStatus);
router.put('/items/:itemId/status', authenticateToken, updateOrderItemStatus); // New route

export default router;
