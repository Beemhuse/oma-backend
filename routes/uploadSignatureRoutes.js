import express from 'express';
import { uploadSignature, getSignature, deleteSignature } from '../controllers/uploadSignatureController.js';

const router = express.Router();

router.post('/', uploadSignature);   // Upload signature (file upload)
router.get('/', getSignature);       // Get latest signature
router.delete('/', deleteSignature); // Delete signature by ID

export default router;
