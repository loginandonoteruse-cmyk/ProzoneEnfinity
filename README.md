# My Shop Website

This is a full-stack e-commerce website built with React, Vite, Express, and SQLite.

## Features
- Product listing and shopping cart
- UPI Payment integration with QR Code
- Admin Dashboard for managing products and settings
- SQLite database for persistent storage

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Admin Access
- **URL:** `/admin`
- **Default Username:** `karl90`
- **Default Password:** `karl906284151703`

## Deployment to Render

1. Create a new Web Service on Render connected to your GitHub repository.
2. Use the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
3. Add a Disk for persistent database storage:
   - **Name:** `database`
   - **Mount Path:** `/opt/render/project/src/data`
   - **Size:** `1 GB`
