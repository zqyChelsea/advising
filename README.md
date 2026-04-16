# PolyU Advising Platform

A full-stack academic advising platform built with React, Node.js, Express, and MongoDB.

## Project Structure

```
advising-platform/
├── backend/                 # Node.js + Express API server
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/         # MongoDB schemas (User, Ticket, ChatMessage)
│   │   ├── routes/         # API endpoints
│   │   └── server.js       # Express server entry point
│   ├── .env               # Environment variables
│   └── package.json
│
└── frontend/               # React + Vite application
    ├── src/
    │   ├── components/     # Reusable UI components
    │   │   ├── common/     # Button, Card, Modal
    │   │   └── layout/     # Sidebar, MainLayout
    │   ├── contexts/       # AuthContext
    │   ├── pages/          # Chat, Profile, Tickets, Resources, Settings
    │   ├── services/       # API service layer
    │   ├── App.jsx         # Main app with routing
    │   └── main.jsx        # Entry point
    ├── .env               # Environment variables
    ├── package.json
    └── tailwind.config.js
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

## Getting Started

### 1. Clone and Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend (.env)**
```env
MONGODB_URI=mongodb://localhost:27017/advising_platform
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
FRONTEND_URL=http://localhost:5173

# Dify chat (required for PolyU Companion chat)
DIFY_API_KEY=app-xxx
DIFY_BASE_URL=https://api.dify.ai/v1
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start MongoDB

Make sure MongoDB is running locally or update the connection string in backend/.env.

### 4. Run the Application

**Start Backend (Terminal 1)**
```bash
cd backend
npm run dev
```

**Start Frontend (Terminal 2)**
```bash
cd frontend
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## Features

- **Authentication**: JWT-based login/register system
- **Chat Interface**: AI-powered academic advisor chat with quick actions
- **Student Profile**: View and edit student information
- **Ticket System**: Submit and track support tickets
- **Resource Library**: Access university policy documents
- **Settings**: Notification and appearance preferences

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Users
- `GET /api/users/:id` - Get user public profile
- `GET /api/users/:id/stats` - Get user academic stats

### Tickets
- `GET /api/tickets` - Get all user tickets
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket

### Chat
- `GET /api/chat/:sessionId` - Get chat history
- `POST /api/chat` - Save chat message
- `GET /api/chat/sessions/list` - Get all chat sessions

## Tech Stack

**Frontend**
- React 18
- Vite
- Tailwind CSS
- React Router v6
- Axios
- Iconify

**Backend**
- Node.js
- Express
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs

## License

MIT
