# Legit HealthCare App

A modern, high-performance, and AI-powered Healthcare Management System designed for digital-first medical institutions. Built with a robust Flask backend and a lightning-fast React + TypeScript frontend.

---

## 🌟 Key Features

### 🛡️ 1. Security & Authentication
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admin, Doctor, Patient, and Staff roles.
- **Two-Factor Authentication (2FA)**: Secure login with Time-based One-Time Passwords (TOTP) for sensitive accounts.
- **JWT Session Management**: Stateless, secure communication between frontend and backend.
- **Secure Password Hashing**: Industry-standard Bcrypt hashing.

### 🏥 2. Patient Management
- **Digital Registration**: Streamlined onboarding workflow for new patients.
- **Patient Dashboard**: A unified view for patients to track their appointments, reports, and history.
- **Electronic Health Records (EHR)**: Secure storage and retrieval of patient medical history.
- **Progress Tracking**: Real-time indicators of patient status throughout their visit.

### 📅 3. Smart Clinical Operations
- **Real-time Queue Management**: Live patient queue updates across departments using Socket.IO.
- **Appointment Scheduling**: Effortless booking and management of medical consultations.
- **Consultation Module**: Integrated workflow for doctors to record clinical notes and prescriptions.
- **Departmental Routing**: Automated routing of patients between Triage, Consultation, Pharmacy, and Diagnostics.

### 🧠 4. AI-Driven Insights
- **Intelligent Diagnostics Assistance**: AI-powered analysis of screening data to assist medical practitioners.
- **Automated Screening Matrix**: High-speed evaluation of vital signs and bio-data.
- **Director's Dashboard**: High-level insights and oversight for hospital administration.

### 💬 5. Communication & Notifications
- **In-App Messaging**: Real-time chat functionality between staff and departments.
- **Smart Notifications**: Multi-channel notifications via in-app alerts, emails, and real-time Socket.IO events.
- **Automated Email Reports**: Direct delivery of reports and appointment confirmations.

### 🎨 6. System Configuration & Branding
- **Institutional Branding**: Dynamic customization of logos, themes, and hospital names.
- **Global Settings**: Manage departments, hospital locations, and system-wide constants (races, nationalities, etc.).
- **Dynamic UI**: Responsive, modern interface with dark mode support.

### 📊 7. Reporting & Tools
- **Automated PDF Generation**: Export professional medical reports and registration slips.
- **Digital QR Codes**: Quick patient identification using QR codes for touchless check-ins.
- **Data Export**: Comprehensive data views for administrative audits.

---

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### 📋 Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **npm** or **yarn**

### 🛠️ Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Unix:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Create a `.env` file in the `backend` folder and add:
   ```env
   SECRET_KEY=your_secret_key
   DATABASE_URL=sqlite:///hc_system.db
   OPENAI_API_KEY=your_openai_api_key
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_app_password
   ```
5. Initialize the database and seed data:
   ```bash
   python setup_system.py
   python init_rbac_data.py
   ```
6. Start the backend server:
   ```bash
   python app.py
   ```

### 💻 Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🏗️ Production Build

### 1. Build the Frontend
Compiles the application into highly optimized static files in the `dist` directory.
```bash
cd frontend
npm run build
```

### 2. Configure Production Backend
For production, it is recommended to use a robust WSGI server like **Gunicorn** (Linux) or **Waitress** (Windows).
```bash
# Example for Linux
pip install gunicorn
gunicorn -k eventlet -w 1 app:app
```

---

## 🌐 Deployment Guide

### Recommended Platforms
- **Render** (Great for full-stack monorepos)
- **Vercel** (Best for React frontend)
- **Railway** (Best for Flask backend and PostgreSQL)

### Option 1: Deployment on [Render](https://render.com) (Recommended)
1. **Frontend (Static Site)**:
   - Build Command: `npm install; npm run build`
   - Publish Directory: `frontend/dist`
2. **Backend (Web Service)**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn -k eventlet -w 1 app:app`
   - Add Environment Variables (from your `.env`).

### Option 2: [Railway](https://railway.app) (Backend + Database)
1. Connect your Github Repo.
2. Add a **PostgreSQL** database plugin.
3. Update `DATABASE_URL` to the Railway-provided connection string.
4. Deploy the `backend` folder as a Web Service.

### ⚠️ Important Production Considerations
> [!IMPORTANT]
> **Database**: For production, migration from **SQLite** to **PostgreSQL** or **MySQL** is strongly recommended for data integrity and concurrency support.
> 
> **SSL/TLS**: Ensure your production domain is served over HTTPS to protect patient data and JWT tokens.
> 
> **Secrets**: Never commit your `.env` file. Use the platform’s secret management system.

---

## 🧪 Testing
Run the backend test suite:
```bash
cd backend
pytest
```

---

## 📄 License
This project is licensed under the Private License.
