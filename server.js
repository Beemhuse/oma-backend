import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // ✅ Import CORS
import memberRoutes from './routes/memberRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', memberRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`OMA Server running on port ${PORT}`);
});
