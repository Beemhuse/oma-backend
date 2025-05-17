import QRCode from 'qrcode';
import { client } from '../sanity/client.js';

export async function generateAndUploadQRCode(memberId) {
    try {
      // Create verification URL with member ID as query parameter
      const verificationUrl = `https://www.onemapafrica.org/verify?id=${memberId}`;
      
      // Generate QR code as data URL pointing to verification URL
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H', // High error correction
        margin: 4, // White space around QR code
        width: 300 // Size of QR code
      });
      
      // Convert data URL to buffer
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Upload to Sanity
      const result = await client.assets.upload('image', imageBuffer, {
        filename: `qr-code-${memberId}.png`,
        contentType: 'image/png'
      });
      
      return {
        ...result,
        verificationUrl // Return the URL for reference
      };
    } catch (error) {
      console.error('Error generating/uploading QR code:', error);
      throw error;
    }
}