import express from 'express';
import { getPriceLists, createPriceList, getPriceListItems, updatePriceListItems } from '../controllers/price_lists.controller';
import { authenticateToken } from '../utils/auth';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getPriceLists);
router.post('/', createPriceList);
router.get('/:id/items', getPriceListItems);
router.put('/:id/items', updatePriceListItems);

export default router;
