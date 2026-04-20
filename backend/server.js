const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Active transactions map
const activeTransactions = new Map();

// Rate limiter kwa kila namba
const paymentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1,
    message: {
        success: false,
        message: 'Tafadhali subiri sekunde 60 kabla ya kuanza malipo mengine'
    },
    keyGenerator: (req) => req.body.phone,
    skip: (req) => !req.body.phone
});

// ZenoPay Configuration
const ZENOPAY_API_KEY = "DpQ9maqAbQ-fam5EKq5AMrzpamiJhzpY4D5-Apf8uP_e_App-LjbN-sUA1a3PJHXnadDAWvrZa5pZda7LWeNzw";
const ZENOPAY_API_URL = "https://zenoapi.com/api/payments/mobile_money_tanzania";

app.get('/health', (req, res) => {
    res.json({ status: 'OK', uptime: process.uptime(), timestamp: new Date() });
});

app.get('/', (req, res) => {
    res.json({ success: true, message: 'XBOX TV Backend is running!' });
});

app.post('/api/payment/initiate', paymentLimiter, async (req, res) => {
    try {
        const { phone, amount, package: packageName } = req.body;
        
        // Check active transaction
        if (activeTransactions.has(phone)) {
            const existing = activeTransactions.get(phone);
            return res.status(429).json({
                success: false,
                message: `Una malipo linalosindikwa. Token: ${existing.transactionId}`,
                pending: true
            });
        }
        
        console.log('📱 Payment request:', { phone, amount, packageName });
        
        let formattedPhone = phone;
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '255' + formattedPhone.substring(1);
        }
        
        const transactionId = `XBOX${Date.now()}${Math.floor(Math.random() * 10000)}`;
        
        // Store active transaction
        activeTransactions.set(phone, {
            transactionId: transactionId,
            timestamp: Date.now()
        });
        
        // Clean up after 2 minutes
        setTimeout(() => {
            activeTransactions.delete(phone);
        }, 120000);
        
        const payload = {
            order_id: transactionId,
            buyer_phone: formattedPhone,
            buyer_email: `${phone}@xboxtv.com`,
            buyer_name: "XBOX TV",
            amount: amount,
            currency: "TZS",
            description: `XBOX TV - ${packageName} Subscription`,
            webhook_url: `https://xboxlivetv.onrender.com/api/payment/callback`
        };
        
        console.log('📤 Sending to ZenoPay:', payload);
        
        const response = await axios.post(ZENOPAY_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ZENOPAY_API_KEY
            },
            timeout: 30000
        });
        
        console.log('📥 ZenoPay Response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.resultcode === '000' || response.data.status === 'success') {
            res.json({
                success: true,
                message: 'STK Push sent. Check your phone.',
                data: { transactionId: transactionId, status: 'pending' }
            });
        } else {
            activeTransactions.delete(phone);
            res.status(400).json({
                success: false,
                message: response.data.message || 'Payment initiation failed'
            });
        }
        
    } catch (error) {
        activeTransactions.delete(req.body.phone);
        console.error('❌ ZenoPay Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message
        });
    }
});

app.get('/api/payment/status/:transactionId', (req, res) => {
    res.json({
        success: true,
        data: {
            transactionId: req.params.transactionId,
            status: 'pending',
            message: 'Payment is being processed. Check your phone.'
        }
    });
});

app.post('/api/payment/callback', (req, res) => {
    console.log('📞 Webhook received:', req.body);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔧 ZenoPay API Key set`);
});
