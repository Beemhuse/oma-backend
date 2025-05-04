import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { client } from '../sanity/client.js';
import nodemailer from 'nodemailer';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });;
};

// Register User
export const register = async (req, res) => {
  const { email, password } = req.body;
  const userExists = await client.fetch(`*[_type == "user" && email == $email][0]`, { email });

  if (userExists) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await client.create({
    _type: 'user',
    email,
    password: hashedPassword,
  });

  const token = generateToken(newUser._id);
  res.status(201).json({ token, user: { email: newUser.email, id: newUser._id } });
};

// Login User
export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await client.fetch(`*[_type == "user" && email == $email][0]`, { email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = generateToken(user._id);
  res.json({ token, user: { email: user.email, id: user._id } });
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await client.fetch(`*[_type == "user" && email == $email][0]`, { email });

  if (!user) return res.status(404).json({ message: 'User not found' });

  const resetToken = Math.random().toString(36).substr(2);
  const expiry = new Date(Date.now() + 3600000); // 1 hour

  await client.patch(user._id).set({ resetToken, resetTokenExpiry: expiry }).commit();

  // Send Email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Reset your password',
    html: `<p>Use this token to reset password: <strong>${resetToken}</strong></p>`,
  });

  res.json({ message: 'Reset token sent to email' });
};

// Reset Password
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const user = await client.fetch(
    `*[_type == "user" && resetToken == $token][0]`,
    { token }
  );

  if (!user || new Date(user.resetTokenExpiry) < new Date()) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await client
    .patch(user._id)
    .set({ password: hashedPassword, resetToken: null, resetTokenExpiry: null })
    .commit();

  res.json({ message: 'Password reset successful' });
};
