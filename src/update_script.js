const fs = require('fs');
const path = require('path');

// File paths
const conversationServicePath = path.join(__dirname, 'services', 'conversationService.js');
const tempHandlersPath = path.join(__dirname, 'temp_handlers.js');

// Read files
let conversationService = fs.readFileSync(conversationServicePath, 'utf8');
const tempHandlers = fs.readFileSync(tempHandlersPath, 'utf8');

// 1. Update conversation states
const statesRegex = /(const CONVERSATION_STATES = \{[^}]+)(\};)/;
const updatedStates = 
`$1  CONSULTATION_DATE: 'CONSULTATION_DATE',
  APPOINTMENT_CONFIRMATION: 'APPOINTMENT_CONFIRMATION',
$2`;

conversationService = conversationService.replace(statesRegex, updatedStates);

// 2. Update patient data structure to include consultationDate
const patientDataRegex = /(patientData: \{[^{]+phoneNumber,[^}]+doctorName: '',)/;
const updatedPatientData = 
`$1
          consultationDate: '',`;

conversationService = conversationService.replace(patientDataRegex, updatedPatientData);

// 3. Update processMessage to handle new states
const processMessageRegex = /(case CONVERSATION_STATES.ANSWERING_QUESTIONS:[^}]+break;[\s\n]+)(\s+case CONVERSATION_STATES.COMPLETED:)/;
const updatedProcessMessage = 
`$1        
      case CONVERSATION_STATES.CONSULTATION_DATE:
        response = this.handleConsultationDateState(message, context);
        break;
        
      case CONVERSATION_STATES.APPOINTMENT_CONFIRMATION:
        response = this.handleAppointmentConfirmationState(message, context);
        break;
$2`;

conversationService = conversationService.replace(processMessageRegex, updatedProcessMessage);

// 4. Update handleAnsweringQuestionsState to transition to consultation date
const answeringQuestionsRegex = /(if \(context\.patientData\.responses\.length >= 3\) \{[^}]+await this\.completeConsultation\(context\);[^}]+message =)/;
const updatedAnsweringQuestions = 
`if (context.patientData.responses.length >= 3) {
        // Ask for consultation date instead of completing consultation
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
      } else {
        // Generate another follow-up question using the updated context
        const patientInfo = {`;

const partToReplace = conversationService.match(answeringQuestionsRegex);
if (partToReplace) {
  // Get everything after the matched regex until the next properly closing bracket
  let afterMatch = conversationService.substring(conversationService.indexOf(partToReplace[0]) + partToReplace[0].length);
  
  // Find where let message = ends and replace until there
  const messageEndIndex = afterMatch.indexOf(';');
  afterMatch = afterMatch.substring(messageEndIndex + 1);
  
  conversationService = conversationService.replace(
    partToReplace[0] + afterMatch.substring(0, afterMatch.indexOf('return {')),
    updatedAnsweringQuestions
  );
}

// 5. Add new handler methods before the completeConsultation method
const completeConsultationRegex = /\/\*\*\n\s+\* Complete the consultation by sending data to the OPPD system\n\s+\*\/\n\s+async completeConsultation/;
const newHandlers = 
`  /**
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
          message: \`\${context.currentQuestion}\\n\\nPlease provide your answer again.\`,
          currentState: CONVERSATION_STATES.ANSWERING_QUESTIONS
        };
      }
    }
    
    // Validate date format (simple DD/MM validation)
    const dateRegex = /^(\\d{1,2})[\\\/\\-](\\d{1,2})$/;
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
    context.patientData.consultationDate = \`\${day}/\${month}\`;
    
    // Proceed to appointment confirmation with a summary
    const language = context.patientData.language || 'English';
    
    // Format patient details for confirmation
    const patientDetails = {
      'English': \`Please confirm your appointment details:
      
Patient Name: \${context.patientData.name}
Age: \${context.patientData.age}
Gender: \${context.patientData.gender}
Doctor: Dr. \${context.patientData.doctorName}
Appointment Date: \${day}/\${month}
      
Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.\`,

      'Hindi': \`कृपया अपने अपॉइंटमेंट विवरण की पुष्टि करें:
      
रोगी का नाम: \${context.patientData.name}
आयु: \${context.patientData.age}
लिंग: \${context.patientData.gender}
डॉक्टर: डॉ. \${context.patientData.doctorName}
अपॉइंटमेंट तिथि: \${day}/\${month}
      
अपने अपॉइंटमेंट की पुष्टि करने के लिए 'confirm' या 'yes' टाइप करें, या तिथि बदलने के लिए 'back' टाइप करें। (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)\`,

      'Marathi': \`कृपया तुमच्या अपॉइंटमेंटच्या तपशीलांची पुष्टी करा:
      
रुग्णाचे नाव: \${context.patientData.name}
वय: \${context.patientData.age}
लिंग: \${context.patientData.gender}
डॉक्टर: डॉ. \${context.patientData.doctorName}
अपॉइंटमेंट तारीख: \${day}/\${month}
      
तुमची अपॉइंटमेंट पुष्टी करण्यासाठी 'confirm' किंवा 'yes' टाइप करा, किंवा तारीख बदलण्यासाठी 'back' टाइप करा. (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)\`,

      'Tamil': \`உங்கள் சந்திப்பு விவரங்களை உறுதிப்படுத்தவும்:
      
நோயாளியின் பெயர்: \${context.patientData.name}
வயது: \${context.patientData.age}
பாலினம்: \${context.patientData.gender}
மருத்துவர்: Dr. \${context.patientData.doctorName}
சந்திப்பு தேதி: \${day}/\${month}
      
உங்கள் சந்திப்பை உறுதிப்படுத்த 'confirm' அல்லது 'yes' என்று தட்டச்சு செய்யவும், அல்லது தேதியை மாற்ற 'back' என்று தட்டச்சு செய்யவும். (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)\`,

      'Telugu': \`దయచేసి మీ అపాయింట్మెంట్ వివరాలను నిర్ధారించండి:
      
రోగి పేరు: \${context.patientData.name}
వయస్సు: \${context.patientData.age}
లింగం: \${context.patientData.gender}
డాక్టర్: డా. \${context.patientData.doctorName}
అపాయింట్మెంట్ తేదీ: \${day}/\${month}
      
మీ అపాయింట్మెంట్‌ని నిర్ధారించడానికి 'confirm' లేదా 'yes' టైప్ చేయండి, లేదా తేదీని మార్చడానికి 'back' టైప్ చేయండి. (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)\`,

      'Kannada': \`ದಯವಿಟ್ಟು ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ವಿವರಗಳನ್ನು ದೃಢೀಕರಿಸಿ:
      
ರೋಗಿಯ ಹೆಸರು: \${context.patientData.name}
ವಯಸ್ಸು: \${context.patientData.age}
ಲಿಂಗ: \${context.patientData.gender}
ವೈದ್ಯರು: ಡಾ. \${context.patientData.doctorName}
ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ದಿನಾಂಕ: \${day}/\${month}
      
ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ದೃಢೀಕರಿಸಲು 'confirm' ಅಥವಾ 'yes' ಎಂದು ಟೈಪ್ ಮಾಡಿ, ಅಥವಾ ದಿನಾಂಕವನ್ನು ಬದಲಾಯಿಸಲು 'back' ಎಂದು ಟೈಪ್ ಮಾಡಿ. (Type 'confirm' or 'yes' to confirm your appointment, or 'back' to change the date.)\`
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
        'English': \`Thank you! Your appointment with Dr. \${context.patientData.doctorName} has been scheduled for \${context.patientData.consultationDate}. You will receive a confirmation message with further details shortly.\`,
        
        'Hindi': \`धन्यवाद! डॉ. \${context.patientData.doctorName} के साथ आपका अपॉइंटमेंट \${context.patientData.consultationDate} के लिए निर्धारित किया गया है। आपको जल्द ही आगे के विवरण के साथ एक पुष्टिकरण संदेश प्राप्त होगा। (Thank you! Your appointment has been scheduled.)\`,
        
        'Marathi': \`धन्यवाद! डॉ. \${context.patientData.doctorName} सोबत तुमची अपॉइंटमेंट \${context.patientData.consultationDate} साठी निश्चित केली आहे. तुम्हाला लवकरच पुढील तपशीलांसह पुष्टीकरण संदेश मिळेल. (Thank you! Your appointment has been scheduled.)\`,
        
        'Tamil': \`நன்றி! டாக்டர் \${context.patientData.doctorName} உடனான உங்கள் சந்திப்பு \${context.patientData.consultationDate} அன்று திட்டமிடப்பட்டுள்ளது. விரைவில் மேலும் விவரங்களுடன் ஒரு உறுதிப்படுத்தல் செய்தியைப் பெறுவீர்கள். (Thank you! Your appointment has been scheduled.)\`,
        
        'Telugu': \`ధన్యవాదాలు! డాక్టర్ \${context.patientData.doctorName} తో మీ అపాయింట్మెంట్ \${context.patientData.consultationDate} కి షెడ్యూల్ చేయబడింది. మీరు త్వరలో మరిన్ని వివరాలతో నిర్ధారణ సందేశాన్ని అందుకుంటారు. (Thank you! Your appointment has been scheduled.)\`,
        
        'Kannada': \`ಧನ್ಯವಾದಗಳು! ಡಾ. \${context.patientData.doctorName} ರವರೊಂದಿಗೆ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು \${context.patientData.consultationDate} ರಂದು ನಿಗದಿಪಡಿಸಲಾಗಿದೆ. ನೀವು ಶೀಘ್ರದಲ್ಲೇ ಹೆಚ್ಚಿನ ವಿವರಗಳೊಂದಿಗೆ ದೃಢೀಕರಣ ಸಂದೇಶವನ್ನು ಪಡೆಯುತ್ತೀರಿ. (Thank you! Your appointment has been scheduled.)\`
      };
      
      return {
        message: confirmationMessages[language],
        currentState: CONVERSATION_STATES.COMPLETED
      };
    } else {
      // User didn't confirm, ask again
      const language = context.patientData.language || 'English';
      
      const retryMessages = {
        'English': \`To confirm your appointment, please type 'confirm' or 'yes'. To change the date, type 'back'.\`,
        'Hindi': \`अपने अपॉइंटमेंट की पुष्टि करने के लिए, कृपया 'confirm' या 'yes' टाइप करें। तिथि बदलने के लिए, 'back' टाइप करें। (To confirm your appointment, please type 'confirm' or 'yes')\`,
        'Marathi': \`तुमच्या अपॉइंटमेंटची पुष्टी करण्यासाठी, कृपया 'confirm' किंवा 'yes' टाइप करा. तारीख बदलण्यासाठी, 'back' टाइप करा. (To confirm your appointment, please type 'confirm' or 'yes')\`,
        'Tamil': \`உங்கள் சந்திப்பை உறுதிப்படுத்த, 'confirm' அல்லது 'yes' என்று தட்டச்சு செய்யவும். தேதியை மாற்ற, 'back' என்று தட்டச்சு செய்யவும். (To confirm your appointment, please type 'confirm' or 'yes')\`,
        'Telugu': \`మీ అపాయింట్మెంట్‌ని నిర్ధారించడానికి, దయచేసి 'confirm' లేదా 'yes' అని టైప్ చేయండి. తేదీని మార్చడానికి, 'back' అని టైప్ చేయండి. (To confirm your appointment, please type 'confirm' or 'yes')\`,
        'Kannada': \`ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ದೃಢೀಕರಿಸಲು, ದಯವಿಟ್ಟು 'confirm' ಅಥವಾ 'yes' ಎಂದು ಟೈಪ್ ಮಾಡಿ. ದಿನಾಂಕವನ್ನು ಬದಲಾಯಿಸಲು, 'back' ಎಂದು ಟೈಪ್ ಮಾಡಿ. (To confirm your appointment, please type 'confirm' or 'yes')\`
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
  async completeConsultation`;

conversationService = conversationService.replace(completeConsultationRegex, newHandlers);

// Write the updated file back
fs.writeFileSync(conversationServicePath, conversationService, 'utf8');

console.log('Successfully updated conversationService.js with new appointment date and confirmation features.');
