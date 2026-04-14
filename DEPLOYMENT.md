# 🚀 Molt Deployment Guide

This guide details how to deploy the Molt system for the X Layer hackathon submission.

## 1. Domain Configuration
- Ensure you have an A-Record for your subdomain `xlayer.agentmolt.live` pointing to your deployment or handled by your host.
- *Note: If using Vercel/Render, they provide their own SSL/Domain management.*

## 2. Obtaining your OKX API Keys (Required)

To make the agent functional, you need to create API credentials from your OKX account:
1. Log in to [OKX API Management](https://www.okx.com/account/my-api).
2. Click **Create V5 API Key**.
3. **API Key Name**: `Molt-Demo`.
4. **Passphrase**: Create a unique passphrase (you will need this for Render).
5. **Permissions**: Check **Read** and **Trade**.
6. **IP Address**: Leave blank.
7. Copy the **API Key**, **Secret Key**, and **Passphrase**. Use these in the Render Environment Variables.

## 3. Backend Deployment (Render)

The backend acts as the bridge for **Onchain OS** skills.

### Steps:
1. **GitHub**: Push your code to a GitHub repository.
2. **Render Dashboard**: 
   - New + → **Blueprint**.
   - Select your repository.
   - Render will detect the `render.yaml` file and automatically configure the service.
3. **Environment Variables**:
   In the Render dashboard, go to your service → **Environment** and fill in:
   - `OKX_API_KEY`: Your OKX API Key.
   - `OKX_SECRET_KEY`: Your OKX Secret.
   - `OKX_PASSPHRASE`: Your OKX Passphrase.
   - `KEEPER_WALLET`: Your Keeper address (X Layer).
   - `HUNTER_WALLET`: Your Hunter address (X Layer).
   - `ARCHITECT_WALLET`: Your Architect address (X Layer).
4. **Deploy**: Render will start the build. Your backend will be live at a URL like `https://molt-backend.onrender.com`.

## 3. Frontend Deployment (Vercel)

1. **Dashboard**: Import your repository.
2. **Environment Variables**:
   Add the following to Vercel:
   - `VITE_SUPABASE_URL`: Your Supabase URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase Key.
   - `VITE_API_BASE_URL`: The URL of your **Render** backend (e.g., `https://molt-backend.onrender.com`).
3. **Deploy**: Vercel will build and host your React app.

## 4. Onchain OS Verification (13 Skills)

Once deployed, the backend will use the injected `OKX` environment variables to authenticate the CLI. 

### Triggering the "Actually Functional" Mode:
The app uses the following skills programmatically:
1. **okx-agentic-wallet**: Verified via `/api/wallet/deploy`.
2. **okx-defi-invest**: Verified via `/api/defi/discover`.
3. **okx-dex-swap**: Triggered during creature rebalancing.
4. **okx-security**: Runs before any vault deposit.
5. **okx-x402-payment**: Handled in creature chat.
6. ...and the remaining portfolio and market skills.

## 5. Troubleshooting
- **CORS Error**: Ensure your Vercel URL is added to the `allowedOrigins` list in `server/index.js` or set as an environment variable.
- **CLI Missing**: Render's environment is Linux-based. The `server/package.json` includes `dotenv`. You may need to add a post-install script to install the CLI if it's not a standard dependency.
