const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

/**
 * Service for interacting with Google's Gemini AI model
 */
class GeminiService {
  constructor() {
    // Initialize the Gemini API client
    const apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Define schema for structured response
    this.schema = {
      description: "List of Questions",
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          question: {
            type: SchemaType.STRING,
            description: "Question to ask the patient",
            nullable: false,
          },
          options: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.STRING,
              description: "Possible answer option",
            },
            description: "Possible options for the question",
            nullable: false,
          },
        },
        required: ["question", "options"],
      },
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
      return this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash", // Upgraded to newer model
        systemInstruction: `You are a medical assistant helping with patient intake. Generate follow-up questions with multiple-choice options based on the patient information provided. Each question should help gather more medical details relevant to the patient's condition. Return a JSON array where each individual element is an object containing exactly two keys: "question" and "options", where options is an array of strings representing possible answer choices.`,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: this.schema
        }
      });
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
        Patient Information:
        Name: ${patientData.name || 'Unknown'}
        Age: ${patientData.age || 'Unknown'}
        Gender: ${patientData.gender || 'Unknown'}
        Reason for visit: ${patientData.reasonForVisit || 'Unknown'}
        
        ${patientData.responses ? 'Previous responses: ' + JSON.stringify(patientData.responses) : ''}
        
        Based on this information, generate 3 relevant follow-up questions with 4 multiple-choice options each.
      `;

      const result = await model.generateContent(prompt);
      
      if (!result || !result.response) {
        console.warn('Received empty response from Gemini');
        return this.defaultQuestions;
      }
      
      // Parse the response - should be direct JSON
      try {
        const responseJson = JSON.parse(result.response.text());
        if (Array.isArray(responseJson) && responseJson.length > 0) {
          return responseJson;
        } else {
          console.warn('Invalid response format from Gemini');
          return this.defaultQuestions;
        }
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
