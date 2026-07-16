# 🇮🇳 Wage Code Validator (Statutory Compliance Engine)

[![Node.js v18+](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React v18](https://img.shields.io/badge/React-v18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-blue.svg)](https://www.postgresql.org/)

An enterprise-ready **Wage Compliance and Restructuring Engine** built to validate and align Indian corporate payroll models with the **Code on Wages, 2019** (scheduled statutory enforcement). The application features a clean React dashboard, an Express.js API, and a robust PostgreSQL database with auditing capabilities.

---

## 🚀 Key Features

* **50% Rule Validator:** Automatically checks if Basic salary + Dearness Allowance (DA) constitutes at least 50% of the total monthly gross wage.
* **Monthly Floor Wage check:** Validates that total monthly gross pay meets the national statutory floor wage threshold of **₹10,000**.
* **Statutory Overtime Calculation:** Computes double-rate overtime (2× normal wage) based on 26 days/month and an 8-hour workday.
* **Salary Restructuring Engine:** Recomputes non-compliant structures into compliant ones while calculating the financial impact on employee net take-home and employer cost (Provident Fund and Gratuity).
* **Two Validation Modes:**
  * **Simple Mode (Free):** Fixed inputs for standard components (Basic, DA, HRA, Special Allowance, Overtime hours & rates).
  * **Dynamic Mode (Premium):** Define unlimited custom components classified into CORE and EXCLUSION categories.
* **Security & Audit Logs:** Logs client-fingerprint data (IP, browser, OS, device) for all validations, logins, and registrations.

---

## 🛠 Tech Stack

* **Frontend:** React (Vite), TypeScript, Tailwind CSS, Framer Motion (animations), Axios, Lucide Icons.
* **Backend:** Node.js, Express, TypeScript, pg (node-postgres with pooling), JSON Web Tokens (JWT), BCryptJS.
* **Database:** PostgreSQL (automatic schema creation on startup).

---

## 📁 Repository Structure

```text
├── backend/                  # Node.js + Express TypeScript API
│   ├── src/
│   │   ├── config/           # DB configuration and migrations
│   │   ├── controllers/      # Route controllers (Auth, Validate, Admin)
│   │   ├── middleware/       # JWT auth & Client info logging middlewares
│   │   ├── repositories/     # DB queries (User, Validation, Log logs)
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # Compliance logic (wageEngine.ts)
│   │   └── app.ts            # Entry point
│   ├── .env.example          # Sample environment variables configuration
│   ├── package.json          # Node scripts and dependencies
│   └── tsconfig.json         # TypeScript configuration
│
├── frontend/                 # React + Vite TypeScript App
│   ├── src/
│   │   ├── assets/           # Static files
│   │   ├── components/       # UI elements (validation forms, charts)
│   │   └── App.tsx           # Dashboard UI logic
│   ├── .env.example          # API endpoint config
│   ├── tailwind.config.js    # Styling rules
│   └── package.json          # React dependencies
│
└── README.md                 # Documentation
```

---

## ⚡ Quick Start

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or later)
* [PostgreSQL](https://www.postgresql.org/) database server running

### 1. Database Setup
Create an empty database named `wage_engine` in your PostgreSQL instance:
```sql
CREATE DATABASE wage_engine;
```

### 2. Backend Installation & Run
1. Go to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Configure the environment variables:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://<db_user>:<db_password>@localhost:5432/wage_engine
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   ```
4. Start the development server (runs auto-migrations on start):
   ```bash
   npm run dev
   ```

### 3. Frontend Installation & Run
1. Go to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the API URL in a `.env` file:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
4. Run the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to the link shown (usually `http://localhost:5173`).

---

## 🔒 Security and Audit Logs

All validation requests log the user's browser, operating system, and IP address to prevent API abuse and track usage history:
* **Validation History:** Cached validations let premium users review their past structures.
* **Audit Logs:** System configuration changes are tracked chronologically.
* **JWT Access Control:** Secure endpoints require a signed JWT token sent in the `Authorization` headers.

---

## 💳 Testing Premium Upgrades
To test **Dynamic Mode** with custom components:
1. Register and sign in.
2. Select **Dynamic Mode** $\rightarrow$ Click **Upgrade**.
3. Use the bypass payment token: **`123456789`**.

---
