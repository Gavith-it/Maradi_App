import express from 'express';
import { importItemsFromExcel } from '../controllers/import.controller';

const router = express.Router();

router.post('/excel', importItemsFromExcel);

export default router;
