const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

// Initialize Gemini API
const ai = new GoogleGenAI({});

// Initialize WhatsApp Client
console.log('Initializing client...');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions', '--disable-dev-shm-usage'],
        headless: true, // Must be true for server deployment
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});
console.log('Client initialized, setting up listeners...');

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

client.on('qr', (qr) => {
    // Generate QR code as a file
    qrcode.toFile('./qrcode.png', qr, {
        color: {
            dark: '#000000',  // Black dots
            light: '#FFFFFF' // White background
        }
    }, function (err) {
        if (err) throw err;
        console.log('QR Code saved to qrcode.png');
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
    console.log('=== BOT IDENTITY INFO ===');
    console.log('Bot WID:', client.info.wid);
    console.log('Bot WID serialized:', client.info.wid._serialized);
    console.log('Bot user:', client.info.wid.user);
    console.log('Bot server:', client.info.wid.server);
    if (client.info.wid.lid) {
        console.log('Bot LID:', client.info.wid.lid);
        console.log('Bot LID serialized:', client.info.wid.lid._serialized);
    } else {
        console.log('Bot LID: Not found');
    }
    console.log('========================');
});

process.on('unhandledRejection', error => {
    console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught Exception:', error);
});

// 'message_create' triggers for ALL messages, including your own (good for testing)
client.on('message_create', async msg => {
    try {
        // CRITICAL: Ignore messages sent by the bot itself to prevent infinite loops
        if (msg.fromMe) {
            return;
        }

        console.log('Message received:', msg.body);

        // Check if the message mentions the bot using mentionedIds
        const mentionedIds = msg.mentionedIds || [];
        console.log('Mentioned IDs:', mentionedIds);

        const botId = client.info.wid._serialized; // '972559415937@c.us'
        const botUser = client.info.wid.user; // '972559415937'

        // Check if any mentioned ID matches the bot
        const isMentioned = mentionedIds.some(id =>
            id === botId ||
            id.startsWith(botUser) ||
            id === '241437576839189@lid' // The LID that appears when you tag the bot
        );

        const isCommand = msg.body.toLowerCase().startsWith('!bot');

        // Check if it's a private chat (not a group)
        const chat = await msg.getChat();
        const isPrivateChat = !chat.isGroup;

        // Read settings from ENV
        const respondToPrivateChats = process.env.RESPOND_TO_PRIVATE_CHATS !== 'false';
        const respondToGroups = process.env.RESPOND_TO_GROUPS !== 'false';

        console.log('Is bot mentioned?', isMentioned);
        console.log('Is command?', isCommand);
        console.log('Is private chat?', isPrivateChat);
        console.log('Private chats enabled?', respondToPrivateChats);
        console.log('Groups enabled?', respondToGroups);

        // Determine if should respond based on settings
        let shouldRespond = false;

        if (isPrivateChat && respondToPrivateChats) {
            // Respond to all messages in private chats if enabled
            shouldRespond = true;
        } else if (!isPrivateChat && respondToGroups) {
            // Respond in groups only if mentioned or command used, and if groups are enabled
            shouldRespond = isMentioned || isCommand;
        }

        if (shouldRespond) {

            // Remove the mention from the prompt to avoid confusing the AI
            let prompt = msg.body;

            try {
                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt,
                });
                const text = response.text;

                // Reply to the message
                await msg.reply(text);
            } catch (error) {
                console.error('Error generating response:', error);
                await msg.reply('Sorry, I encountered an error while processing your request.');
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

client.initialize();
