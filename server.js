import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // ✅ Import CORS
import memberRoutes from './routes/memberRoutes.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import uploadImageRoutes from './routes/uploadImageRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', memberRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', transactionRoutes);
app.use('/upload-image', uploadImageRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`OMA Server running on port ${PORT}`);
});
