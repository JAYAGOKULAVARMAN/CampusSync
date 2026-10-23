# CampusSync

**Inter-Departmental Planning & Resource Sharing Platform**

CampusSync is a real full-stack web application designed for educational institutions to facilitate resource sharing, event planning, and inter-departmental collaboration.

---

## 🛠️ Technology Stack

- **Frontend:** React.js, JavaScript, React Router, Axios, Vite
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JWT (JSON Web Tokens), bcrypt

---

## 📁 Project Structure

```
CampusSync/
├── client/                 # React Frontend (Vite)
│   ├── public/             # Static Assets
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/     # UI Components (future expansion)
│   │   ├── pages/          # Page Views (future expansion)
│   │   ├── services/       # Axios API integration
│   │   │   └── api.js
│   │   ├── App.jsx         # Main React Component
│   │   ├── index.css       # Base CSS Styles
│   │   └── main.jsx        # React Application Entry Point
│   ├── index.html          # HTML Template
│   ├── package.json        # Frontend Dependencies
│   ├── vite.config.js      # Vite Configuration (Port 5173 + API Proxy)
│   └── .gitignore          # Git Ignore rules for Frontend
├── server/                 # Node.js + Express Backend
│   ├── config/             # Database & Configuration Files
│   │   └── db.js           # Mongoose MongoDB Connection Setup
│   ├── routes/             # Express API Routes
│   │   └── healthRoutes.js # GET /api/health Endpoint Router
│   ├── .env                # Local Environment Variables
│   ├── .env.example        # Environment Variables Template
│   ├── package.json        # Backend Dependencies & Scripts
│   ├── server.js           # Express App Server Entry Point
│   └── .gitignore          # Git Ignore rules for Backend
├── .gitignore              # Root Git Ignore
└── README.md               # Project Documentation
```

---

## 🚀 Getting Started & Installation

### 1. Server Setup (Backend)

Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```

Ensure MongoDB is installed and running locally on port `27017` or update `MONGO_URI` in `server/.env`.

Start the server:
```bash
# Development mode (with auto-reload via nodemon):
npm run dev

# Standard production mode:
npm start
```

The Express server will start running on **`http://localhost:5000`**.

---

### 2. Client Setup (Frontend)

Navigate to the `client` directory and install dependencies:
```bash
cd client
npm install
```

Start the frontend Vite development server:
```bash
npm run dev
```

The React app will start running on **`http://localhost:5173`**.

---

## 🧪 Testing the Health-Check API Endpoint

### Method 1: Using Browser or cURL
Open your browser or run in terminal:
```bash
curl http://localhost:5000/api/health
```

**Expected JSON Response:**
```json
{
  "success": true,
  "message": "CampusSync API is running"
}
```

### Method 2: Via Frontend App
Visit **`http://localhost:5173`**. The React application will automatically ping `GET /api/health` via Axios and render the backend connectivity status on screen.
