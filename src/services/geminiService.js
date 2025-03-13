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
    
    // Default questions to use as fallback if AI fails
    this.defaultQuestions = [
      {
        question: "How long have you been experiencing these symptoms?",
        options: ["Less than a week", "1-2 weeks", "More than 2 weeks", "More than a month"]
      },
      {
        question: "On a scale of 1 to 10, how would you rate your pain/discomfort?",
        options: ["1-3 (Mild)", "4-6 (Moderate)", "7-8 (Severe)", "9-10 (Very Severe)"]
      },
      {
        question: "Have you taken any medication for this condition?",
        options: ["Yes, prescription medication", "Yes, over-the-counter medication", "No medication", "Both prescription and over-the-counter"]
      }
    ];
  }

  /**
   * Get the Gemini model
   * @returns {Object} The Gemini model instance
   */
  getModel() {
    try {
      return this.genAI.getGenerativeModel({ model: this.modelName });
    } catch (error) {
      console.error('Error getting Gemini model:', error);
      throw new Error('Failed to initialize Gemini AI model');
    }
  }

  /**
   * Generate follow-up questions based on patient information
   * 
   * @param {Object} patientData - Patient information collected so far
   * @returns {Promise<Array>} Array of generated questions with options
   */
  async generateFollowUpQuestions(patientData) {
    try {
      if (!patientData || !patientData.reasonForVisit) {
        console.warn('Invalid patient data provided to AI service');
        return this.defaultQuestions;
      }

      const model = this.getModel();
      
      // Create prompt with context
      const prompt = `
        You are a medical assistant helping with patient intake. 
        Generate 3 follow-up questions with multiple-choice options based on the following patient information:
        
        Name: ${patientData.name || 'Unknown'}
        Age: ${patientData.age || 'Unknown'}
        Gender: ${patientData.gender || 'Unknown'}
        Reason for visit: ${patientData.reasonForVisit || 'Unknown'}
        
        ${patientData.responses ? 'Previous responses: ' + JSON.stringify(patientData.responses) : ''}
        
        Format your response as a valid JSON array containing exactly 3 objects. Each object must have a "question" field and an "options" array field.
        Example format:
        [
          {
            "question": "How long have you been experiencing these symptoms?",
            "options": ["Less than a week", "1-2 weeks", "More than 2 weeks", "More than a month"]
          }
        ]
        
        Do not include any additional text, only return the JSON array.
      `;

      const result = await model.generateContent(prompt);
      
      if (!result || !result.response) {
        console.warn('Received empty response from Gemini');
        return this.defaultQuestions;
      }
      
      const response = result.response;
      const textResponse = response.text();
      
      if (!textResponse) {
        console.warn('Empty text response from Gemini');
        return this.defaultQuestions;
      }
      
      // Extract JSON from text response (may be surrounded by markdown or other text)
      const jsonMatch = textResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      
      if (jsonMatch) {
        try {
          const jsonText = jsonMatch[0];
          const parsedQuestions = JSON.parse(jsonText);
          
          // Validate the parsed questions
          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
            const validQuestions = parsedQuestions.filter(q => 
              q && typeof q.question === 'string' && 
              Array.isArray(q.options) && q.options.length > 0
            );
            
            if (validQuestions.length > 0) {
              return validQuestions;
            }
          }
          
          console.warn('Parsed questions did not match expected format:', parsedQuestions);
          return this.defaultQuestions;
        } catch (parseError) {
          console.error('Error parsing JSON from Gemini response:', parseError);
          console.debug('Response that failed to parse:', textResponse);
          return this.defaultQuestions;
        }
      } else {
        console.error('Failed to parse AI response into JSON:', textResponse);
        return this.defaultQuestions;
      }
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return this.defaultQuestions;
    }
  }

  /**
   * Get a specific follow-up question
   * 
   * @param {Object} patientData - Patient information
   * @param {number} questionIndex - Index of question to get (defaults to 0)
   * @returns {Promise<Object>} Question object with question text and options
   */
  async getFollowUpQuestion(patientData, questionIndex = 0) {
    try {
      const questions = await this.generateFollowUpQuestions(patientData);
      
      if (questions && questions.length > questionIndex) {
        return questions[questionIndex];
      } else {
        return this.defaultQuestions[questionIndex % this.defaultQuestions.length];
      }
    } catch (error) {
      console.error('Error getting follow-up question:', error);
      return this.defaultQuestions[questionIndex % this.defaultQuestions.length];
    }
  }
}

module.exports = GeminiService;
