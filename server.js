const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const Stripe = require('stripe');

const app = express();
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? Stripe(stripeSecret) : null;
if (!stripe) {
    console.warn('Warning: STRIPE_SECRET_KEY not set. Stripe functionality is disabled.');
}
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

app.post('/api/create-checkout-session', async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }
    try {
        const { total, email } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: email,
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Taxi Booking'
                        },
                        unit_amount: Math.round(Number(total) * 100)
                    },
                    quantity: 1
                }
            ],
            success_url: `${req.protocol}://${req.get('host')}/booking-confirmation.html`,
            cancel_url: `${req.protocol}://${req.get('host')}/`
        });
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating Stripe session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

app.post('/api/contact', (req, res) => {
    console.log('New contact form submission received:', req.body);
    res.json({
        success: true,
        message: 'Contact form received successfully!',
        data: req.body
    });
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
