const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'XBOX TV Backend is alive!' });
});

app.get('/', (req, res) => {
    res.json({ success: true, message: 'XBOX TV Backend API is running' });
});

app.post('/api/payment/initiate', (req, res) => {
    res.json({ success: true, message: 'Payment initiated', data: { transactionId: 'SIM-' + Date.now() } });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
