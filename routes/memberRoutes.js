import express from 'express';
import {
  createMember,
  getMembers,
  updateMember,
  deleteMember,
  verifyMember,
  verifyMemberByCardId,
  generateMemberCard,
  getMemberDetail,
  revokeCard,
  reactivateCard,
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
router.patch('/members/:cardId/reactivate-card', protect, reactivateCard);
router.get('/verify/:code', verifyMember); // Open for scanning
router.get('/verify-card/:cardId', verifyMemberByCardId); // Open for scanning

export default router;
