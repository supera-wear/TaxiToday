const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Load environment variables first
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// In-memory user storage (in production, use a proper database)
const users = [];
const emailVerificationTokens = new Map();

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'taxitoday-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = users.find(u => u.email === email);
        if (!user) {
            return done(null, false, { message: 'Gebruiker niet gevonden' });
        }

        if (!user.emailVerified) {
            return done(null, false, { message: 'E-mailadres is nog niet geverifieerd. Controleer uw inbox.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return done(null, false, { message: 'Onjuist wachtwoord' });
        }

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google OAuth callback received for:', profile.emails[0].value);
        
        // Check if user already exists with Google ID
        let user = users.find(u => u.googleId === profile.id);
        
        if (user) {
            console.log('Existing Google user found:', user.email);
            return done(null, user);
        }

        // Check if user exists with same email
        user = users.find(u => u.email === profile.emails[0].value);
        
        if (user) {
            // Link Google account to existing user
            console.log('Linking Google account to existing user:', user.email);
            user.googleId = profile.id;
            user.emailVerified = true; // Google accounts are pre-verified
            return done(null, user);
        }

        // Create new user
        console.log('Creating new Google user:', profile.emails[0].value);
        const newUser = {
            id: uuidv4(),
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value,
            provider: 'google',
            emailVerified: true, // Google accounts are pre-verified
            createdAt: new Date()
        };

        users.push(newUser);
        console.log('New Google user created successfully');
        return done(null, newUser);
    } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error);
    }
}));

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    done(null, user);
});

// Stripe configuration with proper error handling
let stripe;
try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        console.error('STRIPE_SECRET_KEY not found in environment variables');
        process.exit(1);
    }
    stripe = require('stripe')(stripeSecretKey);
    console.log('Stripe initialized successfully');
} catch (error) {
    console.error('Failed to initialize Stripe:', error.message);
    process.exit(1);
}

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            name: user.name 
        },
        process.env.JWT_SECRET || 'taxitoday-jwt-secret',
        { expiresIn: '24h' }
    );
};

// Helper function to send verification email
const sendVerificationEmail = async (user, token) => {
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:10000'}/api/auth/verify-email?token=${token}`;
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@taxitoday.nl',
        to: user.email,
        subject: 'Bevestig uw e-mailadres - TaxiToday',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>E-mail Verificatie - TaxiToday</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #ffd700; color: #1e3a8a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welkom bij TaxiToday!</h1>
                    </div>
                    <div class="content">
                        <h2>Hallo ${user.name},</h2>
                        <p>Bedankt voor uw registratie bij TaxiToday. Om uw account te activeren, moet u uw e-mailadres bevestigen.</p>
                        <p>Klik op de onderstaande knop om uw e-mailadres te verifiëren:</p>
                        <p style="text-align: center;">
                            <a href="${verificationUrl}" class="button">E-mailadres Bevestigen</a>
                        </p>
                        <p>Als de knop niet werkt, kunt u ook deze link kopiëren en in uw browser plakken:</p>
                        <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
                        <p>Deze verificatielink is 24 uur geldig.</p>
                        <p>Als u dit account niet heeft aangemaakt, kunt u deze e-mail negeren.</p>
                        <p>Met vriendelijke groet,<br>Het TaxiToday Team</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 TaxiToday. Alle rechten voorbehouden.</p>
                        <p>Voor vragen kunt u contact opnemen via info@taxitoday.nl</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await emailTransporter.sendMail(mailOptions);
        console.log('Verification email sent to:', user.email);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'taxitoday-jwt-secret', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Check if user is already logged in middleware
const checkIfLoggedIn = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET || 'taxitoday-jwt-secret', (err, user) => {
            if (!err && user) {
                return res.status(200).json({
                    success: true,
                    message: 'Gebruiker is al ingelogd',
                    alreadyLoggedIn: true,
                    user: user
                });
            }
            next();
        });
    } else {
        next();
    }
};

// Auth routes
app.post('/api/auth/register', checkIfLoggedIn, async (req, res) => {
    try {
        const { name, email, password, acceptTerms } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Alle velden zijn verplicht'
            });
        }

        if (!acceptTerms) {
            return res.status(400).json({
                success: false,
                message: 'U moet de algemene voorwaarden accepteren'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Ongeldig e-mailadres'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Wachtwoord moet minimaal 6 karakters lang zijn'
            });
        }

        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Er bestaat al een account met dit e-mailadres'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create new user
        const newUser = {
            id: uuidv4(),
            name,
            email,
            password: hashedPassword,
            provider: 'local',
            emailVerified: false,
            createdAt: new Date()
        };

        users.push(newUser);

        // Store verification token
        emailVerificationTokens.set(verificationToken, {
            userId: newUser.id,
            email: newUser.email,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        // Send verification email
        const emailSent = await sendVerificationEmail(newUser, verificationToken);

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Account aangemaakt, maar verificatie-email kon niet worden verzonden. Probeer later opnieuw in te loggen.'
            });
        }

        res.json({
            success: true,
            message: 'Account succesvol aangemaakt! Controleer uw e-mail voor de verificatielink.',
            emailSent: true,
            email: email
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het aanmaken van uw account'
        });
    }
});

// Email verification endpoint
app.get('/api/auth/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.redirect('/login.html?error=invalid_token');
        }

        const tokenData = emailVerificationTokens.get(token);
        if (!tokenData) {
            return res.redirect('/login.html?error=invalid_token');
        }

        if (new Date() > tokenData.expiresAt) {
            emailVerificationTokens.delete(token);
            return res.redirect('/login.html?error=token_expired');
        }

        // Find and verify user
        const user = users.find(u => u.id === tokenData.userId);
        if (!user) {
            return res.redirect('/login.html?error=user_not_found');
        }

        user.emailVerified = true;
        emailVerificationTokens.delete(token);

        // Redirect to login with success message
        res.redirect('/login.html?verified=true');
    } catch (error) {
        console.error('Email verification error:', error);
        res.redirect('/login.html?error=verification_failed');
    }
});

app.post('/api/auth/login', checkIfLoggedIn, (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Er is een fout opgetreden bij het inloggen'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: info.message || 'Ongeldige inloggegevens'
            });
        }

        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Er is een fout opgetreden bij het inloggen'
                });
            }

            const token = generateToken(user);
            
            // Remove password from response
            const userResponse = { ...user };
            delete userResponse.password;

            res.json({
                success: true,
                message: 'Succesvol ingelogd',
                token,
                user: userResponse
            });
        });
    })(req, res, next);
});

// Google OAuth routes
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login.html?error=google_auth_failed' }),
    (req, res) => {
        try {
            console.log('Google OAuth callback successful for user:', req.user.email);
            const token = generateToken(req.user);
            
            // Set token in cookie for frontend
            res.cookie('token', token, {
                httpOnly: false,
                secure: false, // Set to true in production
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });

            // Redirect to profile or home page
            res.redirect('/profile.html?login=success');
        } catch (error) {
            console.error('Google auth callback error:', error);
            res.redirect('/login.html?error=auth_failed');
        }
    }
);

app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Fout bij uitloggen'
            });
        }
        
        res.clearCookie('token');
        res.json({
            success: true,
            message: 'Succesvol uitgelogd'
        });
    });
});

// Resend verification email
app.post('/api/auth/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Gebruiker niet gevonden'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'E-mailadres is al geverifieerd'
            });
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        emailVerificationTokens.set(verificationToken, {
            userId: user.id,
            email: user.email,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        const emailSent = await sendVerificationEmail(user, verificationToken);

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Verificatie-email kon niet worden verzonden'
            });
        }

        res.json({
            success: true,
            message: 'Nieuwe verificatie-email verzonden'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden'
        });
    }
});

// Protected user routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Gebruiker niet gevonden'
        });
    }

    const userResponse = { ...user };
    delete userResponse.password;

    res.json({
        success: true,
        user: userResponse
    });
});

app.get('/api/user/bookings', authenticateToken, (req, res) => {
    // Mock booking data - in production, fetch from database
    const mockBookings = [
        {
            bookingId: 'TX123456',
            date: '2024-06-15',
            time: '14:30',
            pickup: 'Amsterdam Central Station',
            destination: 'Schiphol Airport',
            price: 65.25,
            status: 'completed'
        },
        {
            bookingId: 'TX123457',
            date: '2024-06-10',
            time: '09:15',
            pickup: 'Vondelpark, Amsterdam',
            destination: 'RAI Amsterdam',
            price: 28.50,
            status: 'completed'
        }
    ];

    res.json({
        success: true,
        bookings: mockBookings
    });
});

// Existing API routes
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
    const contactId = 'CT' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    res.json({
        success: true,
        message: 'Contact form received successfully!',
        contactId: contactId,
        data: req.body
    });
});

// Get Stripe publishable key
app.get('/api/stripe-config', (req, res) => {
    res.json({
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
});

// Stripe payment intent creation
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency, metadata } = req.body;

        // Validate amount
        if (!amount || amount < 50) { // Minimum 50 cents
            return res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount must be at least 50 cents'
            });
        }

        console.log('Creating payment intent for amount:', amount);

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency || 'eur',
            metadata: metadata || {},
            automatic_payment_methods: {
                enabled: true,
            },
        });

        console.log('Payment intent created successfully:', paymentIntent.id);

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

        const sessionConfig = {
            line_items: [{
                price_data: {
                    currency: currency || 'eur',
                    product_data: {
                        name: 'TaxiToday Rit',
                        description: `Van ${booking_data.pickup} naar ${booking_data.destination}`,
                    },
                    unit_amount: Math.round(amount * 100), // Convert to cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: cancel_url,
            metadata: {
                booking_data: JSON.stringify(booking_data)
            },
            customer_email: booking_data.email
        };

        // Set payment method types based on selection
        switch (payment_method) {
            case 'ideal':
                sessionConfig.payment_method_types = ['ideal'];
                break;
            case 'bancontact':
                sessionConfig.payment_method_types = ['bancontact'];
                break;
            case 'paypal':
                sessionConfig.payment_method_types = ['paypal'];
                break;
            default:
                sessionConfig.payment_method_types = ['card'];
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        res.json({ url: session.url, session_id: session.id });
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
        const { payment_intent_id, session_id, payment_status, ...bookingData } = req.body;
        
        // Verify payment if payment_intent_id or session_id is provided
        if (payment_intent_id) {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
            
            if (paymentIntent.status !== 'succeeded') {
                return res.status(400).json({
                    success: false,
                    message: 'Payment not completed'
                });
            }
        } else if (session_id) {
            const session = await stripe.checkout.sessions.retrieve(session_id);
            
            if (session.payment_status !== 'paid') {
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

// Get booking confirmation details
app.get('/api/booking/:id', (req, res) => {
    const bookingId = req.params.id;
    
    // In a real app, you'd fetch from database
    // For demo, return mock data
    res.json({
        success: true,
        booking: {
            id: bookingId,
            status: 'confirmed',
            pickup: 'Amsterdam Central Station',
            destination: 'Schiphol Airport',
            date: new Date().toISOString().split('T')[0],
            time: '14:30',
            price: '65.25',
            paymentStatus: 'paid'
        }
    });
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
            // Handle successful payment - update booking status in database
            break;
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('Checkout session completed:', session.id);
            // Handle completed checkout session - create booking
            break;
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            // Handle failed payment
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
    console.log(`Stripe integration enabled with key: ${process.env.STRIPE_SECRET_KEY ? 'sk_test_***' : 'NOT SET'}`);
    console.log(`Google OAuth enabled: ${process.env.GOOGLE_CLIENT_ID ? 'YES' : 'NO'}`);
    console.log(`Email service configured: ${process.env.EMAIL_USER ? 'YES' : 'NO'}`);
});