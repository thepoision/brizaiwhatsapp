# Deploying OPPD WhatsApp Service to Railway

This guide will walk you through deploying your WhatsApp service to Railway and connecting it to the Meta WhatsApp API.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app/))
2. A GitHub account to push your code
3. Your WhatsApp Business API credentials (which you already have)

## Deployment Steps

### 1. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Create a GitHub Repository

1. Go to [github.com](https://github.com) and create a new repository
2. Follow the instructions to push your existing repository:

```bash
git remote add origin https://github.com/YOUR-USERNAME/oppd-whatsapp-service.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Railway

1. Log in to [Railway](https://railway.app/)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your GitHub repository
5. Railway will automatically detect your configuration and start the deployment

### 4. Configure Environment Variables

1. In your Railway project, go to the "Variables" tab
2. Add the following variables (copy from your .env file):
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `GEMINI_API_KEY`
   - `PORT=3000`

### 5. Get Your Public URL

1. Once deployed, Railway will provide a public URL for your service
2. This will look something like `https://oppd-whatsapp-service-production.up.railway.app`
3. Note this URL for the next step

### 6. Configure WhatsApp Webhook

1. Go to your [Meta Developer Dashboard](https://developers.facebook.com/)
2. Navigate to your WhatsApp Business App
3. Go to "Webhooks" section
4. Click "Configure Webhooks"
5. Enter your webhook URL: `https://YOUR-RAILWAY-URL/api/whatsapp/webhook`
6. Enter verify token: `oppd-whatsapp-verify-token` (from your .env file)
7. Subscribe to the following events:
   - `messages`
   - `message_deliveries`
   - `message_reads`

### 7. Test Your Deployment

1. Send a message to your WhatsApp test number from your phone
2. The message should be processed by your deployed service
3. You should receive a response based on your conversation flow

## Troubleshooting

If you encounter any issues:

1. Check Railway logs for errors:
   - Go to your Railway project
   - Click on the "Deployments" tab
   - Click on the latest deployment
   - Check the logs

2. Verify webhook configuration:
   - Make sure your webhook URL matches your Railway URL
   - Ensure all required webhook events are subscribed

3. Check environment variables:
   - Ensure all variables are correctly set in Railway

## Updating Your Deployment

After making changes to your code:

```bash
git add .
git commit -m "Your update message"
git push
```

Railway will automatically redeploy your service with the changes.
