const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Service for interacting with Google's Gemini AI model
 */
class GeminiService {
  constructor() {
    // Initialize the Gemini API client
    const apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = 'gemini-2.0-flash'; // Using the faster model from the shared example
    
    // Default language if none specified
    this.defaultLanguage = "English";
    
    // Language support mapping for Gemini model
    this.supportedLanguages = {
      "English": "English",
      "Hindi": "Hindi",
      "Marathi": "Marathi",
      "Tamil": "Tamil",
      "Telugu": "Telugu",
      "Kannada": "Kannada"
    };
    
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
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: `You are a Medical AI assistant trained to provide preliminary medical assessments. Your role is to carefully analyze patient information, symptoms, and vital signs and ask the user a series of questions to understand their condition, the questions will contain options to help the user provide accurate information. Return a JSON array where each individual element is an object containing exactly two keys: "question" and "options", where options is an array of strings.`
      });
      return model;
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
      const language = patientData.language || this.defaultLanguage;
      
      // Create prompt with context and explicit formatting instructions
      const prompt = `
        Patient Information:
        Name: ${patientData.name || 'Unknown'}
        Age: ${patientData.age || 'Unknown'}
        Gender: ${patientData.gender || 'Unknown'}
        Reason for visit: ${patientData.reasonForVisit || 'Unknown'}
        
        ${patientData.responses ? 'Previous responses: ' + JSON.stringify(patientData.responses) : ''}
        
        Based on this information, generate exactly 3 relevant follow-up medical questions in ${language} language. Each question should have 4 multiple-choice options.
        
        The response must be in this exact JSON format:
        [
          {
            "question": "First question text in ${language}?",
            "options": ["Option 1 in ${language}", "Option 2 in ${language}", "Option 3 in ${language}", "Option 4 in ${language}"]
          },
          {
            "question": "Second question text in ${language}?",
            "options": ["Option 1 in ${language}", "Option 2 in ${language}", "Option 3 in ${language}", "Option 4 in ${language}"]
          },
          {
            "question": "Third question text in ${language}?",
            "options": ["Option 1 in ${language}", "Option 2 in ${language}", "Option 3 in ${language}", "Option 4 in ${language}"]
          }
        ]
      `;

      console.log(`Using Gemini model: ${this.modelName} in ${language}`);
      const result = await model.generateContent(prompt);
      
      if (!result || !result.response) {
        console.warn('Received empty response from Gemini');
        return this.defaultQuestions;
      }
      
      // Parse the response
      try {
        const responseText = result.response.text();
        console.log('Gemini raw response:', responseText);
        
        // Clean up the response to handle possible text prefixes/suffixes
        const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const jsonText = jsonMatch ? jsonMatch[0] : responseText;
        
        const responseJson = JSON.parse(jsonText);
        
        if (Array.isArray(responseJson) && responseJson.length > 0) {
          // Validate the response format
          const validQuestions = responseJson.filter(q => 
            q && typeof q.question === 'string' && 
            Array.isArray(q.options) && q.options.length > 0
          );
          
          if (validQuestions.length > 0) {
            return validQuestions;
          }
        }
        
        console.warn('Invalid response format from Gemini:', responseJson);
        return this.defaultQuestions;
      } catch (parseError) {
        console.error('Error parsing JSON from Gemini response:', parseError);
        console.debug('Response that failed to parse:', result.response.text());
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
