const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Service for interacting with Google's Gemini AI model
 */
class GeminiService {
  constructor() {
    // Initialize the Gemini API client
    const apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = 'gemini-pro';
  }

  /**
   * Get the Gemini model
   * @returns {Object} The Gemini model instance
   */
  getModel() {
    return this.genAI.getGenerativeModel({ model: this.modelName });
  }

  /**
   * Generate follow-up questions based on patient information
   * 
   * @param {Object} patientData - Patient information collected so far
   * @returns {Promise<Array>} Array of generated questions with options
   */
  async generateFollowUpQuestions(patientData) {
    try {
      const model = this.getModel();
      
      // Create prompt with context
      const prompt = `
        You are a medical assistant helping with patient intake. 
        Generate 3 follow-up questions with multiple-choice options based on the following patient information:
        
        Name: ${patientData.name}
        Age: ${patientData.age}
        Gender: ${patientData.gender}
        Reason for visit: ${patientData.reasonForVisit}
        
        ${patientData.responses ? 'Previous responses: ' + JSON.stringify(patientData.responses) : ''}
        
        Format each question as a JSON object with "question" and "options" fields.
        The "options" field should be an array of possible answers.
        Example format:
        [
          {
            "question": "How long have you been experiencing these symptoms?",
            "options": ["Less than a week", "1-2 weeks", "More than 2 weeks", "More than a month"]
          }
        ]
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();
      
      // Extract JSON from text response (may be surrounded by markdown or other text)
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        console.error('Failed to parse AI response into JSON:', textResponse);
        throw new Error('Failed to generate properly formatted follow-up questions');
      }
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      throw new Error(`Failed to generate follow-up questions: ${error.message}`);
    }
  }

  /**
   * Generate the next follow-up question based on previous responses
   * 
   * @param {Object} patientData - Patient information including previous responses
   * @param {number} questionIndex - Index of which question to generate (0-based)
   * @returns {Promise<Object>} The next question with options
   */
  async getNextQuestion(patientData, questionIndex = 0) {
    try {
      // If we have already generated questions, use the cached ones
      if (patientData.allQuestions && patientData.allQuestions.length > questionIndex) {
        return patientData.allQuestions[questionIndex];
      }
      
      // Otherwise generate new questions
      const questions = await this.generateFollowUpQuestions(patientData);
      
      // Cache all questions
      patientData.allQuestions = questions;
      
      // Return the current question
      return questions[questionIndex] || null;
    } catch (error) {
      console.error('Error getting next question:', error);
      throw new Error(`Failed to get next question: ${error.message}`);
    }
  }
}

module.exports = GeminiService;
