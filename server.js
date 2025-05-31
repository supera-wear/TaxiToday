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

// 🔽 Dit zorgt dat je website en styling werkt
app.use(express.static(path.join(__dirname, 'public')));

// 🔽 Dit zorgt dat je logo’s en afbeeldingen in uploads werken
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Homepagina
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Pagina-router (zoals /contact, /login, enz.)
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', page.includes('.') ? page : `${page}.html`);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).sendFile(path.join(__dirname, 'public/index.html'));
        }
    });
});

// Server starten
app.listen(PORT, () => {
    console.log(`TaxiToday server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the website`);
});
