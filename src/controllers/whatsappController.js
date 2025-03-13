const express = require('express');
const router = express.Router();
const ConversationService = require('../services/conversationService');
const WhatsAppService = require('../services/whatsAppService');

// Initialize services
const whatsappService = new WhatsAppService();
const conversationService = new ConversationService();

/**
 * Meta WhatsApp webhook verification endpoint
 */
router.get('/webhook', (req, res) => {
  // Get verify token from request query parameters
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    // Respond with '400 Bad Request' if parameters are missing
    res.sendStatus(400);
  }
});

/**
 * Handle incoming WhatsApp messages from Meta API
 */
router.post('/webhook', async (req, res) => {
  try {
    // Return a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
    
    const body = req.body;
    
    // Checks this is a WhatsApp API event
    if (body.object) {
      if (body.entry && 
          body.entry[0].changes && 
          body.entry[0].changes[0] && 
          body.entry[0].changes[0].value.messages && 
          body.entry[0].changes[0].value.messages[0]) {
        
        // Extract message details
        const change = body.entry[0].changes[0];
        const phoneNumberId = change.value.metadata.phone_number_id;
        const from = change.value.messages[0].from;
        const messageBody = change.value.messages[0].text.body;
        
        // Get or create conversation context for this user
        const context = await conversationService.getOrCreateContext(from);
        
        // Process the message based on conversation state
        const response = await conversationService.processMessage(from, messageBody, context);
        
        // Send response back to WhatsApp
        await whatsappService.sendMessage(phoneNumberId, from, response.message);
        
        // Log the interaction
        console.log(`Message from ${from}: "${messageBody}" -> Response: "${response.message}"`);
      }
    }
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
  }
});

/**
 * Manual trigger to test the conversation flow (development only)
 */
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }
    
    // Get or create conversation context
    const context = await conversationService.getOrCreateContext(phoneNumber);
    
    // Process the message
    const response = await conversationService.processMessage(phoneNumber, message, context);
    
    // Return the response that would be sent to WhatsApp
    res.status(200).json({
      phoneNumber,
      userMessage: message,
      botResponse: response.message,
      currentState: response.currentState
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
