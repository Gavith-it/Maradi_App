import express from 'express';
import { getCustomers, createCustomer, updateCustomer } from '../controllers/users.controller';
import { authenticateToken } from '../utils/auth';

const router = express.Router();

// All user management routes require authentication
router.use(authenticateToken);

router.get('/customers', getCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);

export default router;
