# Maradi B2B Wholesale Ordering App (MVP)

This repository contains the source code for the Maradi B2B system, which includes a Backend API, a Mobile App for customers/staff, and a Web Admin Dashboard.

## Project Structure

-   `backend`: Node.js/Express API with PostgreSQL.
-   `mobile-app`: React Native (Expo) app for Android/iOS.
-   `web-admin`: React (Vite) dashboard for desktop management.

## Prerequisites

-   Node.js (v18+)
-   PostgreSQL Database
-   Expo Go app on your phone (for testing mobile app)

## Getting Started

You need to run all three components simultaneously in separate terminals.

### 1. Database Setup
Ensure you have a PostgreSQL database running. Update the `.env` file in the `backend` folder with your credentials.
(See `backend/src/db/schema.sql` for table definitions if setting up freshly).

### 2. Run Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:5000
```

### 3. Run Web Admin Dashboard
```bash
cd web-admin
npm install
npm run dev
# Dashboard runs on http://localhost:5173
# Login with: owner@maradi.com / owner123 (or your configured internal user)
```

### 4. Run Mobile App
```bash
cd mobile-app
npm install
npx expo start
# Scan the QR code with Expo Go app or your camera
```

## Features Verified (MVP Phase 1)

**Mobile App:**
-   **Internal Users**: Add Stock (with photo), View Pending Orders, Fulfill Orders, Scan QR.
-   **Customers**: View Catalog, Select Serials, Add to Cart (15-min reservation), Place Order, View History.

**Web Admin:**
-   **Dashboard**: View KPIs (Revenue, Pending Orders).
-   **Orders**: Manage Order Status (Confirm, Dispatch, Complete).
-   **Inventory**: View Stock Levels.

## Next Steps (Phase 2)
-   **Image Upload**: Replace URL inputs with actual S3/Cloudinary image upload.
-   **Notifications**: Push notifications for order updates.
-   **Production Deployment**: Deploy Backend to Render/Heroku, Web to Vercel/Netlify.
