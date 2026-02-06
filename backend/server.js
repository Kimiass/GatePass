require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const visitsRoutes = require('./routes/visits');
const passesRoutes = require('./routes/passes');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/passes', passesRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: '360GatePass API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'خطایی در سرور رخ داده است',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'مسیر مورد نظر یافت نشد' });
});

app.listen(PORT, () => {
    console.log(`🚀 360GatePass Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});