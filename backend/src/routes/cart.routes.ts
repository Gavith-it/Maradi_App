import { Router } from 'express';
import { addToCart, getCart, removeFromCart } from '../controllers/cart.controller';
import { authenticateToken } from '../utils/auth';

const router = Router();

router.post('/add', authenticateToken, addToCart);
router.get('/', authenticateToken, getCart);
router.delete('/:cart_id', authenticateToken, removeFromCart);

export default router;
