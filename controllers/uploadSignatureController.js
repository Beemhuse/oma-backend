// No multer needed since no file upload now

import { client } from '../sanity/client.js';

export const uploadSignature = async (req, res) => {
  try {
    const { assetId } = req.body;

    if (!assetId || typeof assetId !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing or invalid assetId' });
    }

    // Create the signature document referencing the provided asset ID
    const signatureDoc = await client.create({
      _type: 'signature',
      image: {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: assetId,
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Signature document created successfully',
      signatureId: signatureDoc._id,
    });
  } catch (error) {
    console.error('Error creating signature document:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};


export const getSignature = async (req, res) => {
  try {
    const query = `*[_type == "signature"] | order(_createdAt desc)[0]{
      _id,
      image {
        asset-> {
          _id,
          url
        }
      }
    }`;

    const signature = await client.fetch(query);

    if (!signature) {
      return res.status(404).json({ success: false, message: 'No signature found' });
    }

    res.json({
      success: true,
      signatureId: signature._id,
      signatureUrl: signature.image?.asset?.url || null,
    });
  } catch (error) {
    console.error('Read signature error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

export const deleteSignature = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Signature ID is required' });
    }

    await client.delete(id);

    res.json({ success: true, message: 'Signature deleted successfully' });
  } catch (error) {
    console.error('Delete signature error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};