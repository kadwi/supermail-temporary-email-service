require('dotenv').config();
const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin authentication middleware
function adminAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) {
        res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).send('Authentication required.');
    }
    const [scheme, encoded] = auth.split(' ');
    if (scheme !== 'Basic' || !encoded) {
        return res.status(401).send('Invalid authorization header.');
    }
    const credentials = Buffer.from(encoded, 'base64').toString('utf8').split(':');
    const [username, password] = credentials;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Invalid credentials.');
}

// Set the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// Homepage route (UI)
app.get('/', (req, res) => {
    const prefilledEmail = req.query.email || "";
    res.render('index', { domain: process.env.TEMP_MAIL_DOMAIN, prefilledEmail });
});

// Admin dashboard route with authentication
app.get('/admin', adminAuth, (req, res) => {
    res.render('admin', { domain: process.env.TEMP_MAIL_DOMAIN });
});

// Handle 404
app.use((req, res) => {
    res.status(404).render('404', { message: 'Page not found', domain: process.env.TEMP_MAIL_DOMAIN });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});
