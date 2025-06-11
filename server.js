const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Environment variables (these should be set in production)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_your_stripe_secret_key_here';
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || 'pk.your_mapbox_token_here';

// Initialize Stripe (commented out for now - uncomment when you have real keys)
// const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Pricing configuration
const VEHICLE_RATES = {
    standard: { base: 2.95, perKm: 2.50, name: 'Standaard Taxi' },
    comfort: { base: 4.50, perKm: 3.25, name: 'Comfort Taxi' },
    van: { base: 5.95, perKm: 3.95, name: 'Van Taxi' }
};

// Mock distance calculation (replace with actual Mapbox API call)
async function calculateDistance(from, to) {
    try {
        // In production, use Mapbox Directions API:
        // const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoords};${toCoords}?access_token=${MAPBOX_TOKEN}`);
        
        // Mock calculation for demo
        const mockDistance = Math.random() * 45 + 5; // 5-50 km
        return mockDistance;
    } catch (error) {
        console.error('Distance calculation error:', error);
        return null;
    }
}

// Calculate total price including VAT
function calculateTotalPrice(distance, vehicleType) {
    const rate = VEHICLE_RATES[vehicleType];
    if (!rate) return null;
    
    const subtotal = rate.base + (distance * rate.perKm);
    const vat = subtotal * 0.21; // 21% VAT
    const total = subtotal + vat;
    
    return {
        subtotal: Math.round(subtotal * 100), // in cents
        vat: Math.round(vat * 100),
        total: Math.round(total * 100),
        distance: distance,
        rate: rate
    };
}

// Create Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { from, to, email, phone, date, time, vehicleType, passengers, notes } = req.body;
        
        // Validate required fields
        if (!from || !to || !email || !vehicleType) {
            return res.status(400).json({
                success: false,
                message: 'Vul alle verplichte velden in.'
            });
        }
        
        // Calculate distance
        const distance = await calculateDistance(from, to);
        if (!distance) {
            return res.status(400).json({
                success: false,
                message: 'Kon de afstand niet berekenen. Controleer de adressen.'
            });
        }
        
        // Calculate price
        const pricing = calculateTotalPrice(distance, vehicleType);
        if (!pricing) {
            return res.status(400).json({
                success: false,
                message: 'Ongeldig voertuigtype geselecteerd.'
            });
        }
        
        // For demo purposes, return a mock success response
        // In production, create actual Stripe checkout session:
        /*
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'ideal'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `${pricing.rate.name} - ${from} naar ${to}`,
                        description: `Afstand: ${distance.toFixed(1)} km | Datum: ${date} ${time} | Passagiers: ${passengers}`,
                    },
                    unit_amount: pricing.total,
                },
                quantity: 1,
            }],
            mode: 'payment',
            customer_email: email,
            success_url: `${req.protocol}://${req.get('host')}/success.html`,
            cancel_url: `${req.protocol}://${req.get('host')}/cancel.html`,
            metadata: {
                from,
                to,
                phone,
                date,
                time,
                vehicleType,
                passengers,
                notes: notes || '',
                distance: distance.toString()
            }
        });
        
        res.json({
            success: true,
            url: session.url,
            sessionId: session.id
        });
        */
        
        // Mock response for demo
        console.log('Booking request:', {
            from, to, email, phone, date, time, vehicleType, passengers, notes,
            distance: distance.toFixed(1),
            price: (pricing.total / 100).toFixed(2)
        });
        
        // Simulate successful checkout creation
        setTimeout(() => {
            res.json({
                success: true,
                url: `${req.protocol}://${req.get('host')}/success.html`,
                message: 'Checkout sessie aangemaakt',
                pricing: {
                    distance: distance.toFixed(1),
                    total: (pricing.total / 100).toFixed(2)
                }
            });
        }, 1000);
        
    } catch (error) {
        console.error('Checkout session error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het verwerken van uw boeking.'
        });
    }
});

// Handle contact form submissions
app.post('/api/contact', (req, res) => {
    console.log('Contact form submission:', req.body);
    
    // In production, send email or save to database
    res.json({
        success: true,
        message: 'Uw bericht is succesvol ontvangen!'
    });
});

// Legacy booking endpoint (for compatibility)
app.post('/api/booking', (req, res) => {
    console.log('Legacy booking request:', req.body);
    const bookingRef = 'TX' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    res.json({
        success: true,
        message: 'Booking confirmed successfully!',
        bookingRef: bookingRef,
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚕 TaxiToday server running on port ${PORT}`);
    console.log(`📱 Website: http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (!process.env.STRIPE_SECRET_KEY) {
        console.log('⚠️  Warning: STRIPE_SECRET_KEY not set - using mock payments');
    }
    
    if (!process.env.MAPBOX_TOKEN) {
        console.log('⚠️  Warning: MAPBOX_TOKEN not set - using mock distance calculation');
    }
});