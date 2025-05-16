import express from 'express';
import { sendIdCard } from '../controllers/sensIdCardController.js';

const router = express.Router();

router.post('/', sendIdCard); 

export default router;