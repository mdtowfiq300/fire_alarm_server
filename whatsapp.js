const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const fs = require('fs');
const qrcode = require('qrcode');
const app = express();
const port = 3000;

// WhatsApp Client
const client = new Client({ authStrategy: new LocalAuth() });

// Contacts List (Independent of Department)
const contacts = [
    { name: "Towfiq", phone: "8801725692402" },
    { name: "sadik", phone: "8801521415875" },
    
];

// Message content
const message = "🔥 Fire Alert: Fire detected in the workplace! Take immediate action!";

// Serve static files
app.use(express.static(__dirname + '/public'));


// Generate QR Code and save as image
client.on('qr', qr => {
    console.log("📸 QR Code generated!");
    qrcode.toFile(__dirname + '/public/qr.png', qr, function (err) {
        if (err) console.error("❌ Error saving QR:", err);
    });
});

// WhatsApp Ready Event
client.on('ready', () => {
    console.log('✅ WhatsApp is ready!');
});

// Route to send messages (Triggered by Button)
app.post('/send-message', (req, res) => {
    contacts.forEach(contact => {
        let phoneNumber = contact.phone + "@c.us";
        client.sendMessage(phoneNumber, message)
            .then(() => console.log(`✅ Message sent to ${contact.name}`))
            .catch(err => console.log(`❌ Error sending to ${contact.name}: ${err}`));
    });
    res.send({ status: 'Messages sent successfully!' });
});

// Serve HTML page with QR code and contact list
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start Express Server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});

// Start WhatsApp Client
client.initialize();
