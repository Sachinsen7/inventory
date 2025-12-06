# 🚀 Production Deployment Guide

## 📋 Overview

When you run the project in production, you want:
- **One server** (backend) running on port 5000
- **Frontend** served as static files from the backend
- **Access everything** at `http://localhost:5000`

---

## 🎯 How It Works

### **Development Mode (Current):**
```
Frontend: http://localhost:3000 (React dev server)
Backend:  http://localhost:5000 (Express server)
```

### **Production Mode (What you want):**
```
Everything: http://localhost:5000 (Express serves both)
```

---

## 📁 Folder Structure

### **Current Structure:**
```
Inventory_work-main/
├── backend/
│   ├── server.js          ← Backend server
│   ├── routes/
│   ├── models/
│   └── ...
└── frontend/
    ├── src/               ← React source code
    ├── public/
    └── package.json
```

### **After Build:**
```
Inventory_work-main/
├── backend/
│   ├── server.js
│   ├── build/             ← Frontend static files (created after build)
│   │   ├── index.html
│   │   ├── static/
│   │   │   ├── css/
│   │   │   └── js/
│   │   └── ...
│   └── ...
└── frontend/
    ├── src/
    └── build/             ← OR frontend static files here
        ├── index.html
        └── static/
```

---

## 🔧 Step-by-Step Setup

### **Step 1: Build Frontend**

```bash
cd frontend
npm run build
```

This creates a `build` folder with static files:
- `build/index.html`
- `build/static/css/...`
- `build/static/js/...`

### **Step 2: Copy Build to Backend**

**Option A - Manual Copy:**
```bash
# Windows
xcopy /E /I frontend\build backend\build

# Linux/Mac
cp -r frontend/build backend/build
```

**Option B - Use Script (Recommended):**
Create `frontend/package.json` script:
```json
{
  "scripts": {
    "build": "react-scripts build",
    "build:prod": "react-scripts build && xcopy /E /I build ..\\backend\\build"
  }
}
```

Then run:
```bash
cd frontend
npm run build:prod
```

### **Step 3: Configure Backend to Serve Static Files**

Open `backend/server.js` and add this code **AFTER all your API routes** but **BEFORE** the server starts:

```javascript
// ============================================
// SERVE STATIC FILES IN PRODUCTION
// ============================================

if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'build')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}
```

**Important:** Add `path` import at the top of server.js:
```javascript
const path = require('path');
```

### **Step 4: Set Environment Variable**

**Windows:**
```bash
set NODE_ENV=production
```

**Linux/Mac:**
```bash
export NODE_ENV=production
```

**Or in .env file:**
```
NODE_ENV=production
```

### **Step 5: Start Backend**

```bash
cd backend
npm start
```

### **Step 6: Access Application**

Open browser: `http://localhost:5000`

---

## 📍 Where Files Are Served From

### **When you hit `http://localhost:5000`:**

1. **Backend checks:** Is this an API route?
   - `/api/*` → Backend handles it
   
2. **If not API:** Serve static files
   - `/` → `backend/build/index.html`
   - `/static/css/*` → `backend/build/static/css/*`
   - `/static/js/*` → `backend/build/static/js/*`
   - `/billing` → `backend/build/index.html` (React Router handles it)
   - `/settings` → `backend/build/index.html` (React Router handles it)

---

## 🎯 Complete Implementation

### **1. Update server.js**

Add this code at the end of your `backend/server.js` (before `app.listen`):

```javascript
const path = require('path'); // Add at top

// ... all your existing code ...

// ============================================
// SERVE STATIC FILES IN PRODUCTION
// ============================================

if (process.env.NODE_ENV === 'production') {
  console.log('Running in PRODUCTION mode - serving static files');
  
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, 'build')));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
} else {
  console.log('Running in DEVELOPMENT mode');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

### **2. Create Build Script**

Create `build-and-deploy.bat` (Windows) in root folder:

```batch
@echo off
echo Building frontend...
cd frontend
call npm run build

echo Copying build to backend...
xcopy /E /I /Y build ..\backend\build

echo Done! Build copied to backend\build
cd ..
```

Or `build-and-deploy.sh` (Linux/Mac):

```bash
#!/bin/bash
echo "Building frontend..."
cd frontend
npm run build

echo "Copying build to backend..."
cp -r build ../backend/build

echo "Done! Build copied to backend/build"
cd ..
```

### **3. Update Frontend API URL**

In `frontend/src` files, make sure API calls use relative URLs:

```javascript
// Good - works in both dev and production
const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

// In production, this becomes:
// http://localhost:5000/api/customers (same domain)
```

Or update `.env` files:

**frontend/.env.development:**
```
REACT_APP_BACKEND_URL=http://localhost:5000
```

**frontend/.env.production:**
```
REACT_APP_BACKEND_URL=
```

---

## 🚀 Quick Start Commands

### **Development Mode:**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start

# Access:
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

### **Production Mode:**
```bash
# Build frontend
cd frontend
npm run build

# Copy to backend
xcopy /E /I /Y build ..\backend\build

# Set environment
cd ..\backend
set NODE_ENV=production

# Start server
npm start

# Access:
# Everything: http://localhost:5000
```

---

## 📊 Folder Structure After Build

```
backend/
├── build/                    ← Frontend static files
│   ├── index.html           ← Main HTML file
│   ├── favicon.ico
│   ├── manifest.json
│   ├── static/
│   │   ├── css/
│   │   │   └── main.abc123.css
│   │   ├── js/
│   │   │   ├── main.xyz789.js
│   │   │   └── runtime.def456.js
│   │   └── media/
│   └── asset-manifest.json
├── server.js                ← Serves both API and static files
├── routes/
├── models/
└── ...
```

---

## 🔍 How Requests Are Handled

### **Example 1: API Request**
```
Request:  GET http://localhost:5000/api/customers
Handler:  Backend route (billingRoutes.js)
Response: JSON data
```

### **Example 2: Page Request**
```
Request:  GET http://localhost:5000/billing
Handler:  Express serves build/index.html
Response: HTML (React app loads and handles routing)
```

### **Example 3: Static File**
```
Request:  GET http://localhost:5000/static/js/main.xyz789.js
Handler:  Express serves build/static/js/main.xyz789.js
Response: JavaScript file
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Frontend builds successfully (`npm run build`)
- [ ] Build folder exists in `backend/build`
- [ ] `backend/build/index.html` exists
- [ ] `backend/build/static/` folder has css and js
- [ ] `server.js` has static file serving code
- [ ] `NODE_ENV=production` is set
- [ ] Backend starts without errors
- [ ] `http://localhost:5000` shows your app
- [ ] All pages work (billing, settings, etc.)
- [ ] API calls work
- [ ] No CORS errors

---

## 🐛 Troubleshooting

### **Issue: 404 on page refresh**
**Solution:** Make sure the `app.get('*')` route is AFTER all API routes

### **Issue: API calls fail**
**Solution:** Check `REACT_APP_BACKEND_URL` in frontend

### **Issue: Static files not loading**
**Solution:** Verify `backend/build` folder exists and has files

### **Issue: Blank page**
**Solution:** Check browser console for errors, verify build was successful

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Build frontend: `npm run build`
- [ ] Copy build to backend
- [ ] Set `NODE_ENV=production`
- [ ] Update `.env` with production values
- [ ] Test all features
- [ ] Check all API endpoints work
- [ ] Verify all pages load
- [ ] Test on different browsers
- [ ] Check mobile responsiveness

---

## 📝 Summary

### **Development:**
- Frontend: `localhost:3000` (React dev server)
- Backend: `localhost:5000` (Express)
- Two separate servers

### **Production:**
- Everything: `localhost:5000` (Express serves both)
- Frontend files: `backend/build/`
- One server, easier deployment

---

**Status:** ✅ Guide Complete
**Next:** Build frontend and configure server.js
**Date:** December 6, 2025

---
