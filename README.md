# OPPD WhatsApp Service

A WhatsApp integration for the OPPD consultation system that allows patients to schedule consultations through WhatsApp.

## Features

- WhatsApp integration using Meta WhatsApp Business API
- Conversational flow to collect patient information
- AI-powered follow-up questions using Google's Gemini AI
- Integration with the OPPD database to store patient data

## Prerequisites

- Node.js (14.x or higher)
- WhatsApp Business Account and API access
- Google Gemini API key
- MongoDB (for storing conversation state)

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   cp .env.example .env
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
   
## WhatsApp API Setup

1. Create a WhatsApp Business account at [Facebook Developers](https://developers.facebook.com/)
2. Set up a WhatsApp Business API application
3. Configure the webhook URL to point to your deployed service: `https://your-domain.com/api/whatsapp/webhook`
4. Use the provided verify token from your `.env` file during webhook setup
5. Get your WhatsApp Access Token and Phone Number ID from the Facebook Developer Dashboard

## Conversation Flow

1. User initiates conversation with a greeting
2. Bot asks for doctor code
3. Bot confirms doctor selection
4. Bot collects patient information (name, age, gender)
5. Bot asks for reason for visit
6. Bot generates AI-powered follow-up questions
7. After completing questions, patient data is sent to OPPD database

## Development

For local development and testing, you can use the test endpoint:

```
POST /api/whatsapp/test
{
  "phoneNumber": "+1234567890",
  "message": "Hello"
}
```

This endpoint simulates the conversation flow without requiring an actual WhatsApp connection.

## Deployment to Railway

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Configure environment variables in Railway dashboard using the same keys as in `.env.example`
4. Deploy the application

## License

Copyright © 2025 OPPD
