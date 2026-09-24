# ServiceHub (Microservice & Health Registry)

ServiceHub is an internal developer registry for tracking microservice endpoints, health statuses, and deployment environments (DEVELOPMENT, STAGING, PRODUCTION). Developers can register new services, inspect service configurations, update operational health statuses, and decommission services

## Tech Stack

- **Backend Runtime**: Node.js (v18+), ExpressJS, TypeScript
- **Security & Validation**: jsonwebtoken (JWT), bcryptjs, zod
- **Frontend Framework**: React (v18+ with Vite), TypeScript
- **State Management**: React Context API + useReducer Hook

## Setup

1. **Clone & Install Dependencies**

   ```bash
   git clone https://github.com/KabbalahTreeofLife/castillo-sanol_se2144-midterm.git

   cd castillo-sanol_se2144-midterm/api
   npm install

   cd ../frontend
   npm install

   cd ..
   ```

2. **Create Database and Load Schema**

   ```bash
   createdb -U postgres castillo-sanol_se2144-midterm
   psql -U postgres -d castillo-sanol_se2144-midterm -f api/schema.sql
   ```

3. **Configure Environment Variables — create a .env file in castillo-sanol_se2144-midterm/api:**

   ```env
   PORT=3000
   PGHOST=localhost
   PGDATABASE=castillo-sanol_se2144-midterm
   PGPORT=5432
   PGUSER=your_username
   PGPASSWORD=your_password
   JWT_SECRET=your_custom_JWT_string
   ```

4. **Start the Server**

   **Terminal #1**:

   ```bash
   cd api
   npm run dev

   # http://localhost:3000
   ```

   **Terminal #2**:

   ```bash
   cd frontend
   npm run dev

   # http://localhost:5173
   ```
