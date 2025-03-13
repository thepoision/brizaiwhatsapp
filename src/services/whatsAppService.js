const axios = require('axios');

/**
 * Service for interacting with Meta WhatsApp Business API
 */
class WhatsAppService {
  constructor() {
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  }

  /**
   * Send a text message to a WhatsApp user
   * 
   * @param {string} phoneNumberId - The phone number ID of the business WhatsApp account
   * @param {string} recipientNumber - The recipient's phone number
   * @param {string} message - The message text to send
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendMessage(phoneNumberId, recipientNumber, message) {
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientNumber,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  /**
   * Send a message with options as a list
   * 
   * @param {string} phoneNumberId - The phone number ID of the business WhatsApp account
   * @param {string} recipientNumber - The recipient's phone number
   * @param {string} headerText - Header text for the list message
   * @param {string} bodyText - Body text explaining the options
   * @param {Array<{id: string, title: string, description: string}>} options - List of options
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendOptionsMessage(phoneNumberId, recipientNumber, headerText, bodyText, options) {
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      
      // Format options for interactive list
      const sections = [{
        title: 'Options',
        rows: options.map(option => ({
          id: option.id,
          title: option.title,
          description: option.description || ''
        }))
      }];

      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientNumber,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: {
              type: 'text',
              text: headerText
            },
            body: {
              text: bodyText
            },
            action: {
              button: 'Select an option',
              sections: sections
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp options message:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp options message: ${error.message}`);
    }
  }

  /**
   * Send a message with buttons
   * 
   * @param {string} phoneNumberId - The phone number ID of the business WhatsApp account
   * @param {string} recipientNumber - The recipient's phone number
   * @param {string} headerText - Header text for the button message
   * @param {string} bodyText - Body text explaining the options
   * @param {Array<{id: string, text: string}>} buttons - Array of button options
   * @returns {Promise<object>} - Response from WhatsApp API
   */
  async sendButtonsMessage(phoneNumberId, recipientNumber, headerText, bodyText, buttons) {
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      
      // Format buttons for interactive message
      const formattedButtons = buttons.map(button => ({
        type: 'reply',
        reply: {
          id: button.id,
          title: button.text
        }
      }));

      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientNumber,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: {
              type: 'text',
              text: headerText
            },
            body: {
              text: bodyText
            },
            action: {
              buttons: formattedButtons
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp buttons message:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp buttons message: ${error.message}`);
    }
  }
}

module.exports = WhatsAppService;
