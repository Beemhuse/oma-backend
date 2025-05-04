import { client } from '../sanity/client.js';
import { generateAndUploadQRCode } from '../utils/helper.js';
import { generateQRCode } from '../utils/qrCodeGenerator.js';
import shortid from 'shortid'; // Add this import at the top of your file

// Create Member
export const createMember = async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        address,
        occupation,
        emergencyContact,
        dateOfBirth,
        membershipStatus,
        role,
        socialLinks,
        image,
      } = req.body;
  
      const member = {
        _type: 'member',
        firstName,
        lastName,
        email,
        address,
        occupation,
        emergencyContact,
        dateOfBirth,
        membershipStatus,
        role,
        socialLinks,
        image,
      };
  
      const created = await client.create(member);
  
      res.status(201).json({
        message: 'Member created successfully',
        member: created,
      });
    } catch (err) {
      console.error('Error creating member:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };
  

// Read All Members
export const getMembers = async (req, res) => {
  try {
    const members = await client.fetch(`*[_type == "member"]`);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching members' });
  }
};

// Get Member Detail by ID
export const getMemberDetail = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Fetch published member document by ID (exclude drafts)
      const member = await client.fetch(
        `*[_type == "member" && _id == $id && !(_id in path("drafts.**"))][0]`,
        { id }
      );
  
      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }
  
      // Fetch active card for this member (if exists)
      const card = await client.fetch(
        `*[_type == "card" && references($id) && isActive == true][0]{
          _id,
          cardId,
          "qrCodeUrl": qrCode.asset->url,
          issueDate,
          expiryDate,
          isActive,
          revokedAt,
          revocationReason
        }`,
        { id }
      );
  
      res.status(200).json({
        success: true,
        member: {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          address: member.address,
          dateOfBirth: member.dateOfBirth,
          occupation: member.occupation,
          emergencyContact: member.emergencyContact,
          membershipStatus: member.membershipStatus,
          image: member.image,
          role: member.role,
          socialLinks: member.socialLinks,
          _createdAt: member._createdAt,
          _updatedAt: member._updatedAt
        },
        card: card || null
      });
    } catch (err) {
      console.error('Error fetching member details:', err);
      res.status(500).json({ 
        success: false,
        message: 'Server error', 
        error: err.message 
      });
    }
  };
// Update Member
export const updateMember = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updated = await client.patch(id).set(updateData).commit();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error updating member' });
  }
};

// Delete Member
export const deleteMember = async (req, res) => {
  const { id } = req.params;

  try {
    await client.delete(id);
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting member' });
  }
};

// View Transactions
export const getTransactions = async (req, res) => {
  try {
    const transactions = await client.fetch(`*[_type == "transaction"]`);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching transactions' });
  }
};

// Dashboard Analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    const totalMembers = await client.fetch(`count(*[_type == "member"])`);
    const totalTransactions = await client.fetch(`count(*[_type == "transaction"])`);
    const totalRevenue = await client.fetch(`sum(*[_type == "transaction"].amount)`);

    res.json({ totalMembers, totalTransactions, totalRevenue });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching analytics' });
  }
};

export const generateMemberCard = async (req, res) => {
    const { memberId } = req.params;
  
    try {
      // Check if member exists
      const member = await client.getDocument(memberId);
      if (!member) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }
  
      // Check for existing active cards
      const existingActiveCards = await client.fetch(
        `*[_type == "card" && references($memberId) && isActive == true]`,
        { memberId }
      );
  
      if (existingActiveCards.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Member already has an active card',
          activeCards: existingActiveCards.map(card => card.cardId)
        });
      }
  
      // Generate card ID and QR code
      const cardId = `OMA-${shortid()}`;
      const qrCodeAsset = await generateAndUploadQRCode(cardId);
      
      // Calculate expiry date (1 year from now)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
      // Create new card document
      const newCard = await client.create({
        _type: 'card',
        member: {
          _type: 'reference',
          _ref: memberId
        },
        cardId,
        qrCode: {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: qrCodeAsset._id
          }
        },
        issueDate: new Date().toISOString(),
        expiryDate: expiryDate.toISOString(),
        isActive: true
      });
  
      res.status(201).json({
        success: true,
        message: 'Card generated successfully',
        card: {
          ...newCard,
          qrCodeUrl: qrCodeAsset.url // Include the URL in response
        }
      });
    } catch (err) {
      console.error('Error generating card:', err);
      res.status(500).json({ 
        success: false,
        message: 'Server error', 
        error: err.message 
      });
    }
  };
  export const revokeCard = async (req, res) => {
    const { cardId } = req.params;
    const { reason } = req.body;
  
    try {
      // Check if card exists
      const card = await client.getDocument(cardId);
      if (!card) {
        return res.status(404).json({ success: false, message: 'Card not found' });
      }
  
      // Check if already revoked
      if (!card.isActive) {
        return res.status(400).json({ 
          success: false, 
          message: 'Card is already inactive' 
        });
      }
  
      // Revoke the card
      const revokedCard = await client
        .patch(cardId)
        .set({ 
          isActive: false,
          revokedAt: new Date().toISOString(),
          revocationReason: reason || 'Other'
        })
        .commit();
  
      res.status(200).json({
        success: true,
        message: 'Card revoked successfully',
        card: revokedCard
      });
    } catch (err) {
      console.error('Error revoking card:', err);
      res.status(500).json({ 
        success: false,
        message: 'Server error', 
        error: err.message 
      });
    }
  };
  
// Verify Member by ID or QR
export const verifyMember = async (req, res) => {
  const { code } = req.params;

  try {
    const member = await client.fetch(`*[_type == "member" && (memberId == $code)]`, {
      code,
    });

    if (member.length > 0) {
      res.json({ valid: true, member: member[0] });
    } else {
      res.json({ valid: false, message: 'Member not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
};

export const verifyMemberByCardId = async (req, res) => {
    const { id } = req.params;
  
    try {
      const card = await client.fetch(
        `*[_type == "card" && _id == $id][0]{
          _id,
          cardId,
          "qrCodeUrl": qrCode.asset->url,
          issueDate,
          expiryDate,
          isActive,
          revokedAt,
          revocationReason,
          "member": member->{
            _id,
            firstName,
            lastName,
            membershipId,
            "image": image.asset->url,
            membershipStatus
          }
        }`,
        { id }
      );
  
      if (!card) {
        return res.status(404).json({ 
          success: false,
          message: 'Card not found' 
        });
      }
  
      // Additional validation
      const isExpired = new Date(card.expiryDate) < new Date();
      const isValid = card.isActive && !isExpired && !card.revokedAt;
  
      res.status(200).json({
        success: true,
        isValid,
        card,
        status: isValid ? 'active' : 
                card.revokedAt ? 'revoked' : 
                isExpired ? 'expired' : 'inactive'
      });
    } catch (error) {
      console.error('Card verification error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error during card verification',
        error: error.message
      });
    }
  };
  