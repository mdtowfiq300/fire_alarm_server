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
let isClientReady = false; // Track if the WhatsApp client is ready

// Path to session folder
const sessionPath = path.join(__dirname, 'auth');

// **Delete session folder if needed** (for example, when there's an authentication failure)
if (fs.existsSync(sessionPath)) {
    console.log('Deleting old session data...');
    fs.rmdirSync(sessionPath, { recursive: true }); // Remove the session data folder
}

// **Use the executable path from the environment variable**
const puppeteerExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';  // Default to /usr/bin/chromium if env var is not set

// Initialize WhatsApp client with LocalAuth (to persist session)
const client = new Client({
    authStrategy: new LocalAuth(), // Persistent session using LocalAuth
    puppeteer: {
        headless: true, // Run in headless mode (no visible browser)
        executablePath: puppeteerExecutablePath, // Use system-installed Chromium or the environment variable
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
    isClientReady = true; // Mark client as ready
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
    isClientReady = false; // Mark client as not ready
});

// Define your contact list (Same as in your old code)
const contacts = [
    { name: "Towfiq", phone: "8801725692402" },
    { name: "Sadik", phone: "8801521415875" },
    // Add more contacts here as needed
];

// Retry function for sending messages if the first attempt fails
const sendMessageWithRetry = async (phoneNumber, message, retries = 3) => {
    try {
        await client.sendMessage(phoneNumber, message);
        console.log(`Message sent to ${phoneNumber}`);
    } catch (err) {
        console.error(`Error sending message to ${phoneNumber}:`, err);
        if (retries > 0) {
            console.log(`Retrying... (${retries} attempts left)`);
            await sendMessageWithRetry(phoneNumber, message, retries - 1);
        } else {
            console.log('Failed to send message after retries');
        }
    }
};

// Send WhatsApp Message (Button Click)
app.post('/send-message', async (req, res) => {
    const message = '🔥 Fire Alert! Please take immediate action!';

    // Check if the client is ready before sending the message
    if (!isClientReady) {
        return res.status(500).json({ status: 'Client not ready. Please wait for WhatsApp to be ready.' });
    }

    // Iterate through the contacts and send the message
    for (let contact of contacts) {
        const phoneNumber = `+${contact.phone}@c.us`; // Format phone number
        await sendMessageWithRetry(phoneNumber, message); // Use retry logic
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
