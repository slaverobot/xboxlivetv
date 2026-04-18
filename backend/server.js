const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ZenoPay Configuration
const ZENOPAY_API_KEY = "DpQ9maqAbQ-fam5EKq5AMrzpamiJhzpY4D5-Apf8uP_e_App-LjbN-sUA1a3PJHXnadDAWvrZa5pZda7LWeNzw";
const ZENOPAY_API_URL = "https://zenoapi.com/api/payments/mobile_money_tanzania";

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'XBOX TV Backend is alive!' });
});

app.get('/', (req, res) => {
    res.json({ success: true, message: 'XBOX TV Backend API is running' });
});

// Payment endpoint - REAL ZENOPAY
app.post('/api/payment/initiate', async (req, res) => {
    try {
        const { phone, amount, package: packageName } = req.body;
        
        console.log('📱 Payment request:', { phone, amount, packageName });
        
        // Format phone (255XXXXXXXXX)
        let formattedPhone = phone;
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '255' + formattedPhone.substring(1);
        }
        
        const transactionId = `XBOX${Date.now()}`;
        
        const payload = {
            order_id: transactionId,
            buyer_phone: formattedPhone,
            buyer_email: `${phone}@xboxtv.com`,
            buyer_name: `XBOX Customer`,
            amount: amount,
            currency: "TZS",
            description: `${packageName} Subscription`,
            webhook_url: "https://xboxlivetv.onrender.com/api/payment/callback"
        };
        
        console.log('📤 Sending to ZenoPay...');
        
        const response = await axios.post(ZENOPAY_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ZENOPAY_API_KEY
            }
        });
        
        console.log('📥 ZenoPay Response:', response.data);
        
        res.json({
            success: true,
            message: 'STK Push sent. Check your phone.',
            data: { transactionId: transactionId, status: 'pending' }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || 'Payment failed'
        });
    }
});

// Status check
app.get('/api/payment/status/:transactionId', (req, res) => {
    res.json({
        success: true,
        data: { transactionId: req.params.transactionId, status: 'pending' }
    });
});

// Webhook
app.post('/api/payment/callback', (req, res) => {
    console.log('📞 Webhook received:', req.body);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
