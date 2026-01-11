(function() {
    console.log('🚀 Script gestart in veilige modus');

    // ============================================
    // Supabase Configuration
    // ============================================
    const supabaseUrl = 'https://fhynxjujbwxxdxegomki.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeW54anVqYnd4eGR4ZWdvbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjkyMzYsImV4cCI6MjA4MDg0NTIzNn0.tTXCi7ptSw1P6IVouGwTZt5DMbCcTZofqpXO-P0UA3k';

    // We gebruiken een lokale variabele binnen deze functie scope
    let localSupabaseClient = null;
    
    // Globale variabelen voor profiel
    let currentUserProfile = null;
    let caretakerEmail = null;

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
    // PROFILE MANAGEMENT
    // ============================================

    async function getUserProfile(userId) {
        if (!localSupabaseClient || userId.startsWith('anonymous_')) return;

        try {
            const { data, error } = await localSupabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('❌ Fout bij ophalen profiel:', error);
                return;
            }

            if (data) {
                currentUserProfile = data;
                caretakerEmail = data.caretaker_email;
                console.log('👤 Profiel geladen voor:', data.full_name || 'Onbekend');
                if (caretakerEmail) {
                    console.log("Begeleider email opgehaald: " + caretakerEmail);
                }
            }
        } catch (err) {
            console.error('❌ Onverwachte fout bij profiel laden:', err);
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function scrollChatToBottom() {
        if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function addMessageToChat(sender, text, isHTML = false) {
        if (!chatWindow) return;

        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (sender === 'user') {
            messageElement.classList.add('user-message');
        } else if (sender === 'bot') {
            messageElement.classList.add('bot-message');
        } else {
            messageElement.classList.add(sender);
        }

        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        
        if (isHTML) {
            contentElement.innerHTML = text;
        } else {
            contentElement.textContent = text;
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
        addMessageToChat('user', message);
    }

    function displayBotMessage(message) {
        addMessageToChat('bot', message);
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
        
        // Haal naam op uit profiel (indien beschikbaar)
        const userName = currentUserProfile ? currentUserProfile.full_name : null;

        // 1. Probeer Backend
        try {
            console.log(`📤 Fetching ${API_URL}/api/chat...`);
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message, 
                    userId,
                    userName // NIEUW: Stuur naam mee naar backend
                })
            });

            if (response.ok) {
                const data = await response.json();
                let rawReply = data.reply || data.message;

                // --- NIEUWE CODE: FORCEER DE OPMAAK ---
                if (rawReply.includes('[ALERT]')) {
                    
                    // 1. Stuur melding naar database
                    sendSilentAlert(message, rawReply, userId);

                    // 2. SCHOONMAAK ACTIE:
                    // - .replace('[ALERT]', '')  -> Haalt de tag weg
                    // - .replace(/\|\|/g, '\n\n') -> Vervangt ALLE '||' tekens door 2 enters
                    let cleanReply = rawReply
                        .replace('[ALERT]', '')
                        .replace(/\|\|/g, '\n\n') 
                        .trim();
                    
                    // 3. Toon het bericht
                    addMessageToChat('bot', cleanReply);
                    
                    botReply = cleanReply;

                } else {
                    // Geen alarm, gewoon tonen
                    botReply = rawReply;
                    addMessageToChat('bot', botReply);
                }

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
            addMessageToChat('bot', botReply);
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

            // 2. Haal profiel op (NIEUW)
            await getUserProfile(userId);

            // 3. Haal mijn geschiedenis op!
            await loadChatHistory(userId);
            
            // Welkomstbericht als leeg
            if (chatWindow.children.length === 0) {
                let welcomeText = '👋 Hallo! Ik ben Maatje AI. Hoe kan ik je helpen?';
                if (currentUserProfile && currentUserProfile.full_name) {
                    welcomeText = `👋 Hallo ${currentUserProfile.full_name}! Ik ben Maatje AI. Hoe kan ik je helpen?`;
                }
                addMessageToChat('bot', welcomeText);
            }

            // 3. Laad mijn profiel (indien beschikbaar)
            await getUserProfile(userId);
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
    // FULLSCREEN TOGGLE (Met Scroll Fix)
    // ============================================

    document.addEventListener('DOMContentLoaded', () => {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const chatSection = document.querySelector('.chat-section');

        if (fullscreenBtn && chatSection) {
            fullscreenBtn.addEventListener('click', () => {
                // 1. Wissel de fullscreen modus voor de chat
                chatSection.classList.toggle('fullscreen-mode');

                // 2. NIEUW: Zet de website op slot (wel/niet scrollen)
                document.body.classList.toggle('no-scroll');

                // 3. Verander het icoontje
                const isFullscreen = chatSection.classList.contains('fullscreen-mode');
                
                if (isFullscreen) {
                    fullscreenBtn.innerText = '✖'; 
                    fullscreenBtn.title = "Sluit volledig scherm";
                } else {
                    fullscreenBtn.innerText = '⛶'; 
                    fullscreenBtn.title = "Open volledig scherm";
                }
            });
        }
    });

    // ============================================
    // VEILIGHEID: STIL ALARM SYSTEEM
    // ============================================
    async function sendSilentAlert(userMessage, aiRawResponse, userId) {
        console.log("⚠️ Alarm signaal gedetecteerd! Bezig met melden...");

        // Gebruik de globale supabaseClient of localSupabaseClient als die beschikbaar is
        const client = window.supabaseClient || window.__maatjeSupabaseClient;

        if (!client) {
            console.error("❌ Geen Supabase client beschikbaar voor alarm!");
            return;
        }

        // Bepaal ontvanger (begeleider of fallback)
        const alertRecipient = caretakerEmail || 'begeleiding@abrona.nl';
        
        // DE GEVRAAGDE MELDING:
        console.log("NOODSIGNAAL! Melding verstuurd naar: " + alertRecipient);
        // alert("NOODSIGNAAL! Melding verstuurd naar: " + alertRecipient); // Uncomment voor test-popup

        try {
            const { error } = await client
                .from('alerts')
                .insert([
                    {
                        user_id: userId || 'onbekend',
                        user_message: userMessage,  // Wat de cliënt typte
                        ai_response: aiRawResponse, // Het antwoord van de AI (met [ALERT])
                        status: 'open',             // Status begint altijd als 'open'
                        caretaker_email: alertRecipient // NIEUW: Sla op voor wie dit bedoeld is
                    }
                ]);

            if (error) {
                console.error("❌ Fout bij opslaan alarm:", error);
            } else {
                console.log(`✅ Alarm opgeslagen in database.`);
            }
        } catch (err) {
            console.error("❌ Onverwachte fout in alarmsysteem:", err);
        }
    }

})();