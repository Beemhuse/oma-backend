import { client } from '../sanity/client.js';
import { generateAndUploadQRCode } from '../utils/helper.js';
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
      phone,
      country,
      emergencyContact,
      dateOfBirth,
      dateJoined,
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
      phone,
      country,
      emergencyContact,
      dateOfBirth,
      dateJoined,
      membershipStatus,
      role,
      socialLinks,
      image: image
        ? {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: image, // asset._id from Sanity
          },
        }
        : null,
    };
    // console.log(member)
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


// Read All Members with their cards
export const getMembers = async (req, res) => {
  try {
    const members = await client.fetch(`
      *[_type == "member"] {
        _id,
        _createdAt,
        firstName,
        lastName,
        email,
        address,
        occupation,
        phone,
        country,
        emergencyContact,
        dateOfBirth,
        dateJoined,
        membershipStatus,
        role,
        socialLinks,
        "image": image.asset->url,
        "card": *[_type == "card" && references(^._id)][0] {
          _id,
          cardId,
          "qrCodeUrl": qrCode.asset->url,
          issueDate,
          expiryDate,
          isActive
        }
      }
    `);

    res.status(200).json({
      success: true,
      count: members.length,
      members
    });
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching members',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};



// Get Member Detail by ID
export const getMemberDetail = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch published member document by ID (exclude drafts) and dereference image
    const member = await client.fetch(
      `*[_type == "member" && _id == $id && !(_id in path("drafts.**"))][0]{
        _id,
        firstName,
        lastName,
        email,
        phone,
        country,
        address,
        dateOfBirth,
        dateJoined,
        occupation,
        emergencyContact,
        membershipStatus,
        "image": image.asset->url,
        role,
        socialLinks,
        _createdAt,
        _updatedAt
      }`,
      { id }
    );

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Fetch active card for this member (if exists)
    const card = await client.fetch(
      `*[_type == "card" && references($id)][0]{
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
      member,
      card: card
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

// // Update Member
// export const updateMember = async (req, res) => {
//   const { id } = req.params;
//   const updateData = req.body;

//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       address,
//       occupation,
//       phone,
//       country,
//       emergencyContact,
//       dateOfBirth,
//       dateJoined,
//       membershipStatus,
//       role,
//       socialLinks,
//       image,
//     } = updateData;

//     const updatedFields = {
//       firstName,
//       lastName,
//       email,
//       address,
//       occupation,
//       phone,
//       country,
//       emergencyContact,
//       dateOfBirth,
//       dateJoined,
//       membershipStatus,
//       role,
//       socialLinks,
//       image: image
//         ? {
//             _type: 'image',
//             asset: {
//               _type: 'reference',
//               _ref: image, // assuming you're sending only asset ID
//             }
//           }
//         : null,
//     };

//     const updated = await client.patch(id).set(updatedFields).commit();

//     res.status(200).json({
//       message: 'Member updated successfully',
//       member: updated,
//     });
//   } catch (err) {
//     console.error('Error updating member:', err);
//     res.status(500).json({ message: 'Error updating member', error: err.message });
//   }
// };

// Update Member
export const updateMember = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const {
      firstName,
      lastName,
      email,
      address,
      occupation,
      phone,
      country,
      emergencyContact,
      dateOfBirth,
      dateJoined,
      membershipStatus,
      role,
      socialLinks,
      image,
    } = updateData;

    // Prepare updatedFields object without image initially
    const updatedFields = {
      firstName,
      lastName,
      email,
      address,
      occupation,
      phone,
      country,
      emergencyContact,
      dateOfBirth,
      dateJoined,
      membershipStatus,
      role,
      socialLinks,
    };

    // Only set image if it's NOT a URL (does NOT contain 'https')
    // and is truthy (assumed asset ID)
    if (image && typeof image === 'string' && !image.startsWith('https')) {
      updatedFields.image = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: image, // assuming you're sending only asset ID
        },
      };
    }
    // If image is null or undefined, you can handle removal if needed (optional)
    else if (image === null) {
      updatedFields.image = null;
    }

    const updated = await client.patch(id).set(updatedFields).commit();
console.log(updated, "updated")
    res.status(200).json({
      message: 'Member updated successfully',
      member: updated,
    });
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(500).json({ message: 'Error updating member', error: err.message });
  }
};



export const deleteMember = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Member ID is required' });
  }

  try {
    // 1. Find all documents that reference this member
    const query = `*[references("${id}")]`;
    const referencingDocuments = await client.fetch(query);

    // 2. Create a transaction
    const transaction = client.transaction();

    // Process each referencing document
    referencingDocuments.forEach(doc => {
      // Get all reference fields in the document
      const referenceFields = Object.keys(doc)
        .filter(key => {
          const value = doc[key];
          return (
            (value && value._ref === id) || // Direct reference
            (Array.isArray(value) && value.some(item => item && item._ref === id)) // Array of references
          );
        });

      // Create patch for each document to remove references
      if (referenceFields.length > 0) {
        const patchOperations = {};
        
        referenceFields.forEach(field => {
          const value = doc[field];
          
          if (Array.isArray(value)) {
            // For array fields, filter out the reference
            patchOperations[field] = value.filter(item => !item || item._ref !== id);
          } else {
            // For direct references, set to null
            patchOperations[field] = null;
          }
        });
        
        // Apply all patch operations at once
        transaction.patch(doc._id, patch => patch.set(patchOperations));
      }
    });

    // Add the delete operation
    transaction.delete(id);

    // 3. Commit the transaction
    const result = await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Member and all references deleted successfully',
      deletedId: id,
      patchedDocuments: referencingDocuments.map(doc => doc._id),
      transactionId: result.transactionId
    });
  } catch (err) {
    console.error('Error force deleting member:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to force delete member',
      details: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
};
// get transaction details
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

    // Generate a uniform cardId: OMA-YYYYMMDD-XXXX
    const now = new Date();
    const datePart = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const shortCode = shortid().slice(0, 4).toUpperCase(); // short 4-char code
    const cardId = `OMA-${datePart}-${shortCode}`;

    // Generate and upload QR code to Sanity
    const qrCodeAsset = await generateAndUploadQRCode(cardId);

    // Set expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Create the new card document
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
        qrCodeUrl: qrCodeAsset.url
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
export const reactivateCard = async (req, res) => {
  const { cardId } = req.params;
  const { reason } = req.body;

  try {
    // Check if card exists
    const card = await client.getDocument(cardId);
    if (!card) {
      return res.status(404).json({ 
        success: false, 
        message: 'Card not found' 
      });
    }

    // Check if already active
    if (card.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Card is already active'
      });
    }

    // Reactivate the card
    const reactivatedCard = await client
      .patch(cardId)
      .set({
        isActive: true,
        reactivatedAt: new Date().toISOString(),
        reactivationReason: reason || 'Reinstated',
        $unset: ['revokedAt', 'revocationReason'] // Remove revocation fields
      })
      .commit();

    res.status(200).json({
      success: true,
      message: 'Card reactivated successfully',
      card: reactivatedCard
    });
  } catch (err) {
    console.error('Error reactivating card:', err);
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
  const { cardId } = req.params;
  console.log("request params", req.params)
  try {
    const card = await client.fetch(
      `*[_type == "card" && cardId == $cardId][0]{
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
            dateJoined,
            _createdAt,
            "image": image.asset->url,
            membershipStatus
          }
        }`,
      { cardId }
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
