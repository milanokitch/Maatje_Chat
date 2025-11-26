require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS)

// ============================================
// MongoDB Connection
// ============================================
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('✅ MongoDB verbonden');
    }).catch(err => {
        console.error('❌ MongoDB Error:', err.message);
    });

    // Chat History Schema
    const chatSchema = new mongoose.Schema({
        userId: { type: String, default: 'anonymous' },
        userMessage: String,
        botReply: String,
        timestamp: { type: Date, default: Date.now }
    });

    var Chat = mongoose.model('Chat', chatSchema);
} else {
    console.log('⚠️ MONGODB_URI niet ingesteld. Chat history wordt niet opgeslagen.');
}

// OpenAI configuratie
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Jouw Assistant ID
const ASSISTANT_ID = 'asst_KPJBbeBjFn9RnQtbPCA09yH7';
let threadId = null;

// Haal Assistant info op (inclusief system instructions)
async function getAssistantInfo() {
    try {
        const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
        console.log('🤖 Assistant geladen:', assistant.name);
        if (assistant.instructions) {
            console.log('📋 System instructions geladen:', assistant.instructions.substring(0, 100) + '...');
        }
        return assistant;
    } catch (error) {
        console.error('❌ Kon Assistant niet ophalen:', error.message);
        throw error;
    }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Bericht is leeg' });
        }

        // Maak een thread aan (eenmalig)
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
            console.log('✅ Nieuwe thread aangemaakt:', threadId);
        }

        // Stuur bericht naar thread
        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message
        });

        console.log('💬 Bericht verzonden naar Assistant');

        // Run de Assistant (respecteert automatisch system instructions!)
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: ASSISTANT_ID
        });

        // Wacht tot de run klaar is
        let runStatus = run.status;
        let waitTime = 0;
        const maxWaitTime = 60; // Max 60 seconden

        while ((runStatus === 'queued' || runStatus === 'in_progress') && waitTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const runCheck = await openai.beta.threads.runs.retrieve(threadId, run.id);
            runStatus = runCheck.status;
            waitTime++;
        }

        if (runStatus === 'failed') {
            throw new Error('Assistant run mislukt');
        }

        if (runStatus !== 'completed') {
            throw new Error(`Run status: ${runStatus} (timeout na ${waitTime} seconden)`);
        }

        // Haal het antwoord op
        const messages = await openai.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];
        const botReply = lastMessage.content[0].text.value;

        console.log('🤖 Assistant antwoord ontvangen');

        // Sla op in MongoDB (als beschikbaar)
        if (typeof Chat !== 'undefined') {
            try {
                await Chat.create({
                    userId: userId || 'anonymous',
                    userMessage: message,
                    botReply: botReply,
                    timestamp: new Date()
                });
                console.log('💾 Chat opgeslagen in database');
            } catch (dbError) {
                console.error('⚠️ Database error:', dbError.message);
            }
        }

        res.json({ reply: botReply });

    } catch (error) {
        console.error('OpenAI API Error:', error);
        res.status(500).json({ 
            error: 'Er is een fout opgetreden met de API',
            details: error.message
        });
    }
});// Serve index.html voor root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat history ophalen
app.get('/api/chat-history/:userId', async (req, res) => {
    try {
        if (typeof Chat === 'undefined') {
            return res.status(503).json({ error: 'Database niet beschikbaar' });
        }
        const { userId } = req.params;
        const history = await Chat.find({ userId }).sort({ timestamp: -1 }).limit(50);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: '✅ Server is online' });
});

// Start server en verifieer Assistant
app.listen(PORT, async () => {
    console.log(`✅ Maatje AI Server draait op http://localhost:${PORT}`);
    try {
        await getAssistantInfo();
    } catch (error) {
        console.error('❌ Kon Assistant niet laden:', error.message);
    }
    console.log('💬 Chatbot is klaar voor gebruik!');
});
