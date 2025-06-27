const express = require('express');
const router = express.Router();
const { fetchEmailsForAddress } = require('../utils/imapClient');
const { setCache, getCache } = require('../utils/cache');

// Generate temporary email
router.post('/generate-email', (req, res) => {
    try {
        let email = "";
        // Check if custom username is provided
        if (req.body.customUsername) {
            // Validate custom username (allow alphanumeric, underscore, dot, hyphen)
            const usernamePattern = /^[a-zA-Z0-9._-]+$/;
            if (!usernamePattern.test(req.body.customUsername)) {
                return res.status(400).json({ error: 'Invalid username', success: false });
            }
            const domain = req.body.domain || process.env.TEMP_MAIL_DOMAIN;
            email = `${req.body.customUsername}@${domain}`;
        } else {
            const randomString = Math.random().toString(36).substring(2, 12);
            email = `${randomString}@${process.env.TEMP_MAIL_DOMAIN}`;
        }
        console.log(`Generated email: ${email}`);
        res.json({ email, success: true });
    } catch (error) {
        console.error('Error generating email:', error);
        res.status(500).json({ error: 'Failed to generate email address', success: false });
    }
});

// Get emails for a specific address
router.get('/emails/:email', async (req, res) => {
    try {
        const tempMailAddress = req.params.email;
        console.log(`Fetching emails for: ${tempMailAddress}`);
        
        // Check cache first
        const cachedEmails = await getCache(tempMailAddress);
        if (cachedEmails) {
            console.log(`Found ${cachedEmails.length} cached emails for ${tempMailAddress}`);
            return res.json({ emails: cachedEmails, source: 'cache', success: true });
        }

        console.log(`No cache found, fetching from IMAP for ${tempMailAddress}`);
        
        // Fetch from IMAP if not in cache
        const emails = await fetchEmailsForAddress(tempMailAddress);
        
        console.log(`IMAP returned ${emails.length} emails for ${tempMailAddress}`);
        
        // Cache the results for 5 minutes (shorter cache for more real-time updates)
        await setCache(tempMailAddress, emails);
        
        res.json({ emails, source: 'imap', success: true });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ 
            error: 'Failed to fetch emails', 
            details: error.message,
            success: false 
        });
    }
});

// Quick inbox access - redirect to homepage with email parameter
router.get('/email', (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).send('Email parameter is required.');
    }
    console.log(`Quick inbox access for: ${email}`);
    res.redirect('/?email=' + encodeURIComponent(email));
});

// Test IMAP connection endpoint
router.get('/test-imap/:email', async (req, res) => {
    try {
        const tempMailAddress = req.params.email;
        console.log(`Testing IMAP connection for: ${tempMailAddress}`);
        
        const emails = await fetchEmailsForAddress(tempMailAddress);
        
        res.json({ 
            success: true, 
            message: `IMAP test successful for ${tempMailAddress}`,
            emailCount: emails.length,
            emails: emails.map(email => ({
                from: email.from,
                subject: email.subject,
                date: email.date,
                preview: email.preview ? email.preview.substring(0, 100) : 'No preview'
            }))
        });
    } catch (error) {
        console.error('IMAP test error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'IMAP test failed',
            details: error.message
        });
    }
});

// Domain management endpoints
router.post('/domains', (req, res) => {
    const { domain } = req.body;
    if (!domain) {
        return res.status(400).json({ error: 'Domain is required', success: false });
    }
    // In a real implementation, this would save to a database
    res.json({ message: 'Domain added successfully', domain, success: true });
});

router.get('/domains', (req, res) => {
    // In a real implementation, this would fetch from a database
    res.json({ 
        domains: [process.env.TEMP_MAIL_DOMAIN],
        success: true 
    });
});

router.delete('/domains/:domain', (req, res) => {
    // In a real implementation, this would delete from a database
    res.json({ 
        message: 'Domain removed successfully',
        success: true 
    });
});

module.exports = router;
