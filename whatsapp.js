const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode'); // To generate QR code
const cors = require('cors'); // Allows requests from different domains
const port = process.env.PORT || 3000;
const app = express();

// CORS configuration
const corsOptions = {
    origin: '*',  // Allow requests from any origin
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};

// Enable CORS with specific options
app.use(cors(corsOptions));
app.use(express.static('public')); // Serve static files from 'public' folder

// Ensure the 'public' folder exists
const publicFolder = path.join(__dirname, 'public');
if (!fs.existsSync(publicFolder)) {
    fs.mkdirSync(publicFolder);
}

let qrGenerated = false; // Flag to track if a QR code has been generated
let clientReady = false; // Track if the client is ready to send messages

// Specify the session folder (persistent folder for session storage)
const sessionFolder = path.join(__dirname, 'sessions');

// Initialize WhatsApp client with LocalAuth for session persistence
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'client', // Store session in 'sessions' directory
        sessionData: sessionFolder // Specify session folder for persistence
    }),
    puppeteer: {
        headless: true, // Run in headless mode (no visible browser)
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate QR Code and save it
client.on('qr', async (qr) => {
    console.log('QR Code received, generating image...');
    const qrPath = path.join(__dirname, 'public', 'qr.png');
    await qrcode.toFile(qrPath, qr, { width: 300 });
    qrGenerated = true; // Mark that QR code is generated
    console.log('QR Code saved at:', qrPath);
});

// WhatsApp Client Ready
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    clientReady = true; // Mark client as ready
    // Log message indicating that the client has been initialized from session data
    console.log('WhatsApp client is ready to use.');
});

// Handle Errors
client.on('auth_failure', () => {
    console.log('Authentication failed. Restarting...');
});

// Handle Disconnections
client.on('disconnected', (reason) => {
    console.log('Client disconnected:', reason);
    qrGenerated = false; // Reset flag if disconnected
    clientReady = false; // Reset client ready state
});

// Serve QR Code Image (only if not generated before or after disconnection)
app.get('/qr', (req, res) => {
    const qrPath = path.join(__dirname, 'public', 'qr.png');
    if (fs.existsSync(qrPath) && qrGenerated) {
        console.log('Serving QR code...');
        res.sendFile(qrPath);
    } else {
        console.log('QR Code not available. Please wait...');
        res.status(404).send('QR Code not available. Please wait...');
    }
});

// Send WhatsApp Message (Button Click)
const contacts = [
    { name: "Towfiq", phone: "8801725692402" },
];

const message = '🔥 Fire Alert! Please take immediate action!';

app.post('/send-message', async (req, res) => {
    if (clientReady) {  // Ensure client is ready
        try {
            console.log('Sending message...');
            // Loop through contacts and send messages sequentially
            for (const contact of contacts) {
                const phoneNumber = `${contact.phone}@c.us`;
                console.log(`Sending message to ${contact.name}...`);
                await client.sendMessage(phoneNumber, message);  // Send message to contact
                console.log(`✅ Message sent to ${contact.name}`);
            }
            res.json({ status: 'Messages sent successfully!' });
        } catch (err) {
            console.error('Error sending message:', err);
            res.status(500).json({ status: 'Failed to send message', error: err.message });
        }
    } else {
        console.log('Client is not ready yet');
        res.status(500).json({ status: 'WhatsApp client is not ready' });
    }
});

// Start Express Server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});

// Start WhatsApp Client
client.initialize();

// Check if session data exists and restore client readiness (if applicable)
client.on('authenticated', () => {
    console.log('Session restored. WhatsApp client is getting ready!');
});
