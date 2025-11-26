# Maatje AI - Chatbot voor Abrona

Een moderne, responsive chatbot gebouwd met Node.js, Express, OpenAI, en MongoDB.

## 🌟 Features

- ✅ Moderne, responsive UI (Abrona kleuren)
- ✅ OpenAI Assistant integratie
- ✅ Chat history opslag (MongoDB)
- ✅ User tracking (localStorage)
- ✅ Typing indicator animatie
- ✅ Mobile-friendly design

## 🚀 Quick Start

### Lokaal testen

```bash
npm install
npm start
```

Open http://localhost:3000

### Environment Variabelen

```env
OPENAI_API_KEY=sk-proj-...
MONGODB_URI=mongodb+srv://...
PORT=3000
```

## 📁 Project Structuur

```
Maatje_Chat/
├── index.html          # HTML structuur
├── style.css           # Styling (Abrona kleuren)
├── script.js           # Frontend logica
├── server.js           # Node.js backend
├── package.json        # Dependencies
├── .env                # Environment variabelen
└── README.md           # Dit bestand
```

## 🔧 Technologies

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **AI**: OpenAI API
- **Database**: MongoDB Atlas
- **Hosting**: Vercel

## 📝 API Endpoints

- `POST /api/chat` - Verstuur bericht naar chatbot
- `GET /api/chat-history/:userId` - Haal chat history op
- `GET /api/health` - Health check

## 🎨 Design

Gebouwd met Abrona kleurenschema:
- Oranje (#FF8C00)
- Teal (#00BCD4)
- Paars (#7B2CBF)
- Roze (#E91E63)
- Blauw (#0066CC)

## 💡 Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Server draait op port 3000
```

## 📦 Deployment

Dit project is gemaakt voor deployment op Vercel:

1. Push naar GitHub
2. Connect op Vercel
3. Voeg environment variabelen toe
4. Deploy!

## 📄 Licentie

MIT

## 👨‍💻 Author

Milan - Abrona Chatbot Project
