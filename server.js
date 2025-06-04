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

    // Generate a simple booking identifier (e.g. "TX-000123")
    const bookingId = 'TX-' + Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0');

    // For demo purposes, return an estimated pickup time 15 minutes from now
    const estimatedPickup = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    res.json({
        success: true,
        message: 'Booking confirmed successfully!',
        bookingId,
        estimatedPickup,
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

// Fetch a user's bookings (dummy data for now)
app.get('/api/user/bookings', (req, res) => {
    // Normally you would look up the user's bookings in a database based on
    // their authenticated user id. This example just returns a static list so
    // the profile page can display something useful.
    const demoBookings = [
        {
            bookingId: 'TX-123456',
            pickup: 'Amsterdam Central Station',
            destination: 'Schiphol Airport',
            date: '2024-06-01',
            time: '14:30',
            price: 55,
            status: 'confirmed'
        }
    ];

    res.json({ success: true, bookings: demoBookings });
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
