const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const multer = require('multer');

// ✅ Load env vars (FIXED)
dotenv.config();

// ✅ Connect to database
connectDB();

const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/routines', require('./routes/routines'));
app.use('/api/analytics', require('./routes/analytics'));

// ✅ Serve frontend
app.use(express.static(path.join(__dirname, '../client')));

// ✅ Serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Multer setup (image upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads/'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// ✅ Upload route
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ imageUrl });
});

// ✅ FIX: Handle frontend routes (VERY IMPORTANT)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ✅ Port setup (Render compatible)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});