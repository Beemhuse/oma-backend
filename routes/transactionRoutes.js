import express from 'express';
import { getTransactionById, getTransactions } from '../controllers/transactionControllers.js';

const router = express.Router();

router.get('/transactions/:id', getTransactionById); 
router.get('/transactions/', getTransactions); 

export default router;