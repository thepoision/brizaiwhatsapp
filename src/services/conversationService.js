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
  CONSULTATION_DATE: 'CONSULTATION_DATE',
  APPOINTMENT_CONFIRMATION: 'APPOINTMENT_CONFIRMATION',
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
          consultationDate: '',
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
        
             
      case CONVERSATION_STATES.CONSULTATION_DATE:
        response = this.handleConsultationDateState(message, context);
        break;
        
      case CONVERSATION_STATES.APPOINTMENT_CONFIRMATION:
        response = this.handleAppointmentConfirmationState(message, context);
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
    // Multilingual welcome message
    const welcomeMessages = {
      'English': "Welcome to OPPD WhatsApp Consultation Service! Please select your preferred language:",
      'Hindi': "OPPD WhatsApp परामर्श सेवा में आपका स्वागत है! कृपया अपनी पसंदीदा भाषा चुनें:",
      'Marathi': "OPPD WhatsApp सल्लामसलत सेवेमध्ये आपले स्वागत आहे! कृपया आपली प्राधान्य भाषा निवडा:",
      'Tamil': "OPPD WhatsApp ஆலோசனை சேவைக்கு வரவேற்கிறோம்! உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்:",
      'Telugu': "OPPD WhatsApp కన్సల్టేషన్ సర్వీస్‌కి స్వాగతం! దయచేసి మీ ప్రాధాన్య భాషను ఎంచుకోండి:",
      'Kannada': "OPPD WhatsApp ಸಮಾಲೋಚನಾ ಸೇವೆಗೆ ಸುಸ್ವಾಗತ! ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:"
    };
    
    // Language options formatted with numbers
    const languageOptions = [
      "1. English", 
      "2. हिंदी (Hindi)", 
      "3. मराठी (Marathi)", 
      "4. தமிழ் (Tamil)", 
      "5. తెలుగు (Telugu)", 
      "6. ಕನ್ನಡ (Kannada)"
    ].join('\n');

    const instructions = "Reply with a number (1-6) to select your language.";
    
    return {
      message: `${welcomeMessages['English']}\n\n${languageOptions}\n\n${instructions}`,
      currentState: CONVERSATION_STATES.LANGUAGE_SELECTION
    };
  }

  /**
   * Handle the language selection state
   */
  handleLanguageSelectionState(language, context) {
    // Store the selected language in the context
    const languageMap = {
      '1': 'English',
      'english': 'English',
      '2': 'Hindi',
      'hindi': 'Hindi',
      'हिंदी': 'Hindi',
      '3': 'Marathi',
      'marathi': 'Marathi',
      'मराठी': 'Marathi',
      '4': 'Tamil',
      'tamil': 'Tamil',
      'தமிழ்': 'Tamil',
      '5': 'Telugu',
      'telugu': 'Telugu',
      'తెలుగు': 'Telugu',
      '6': 'Kannada',
      'kannada': 'Kannada',
      'ಕನ್ನಡ': 'Kannada'
    };
    
    // Check if the incoming message is a valid language selection
    const selectedLanguage = language.toLowerCase();
    const mappedLanguage = languageMap[selectedLanguage];
    
    if (mappedLanguage) {
      // Save the language preference to the context
      if (!context.patientData) {
        context.patientData = {};
      }
      context.patientData.language = mappedLanguage;
      
      // Doctor code request in different languages with English in brackets
      const doctorCodeRequests = {
        'English': "You have selected English. Please enter your doctor's code:",
        'Hindi': "आपने हिंदी चुनी है। कृपया अपना डॉक्टर कोड दर्ज करें (Please enter your doctor's code):",
        'Marathi': "तुम्ही मराठी निवडली आहे. कृपया तुमचा डॉक्टर कोड प्रविष्ट करा (Please enter your doctor's code):",
        'Tamil': "நீங்கள் தமிழைத் தேர்ந்தெடுத்துள்ளீர்கள். உங்கள் மருத்துவர் குறியீட்டை உள்ளிடவும் (Please enter your doctor's code):",
        'Telugu': "మీరు తెలుగును ఎంచుకున్నారు. దయచేసి మీ డాక్టర్ కోడ్‌ని నమోదు చేయండి (Please enter your doctor's code):",
        'Kannada': "ನೀವು ಕನ್ನಡವನ್ನು ಆಯ್ಕೆ ಮಾಡಿದ್ದೀರಿ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೈದ್ಯರ ಕೋಡ್ ನಮೂದಿಸಿ (Please enter your doctor's code):"
      };
      
      return {
        message: doctorCodeRequests[mappedLanguage],
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
    const normalizedAnswer = answer.toLowerCase();
    
    // Handle 'back' command
    if (normalizedAnswer === 'back') {
      return {
        message: "Please enter your doctor's code again:",
        currentState: CONVERSATION_STATES.DOCTOR_CODE
      };
    }

    // Accept various forms of yes/no including Y/N
    if (['yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay', 'हां', 'हाँ', 'होय', 'ஆம்', 'అవును', 'ಹೌದು'].includes(normalizedAnswer)) {
      const language = context.patientData?.language || 'English';
      let message = "Please enter the patient's full name:";
      
      if (language === 'Hindi') {
        message = "कृपया रोगी का पूरा नाम दर्ज करें (Please enter patient's full name):";
      } else if (language === 'Marathi') {
        message = "कृपया रुग्णाचे पूर्ण नाव प्रविष्ट करा (Please enter patient's full name):";
      } else if (language === 'Tamil') {
        message = "நோயாளியின் முழுப் பெயரை உள்ளிடவும் (Please enter patient's full name):";
      } else if (language === 'Telugu') {
        message = "దయచేసి రోగి పూర్తి పేరును నమోదు చేయండి (Please enter patient's full name):";
      } else if (language === 'Kannada') {
        message = "ದಯವಿಟ್ಟು ರೋಗಿಯ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ (Please enter patient's full name):";
      }
      
      message += "\n\nType 'back' to return to the previous step.";
      
      return {
        message,
        currentState: CONVERSATION_STATES.PATIENT_NAME
      };
    } else if (['no', 'n', 'nope', 'not', 'नहीं', 'ना', 'नाही', 'இல்லை', 'కాదు', 'ಇಲ್ಲ'].includes(normalizedAnswer)) {
      const language = context.patientData?.language || 'English';
      let message = "Please enter a different doctor code:";
      
      if (language === 'Hindi') {
        message = "कृपया एक अलग डॉक्टर कोड दर्ज करें (Please enter a different doctor code):";
      } else if (language === 'Marathi') {
        message = "कृपया एक वेगळा डॉक्टर कोड प्रविष्ट करा (Please enter a different doctor code):";
      } else if (language === 'Tamil') {
        message = "தயவுசெய்து வேறு மருத்துவர் குறியீட்டை உள்ளிடவும் (Please enter a different doctor code):";
      } else if (language === 'Telugu') {
        message = "దయచేసి వేరే డాక్టర్ కోడ్‌ని నమోదు చేయండి (Please enter a different doctor code):";
      } else if (language === 'Kannada') {
        message = "ದಯವಿಟ್ಟು ಬೇರೆ ವೈದ್ಯರ ಕೋಡ್ ನಮೂದಿಸಿ (Please enter a different doctor code):";
      }
      
      return {
        message,
        currentState: CONVERSATION_STATES.DOCTOR_CODE
      };
    } else {
      const language = context.patientData?.language || 'English';
      let message = `Please answer with 'Yes' or 'No'. Do you want to proceed with Dr. ${context.patientData.doctorName}?`;
      
      if (language === 'Hindi') {
        message = `कृपया 'हां' या 'नहीं' के साथ उत्तर दें। क्या आप डॉ. ${context.patientData.doctorName} के साथ आगे बढ़ना चाहते हैं? (Please answer with Yes/No or Y/N)`;
      } else if (language === 'Marathi') {
        message = `कृपया 'होय' किंवा 'नाही' सह उत्तर द्या. तुम्हाला डॉ. ${context.patientData.doctorName} सोबत पुढे जायचे आहे का? (Please answer with Yes/No or Y/N)`;
      } else if (language === 'Tamil') {
        message = `தயவுசெய்து 'ஆம்' அல்லது 'இல்லை' என்று பதிலளிக்கவும். டாக்டர் ${context.patientData.doctorName} உடன் தொடர விரும்புகிறீர்களா? (Please answer with Yes/No or Y/N)`;
      } else if (language === 'Telugu') {
        message = `దయచేసి 'అవును' లేదా 'కాదు'తో సమాధానం ఇవ్వండి. మీరు డాక్టర్ ${context.patientData.doctorName} తో కొనసాగాలనుకుంటున్నారా? (Please answer with Yes/No or Y/N)`;
      } else if (language === 'Kannada') {
        message = `ದಯವಿಟ್ಟು 'ಹೌದು' ಅಥವಾ 'ಇಲ್ಲ' ಎಂದು ಉತ್ತರಿಸಿ. ನೀವು ಡಾ. ${context.patientData.doctorName} ಜೊತೆಗೆ ಮುಂದುವರೆಯಲು ಬಯಸುತ್ತೀರಾ? (Please answer with Yes/No or Y/N)`;
      }
      
      message += "\n\nType 'Y' for Yes or 'N' for No. Type 'back' to return to the previous step.";
      
      return {
        message,
        currentState: CONVERSATION_STATES.CONFIRM_DOCTOR
      };
    }
  }

  /**
   * Handle the patient name state
   */
  handlePatientNameState(name, context) {
    // Check if the user wants to go back
    if (name.toLowerCase() === 'back') {
      const language = context.patientData?.language || 'English';
      let message = `Is Dr. ${context.patientData.doctorName} the correct doctor? Please reply with Yes or No.`;
      
      if (language !== 'English') {
        // Add translations with English in brackets
        const translations = {
          'Hindi': `क्या डॉ. ${context.patientData.doctorName} सही डॉक्टर हैं? कृपया हां या नहीं के साथ जवाब दें।`,
          'Marathi': `डॉ. ${context.patientData.doctorName} योग्य डॉक्टर आहेत का? कृपया होय किंवा नाही सह उत्तर द्या.`,
          'Tamil': `டாக்டர் ${context.patientData.doctorName} சரியான மருத்துவரா? ஆம் அல்லது இல்லை என்று பதிலளிக்கவும்.`,
          'Telugu': `డాక్టర్ ${context.patientData.doctorName} సరైన డాక్టర్ అవునా? దయచేసి అవును లేదా కాదు అని సమాధానం ఇవ్వండి.`,
          'Kannada': `ಡಾ. ${context.patientData.doctorName} ಸರಿಯಾದ ವೈದ್ಯರೇ? ದಯವಿಟ್ಟು ಹೌದು ಅಥವಾ ಇಲ್ಲ ಎಂದು ಉತ್ತರಿಸಿ.`
        };
        message = `${translations[language]} (Is Dr. ${context.patientData.doctorName} the correct doctor? Please reply with Yes or No.)`;
      }
      
      message += "\n\nType 'Y' for Yes or 'N' for No.";
      
      return {
        message,
        currentState: CONVERSATION_STATES.CONFIRM_DOCTOR
      };
    }
    
    // Normal flow - store patient name
    context.patientData.name = name;
    
    const language = context.patientData?.language || 'English';
    let message = "Please enter the patient's age:";
    
    if (language !== 'English') {
      // Add translations with English in brackets
      const translations = {
        'Hindi': "कृपया रोगी की उम्र दर्ज करें",
        'Marathi': "कृपया रुग्णाचे वय प्रविष्ट करा",
        'Tamil': "நோயாளியின் வயதை உள்ளிடவும்",
        'Telugu': "దయచేసి రోగి వయస్సును నమోదు చేయండి",
        'Kannada': "ದಯವಿಟ್ಟು ರೋಗಿಯ ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ"
      };
      message = `${translations[language]} (Please enter the patient's age):`;
    }
    
    message += "\n\nType 'back' to return to the previous step.";
    
    return {
      message,
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
    
    // Accept short forms: m/f/o for Male/Female/Other
    if (['male', 'm', 'female', 'f', 'other', 'o'].includes(normalizedGender)) {
      // Map short forms to full gender
      if (normalizedGender === 'm') context.patientData.gender = 'Male';
      else if (normalizedGender === 'f') context.patientData.gender = 'Female';
      else if (normalizedGender === 'o') context.patientData.gender = 'Other';
      else context.patientData.gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
      
      const language = context.patientData.language || 'English';
      
      // Reason for visit message in different languages with English in brackets
      const reasonMessages = {
        'English': "Thank you. Please describe your reason for seeking consultation in detail.",
        'Hindi': "धन्यवाद। कृपया परामर्श के लिए अपने कारण का विस्तार से वर्णन करें। (Please describe your reason for seeking consultation in detail.)",
        'Marathi': "धन्यवाद. कृपया सल्ला घेण्याच्या कारणाचे सविस्तर वर्णन करा. (Please describe your reason for seeking consultation in detail.)",
        'Tamil': "நன்றி. ஆலோசனை பெற நீங்கள் கோரும் காரணத்தை விரிவாக விவரிக்கவும். (Please describe your reason for seeking consultation in detail.)",
        'Telugu': "ధన్యవాదాలు. దయచేసి సంప్రదింపు కోసం మీ కారణాన్ని వివరంగా వివరించండి. (Please describe your reason for seeking consultation in detail.)",
        'Kannada': "ಧನ್ಯವಾದಗಳು. ದಯವಿಟ್ಟು ಸಮಾಲೋಚನೆಯನ್ನು ಪಡೆಯಲು ನಿಮ್ಮ ಕಾರಣವನ್ನು ವಿವರವಾಗಿ ವಿವರಿಸಿ. (Please describe your reason for seeking consultation in detail.)"
      };
      
      // Back instruction
      const backInstruction = {
        'English': "Type 'back' to return to the previous step.",
        'Hindi': "पिछले चरण पर वापस जाने के लिए 'back' टाइप करें।",
        'Marathi': "मागील चरणावर परत जाण्यासाठी 'back' टाइप करा.",
        'Tamil': "முந்தைய படிக்குத் திரும்ப 'back' என்று தட்டச்சு செய்யவும்.",
        'Telugu': "మునుపటి దశకు తిరిగి వెళ్లడానికి 'back' టైప్ చేయండి.",
        'Kannada': "ಹಿಂದಿನ ಹಂತಕ್ಕೆ ಹಿಂತಿರುಗಲು 'back' ಟೈప್ ಮಾಡಿ."
      };
      
      return {
        message: `${reasonMessages[language]}\n\n${backInstruction[language]}`,
        currentState: CONVERSATION_STATES.REASON_FOR_VISIT
      };
    } else if (gender.toLowerCase() === 'back') {
      // Handle back command
      const language = context.patientData.language || 'English';
      
      const agePrompts = {
        'English': "Please enter the patient's age:",
        'Hindi': "कृपया रोगी की उम्र दर्ज करें (Please enter patient's age):",
        'Marathi': "कृपया रुग्णाचे वय प्रविष्ट करा (Please enter patient's age):",
        'Tamil': "நோயாளியின் வயதை உள்ளிடவும் (Please enter patient's age):",
        'Telugu': "దయచేసి రోగి వయస్సును నమోదు చేయండి (Please enter patient's age):",
        'Kannada': "ದಯವಿಟ್ಟು ರೋಗಿಯ ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ (Please enter patient's age):"
      };
      
      // Back instruction
      const backInstruction = {
        'English': "Type 'back' to return to the previous step.",
        'Hindi': "पिछले चरण पर वापस जाने के लिए 'back' टाइप करें।",
        'Marathi': "मागील चरणावर परत जाण्यासाठी 'back' टाइप करा.",
        'Tamil': "முந்தைய படிக்குத் திரும்ப 'back' என்று தட்டச்சு செய்யவும்.",
        'Telugu': "మునుపటి దశకు తిరిగి వెళ్లడానికి 'back' టైప్ చేయండి.",
        'Kannada': "ಹಿಂದಿನ ಹಂತಕ್ಕೆ ಹಿಂತಿರುಗಲು 'back' ಟೈಪ್ ಮಾಡಿ."
      };
      
      return {
        message: `${agePrompts[language]}\n\n${backInstruction[language]}`,
        currentState: CONVERSATION_STATES.PATIENT_AGE
      };
    } else {
      // Invalid gender input
      const language = context.patientData.language || 'English';
      
      const genderPrompts = {
        'English': "Please enter a valid gender (Male/Female/Other). You can also type 'M' for Male, 'F' for Female, or 'O' for Other.",
        'Hindi': "कृपया एक वैध लिंग दर्ज करें (पुरुष/महिला/अन्य)। आप पुरुष के लिए 'M', महिला के लिए 'F', या अन्य के लिए 'O' भी टाइप कर सकते हैं। (Please enter a valid gender - M/F/O)",
        'Marathi': "कृपया वैध लिंग प्रविष्ट करा (पुरुष/स्त्री/इतर)। तुम्ही पुरुषासाठी 'M', स्त्रीसाठी 'F', किंवा इतरांसाठी 'O' देखील टाइप करू शकता. (Please enter a valid gender - M/F/O)",
        'Tamil': "சரியான பாலினத்தை உள்ளிடவும் (ஆண்/பெண்/பிற). நீங்கள் ஆணுக்கு 'M', பெண்ணுக்கு 'F', அல்லது பிறருக்கு 'O' என்றும் தட்டச்சு செய்யலாம். (Please enter a valid gender - M/F/O)",
        'Telugu': "దయచేసి చెల్లుబాటు అయ్యే లింగాన్ని నమోదు చేయండి (పురుషుడు/స్త్రీ/ఇతర). మీరు పురుషులకు 'M', స్త్రీలకు 'F', లేదా ఇతరులకు 'O' అని కూడా టైప్ చేయవచ్చు. (Please enter a valid gender - M/F/O)",
        'Kannada': "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ಲಿಂಗವನ್ನು ನಮೂದಿಸಿ (ಪುರುಷ/ಮಹಿಳೆ/ಇತರೆ). ನೀವು ಪುರುಷರಿಗೆ 'M', ಮಹಿಳೆಯರಿಗೆ 'F', ಅಥವಾ ಇತರರಿಗೆ 'O' ಎಂದು ಟೈಪ್ ಮಾಡಬಹುದು. (Please enter a valid gender - M/F/O)"
      };
      
      return {
        message: genderPrompts[language],
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
      
      // Format options for display (numbered list)
      const formattedOptions = followUpQuestion.options.map((option, index) => 
        `${index + 1}. ${option}`
      ).join('\n');
      
      const language = context.patientData.language || 'English';
      const backInstruction = {
        'English': "Type 'back' to return to the previous question.",
        'Hindi': "पिछले प्रश्न पर वापस जाने के लिए 'back' टाइप करें।",
        'Marathi': "मागील प्रश्नावर परत जाण्यासाठी 'back' टाइप करा.",
        'Tamil': "முந்தைய கேள்விக்குத் திரும்ப 'back' என்று தட்டச்சு செய்யவும்.",
        'Telugu': "మునుపటి ప్రశ్నకు తిరిగి వెళ్లడానికి 'back' టైప్ చేయండి.",
        'Kannada': "ಹಿಂದಿನ ಪ್ರಶ್ನೆಗೆ ಹಿಂತಿರುಗಲು 'back' ಟೈಪ್ ಮಾಡಿ."
      };
      
      return {
        message: `${followUpQuestion.question}\n\n${formattedOptions}\n\n${backInstruction[language]}`,
        currentState: CONVERSATION_STATES.ANSWERING_QUESTIONS
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
    // Check for "back" command to go to previous question
    if (answer.toLowerCase() === 'back') {
      // If there are previous responses, remove the last one and ask the previous question
      if (context.patientData.responses && context.patientData.responses.length > 0) {
        // Remove the last response
        context.patientData.responses.pop();
        
        // If there are no more responses, go back to reason for visit
        if (context.patientData.responses.length === 0) {
          return {
            message: "Please describe your reason for seeking consultation in detail again.",
            currentState: CONVERSATION_STATES.REASON_FOR_VISIT
          };
        }
        
        // Generate the previous question again
        const patientInfo = {
          name: context.patientData.name,
          age: context.patientData.age,
          gender: context.patientData.gender,
          reasonForVisit: context.patientData.reasonForVisit,
          responses: context.patientData.responses,
          language: context.patientData.language
        };
        
        const previousQuestionIndex = context.patientData.responses.length - 1;
        const previousQuestion = await this.geminiService.getFollowUpQuestion(patientInfo, previousQuestionIndex);
        
        // Store the current question
        context.currentQuestion = previousQuestion.question;
        context.questionOptions = previousQuestion.options;
        
        // Format options for display (numbered list)
        const formattedOptions = previousQuestion.options.map((option, index) => 
          `${index + 1}. ${option}`
        ).join('\n');
        
        const language = context.patientData.language || 'English';
        const backInstruction = {
          'English': "Type 'back' to return to the previous question.",
          'Hindi': "पिछले प्रश्न पर वापस जाने के लिए 'back' टाइप करें।",
          'Marathi': "मागील प्रश्नावर परत जाण्यासाठी 'back' टाइप करा.",
          'Tamil': "முந்தைய கேள்விக்குத் திரும்ப 'back' என்று தட்டச்சு செய்யவும்.",
          'Telugu': "మునుపటి ప్రశ్నకు తిరిగి వెళ్లడానికి 'back' టైప్ చేయండి.",
          'Kannada': "ಹಿಂದಿನ ಪ್ರಶ್ನೆಗೆ ಹಿಂತಿರುಗಲು 'back' ಟೈಪ್ ಮಾಡಿ."
        };
        
        return {
          message: `${previousQuestion.question}\n\n${formattedOptions}\n\n${backInstruction[language]}`,
          currentState: CONVERSATION_STATES.ANSWERING_QUESTIONS
        };
      }
    }
    
    // Parse the answer (either as a number or the full text)
    let selectedOption;
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
          message = `सभी जानकारी प्रदान करने के लिए धन्यवाद। डॉ. ${context.patientData.doctorName} के साथ आपका परामर्श निर्धारित किया गया है। आपको जल्द ही पुष्टिकरण विवरण प्राप्त होगा। (Thank you for providing all the information. Your consultation has been scheduled.)`;
        } else if (context.patientData.language === 'Marathi') {
          message = `सर्व माहिती दिल्याबद्दल धन्यवाद. डॉ. ${context.patientData.doctorName} सोबत तुमचा सल्लामसलत निश्चित केला आहे. तुम्हाला लवकरच पुष्टीकरणाचा तपशील मिळेल. (Thank you for providing all the information. Your consultation has been scheduled.)`;
        } else if (context.patientData.language === 'Tamil') {
          message = `அனைத்து தகவல்களையும் வழங்கியதற்கு நன்றி. டாக்டர் ${context.patientData.doctorName} உடனான உங்கள் ஆலோசனை திட்டமிடப்பட்டுள்ளது. விரைவில் உறுதிப்படுத்தல் விவரங்களைப் பெறுவீர்கள். (Thank you for providing all the information. Your consultation has been scheduled.)`;
        } else if (context.patientData.language === 'Telugu') {
          message = `అన్ని సమాచారాన్ని అందించినందుకు ధన్యవాదాలు. డాక్టర్ ${context.patientData.doctorName} తో మీ సంప్రదింపులు షెడ్యూల్ చేయబడ్డాయి. మీరు త్వరలో నిర్ధారణ వివరాలను పొందుతారు. (Thank you for providing all the information. Your consultation has been scheduled.)`;
        } else if (context.patientData.language === 'Kannada') {
          message = `ಎಲ್ಲಾ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಡಾ. ${context.patientData.doctorName} ರವರೊಂದಿಗೆ ನಿಮ್ಮ ಸಮಾಲೋಚನೆಯನ್ನು ನಿಗದಿಪಡಿಸಲಾಗಿದೆ. ನೀವು ಶೀಘ್ರದಲ್ಲೇ ದೃಢೀಕರಣ ವಿವರಗಳನ್ನು ಪಡೆಯುತ್ತೀರಿ. (Thank you for providing all the information. Your consultation has been scheduled.)`;
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
          language: context.patientData.language
        };
        
        const followUpQuestion = await this.geminiService.getFollowUpQuestion(patientInfo, context.patientData.responses.length);
        
        // Store the current question
        context.currentQuestion = followUpQuestion.question;
        context.questionOptions = followUpQuestion.options;
        
        // Format options for display (numbered list)
        const formattedOptions = followUpQuestion.options.map((option, index) => 
          `${index + 1}. ${option}`
        ).join('\n');
        
        const language = context.patientData.language || 'English';
        const backInstruction = {
          'English': "Type 'back' to return to the previous question. Type a number or custom answer for this question.",
          'Hindi': "पिछले प्रश्न पर वापस जाने के लिए 'back' टाइप करें। इस प्रश्न के लिए एक नंबर या कस्टम उत्तर टाइप करें।",
          'Marathi': "मागील प्रश्नावर परत जाण्यासाठी 'back' टाइप करा. या प्रश्नासाठी क्रमांक किंवा सानुकूल उत्तर टाइप करा.",
          'Tamil': "முந்தைய கேள்விக்குத் திரும்ப 'back' என்று தட்டச்சு செய்யவும். இந்தக் கேள்விக்கு ஒரு எண் அல்லது விருப்ப பதிலைத் தட்டச்சு செய்யவும்.",
          'Telugu': "మునుపటి ప్రశ్నకు తిరిగి వెళ్లడానికి 'back' టైప్ చేయండి. ఈ ప్రశ్నకు సంఖ్య లేదా కస్టమ్ సమాధానాన్ని టైప్ చేయండి.",
          'Kannada': "ಹಿಂದಿನ ಪ್ರಶ್ನೆಗೆ ಹಿಂತಿರುಗಲು 'back' ಟೈಪ್ ಮಾಡಿ. ಈ ಪ್ರಶ್ನೆಗೆ ಸಂಖ್ಯೆ ಅಥವಾ ಕಸ್ಟಮ್ ಉತ್ತರವನ್ನು ಟೈಪ್ ಮಾಡಿ."
        };
        
        return {
          message: `${followUpQuestion.question}\n\n${formattedOptions}\n\n${backInstruction[language]}`,
          currentState: CONVERSATION_STATES.ANSWERING_QUESTIONS
        };
      }
    } catch (error) {
      console.error('Error processing follow-up questions:', error);
      
      // In case of error, we'll complete the consultation with what we have
      await this.completeConsultation(context);
      
      // Get appropriate message based on language
      let message = "Thank you for providing the information. Your consultation has been scheduled. You will receive confirmation details shortly.";
      
      if (context.patientData.language === 'Hindi') {
        message = "जानकारी प्रदान करने के लिए धन्यवाद। आपका परामर्श निर्धारित किया गया है। आपको जल्द ही पुष्टिकरण विवरण प्राप्त होगा। (Thank you for providing the information. Your consultation has been scheduled.)";
      } else if (context.patientData.language === 'Marathi') {
        message = "माहिती दिल्याबद्दल धन्यवाद. तुमचा सल्लामसलत निश्चित केला आहे. तुम्हाला लवकरच पुष्टीकरणाचा तपशील मिळेल. (Thank you for providing the information. Your consultation has been scheduled.)";
      } else if (context.patientData.language === 'Tamil') {
        message = "தகவல்களை வழங்கியதற்கு நன்றி. உங்கள் ஆலோசனை திட்டமிடப்பட்டுள்ளது. விரைவில் உறுதிப்படுத்தல் விவரங்களைப் பெறுவீர்கள். (Thank you for providing the information. Your consultation has been scheduled.)";
      } else if (context.patientData.language === 'Telugu') {
        message = "సమాచారాన్ని అందించినందుకు ధన్యవాదాలు. మీ సంప్రదింపులు షెడ్యూల్ చేయబడ్డాయి. మీరు త్వరలో నిర్ధారణ వివరాలను పొందుతారు. (Thank you for providing the information. Your consultation has been scheduled.)";
      } else if (context.patientData.language === 'Kannada') {
        message = "ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಸಮಾಲೋಚನೆಯನ್ನು ನಿಗದಿಪಡಿಸಲಾಗಿದೆ. ನೀವು ಶೀಘ್ರದಲ್ಲೇ ದೃಢೀಕರಣ ವಿವರಗಳನ್ನು ಪಡೆಯುತ್ತೀರಿ. (Thank you for providing the information. Your consultation has been scheduled.)";
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
   * Handle the consultation date state
   */
  handleConsultationDateState(dateInput, context) {
    // Check if the user wants to go back
    if (dateInput.toLowerCase() === 'back') {
      // Go back to the last question
      if (context.patientData.responses && context.patientData.responses.length > 0) {
        // Remove the last response to repeat it
        const lastResponse = context.patientData.responses.pop();
        
        return {
          message: `${context.currentQuestion}\n\nPlease provide your answer again.`,
          currentState: CONVERSATION_STATES.ANSWERING_QUESTIONS
        };
      }
    }
    
    // Validate date format (simple DD/MM validation)
    const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})$/;
    const match = dateInput.match(dateRegex);
    
    if (!match) {
      const language = context.patientData.language || 'English';
      
      const errorMessages = {
        'English': "Please enter a valid date in the format DD/MM (e.g., 15/03 for March 15).",
        'Hindi': "कृपया DD/MM प्रारूप में एक वैध तिथि दर्ज करें (उदाहरण के लिए, 15 मार्च के लिए 15/03)। (Please enter a valid date in DD/MM format)",
        'Marathi': "कृपया DD/MM स्वरूपात वैध तारीख प्रविष्ट करा (उदा., 15 मार्च साठी 15/03). (Please enter a valid date in DD/MM format)",
        'Tamil': "DD/MM வடிவமைப்பில் சரியான தேதியை உள்ளிடவும் (எ.கா., மார்ச் 15க்கு 15/03). (Please enter a valid date in DD/MM format)",
        'Telugu': "దయచేసి DD/MM ఫార్మాట్‌లో చెల్లుబాటు అయ్యే తేదీని నమోదు చేయండి (ఉదా., మార్చి 15 కి 15/03). (Please enter a valid date in DD/MM format)",
        'Kannada': "ದಯವಿಟ್ಟು DD/MM ಫಾರ್ಮ್ಯಾಟ್‌ನಲ್ಲಿ ಮಾನ್ಯವಾದ ದಿನಾಂಕವನ್ನು ನಮೂದಿಸಿ (ಉದಾ., ಮಾರ್ಚ್ 15 ಕ್ಕೆ 15/03). (Please enter a valid date in DD/MM format)"
      };
      
      return {
        message: errorMessages[language],
        currentState: CONVERSATION_STATES.CONSULTATION_DATE
      };
    }
    
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    
    // Basic validation
    if (day < 1 || day > 31 || month < 1 || month > 12) {
      const language = context.patientData.language || 'English';
      
      const errorMessages = {
        'English': "Please enter a valid date. Day should be between 1-31 and month between 1-12.",
        'Hindi': "कृपया एक वैध तिथि दर्ज करें। दिन 1-31 के बीच और महीना 1-12 के बीच होना चाहिए। (Please enter a valid date)",
        'Marathi': "कृपया वैध तारीख प्रविष्ट करा. दिवस 1-31 आणि महिना 1-12 दरम्यान असावा. (Please enter a valid date)",
        'Tamil': "சரியான தேதியை உள்ளிடவும். நாள் 1-31க்கும், மாதம் 1-12க்கும் இடையில் இருக்க வேண்டும். (Please enter a valid date)",
        'Telugu': "దయచేసి చెల్లుబాటు అయ్యే తేదీని నమోదు చేయండి. రోజు 1-31 మధ్య మరియు నెల 1-12 మధ్య ఉండాలి. (Please enter a valid date)",
        'Kannada': "ದಯವಿಟ್ಟು ಮಾನ್ಯವಾದ ದಿನಾಂಕವನ್ನು ನಮೂದಿಸಿ. ದಿನವು 1-31 ರ ನಡುವೆ ಮತ್ತು ತಿಂಗಳು 1-12 ರ ನಡುವೆ ಇರಬೇಕು. (Please enter a valid date)"
      };
      
      return {
        message: errorMessages[language],
        currentState: CONVERSATION_STATES.CONSULTATION_DATE
      };
    }
    
    // Store the consultation date
    context.patientData.consultationDate = `${day}/${month}`;
    
    // Proceed to appointment confirmation with a summary
    const language = context.patientData.language || 'English';
    
    // Format patient details for confirmation
    const patientDetails = {
      'English': `Please confirm your appointment details:
      
Patient Name: ${context.patientData.name}
Age: ${context.patientData.age}
Gender: ${context.patientData.gender}
Doctor: Dr. ${context.patientData.doctorName}
Appointment Date: ${day}/${month}
      
Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.`,

      'Hindi': `कृपया अपने अपॉइंटमेंट विवरण की पुष्टि करें:
      
रोगी का नाम: ${context.patientData.name}
आयु: ${context.patientData.age}
लिंग: ${context.patientData.gender}
डॉक्टर: डॉ. ${context.patientData.doctorName}
अपॉइंटमेंट तिथि: ${day}/${month}
      
अपने अपॉइंटमेंट की पुष्टि करने के लिए 'confirm' या 'yes' टाइप करें, या तिथि बदलने के लिए 'back' टाइप करें। (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)`,

      'Marathi': `कृपया तुमच्या अपॉइंटमेंटच्या तपशीलांची पुष्टी करा:
      
रुग्णाचे नाव: ${context.patientData.name}
वय: ${context.patientData.age}
लिंग: ${context.patientData.gender}
डॉक्टर: डॉ. ${context.patientData.doctorName}
अपॉइंटमेंट तारीख: ${day}/${month}
      
तुमची अपॉइंटमेंट पुष्टी करण्यासाठी 'confirm' किंवा 'yes' टाइप करा, किंवा तारीख बदलण्यासाठी 'back' टाइप करा. (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)`,

      'Tamil': `உங்கள் சந்திப்பு விவரங்களை உறுதிப்படுத்தவும்:
      
நோயாளியின் பெயர்: ${context.patientData.name}
வயது: ${context.patientData.age}
பாலினம்: ${context.patientData.gender}
மருத்துவர்: Dr. ${context.patientData.doctorName}
சந்திப்பு தேதி: ${day}/${month}
      
உங்கள் சந்திப்பை உறுதிப்படுத்த 'confirm' அல்லது 'yes' என்று தட்டச்சு செய்யவும், அல்லது தேதியை மாற்ற 'back' என்று தட்டச்சு செய்யவும். (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)`,

      'Telugu': `దయచేసి మీ అపాయింట్మెంట్ వివరాలను నిర్ధారించండి:
      
రోగి పేరు: ${context.patientData.name}
వయస్సు: ${context.patientData.age}
లింగం: ${context.patientData.gender}
డాక్టర్: డా. ${context.patientData.doctorName}
అపాయింట్మెంట్ తేదీ: ${day}/${month}
      
మీ అపాయింట్మెంట్‌ని నిర్ధారించడానికి 'confirm' లేదా 'yes' టైప్ చేయండి, లేదా తేదీని మార్చడానికి 'back' టైప్ చేయండి. (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)`,

      'Kannada': `ದಯವಿಟ್ಟು ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ವಿವರಗಳನ್ನು ದೃಢೀಕರಿಸಿ:
      
ರೋಗಿಯ ಹೆಸರು: ${context.patientData.name}
ವಯಸ್ಸು: ${context.patientData.age}
ಲಿಂಗ: ${context.patientData.gender}
ವೈದ್ಯರು: ಡಾ. ${context.patientData.doctorName}
ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ದಿನಾಂಕ: ${day}/${month}
      
ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ದೃಢೀಕರಿಸಲು 'confirm' ಅಥವಾ 'yes' ಎಂದು ಟೈಪ್ ಮಾಡಿ, ಅಥವಾ ದಿನಾಂಕವನ್ನು ಬದಲಾಯಿಸಲು 'back' ಎಂದು ಟೈಪ್ ಮಾಡಿ. (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)`
    };
    
    return {
      message: patientDetails[language],
      currentState: CONVERSATION_STATES.APPOINTMENT_CONFIRMATION
    };
  }

  /**
   * Handle the appointment confirmation state
   */
  handleAppointmentConfirmationState(confirmation, context) {
    // Check if the user wants to go back
    if (confirmation.toLowerCase() === 'back') {
      const language = context.patientData.language || 'English';
      
      const datePrompts = {
        'English': "Please enter your preferred date for consultation (DD/MM), e.g., 25/03 for March 25:",
        'Hindi': "कृपया परामर्श के लिए अपनी पसंदीदा तिथि दर्ज करें (DD/MM), उदा., 25 मार्च के लिए 25/03: (Please enter your preferred date for consultation)",
        'Marathi': "कृपया सल्लामसलत साठी तुमची पसंतीची तारीख टाका (DD/MM), उदा., 25 मार्च साठी 25/03: (Please enter your preferred date for consultation)",
        'Tamil': "ஆலோசனைக்கான உங்கள் விருப்பமான தேதியை உள்ளிடவும் (DD/MM), எ.கா., மார்ச் 25க்கு 25/03: (Please enter your preferred date for consultation)",
        'Telugu': "దయచేసి సంప్రదింపు కోసం మీకు ఇష్టమైన తేదీని నమోదు చేయండి (DD/MM), ఉదా., మార్చి 25 కి 25/03: (Please enter your preferred date for consultation)",
        'Kannada': "ದಯವಿಟ್ಟು ಸಮಾಲೋಚನೆಗಾಗಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ದಿನಾಂಕವನ್ನು ನಮೂದಿಸಿ (DD/MM), ಉದಾ., ಮಾರ್ಚ್ 25 ಕ್ಕೆ 25/03: (Please enter your preferred date for consultation)"
      };
      
      return {
        message: datePrompts[language],
        currentState: CONVERSATION_STATES.CONSULTATION_DATE
      };
    }
    
    // Check for confirmation
    const normalizedConfirmation = confirmation.toLowerCase();
    
    if (['yes', 'confirm', 'y', 'ok', 'sure', 'confirmed'].includes(normalizedConfirmation)) {
      // Save the confirmed appointment
      this.completeConsultation(context);
      
      const language = context.patientData.language || 'English';
      
      const confirmationMessages = {
        'English': `Thank you! Your appointment with Dr. ${context.patientData.doctorName} has been scheduled for ${context.patientData.consultationDate}. You will receive a confirmation message with further details shortly.`,
        
        'Hindi': `धन्यवाद! डॉ. ${context.patientData.doctorName} के साथ आपका अपॉइंटमेंट ${context.patientData.consultationDate} के लिए निर्धारित किया गया है। आपको जल्द ही आगे के विवरण के साथ एक पुष्टिकरण संदेश प्राप्त होगा। (Thank you! Your appointment has been scheduled.)`,
        
        'Marathi': `धन्यवाद! डॉ. ${context.patientData.doctorName} सोबत तुमची अपॉइंटमेंट ${context.patientData.consultationDate} साठी निश्चित केली आहे. तुम्हाला लवकरच पुढील तपशीलांसह पुष्टीकरण संदेश मिळेल. (Thank you! Your appointment has been scheduled.)`,
        
        'Tamil': `நன்றி! டாக்டர் ${context.patientData.doctorName} உடனான உங்கள் சந்திப்பு ${context.patientData.consultationDate} அன்று திட்டமிடப்பட்டுள்ளது. விரைவில் மேலும் விவரங்களுடன் ஒரு உறுதிப்படுத்தல் செய்தியைப் பெறுவீர்கள். (Thank you! Your appointment has been scheduled.)`,
        
        'Telugu': `ధన్యవాదాలు! డాక్టర్ ${context.patientData.doctorName} తో మీ అపాయింట్మెంట్ ${context.patientData.consultationDate} కి షెడ్యూల్ చేయబడింది. మీరు త్వరలో మరిన్ని వివరాలతో నిర్ధారణ సందేశాన్ని అందుకుంటారు. (Thank you! Your appointment has been scheduled.)`,
        
        'Kannada': `ಧನ್ಯವಾದಗಳು! ಡಾ. ${context.patientData.doctorName} ರವರೊಂದಿಗೆ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ${context.patientData.consultationDate} ರಂದು ನಿಗದಿಪಡಿಸಲಾಗಿದೆ. ನೀವು ಶೀಘ್ರದಲ್ಲೇ ಹೆಚ್ಚಿನ ವಿವರಗಳೊಂದಿಗೆ ದೃಢೀಕರಣ ಸಂದೇಶವನ್ನು ಪಡೆಯುತ್ತೀರಿ. (Thank you! Your appointment has been scheduled.)`
      };
      
      return {
        message: confirmationMessages[language],
        currentState: CONVERSATION_STATES.COMPLETED
      };
    } else {
      // User didn't confirm, ask again
      const language = context.patientData.language || 'English';
      
      const retryMessages = {
        'English': `To confirm your appointment, please type 'confirm' or 'yes'. To change the date, type 'back'.`,
        'Hindi': `अपने अपॉइंटमेंट की पुष्टि करने के लिए, कृपया 'confirm' या 'yes' टाइप करें। तिथि बदलने के लिए, 'back' टाइप करें। (To confirm your appointment, please type 'confirm' or 'yes')`,
        'Marathi': `तुमच्या अपॉइंटमेंटची पुष्टी करण्यासाठी, कृपया 'confirm' किंवा 'yes' टाइप करा. तारीख बदलण्यासाठी, 'back' टाइप करा. (To confirm your appointment, please type 'confirm' or 'yes')`,
        'Tamil': `உங்கள் சந்திப்பை உறுதிப்படுத்த, 'confirm' அல்லது 'yes' என்று தட்டச்சு செய்யவும். தேதியை மாற்ற, 'back' என்று தட்டச்சு செய்யவும். (To confirm your appointment, please type 'confirm' or 'yes')`,
        'Telugu': `మీ అపాయింట్మెంట్‌ని నిర్ధారించడానికి, దయచేసి 'confirm' లేదా 'yes' అని టైప్ చేయండి. తేదీని మార్చడానికి, 'back' అని టైప్ చేయండి. (To confirm your appointment, please type 'confirm' or 'yes')`,
        'Kannada': `ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ದೃಢೀಕರಿಸಲು, ದಯವಿಟ್ಟು 'confirm' ಅಥವಾ 'yes' ಎಂದು ಟೈಪ್ ಮಾಡಿ. ದಿನಾಂಕವನ್ನು ಬದಲಾಯಿಸಲು, 'back' ಎಂದು ಟೈಪ್ ಮಾಡಿ. (To confirm your appointment, please type 'confirm' or 'yes')`
      };
      
      return {
        message: retryMessages[language],
        currentState: CONVERSATION_STATES.APPOINTMENT_CONFIRMATION
      };
    }
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
