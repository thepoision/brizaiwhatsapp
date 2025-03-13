# Testing the OPPD WhatsApp Service

This guide explains how to test your WhatsApp integration both locally and with the actual WhatsApp API.

## Testing Methods

There are two main methods to test your WhatsApp implementation:

1. **Direct WhatsApp API Test**: Test sending real messages using the Meta WhatsApp API
2. **Local Conversation Flow Test**: Test the entire conversation flow without using the WhatsApp API

## Prerequisites

Before testing, make sure:
1. Your `.env` file is configured with the correct API keys
2. Node.js is installed on your machine

## Method 1: Direct WhatsApp API Test

This test will send an actual WhatsApp message using your Meta API credentials.

### Steps:

1. First, make sure your phone number is added to the test phone numbers in your WhatsApp Business account.

2. Run the test script with your phone number (including country code):
   ```bash
   npm run test:whatsapp -- +1234567890
   ```
   
   Replace `+1234567890` with your actual WhatsApp phone number.

3. If successful, you should receive a test message on your WhatsApp.

## Method 2: Local Conversation Flow Test

This test simulates the entire conversation flow without connecting to the actual WhatsApp API.

### Steps:

1. Start the server in one terminal:
   ```bash
   npm run dev
   ```

2. In another terminal, run the conversation test:
   ```bash
   npm run test:conversation
   ```

3. Follow the prompts to test the conversation flow:
   - The test will start by sending "Hi" to initiate the conversation
   - You'll see the bot's response and the current state
   - Enter your responses when prompted
   - The test will show the current conversation state at each step

## Webhook Testing

To test the webhook setup (required for production):

1. Deploy your application to a public URL (Railway or similar)
2. Use the public URL in your WhatsApp Business API webhook configuration
3. The webhook URL should be: `https://your-domain.com/api/whatsapp/webhook`
4. Use `oppd-whatsapp-verify-token` as your verify token (or change it in your `.env` file)

## Troubleshooting

If you encounter errors:

1. **API Errors**: Check that your API credentials are correct in the `.env` file
2. **Server Not Running**: Make sure the server is started with `npm run dev`
3. **WhatsApp API Errors**: Make sure your WhatsApp Business account is properly set up and your test phone number is approved

## Next Steps

After successful testing, deploy your application to Railway for production use.
