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

// Initialize WhatsApp client with LocalAuth (to persist session)
const client = new Client({
    authStrategy: new LocalAuth(), // Persistent session using LocalAuth
    puppeteer: {
        headless: true, // Run in headless mode (no visible browser)
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate QR Code and save it to public folder
client.on('qr', async (qr) => {
    console.log('QR Code received, generating image...');

    // Generate QR code and save it in 'public/qr.png'
    const qrPath = path.join(__dirname, 'public', 'qr.png');
    await qrcode.toFile(qrPath, qr, { width: 300 });

    qrGenerated = true;
    console.log('QR Code saved at:', qrPath);
});

// WhatsApp Client Ready (successful login)
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// Handle Authentication Failures
client.on('auth_failure', (message) => {
    console.log('Authentication failed. Restarting...');
    console.log(message);
});

// Handle Disconnections
client.on('disconnected', (reason) => {
    console.log('Client disconnected:', reason);
    qrGenerated = false; // Reset flag if disconnected
});

// Define your contact list (Same as in your old code)
const contacts = [
    { name: "Towfiq", phone: "8801725692402" },
    { name: "Sadik", phone: "8801521415875" },
    // Add more contacts here as needed
];

// Send WhatsApp Message (Button Click)
app.post('/send-message', async (req, res) => {
    const message = '🔥 Fire Alert! Please take immediate action!';

    // Iterate through the contacts and send the message
    for (let contact of contacts) {
        const phoneNumber = `+${contact.phone}@c.us`; // Format phone number
        try {
            await client.sendMessage(phoneNumber, message);
            console.log(`Message sent to ${contact.name}`);
        } catch (err) {
            console.error(`Failed to send message to ${contact.name}:`, err);
        }
    }
    res.json({ status: 'Messages sent successfully!' });
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

// Start Express Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// Start WhatsApp Client
client.initialize();
