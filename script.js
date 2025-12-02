// DOM Elements
const chatWindow = document.getElementById('chatWindow');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// ============================================
// User ID Management
// ============================================

/**
 * Genereer of haal user ID op uit localStorage
 */
function getUserId() {
    let userId = localStorage.getItem('maatje_userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('maatje_userId', userId);
        console.log('🆔 Nieuwe user ID aangemaakt:', userId);
    }
    return userId;
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

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
    contentElement.className = messageClass === 'typing-indicator' ? 'typing-indicator' : 'message-content';
    
    if (isHTML) {
        contentElement.innerHTML = messageText;
    } else {
        contentElement.textContent = messageText;
    }

    messageElement.appendChild(contentElement);
    if (messageClass === 'bot-message' && messageText === '') {
        messageElement.id = 'typing-indicator';
    }
    
    chatWindow.appendChild(messageElement);
    scrollChatToBottom();
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Verstuur gebruikersbericht
 */
function sendMessage() {
    const message = messageInput.value.trim();

    if (!message) {
        console.log('⚠️ Leeg bericht, niet verzonden');
        return;
    }

    console.log('📝 Gebruiker typt:', message);
    displayUserMessage(message);
    messageInput.value = '';
    messageInput.focus();
    sendMessageToBot(message);
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
 * Toon typing indicator (Maatje aan het nadenken)
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
 * Bepaal de juiste API URL (localhost of productie)
 */
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://maatjechat.vercel.app'; // Gebruik de volledige URL voor Vercel

console.log('🔗 API URL:', API_URL);
console.log('🌐 Hostname:', window.location.hostname);

/**
 * Stuur bericht naar OpenAI via backend
 */
async function sendMessageToBot(message) {
    try {
        sendBtn.disabled = true;
        displayTypingIndicator();
        
        const userId = getUserId();
        const requestBody = { message, userId };
        
        console.log('📤 Verzenden naar API...');
        console.log('   URL:', `${API_URL}/api/chat`);
        console.log('   Message:', message);
        console.log('   User ID:', userId);
        
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log('📥 Response ontvangen');
        console.log('   Status:', response.status);
        console.log('   OK?:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error response:', errorText);
            throw new Error(`HTTP Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Data ontvangen:', data);
        console.log('💾 Chat moet nu opgeslagen zijn in MongoDB!');
        
        removeTypingIndicator();
        displayBotMessage(data.reply || 'Sorry, ik kon geen antwoord genereren.');

    } catch (error) {
        console.error('💥 FOUT bij verzenden:');
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
        removeTypingIndicator();
        displayBotMessage('❌ Fout: Kan geen verbinding maken met de server. Check de console voor details.');
    } finally {
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// Functie om een bericht te verzenden naar de chatbot
async function sendMessage(message) {
    console.log('📩 Verzenden:', message);
    try {
        const response = await fetch(`${API_URL}/send`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message }),
        });
        const data = await response.json();
        console.log('📬 Ontvangen:', data);
        return data;
    } catch (error) {
        console.error('❌ Fout bij verzenden:', error);
    }
}

// ============================================
// INIT
// ============================================

console.log('✅ Maatje AI Chatbot geladen');
console.log('👤 User ID:', getUserId());

