
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (HTML, CSS, JS)

// ============================================
// Supabase Client Setup
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ SUPABASE_URL of SUPABASE_KEY niet ingesteld. Supabase functionaliteit is uitgeschakeld.');
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


        // Sla chat op in Supabase (optioneel)
        if (supabaseUrl && supabaseKey) {
            try {
                await supabase.from('chat_history').insert([
                    {
                        user_id: userId || 'anonymous',
                        user_message: message,
                        bot_reply: botReply,
                        timestamp: new Date().toISOString()
                    }
                ]);
                console.log('💾 Chat opgeslagen in Supabase');
            } catch (dbError) {
                console.error('⚠️ Supabase error:', dbError.message);
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


// Chat history ophalen uit Supabase
app.get('/api/chat-history/:userId', async (req, res) => {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return res.status(503).json({ error: 'Supabase niet beschikbaar' });
        }
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(50);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: '✅ Server is online' });
});


// ==========================================
// SERVER STARTUP (Aangepast voor Vercel)
// ==========================================

// Stap 1: Check of we lokaal zijn of op Vercel
if (process.env.NODE_ENV !== 'production') {
    // We zijn lokaal (localhost): Start de server handmatig
    app.listen(PORT, async () => {
        console.log(`✅ Maatje AI Server draait op http://localhost:${PORT}`);
        try {
            // Probeer assistant info te laden voor de sier/check
            if (typeof getAssistantInfo === 'function') {
                await getAssistantInfo();
            }
        } catch (error) {
            console.error('❌ Kon Assistant niet laden:', error.message);
        }
        console.log('💬 Chatbot is klaar voor gebruik!');
    });
}

// Stap 2: Exporteer de app zodat Vercel hem kan gebruiken
// DIT IS DE BELANGRIJKSTE REGEL VOOR VERCEL:
module.exports = app;
