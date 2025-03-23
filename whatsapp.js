const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode'); // To generate QR code
const cors = require('cors'); // Allows requests from different domains

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS to allow GitHub-hosted HTML to request resources
app.use(cors());
app.use(express.static('public')); // Serve static files from 'public' folder

// Ensure the 'public' folder exists
const publicFolder = path.join(__dirname, 'public');
if (!fs.existsSync(publicFolder)) {
    fs.mkdirSync(publicFolder);
}

let qrGenerated = false; // Flag to track if a QR code has been generated

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Run in headless mode (no visible browser)
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate QR Code and save it
client.on('qr', async (qr) => {
    console.log('QR Code received, generating image...');

    // Generate QR code and save it in 'public/qr.png'
    const qrPath = path.join(__dirname, 'public', 'qr.png');
    await qrcode.toFile(qrPath, qr, { width: 300 });

    qrGenerated = true;
    console.log('QR Code saved at:', qrPath);
});

// WhatsApp Client Ready
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// Handle Errors
client.on('auth_failure', () => {
    console.log('Authentication failed. Restarting...');
});

// Handle Disconnections
client.on('disconnected', (reason) => {
    console.log('Client disconnected:', reason);
    qrGenerated = false; // Reset flag if disconnected
});

// Serve QR Code Image
app.get('/qr', (req, res) => {
    const qrPath = path.join(__dirname, 'public', 'qr.png');

    if (fs.existsSync(qrPath) && qrGenerated) {
        res.sendFile(qrPath);
    } else {
        res.status(404).send('QR Code not available. Please wait...');
    }
});

// Send WhatsApp Message (Button Click)
app.post('/send-message', async (req, res) => {
    const phoneNumber = '8801725692402'; // Replace with actual number
    const message = '🔥 Fire Alert! Please take immediate action!';

    try {
        await client.sendMessage(`${phoneNumber}@c.us`, message);
        res.json({ status: 'Message sent successfully!' });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ status: 'Failed to send message' });
    }
});

// Start Express Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// Start WhatsApp Client
client.initialize();
