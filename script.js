(function() {
    console.log('🚀 Script gestart in veilige modus');

    // ============================================
    // Supabase Configuration
    // ============================================
    const supabaseUrl = 'https://fhynxjujbwxxdxegomki.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeW54anVqYnd4eGR4ZWdvbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjkyMzYsImV4cCI6MjA4MDg0NTIzNn0.tTXCi7ptSw1P6IVouGwTZt5DMbCcTZofqpXO-P0UA3k';

    // We gebruiken een lokale variabele binnen deze functie scope
    let localSupabaseClient = null;

    // Check of we een globale client kunnen hergebruiken of een nieuwe moeten maken
    if (typeof window !== 'undefined') {
        if (window.__maatjeSupabaseClient) {
            localSupabaseClient = window.__maatjeSupabaseClient;
            console.log('♻️ Supabase client hergebruikt');
        } else if (window.supabase && typeof window.supabase.createClient === 'function') {
            localSupabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
            window.__maatjeSupabaseClient = localSupabaseClient;
            console.log('✅ Supabase client nieuw aangemaakt');
        } else {
            console.warn('⚠️ Supabase library niet gevonden, chat werkt in offline modus');
        }
    }

    // DOM Elements (worden gevuld bij load)
    let chatWindow, messageInput, sendBtn;

    // ============================================
    // User ID Management
    // ============================================

    async function getUserId() {
        try {
            if (!localSupabaseClient) return 'anonymous_' + Date.now();

            const { data: { user }, error } = await localSupabaseClient.auth.getUser();
            
            if (error || !user) {
                console.log('⚠️ Geen ingelogde gebruiker gevonden');
                return 'anonymous_' + Date.now();
            }
            
            return user.id;
        } catch (error) {
            console.error('❌ Fout bij ophalen user:', error);
            return 'anonymous_' + Date.now();
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function scrollChatToBottom() {
        if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function addMessageToChat(messageText, messageClass, isHTML = false) {
        if (!chatWindow) return;

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

    async function sendMessage() {
        if (!messageInput) return;
        const message = messageInput.value.trim();

        if (!message) return;

        console.log('📝 Bericht versturen:', message);
        displayUserMessage(message);
        
        messageInput.value = '';
        messageInput.focus();
        
        await sendMessageToBot(message);
    }

    function displayUserMessage(message) {
        addMessageToChat(message, 'user-message');
    }

    function displayBotMessage(message) {
        addMessageToChat(message, 'bot-message');
    }

    function displayTypingIndicator() {
        if (!chatWindow) return;
        const messageElement = document.createElement('div');
        messageElement.className = 'message bot-message';
        messageElement.id = 'typing-indicator';
        messageElement.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        chatWindow.appendChild(messageElement);
        scrollChatToBottom();
    }

    function removeTypingIndicator() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    // ============================================
    // API FUNCTIONS
    // ============================================

    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://maatjechat.vercel.app';

    async function sendMessageToBot(message) {
        if (sendBtn) sendBtn.disabled = true;
        displayTypingIndicator();

        let botReply = null;
        let backendSuccess = false;
        const userId = await getUserId();

        // 1. Probeer Backend
        try {
            console.log(`📤 Fetching ${API_URL}/api/chat...`);
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, userId })
            });

            if (response.ok) {
                const data = await response.json();
                botReply = data.reply;
                backendSuccess = true;
                console.log('✅ Antwoord van backend ontvangen');
            } else {
                console.warn('⚠️ Backend response not OK:', response.status);
            }
        } catch (err) {
            console.warn('⚠️ Backend onbereikbaar:', err);
        }

        // 2. Fallback als backend faalt
        if (!backendSuccess) {
            const fallbackResponses = [
                "Hallo! Ik ben Maatje AI. Mijn verbinding wordt nog geconfigureerd, maar ik luister wel!",
                "Bedankt voor je bericht. Ik kan even niet bij mijn brein, maar ik ben er voor je.",
                "Ik hoor je! Wat kan ik voor je doen terwijl mijn systemen opstarten?"
            ];
            botReply = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
            console.log('🔄 Fallback antwoord gebruikt');
        }

        // 3. Opslaan in Supabase
        if (localSupabaseClient) {
            try {
                await localSupabaseClient.from('chat_history').insert([{
                    user_id: userId,
                    user_message: message,
                    bot_reply: botReply,
                    timestamp: new Date().toISOString()
                }]);
            } catch (dbError) {
                console.error('⚠️ Kon niet opslaan in DB:', dbError);
            }
        }

        removeTypingIndicator();
        displayBotMessage(botReply);
        if (sendBtn) sendBtn.disabled = false;
        if (messageInput) messageInput.focus();
    }

    // ============================================
    // GESCHIEDENIS LADEN
    // ============================================

    async function loadChatHistory(userId) {
        if (!localSupabaseClient) return;

        console.log('📚 Oude chats ophalen voor:', userId);

        const { data, error } = await localSupabaseClient
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: true });

        if (error) {
            console.error('❌ Fout bij laden geschiedenis:', error);
            return;
        }

        data.forEach(row => {
            if (row.user_message) displayUserMessage(row.user_message);
            if (row.bot_reply) displayBotMessage(row.bot_reply);
        });
        
        scrollChatToBottom();
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    async function initChat() {
        console.log('🎯 Initialiseren chat elementen...');
        chatWindow = document.getElementById('chatWindow');
        messageInput = document.getElementById('messageInput');
        sendBtn = document.getElementById('sendBtn');

        if (sendBtn && messageInput && chatWindow) {
            // Verwijder oude listeners door elementen te clonen (optioneel, maar veilig)
            const newBtn = sendBtn.cloneNode(true);
            sendBtn.parentNode.replaceChild(newBtn, sendBtn);
            sendBtn = newBtn;

            sendBtn.addEventListener('click', sendMessage);
            
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });

            console.log('✅ Chat events gekoppeld');
            
            // 1. Wie ben ik?
            const userId = await getUserId();
            console.log('👤 User ID:', userId);

            // 2. Haal mijn geschiedenis op!
            await loadChatHistory(userId);
            
            // Welkomstbericht als leeg
            if (chatWindow.children.length === 0) {
                addMessageToChat('👋 Hallo! Ik ben Maatje AI. Hoe kan ik je helpen?', 'bot-message');
            }
        } else {
            console.error('❌ Kon chat elementen niet vinden in de DOM');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }

    // ============================================
    // FULLSCREEN TOGGLE
    // ============================================

    document.addEventListener('DOMContentLoaded', () => {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const chatSection = document.querySelector('.chat-section');

        if (fullscreenBtn && chatSection) {
            fullscreenBtn.addEventListener('click', () => {
                // 1. Wissel de class (aan/uit)
                chatSection.classList.toggle('fullscreen-mode');

                // 2. Verander het icoontje
                const isFullscreen = chatSection.classList.contains('fullscreen-mode');
                
                if (isFullscreen) {
                    fullscreenBtn.innerText = '✖'; // Kruisje om te sluiten
                    fullscreenBtn.title = "Sluit volledig scherm";
                } else {
                    fullscreenBtn.innerText = '⛶'; // Icoontje voor openen
                    fullscreenBtn.title = "Open volledig scherm";
                }
            });
        }
    });

})();