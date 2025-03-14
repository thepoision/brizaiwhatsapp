const GeminiService = require('./geminiService');
const PatientService = require('./patientService');

// Conversation states
const CONVERSATION_STATES = {
  INITIAL: 'INITIAL',
  LANGUAGE_SELECTION: 'LANGUAGE_SELECTION',
  DOCTOR_CODE: 'DOCTOR_CODE',
  CONFIRM_DOCTOR: 'CONFIRM_DOCTOR',
  PATIENT_NAME: 'PATIENT_NAME',
  PATIENT_AGE: 'PATIENT_AGE',
  PATIENT_GENDER: 'PATIENT_GENDER',
  REASON_FOR_VISIT: 'REASON_FOR_VISIT',
  ANSWERING_QUESTIONS: 'ANSWERING_QUESTIONS',
  COMPLETED: 'COMPLETED'
};

class ConversationService {
  constructor() {
    this.geminiService = new GeminiService();
    this.patientService = new PatientService();
    
    // In-memory store for conversations (should be replaced with a database in production)
    this.conversations = new Map();
  }

  /**
   * Get existing conversation context or create a new one
   * @param {string} phoneNumber - The user's WhatsApp phone number
   * @returns {Object} The conversation context
   */
  async getOrCreateContext(phoneNumber) {
    if (!this.conversations.has(phoneNumber)) {
      // Create new conversation context
      const newContext = {
        state: CONVERSATION_STATES.INITIAL,
        patientData: {
          phoneNumber,
          name: '',
          age: null,
          gender: '',
          reasonForVisit: '',
          doctorCode: '',
          doctorName: '',
          responses: [] // Will contain AI questions and patient answers
        },
        currentQuestion: null,
        questionOptions: [],
        history: []
      };
      
      this.conversations.set(phoneNumber, newContext);
    }
    
    return this.conversations.get(phoneNumber);
  }

  /**
   * Process an incoming message based on the current conversation state
   * @param {string} phoneNumber - The user's WhatsApp phone number
   * @param {string} message - The message text from the user
   * @param {Object} context - The conversation context
   * @returns {Object} The response object with message and updated state
   */
  async processMessage(phoneNumber, message, context) {
    // Add message to history
    context.history.push({ role: 'user', content: message });
    
    let response;
    
    // Process based on current state
    switch (context.state) {
      case CONVERSATION_STATES.INITIAL:
        response = this.handleInitialState(message, context);
        break;
        
      case CONVERSATION_STATES.LANGUAGE_SELECTION:
        response = this.handleLanguageSelectionState(message, context);
        break;
        
      case CONVERSATION_STATES.DOCTOR_CODE:
        response = await this.handleDoctorCodeState(message, context);
        break;
        
      case CONVERSATION_STATES.CONFIRM_DOCTOR:
        response = this.handleConfirmDoctorState(message, context);
        break;
        
      case CONVERSATION_STATES.PATIENT_NAME:
        response = this.handlePatientNameState(message, context);
        break;
        
      case CONVERSATION_STATES.PATIENT_AGE:
        response = this.handlePatientAgeState(message, context);
        break;
        
      case CONVERSATION_STATES.PATIENT_GENDER:
        response = this.handlePatientGenderState(message, context);
        break;
        
      case CONVERSATION_STATES.REASON_FOR_VISIT:
        response = await this.handleReasonForVisitState(message, context);
        break;
        
      case CONVERSATION_STATES.ANSWERING_QUESTIONS:
        response = await this.handleAnsweringQuestionsState(message, context);
        break;
        
      case CONVERSATION_STATES.COMPLETED:
        response = this.handleCompletedState(message, context);
        break;
        
      default:
        response = {
          message: "I'm not sure how to respond. Let's start over. Hi! I'm your OPPD consultation assistant.",
          currentState: CONVERSATION_STATES.INITIAL
        };
    }
    
    // Update the state
    context.state = response.currentState;
    
    // Add response to history
    context.history.push({ role: 'assistant', content: response.message });
    
    return response;
  }

  /**
   * Handle the initial state
   */
  handleInitialState(message, context) {
    // Create language selection buttons
    const languageOptions = [
      { id: 'english', title: 'English' },
      { id: 'hindi', title: 'हिंदी (Hindi)' },
      { id: 'marathi', title: 'मराठी (Marathi)' },
      { id: 'tamil', title: 'தமிழ் (Tamil)' },
      { id: 'telugu', title: 'తెలుగు (Telugu)' },
      { id: 'kannada', title: 'ಕನ್ನಡ (Kannada)' }
    ];
    
    const buttons = languageOptions.map(option => ({
      type: 'reply',
      reply: {
        id: option.id,
        title: option.title
      }
    }));
    
    return {
      message: "Welcome to OPPD WhatsApp Consultation Service! Please select your preferred language:",
      currentState: CONVERSATION_STATES.LANGUAGE_SELECTION,
      interactive: {
        type: 'button',
        body: {
          text: "Select your preferred language / अपनी पसंदीदा भाषा चुनें / आपली प्राधान्य भाषा निवडा / உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும் / మీకు నచ్చిన భాషను ఎంచుకోండి / ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ"
        },
        action: {
          buttons
        }
      }
    };
  }

  /**
   * Handle the language selection state
   */
  handleLanguageSelectionState(language, context) {
    // Store the selected language in the context
    const languageMap = {
      'english': 'English',
      'hindi': 'Hindi',
      'marathi': 'Marathi',
      'tamil': 'Tamil',
      'telugu': 'Telugu',
      'kannada': 'Kannada'
    };
    
    // Check if the incoming message is a valid language selection
    const selectedLanguage = language.toLowerCase();
    if (Object.keys(languageMap).includes(selectedLanguage)) {
      // Save the language preference to the context
      if (!context.patientData) {
        context.patientData = {};
      }
      context.patientData.language = languageMap[selectedLanguage];
      
      // Generate response based on the selected language
      let message = "";
      switch (selectedLanguage) {
        case 'hindi':
          message = "आपने हिंदी चुनी है। कृपया अपना डॉक्टर कोड दर्ज करें:";
          break;
        case 'marathi':
          message = "तुम्ही मराठी निवडली आहे. कृपया तुमचा डॉक्टर कोड प्रविष्ट करा:";
          break;
        case 'tamil':
          message = "நீங்கள் தமிழைத் தேர்ந்தெடுத்துள்ளீர்கள். உங்கள் மருத்துவர் குறியீட்டை உள்ளிடவும்:";
          break;
        case 'telugu':
          message = "మీరు తెలుగును ఎంచుకున్నారు. దయచేసి మీ డాక్టర్ కోడ్‌ని నమోదు చేయండి:";
          break;
        case 'kannada':
          message = "ನೀವು ಕನ್ನಡವನ್ನು ಆಯ್ಕೆ ಮಾಡಿದ್ದೀರಿ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರ ಕೋಡ್ ನಮೂದಿಸಿ:";
          break;
        case 'english':
        default:
          message = "You have selected English. Please enter your doctor's code:";
      }
      
      return {
        message,
        currentState: CONVERSATION_STATES.DOCTOR_CODE
      };
    } else {
      // If invalid language selection, prompt again
      return this.handleInitialState("", context);
    }
  }

  /**
   * Handle the doctor code state
   */
  async handleDoctorCodeState(doctorCode, context) {
    // In a real implementation, we would validate the doctor code against a database
    // For now, we'll simulate finding a doctor
    try {
      const doctorInfo = await this.patientService.getDoctorByCode(doctorCode);
      
      if (doctorInfo) {
        context.patientData.doctorCode = doctorCode;
        context.patientData.doctorName = doctorInfo.name;
        
        return {
          message: `Thank you. You are scheduling a consultation with Dr. ${doctorInfo.name}. Is this correct? (Yes/No)`,
          currentState: CONVERSATION_STATES.CONFIRM_DOCTOR
        };
      } else {
        return {
          message: "Sorry, I couldn't find a doctor with that code. Please check and try again.",
          currentState: CONVERSATION_STATES.DOCTOR_CODE
        };
      }
    } catch (error) {
      console.error('Error validating doctor code:', error);
      return {
        message: "There was an error processing your doctor code. Please try again.",
        currentState: CONVERSATION_STATES.DOCTOR_CODE
      };
    }
  }

  /**
   * Handle the doctor confirmation state
   */
  handleConfirmDoctorState(answer, context) {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      return {
        message: "Great! Please enter your full name.",
        currentState: CONVERSATION_STATES.PATIENT_NAME
      };
    } else {
      return {
        message: "No problem. Let's try again. Please enter your doctor's code.",
        currentState: CONVERSATION_STATES.DOCTOR_CODE
      };
    }
  }

  /**
   * Handle the patient name state
   */
  handlePatientNameState(name, context) {
    context.patientData.name = name;
    
    return {
      message: "Thank you. Now, please enter your age.",
      currentState: CONVERSATION_STATES.PATIENT_AGE
    };
  }

  /**
   * Handle the patient age state
   */
  handlePatientAgeState(age, context) {
    const ageNum = parseInt(age);
    
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      return {
        message: "Please enter a valid age between 1 and 120.",
        currentState: CONVERSATION_STATES.PATIENT_AGE
      };
    }
    
    context.patientData.age = ageNum;
    
    return {
      message: "Thank you. Please enter your gender (Male/Female/Other).",
      currentState: CONVERSATION_STATES.PATIENT_GENDER
    };
  }

  /**
   * Handle the patient gender state
   */
  handlePatientGenderState(gender, context) {
    const normalizedGender = gender.toLowerCase();
    
    if (['male', 'm', 'female', 'f', 'other', 'o'].includes(normalizedGender)) {
      // Map short forms to full gender
      if (normalizedGender === 'm') context.patientData.gender = 'Male';
      else if (normalizedGender === 'f') context.patientData.gender = 'Female';
      else if (normalizedGender === 'o') context.patientData.gender = 'Other';
      else context.patientData.gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      
      return {
        message: "Thank you. Please describe your reason for seeking consultation in detail.",
        currentState: CONVERSATION_STATES.REASON_FOR_VISIT
      };
    } else {
      return {
        message: "Please enter a valid gender (Male/Female/Other).",
        currentState: CONVERSATION_STATES.PATIENT_GENDER
      };
    }
  }

  /**
   * Handle the reason for visit state
   */
  async handleReasonForVisitState(reason, context) {
    context.patientData.reasonForVisit = reason;
    
    try {
      // Ensure responses array is initialized
      if (!context.patientData.responses) {
        context.patientData.responses = [];
      }
      
      // Generate follow-up questions using Gemini
      const patientInfo = {
        name: context.patientData.name,
        age: context.patientData.age,
        gender: context.patientData.gender,
        reasonForVisit: context.patientData.reasonForVisit,
        language: context.patientData.language // Pass the language to Gemini
      };
      
      // Get first follow-up question
      const followUpQuestion = await this.geminiService.getFollowUpQuestion(patientInfo, 0);
      
      // Store the current question
      context.currentQuestion = followUpQuestion.question;
      context.questionOptions = followUpQuestion.options;
      
      // Create clickable buttons for the options
      const buttons = followUpQuestion.options.map((option, index) => ({
        type: 'reply',
        reply: {
          id: `option_${index + 1}`,
          title: option.length > 20 ? option.substring(0, 19) + '...' : option // Ensure button text fits within WhatsApp limits
        }
      }));
      
      return {
        message: followUpQuestion.question,
        currentState: CONVERSATION_STATES.ANSWERING_QUESTIONS,
        interactive: {
          type: 'button',
          body: {
            text: followUpQuestion.question
          },
          action: {
            buttons: buttons.slice(0, 3) // WhatsApp has a limit of 3 buttons per message
          }
        }
      };
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return {
        message: "I'm having trouble generating follow-up questions. Let's schedule your consultation with the information provided. Thank you!",
        currentState: CONVERSATION_STATES.COMPLETED
      };
    }
  }

  /**
   * Handle the answering questions state
   */
  async handleAnsweringQuestionsState(answer, context) {
    // Parse the answer (either as a number, option_X identifier, or the full text)
    let selectedOption;
    
    // Check if this is a button response with option_X format
    if (answer.startsWith('option_')) {
      const optionNum = parseInt(answer.replace('option_', '')) - 1;
      if (!isNaN(optionNum) && optionNum >= 0 && optionNum < context.questionOptions.length) {
        selectedOption = context.questionOptions[optionNum];
      }
    } else {
      // Try to parse as a direct number input
      const answerNum = parseInt(answer);
      
      if (!isNaN(answerNum) && answerNum > 0 && answerNum <= context.questionOptions.length) {
        // User answered with a number
        selectedOption = context.questionOptions[answerNum - 1];
      } else {
        // User might have typed the full answer
        selectedOption = context.questionOptions.find(option => 
          option.toLowerCase() === answer.toLowerCase()
        );
        
        // If we didn't find an exact match, default to storing their exact response
        if (!selectedOption) {
          selectedOption = answer;
        }
      }
    }
    
    // Store question and answer
    if (!context.patientData.responses) {
      context.patientData.responses = [];
    }
    
    context.patientData.responses.push({
      question: context.currentQuestion,
      answer: selectedOption
    });
    
    try {
      // Decide if we need more questions based on context
      // For simplicity, we'll check if we already have 3 responses
      if (context.patientData.responses.length >= 3) {
        // We've asked enough questions, complete the consultation
        await this.completeConsultation(context);
        
        // Get appropriate message based on language
        let message = `Thank you for providing all the information. Your consultation with Dr. ${context.patientData.doctorName} has been scheduled. You will receive confirmation details shortly.`;
        
        if (context.patientData.language === 'Hindi') {
          message = `सभी जानकारी प्रदान करने के लिए धन्यवाद। डॉ. ${context.patientData.doctorName} के साथ आपका परामर्श निर्धारित किया गया है। आपको जल्द ही पुष्टिकरण विवरण प्राप्त होगा।`;
        } else if (context.patientData.language === 'Marathi') {
          message = `सर्व माहिती दिल्याबद्दल धन्यवाद. डॉ. ${context.patientData.doctorName} सोबत तुमचा सल्लामसलत निश्चित केला आहे. तुम्हाला लवकरच पुष्टीकरणाचा तपशील मिळेल.`;
        } else if (context.patientData.language === 'Tamil') {
          message = `அனைத்து தகவல்களையும் வழங்கியதற்கு நன்றி. டாக்டர் ${context.patientData.doctorName} உடனான உங்கள் ஆலோசனை திட்டமிடப்பட்டுள்ளது. விரைவில் உறுதிப்படுத்தல் விவரங்களைப் பெறுவீர்கள்.`;
        } else if (context.patientData.language === 'Telugu') {
          message = `అన్ని సమాచారాన్ని అందించినందుకు ధన్యవాదాలు. డాక్టర్ ${context.patientData.doctorName} తో మీ సంప్రదింపులు షెడ్యూల్ చేయబడ్డాయి. మీరు త్వరలో నిర్ధారణ వివరాలను పొందుతారు.`;
        } else if (context.patientData.language === 'Kannada') {
          message = `ಎಲ್ಲಾ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಡಾ. ${context.patientData.doctorName} ರವರೊಂದಿಗೆ ನಿಮ್ಮ ಸಮಾಲೋಚನೆಯನ್ನು ನಿಗದಿಪಡಿಸಲಾಗಿದೆ. ನೀವು ಶೀಘ್ರದಲ್ಲೇ ದೃಢೀಕರಣ ವಿವರಗಳನ್ನು ಪಡೆಯುತ್ತೀರಿ.`;
        }
        
        return {
          message: message,
          currentState: CONVERSATION_STATES.COMPLETED
        };
      } else {
        // Generate another follow-up question using the updated context
        const patientInfo = {
          name: context.patientData.name,
          age: context.patientData.age,
          gender: context.patientData.gender,
          reasonForVisit: context.patientData.reasonForVisit,
          responses: context.patientData.responses,
          language: context.patientData.language // Pass the language to Gemini
        };
        
        const followUpQuestion = await this.geminiService.getFollowUpQuestion(patientInfo, context.patientData.responses.length);
        
        // Store the current question
        context.currentQuestion = followUpQuestion.question;
        context.questionOptions = followUpQuestion.options;
        
        // Create clickable buttons for the options
        const buttons = followUpQuestion.options.map((option, index) => ({
          type: 'reply',
          reply: {
            id: `option_${index + 1}`,
            title: option.length > 20 ? option.substring(0, 19) + '...' : option
          }
        }));
        
        return {
          message: followUpQuestion.question,
          currentState: CONVERSATION_STATES.ANSWERING_QUESTIONS,
          interactive: {
            type: 'button',
            body: {
              text: followUpQuestion.question
            },
            action: {
              buttons: buttons.slice(0, 3) // WhatsApp has a limit of 3 buttons per message
            }
          }
        };
      }
    } catch (error) {
      console.error('Error processing follow-up questions:', error);
      
      // In case of error, we'll complete the consultation with what we have
      await this.completeConsultation(context);
      
      // Get appropriate message based on language
      let message = "Thank you for providing the information. Your consultation has been scheduled. You will receive confirmation details shortly.";
      
      if (context.patientData.language === 'Hindi') {
        message = "जानकारी प्रदान करने के लिए धन्यवाद। आपका परामर्श निर्धारित किया गया है। आपको जल्द ही पुष्टिकरण विवरण प्राप्त होगा।";
      } else if (context.patientData.language === 'Marathi') {
        message = "माहिती दिल्याबद्दल धन्यवाद. तुमचा सल्लामसलत निश्चित केला आहे. तुम्हाला लवकरच पुष्टीकरणाचा तपशील मिळेल.";
      } else if (context.patientData.language === 'Tamil') {
        message = "தகவல்களை வழங்கியதற்கு நன்றி. உங்கள் ஆலோசனை திட்டமிடப்பட்டுள்ளது. விரைவில் உறுதிப்படுத்தல் விவரங்களைப் பெறுவீர்கள்.";
      } else if (context.patientData.language === 'Telugu') {
        message = "సమాచారాన్ని అందించినందుకు ధన్యవాదాలు. మీ సంప్రదింపులు షెడ్యూల్ చేయబడ్డాయి. మీరు త్వరలో నిర్ధారణ వివరాలను పొందుతారు.";
      } else if (context.patientData.language === 'Kannada') {
        message = "ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಸಮಾಲೋಚನೆಯನ್ನು ನಿಗದಿಪಡಿಸಲಾಗಿದೆ. ನೀವು ಶೀಘ್ರದಲ್ಲೇ ದೃಢೀಕರಣ ವಿವರಗಳನ್ನು ಪಡೆಯುತ್ತೀರಿ.";
      }
      
      return {
        message: message,
        currentState: CONVERSATION_STATES.COMPLETED
      };
    }
  }

  /**
   * Handle the completed state
   */
  handleCompletedState(message, context) {
    return {
      message: "Your consultation has already been scheduled. If you need to make changes or schedule a new consultation, please start a new conversation.",
      currentState: CONVERSATION_STATES.COMPLETED
    };
  }

  /**
   * Complete the consultation by sending data to the OPPD system
   */
  async completeConsultation(context) {
    try {
      // Send the patient data to the OPPD system
      await this.patientService.savePatientData(context.patientData);
      
      // In a production system, we would clear the conversation after some time
      // For now, we'll keep it for debugging purposes
      console.log(`Consultation scheduled for ${context.patientData.name} with Dr. ${context.patientData.doctorName}`);
      
      return true;
    } catch (error) {
      console.error('Error completing consultation:', error);
      throw error;
    }
  }
}

module.exports = ConversationService;
