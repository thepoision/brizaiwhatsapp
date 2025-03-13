require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test phone number for simulation
const TEST_PHONE_NUMBER = '+1234567890';
const TEST_ENDPOINT = 'http://localhost:3000/api/whatsapp/test';

// Current conversation state
let currentState = null;

/**
 * Make a request to the test endpoint
 * @param {string} message - The message to send
 * @returns {Promise<Object>} - The response from the server
 */
async function sendMessage(message) {
  try {
    const response = await axios.post(TEST_ENDPOINT, {
      phoneNumber: TEST_PHONE_NUMBER,
      message: message
    });
    return response.data;
  } catch (error) {
    console.error('Error making request:', error.response?.data || error.message);
    return { error: true, message: error.message };
  }
}

/**
 * Run the conversation test loop
 */
async function startConversation() {
  console.log('==== OPPD WhatsApp Conversation Simulator ====');
  console.log('(Type your messages below to simulate WhatsApp conversation)');
  console.log('-------------------------------------------------');
  
  // Start the conversation with a greeting
  processUserInput('Hi');
}

/**
 * Process user input and display bot response
 * @param {string} message - User message
 */
async function processUserInput(message) {
  console.log(`\n[YOU]: ${message}`);
  
  // Send to test endpoint
  const response = await sendMessage(message);
  
  if (response.error) {
    console.log('\n[ERROR]: Could not get response from server.');
    console.log('Make sure the server is running at http://localhost:3000');
    rl.close();
    return;
  }
  
  // Update current state
  currentState = response.currentState;
  
  // Display bot response
  console.log(`\n[BOT]: ${response.botResponse}`);
  console.log(`\n[STATE]: ${currentState}`);
  
  // Prompt for next input
  rl.question('\nYour response: ', processUserInput);
}

// Start the server check
console.log('Checking if the server is running...');
axios.get('http://localhost:3000/health')
  .then(() => {
    console.log('Server is running! Starting conversation test...\n');
    startConversation();
  })
  .catch(error => {
    console.error('Server not running or health endpoint not available.');
    console.error('Please start the server with: npm start');
    console.error('Error details:', error.message);
    rl.close();
  });

// Handle exit
rl.on('close', () => {
  console.log('\nExiting conversation test.');
  process.exit(0);
});
