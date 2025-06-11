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

// Stripe configuration (you'll need to add your actual Stripe secret key)
const stripe = require('stripe')('sk_test_your_secret_key_here'); // Replace with your actual secret key

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

// Stripe payment intent creation
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency, metadata } = req.body;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency || 'eur',
            metadata: metadata || {},
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ 
            error: 'Failed to create payment intent',
            message: error.message 
        });
    }
});

// Create payment session for alternative payment methods
app.post('/api/create-payment-session', async (req, res) => {
    try {
        const { payment_method, amount, currency, booking_data, success_url, cancel_url } = req.body;

        let session;

        if (payment_method === 'ideal') {
            session = await stripe.checkout.sessions.create({
                payment_method_types: ['ideal'],
                line_items: [{
                    price_data: {
                        currency: currency || 'eur',
                        product_data: {
                            name: 'TaxiToday Rit',
                            description: `Van ${booking_data.pickup} naar ${booking_data.destination}`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: success_url,
                cancel_url: cancel_url,
                metadata: {
                    booking_data: JSON.stringify(booking_data)
                }
            });
        } else if (payment_method === 'bancontact') {
            session = await stripe.checkout.sessions.create({
                payment_method_types: ['bancontact'],
                line_items: [{
                    price_data: {
                        currency: currency || 'eur',
                        product_data: {
                            name: 'TaxiToday Rit',
                            description: `Van ${booking_data.pickup} naar ${booking_data.destination}`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: success_url,
                cancel_url: cancel_url,
                metadata: {
                    booking_data: JSON.stringify(booking_data)
                }
            });
        } else {
            // For PayPal and other methods, use generic checkout
            session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: currency || 'eur',
                        product_data: {
                            name: 'TaxiToday Rit',
                            description: `Van ${booking_data.pickup} naar ${booking_data.destination}`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: success_url,
                cancel_url: cancel_url,
                metadata: {
                    booking_data: JSON.stringify(booking_data)
                }
            });
        }

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating payment session:', error);
        res.status(500).json({ 
            error: 'Failed to create payment session',
            message: error.message 
        });
    }
});

// Enhanced bookings endpoint with payment verification
app.post('/api/bookings', async (req, res) => {
    try {
        const { payment_intent_id, payment_status, ...bookingData } = req.body;
        
        // Verify payment if payment_intent_id is provided
        if (payment_intent_id) {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
            
            if (paymentIntent.status !== 'succeeded') {
                return res.status(400).json({
                    success: false,
                    message: 'Payment not completed'
                });
            }
        }

        console.log('New booking with payment:', bookingData);
        const bookingId = 'TX' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        
        // Here you would typically save to database
        // For now, we'll just return success
        
        res.json({
            success: true,
            message: 'Booking created successfully!',
            bookingId: bookingId,
            paymentStatus: payment_status || 'paid'
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking'
        });
    }
});

// Webhook endpoint for Stripe events
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            // Handle successful payment
            break;
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('Checkout session completed:', session.id);
            // Handle completed checkout session
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
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