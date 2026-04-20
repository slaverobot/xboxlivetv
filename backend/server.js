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

// ===================== HEALTH CHECK =====================
app.get('/health', (req, res) => {
    res.json({ status: 'OK', uptime: process.uptime(), timestamp: new Date() });
});

// ===================== ROOT ENDPOINT =====================
app.get('/', (req, res) => {
    res.json({ success: true, message: 'XBOX TV Backend is running!' });
});

// ===================== INITIATE PAYMENT =====================
app.post('/api/payment/initiate', async (req, res) => {
    try {
        const { phone, amount, package: packageName } = req.body;
        
        console.log('📱 Payment request:', { phone, amount, packageName });
        
        // Format phone (255XXXXXXXXX)
        let formattedPhone = phone;
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '255' + formattedPhone.substring(1);
        }
        
        const transactionId = `XBOX${Date.now()}${Math.floor(Math.random() * 10000)}`;
        
        // ZenoPay Payload
        const payload = {
            order_id: transactionId,
            buyer_phone: formattedPhone,
            buyer_email: `${phone}@xboxtv.com`,
            buyer_name: `XBOX Customer`,
            amount: amount,
            currency: "TZS",
            description: `${packageName} Subscription - XBOX TV`,
            webhook_url: `${process.env.CALLBACK_URL || 'https://xboxlivetv.onrender.com'}/api/payment/callback`
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
        
        // Check if successful
        if (response.data.resultcode === '000' || response.data.status === 'success') {
            res.json({
                success: true,
                message: 'STK Push sent. Check your phone.',
                data: { transactionId: transactionId, status: 'pending' }
            });
        } else {
            res.status(400).json({
                success: false,
                message: response.data.message || 'Payment initiation failed'
            });
        }
        
    } catch (error) {
        console.error('❌ ZenoPay Error:', error.response?.data || error.message);
        
        let errorMessage = 'Payment initiation failed';
        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// ===================== CHECK PAYMENT STATUS =====================
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

// ===================== ZENOPAY API MODE CHECK =====================
app.get('/api/zenopay/status', async (req, res) => {
    try {
        const testPayload = {
            order_id: `TEST${Date.now()}`,
            buyer_phone: "255756804929",
            buyer_email: "test@xboxtv.com",
            buyer_name: "Test Customer",
            amount: 100,
            currency: "TZS",
            description: "API Mode Test"
        };
        
        const response = await axios.post(ZENOPAY_API_URL, testPayload, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ZENOPAY_API_KEY
            }
        });
        
        const isTestMode = response.data.test_mode === true || 
                          response.data.message?.includes('test') ||
                          response.data.environment === 'sandbox';
        
        res.json({
            api_mode: isTestMode ? 'TEST MODE (Sandbox)' : 'LIVE MODE (Production)',
            response: response.data
        });
    } catch (error) {
        res.json({ error: error.response?.data || error.message });
    }
});

// ===================== WEBHOOK CALLBACK =====================
app.post('/api/payment/callback', (req, res) => {
    console.log('📞 Webhook received:', req.body);
    res.json({ success: true });
});

// ===================== START SERVER =====================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔧 ZenoPay API Key: ${ZENOPAY_API_KEY.substring(0, 20)}...`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
});
