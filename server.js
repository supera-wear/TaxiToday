const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.post('/api/booking', (req, res) => {
    console.log('New booking request received:', req.body);
    const bookingRef = 'TX' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    res.json({
        success: true,
        message: 'Booking confirmed successfully!',
        bookingRef: bookingRef,
        data: req.body
    });
});

app.post('/api/contact', (req, res) => {
    console.log('New contact form submission received:', req.body);
    res.json({
        success: true,
        message: 'Contact form received successfully!',
        data: req.body
    });
});

// Stripe checkout proxy endpoint
app.post('/api/stripe/checkout', async (req, res) => {
    try {
        const { price_id, mode, success_url, cancel_url } = req.body;
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header required' });
        }
        
        // In a real implementation, you would validate the token here
        // For now, we'll simulate a successful response
        const sessionId = 'cs_test_' + Math.random().toString(36).substring(2, 15);
        const checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}`;
        
        console.log('Stripe checkout session created:', {
            sessionId,
            price_id,
            mode,
            success_url,
            cancel_url
        });
        
        res.json({
            sessionId: sessionId,
            url: checkoutUrl
        });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Serve main index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Serve all other static HTML pages
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', page.includes('.') ? page : `${page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).sendFile(path.join(__dirname, 'public/index.html'));
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`TaxiToday server running on port ${PORT}`);
});