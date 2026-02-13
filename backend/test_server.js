require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth');
const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
