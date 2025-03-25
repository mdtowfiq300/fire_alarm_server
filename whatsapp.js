const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');  // Import Socket.io
const port = process.env.PORT || 3000;
const app = express();

// Create HTTP server for Socket.io to use
const server = http.createServer(app);
const io = socketIo(server);  // Initialize Socket.io

// CORS configuration
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.static('public'));  // Serve static files from 'public' folder

// Ensure the 'public' folder exists
const publicFolder = path.join(__dirname, 'public');
if (!fs.existsSync(publicFolder)) {
    fs.mkdirSync(publicFolder);
}

let qrGenerated = false;  // Flag to track if a QR code has been generated
let clientReady = false;  // Track if the client is ready to send messages

const sessionFolder = path.join(__dirname, 'sessions');  // Specify the session folder

// Initialize WhatsApp client with LocalAuth for session persistence
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'client',
        sessionData: sessionFolder  // Specify session folder for persistence
    }),
    puppeteer: {
        headless: true,  // Run in headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Function to emit logs via WebSocket
const emitLog = (message) => {
    console.log(message);  // Print log to the console as well
    io.emit('log', message);  // Send log message to the client in real-time
};

// Generate QR Code and save it
client.on('qr', async (qr) => {
    const qrPath = path.join(__dirname, 'public', 'qr.png');
    await qrcode.toFile(qrPath, qr, { width: 300 });
    qrGenerated = true;  // Mark that QR code is generated
    emitLog('QR Code generated and saved');
});

// WhatsApp Client Ready
client.on('ready', () => {
    emitLog('WhatsApp Client is ready!');
    clientReady = true;  // Mark client as ready
    emitLog('WhatsApp client is ready to use.');
});

// Handle Errors
client.on('auth_failure', () => {
    emitLog('Authentication failed. Restarting...');
});

// Handle Disconnections
client.on('disconnected', (reason) => {
    emitLog(`Client disconnected: ${reason}`);
    qrGenerated = false;  // Reset flag if disconnected
    clientReady = false;  // Reset client ready state
});

// Serve QR Code Image (only if not generated before or after disconnection)
app.get('/qr', (req, res) => {
    const qrPath = path.join(__dirname, 'public', 'qr.png');
    if (fs.existsSync(qrPath) && qrGenerated) {
        emitLog('Serving QR code...');
        res.sendFile(qrPath);
    } else {
        emitLog('QR Code not available. Please wait...');
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
            emitLog('Sending message...');
            for (const contact of contacts) {
                const phoneNumber = `${contact.phone}@c.us`;
                emitLog(`Sending message to ${contact.name}...`);
                await client.sendMessage(phoneNumber, message);  // Send message to contact
                emitLog(`✅ Message sent to ${contact.name}`);
            }
            res.json({ status: 'Messages sent successfully!' });
        } catch (err) {
            emitLog('Error sending message: ' + err);
            res.status(500).json({ status: 'Failed to send message', error: err.message });
        }
    } else {
        emitLog('Client is not ready yet');
        res.status(500).json({ status: 'WhatsApp client is not ready' });
    }
});

// Start Express Server
server.listen(port, () => {
    emitLog(`🚀 Server running at http://localhost:${port}`);
});

// Start WhatsApp Client
client.initialize();

// Check if session data exists and restore client readiness (if applicable)
client.on('authenticated', () => {
    emitLog('Session restored. WhatsApp client is getting ready!');
});
