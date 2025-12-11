// DOM Elements
const chatWindow = document.getElementById('chatWindow');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// ============================================
// Supabase Configuration
// ============================================
let supabaseClient;

// Check if supabase is available (from window)
if (typeof window !== 'undefined' && window.supabase) {
    supabaseClient = window.supabase;
    console.log('✅ Supabase client found from window');
} else {
    console.error('❌ Supabase client not found');
}

// ============================================
// User ID Management
// ============================================

/**
 * Haal Supabase user ID op van ingelogde gebruiker
 */
async function getUserId() {
    try {
        if (!supabaseClient) {
            console.error('❌ Supabase client niet beschikbaar');
            return 'anonymous_' + Date.now();
        }

        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error || !user) {
            console.log('⚠️ Geen geauthenticeerde gebruiker');
            // Fallback voor ontwikkeling
            return 'anonymous_' + Date.now();
        }
        
        console.log('✅ Authenticated user:', user.id);
        return user.id;
    } catch (error) {
        console.error('❌ Error getting user:', error);
        return 'anonymous_' + Date.now();
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Scroll chatvenster naar beneden
 */
function scrollChatToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Generieke functie om berichten toe te voegen
 */
function addMessageToChat(messageText, messageClass, isHTML = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageClass}`;

    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    
    if (isHTML) {
        contentElement.innerHTML = messageText;
    } else {
        contentElement.textContent = messageText;
    }

    messageElement.appendChild(contentElement);
    chatWindow.appendChild(messageElement);
    scrollChatToBottom();
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Verstuur gebruikersbericht
 */
async function sendMessage() {
    const message = messageInput.value.trim();

    if (!message) {
        console.log('⚠️ Leeg bericht, niet verzonden');
        return;
    }

    console.log('📝 Gebruiker typt:', message);
    displayUserMessage(message);
    messageInput.value = '';
    messageInput.focus();
    await sendMessageToBot(message);
}

/**
 * Toon gebruikersbericht
 */
function displayUserMessage(message) {
    addMessageToChat(message, 'user-message');
}

/**
 * Toon botbericht
 */
function displayBotMessage(message) {
    addMessageToChat(message, 'bot-message');
}

/**
 * Toon typing indicator
 */
function displayTypingIndicator() {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot-message';
    messageElement.id = 'typing-indicator';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }

    messageElement.appendChild(typingDiv);
    chatWindow.appendChild(messageElement);
    scrollChatToBottom();
}

/**
 * Verwijder typing indicator
 */
function removeTypingIndicator() {
    const typingElement = document.getElementById('typing-indicator');
    if (typingElement) typingElement.remove();
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Bepaal de juiste API URL
 */
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://maatjechat.vercel.app';

console.log('🔗 API URL:', API_URL);

/**
 * Stuur bericht naar OpenAI via backend, met Supabase fallback
 */
async function sendMessageToBot(message) {
    try {
        sendBtn.disabled = true;
        displayTypingIndicator();
        
        const userId = await getUserId();
        
        console.log('📤 Verzenden naar API...');
        console.log('   Message:', message);
        console.log('   User ID:', userId);
        
        let botReply = null;
        let backendSuccess = false;

        // Probeer backend voor OpenAI
        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, userId })
            });

            if (response.ok) {
                const data = await response.json();
                botReply = data.reply || 'Sorry, ik kon geen antwoord genereren.';
                backendSuccess = true;
                console.log('✅ OpenAI response ontvangen');
            }
        } catch (err) {
            console.warn('⚠️ Backend niet bereikbaar, gebruik fallback');
        }

        // Fallback als backend niet werkt
        if (!backendSuccess) {
            const fallbackResponses = [
                "Hallo! Ik ben Maatje AI. Hoe kan ik je vandaag helpen?",
                "Bedankt voor je bericht! Mijn OpenAI verbinding wordt momenteel geconfigureerd. Kan ik je ergens anders mee helpen?",
                "Ik hoor je! Hoewel mijn AI-brain nog wordt ingesteld, ben ik er wel voor je. Wat zou je willen weten?",
                "Super dat je contact opneemt! Even geduld terwijl mijn systemen opstarten. Hoe gaat het met je?"
            ];
            botReply = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
            console.log('🔄 Gebruikt fallback response');
        }

        // Sla op in Supabase (als beschikbaar)
        if (supabaseClient) {
            try {
                await supabaseClient.from('chat_history').insert([
                    {
                        user_id: userId,
                        user_message: message,
                        bot_reply: botReply,
                        timestamp: new Date().toISOString()
                    }
                ]);
                console.log('💾 Chat opgeslagen in Supabase');
            } catch (dbError) {
                console.error('⚠️ Supabase opslag fout:', dbError.message);
            }
        }

        removeTypingIndicator();
        displayBotMessage(botReply);

    } catch (error) {
        console.error('💥 Chat fout:', error);
        removeTypingIndicator();
        displayBotMessage('❌ Er ging iets mis. Probeer het opnieuw.');
    } finally {
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Wacht tot DOM geladen is
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM geladen, adding event listeners...');
    
    // Voeg event listeners toe als elementen bestaan
    if (sendBtn && messageInput) {
        sendBtn.addEventListener('click', sendMessage);
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        console.log('✅ Event listeners toegevoegd');
        
        // Focus op input
        messageInput.focus();
    } else {
        console.error('❌ Send button of message input niet gevonden!');
    }
});

// ============================================
// INIT
// ============================================

window.addEventListener('load', async () => {
    console.log('✅ Pagina geladen');
    
    const userId = await getUserId();
    console.log('👤 User ID:', userId);
});

console.log('✅ Maatje AI Chatbot script geladen');