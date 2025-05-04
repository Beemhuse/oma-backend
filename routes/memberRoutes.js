import express from 'express';
import {
  createMember,
  getMembers,
  updateMember,
  deleteMember,
  getTransactions,
  getDashboardAnalytics,
  verifyMember,
  verifyMemberByCardId,
  generateMemberCard,
  getMemberDetail,
  revokeCard
} from '../controllers/memberControllers.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/members', protect, createMember);
router.get('/members', protect, getMembers);
router.patch('/members/:id', protect, updateMember);
router.get('/members/:id', protect, getMemberDetail);
router.delete('/members/:id', protect, deleteMember);
router.post('/members/:memberId/generate-card', protect, generateMemberCard);
router.patch('/members/:cardId/revoke-card', protect, revokeCard);
router.get('/transactions', protect, getTransactions);
router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/verify/:code', verifyMember); // Open for scanning
router.get('/verify-card/:cardId', verifyMemberByCardId); // Open for scanning

export default router;
