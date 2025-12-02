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

    if (!message) return;

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
    : ''; // Gebruik relative path voor Vercel/productie

/**
 * Stuur bericht naar OpenAI via backend
 */
async function sendMessageToBot(message) {
    try {
        sendBtn.disabled = true;
        displayTypingIndicator();
        
        const response = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message,
                userId: getUserId()
            })
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        removeTypingIndicator();
        displayBotMessage(data.reply || 'Sorry, ik kon geen antwoord genereren.');

    } catch (error) {
        console.error('Chat Error:', error);
        removeTypingIndicator();
        displayBotMessage('❌ Fout: Kan geen verbinding maken met de server op poort 3000. Start je server met: npm start');
    } finally {
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

// ============================================
// INIT
// ============================================

console.log('✅ Maatje AI Chatbot geladen');

