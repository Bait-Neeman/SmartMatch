# SmartMatch 💙

### Full Stack Matching Platform

![React](https://img.shields.io/badge/Frontend-React-blue?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-darkgreen?logo=mongodb)
![Express](https://img.shields.io/badge/API-Express-black?logo=express)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![MUI](https://img.shields.io/badge/UI-Material_UI-007FFF?logo=mui)

---

# 📌 Project Overview

**SmartMatch** is a Full Stack web application designed to manage intelligent matching workflows between users through profiles, preferences, interests, approvals, and administrator handling.

The system allows users to:

* Register and authenticate securely
* Build personal profiles
* Define matching preferences
* Receive dynamic match suggestions
* Send and manage interests
* Approve or reject match requests
* Share profile files after mutual approval
* Escalate approved matches to an administrator

The platform was built with a strong focus on:

* Modular architecture
* Secure authentication
* Scalable backend structure
* Clean UI/UX
* Real-world workflow simulation

---

# 🚀 Main Features

## User Authentication

* JWT-based authentication
* Protected routes
* Persistent login sessions
* Role-based authorization

## Profile Management

* Create and update personal profile
* Upload profile image
* Upload PDF resume
* Store education, occupation, financial data, and additional profile information

## Preference System

* Define desired match criteria
* Multi-select appearance preferences
* Financial requirement filtering
* Dynamic compatibility filtering

## Matching Engine

* Server-side match generation
* Preference-based filtering
* Hidden sensitive data before approval
* Dynamic compatibility checks

## Interest Workflow

* Send interest requests
* Accept or reject interests
* Mutual approval flow
* Conditional profile exposure

## Admin Dashboard

* View pending approved matches
* Review user profiles
* Manage match workflow

---

# 🛠 Tech Stack

## Frontend

* React
* Vite
* React Router
* Material UI (MUI)
* Axios

## Backend

* Node.js
* Express.js

## Database

* MongoDB
* Mongoose

## Authentication

* JWT (JSON Web Token)

## File Upload

* Multer
* Cloudinary (images and resumes are stored only in Cloudinary, as private files)

---

# 🧱 System Architecture

The project follows a modular Full Stack architecture:

```text
Client (React)
   ↓
REST API (Express)
   ↓
Business Logic Layer (Services)
   ↓
MongoDB Database
```

## Backend Layers

### Routes

Responsible for defining API endpoints.

### Controllers

Handle incoming requests and responses.

### Services

Contain business logic and database operations.

### Models

Mongoose schemas and database structure.

### Middleware

Authentication and authorization validation.

---

# 🔐 Authentication & Authorization

The system uses JWT authentication.

## Authentication Flow

1. User logs in
2. Server validates credentials
3. JWT token is generated
4. Token is stored in localStorage
5. Protected routes validate token access

## Authorization

The application supports:

* Regular users
* Admin users

Admin-only routes are protected via middleware.

---

# 🤖 AI Integration

Currently, the system does not include AI integrations.

However, the architecture was designed to support future AI-based recommendation systems such as:

* Compatibility scoring
* Smart ranking
* Recommendation optimization

---

# 🗄 Database Structure

## Main Collections

### Users

Stores:

* Credentials
* Roles
* Authentication data

### Profiles

Stores:

* Personal information
* Study place
* Occupation
* Financial capabilities
* Resume and image paths

### Preferences

Stores:

* Matching requirements
* Appearance preferences
* Financial requirements

### Interests

Stores:

* Match requests
* Approval states
* Admin transfer states

---

# 📡 API Overview

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
```

## Profile

```http
GET /api/profile/me
POST /api/profile
PUT /api/profile
```

## Preferences

```http
GET /api/preference/me
POST /api/preference
PUT /api/preference
```

## Matches

```http
GET /api/match/candidates
```

## Interests

```http
POST /api/interest
GET /api/interest/incoming
GET /api/interest/outgoing
PUT /api/interest/:id/approve
PUT /api/interest/:id/reject
```

## Admin

```http
GET /api/admin/users
GET /api/admin/pending-matches
```

---

# ⚙️ Installation & Setup

## Clone Repository

```bash
git clone https://github.com/yourusername/smartmatch.git
cd smartmatch
```

---

## Install Dependencies

### Client

```bash
cd client
npm install
```

### Server

```bash
cd server
npm install
```

---

## Run Development Servers

### Backend

```bash
cd server
node server.js
```

### Frontend

```bash
cd client
npm run dev
```

---

# 🔑 Environment Variables

## Client `.env`

```env
VITE_API_URL=http://localhost:3000
```

## Server `.env`

See `server/.env.example` and `server/README.md` for all variables.

```env
PORT=3000
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

---

# 📂 Project Structure

```text
SmartMatch/
│
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── routes/
│   │   └── context/
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
```

---

# 📈 Future Improvements

* AI-powered compatibility scoring
* Real-time notifications
* Advanced filtering system
* Email verification
* Mobile responsive optimization
* Cloud file storage
* Admin analytics dashboard
* Chat system between approved users

---

# 👩‍💻 My Responsibilities

This project was developed as part of a Full Stack development portfolio.

Main responsibilities included:

* Frontend architecture
* React component development
* Backend API development
* MongoDB schema design
* Authentication implementation
* Matching workflow logic
* Admin system development
* File upload system
* UI/UX improvements
* Debugging and system integration

---

# 🖼 Screenshots

## Login Page

*Add screenshot here*

## Personal Area

*Add screenshot here*

## Matches Page

*Add screenshot here*

## Interests Page

*Add screenshot here*

## Admin Dashboard

*Add screenshot here*

---

# 🌐 Deployment

Deployment-ready architecture.

Can be deployed using:

* Render
* Railway
* Vercel
* Netlify
* MongoDB Atlas

---

# 📬 Contact

**Developer:** Hani Gdalovich
**Role:** Full Stack Developer
**Tech Stack:** React | Node.js | MongoDB | Express | JWT | MUI
