const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/')));

// API routes
app.post('/api/booking', (req, res) => {
    // In a real app, we would save the booking to a database
    console.log('New booking request received:', req.body);
    
    // Generate a fake booking reference
    const bookingRef = 'TX' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    // Send back confirmation
    res.json({
        success: true,
        message: 'Booking confirmed successfully!',
        bookingRef: bookingRef,
        data: req.body
    });
});

app.post('/api/contact', (req, res) => {
    // In a real app, we would save the contact form to a database
    // and/or send an email notification
    console.log('New contact form submission received:', req.body);
    
    // Send back confirmation
    res.json({
        success: true,
        message: 'Contact form received successfully!',
        data: req.body
    });
});

// Catch-all route to serve the frontend for any other routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, page.includes('.') ? page : `${page}.html`);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`TaxiToday server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the website`);
});
