require('dotenv').config();
const axios = require('axios');

/**
 * Utility script to test WhatsApp API integration directly
 */
async function testWhatsAppAPI() {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const recipientNumber = process.argv[2]; // Get phone number from command line

    if (!recipientNumber) {
      console.error('Please provide a recipient phone number as a command line argument');
      console.error('Usage: node testWhatsApp.js +1234567890');
      process.exit(1);
    }

    console.log(`Testing WhatsApp API with phone number: ${recipientNumber}`);

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientNumber,
        type: 'text',
        text: { body: 'Hello! This is a test message from the OPPD WhatsApp Service.' }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Successfully sent test message!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error sending test message:');
    console.error(error.response?.data || error.message);
  }
}

testWhatsAppAPI();
