import multer from 'multer';
import nodemailer from 'nodemailer';
import fs from 'fs';

// Setup Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueName = `idcard-${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage }).single('file');

// Controller function
export const sendIdCard = (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(500).json({ error: 'File upload failed' });
    }

    const { email, name } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Received file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    });

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your ID Card',
      text: `Hello ${name},\n\nPlease find your ID card attached.`,
      attachments: [
        {
          filename: file.originalname,
          path: file.path,
        },
      ],
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Email sent successfully' });

      // Optional: delete file after sending
      fs.unlinkSync(file.path);
    } catch (error) {
      console.error('Mail error:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });
};
