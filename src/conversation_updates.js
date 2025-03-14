// UPDATES FOR CONVERSATION STATES
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
  CONSULTATION_DATE: 'CONSULTATION_DATE',
  APPOINTMENT_CONFIRMATION: 'APPOINTMENT_CONFIRMATION',
  COMPLETED: 'COMPLETED'
};

// UPDATES FOR PATIENT DATA STRUCTURE
// const newContext = {
//   state: CONVERSATION_STATES.INITIAL,
//   patientData: {
//     phoneNumber,
//     name: '',
//     age: null,
//     gender: '',
//     reasonForVisit: '',
//     doctorCode: '',
//     doctorName: '',
//     consultationDate: '', // New field for storing the DD/MM date
//     responses: [] // Will contain AI questions and patient answers
//   },
//   currentQuestion: null,
//   questionOptions: [],
//   history: []
// };

// UPDATES FOR PROCESS MESSAGE METHOD
// switch (context.state) {
//   // ... existing cases
//   
//   case CONVERSATION_STATES.CONSULTATION_DATE:
//     response = this.handleConsultationDateState(message, context);
//     break;
//     
//   case CONVERSATION_STATES.APPOINTMENT_CONFIRMATION:
//     response = this.handleAppointmentConfirmationState(message, context);
//     break;
// }

// UPDATE FOR HANDLING ANSWERING QUESTIONS STATE
// After 3 questions, transition to consultation date selection instead of completing consultation
// if (context.patientData.responses.length >= 3) {
//   // Ask for consultation date
//   const language = context.patientData.language || 'English';
//   
//   const datePrompts = {
//     'English': "Please enter your preferred date for consultation (DD/MM), e.g., 25/03 for March 25:",
//     'Hindi': "कृपया परामर्श के लिए अपनी पसंदीदा तिथि दर्ज करें (DD/MM), उदा., 25 मार्च के लिए 25/03: (Please enter your preferred date for consultation)",
//     'Marathi': "कृपया सल्लामसलत साठी तुमची पसंतीची तारीख टाका (DD/MM), उदा., 25 मार्च साठी 25/03: (Please enter your preferred date for consultation)",
//     'Tamil': "ஆலோசனைக்கான உங்கள் விருப்பமான தேதியை உள்ளிடவும் (DD/MM), எ.கா., மார்ச் 25க்கு 25/03: (Please enter your preferred date for consultation)",
//     'Telugu': "దయచేసి సంప్రదింపు కోసం మీకు ఇష్టమైన తేదీని నమోదు చేయండి (DD/MM), ఉదా., మార్చి 25 కి 25/03: (Please enter your preferred date for consultation)",
//     'Kannada': "ದಯವಿಟ್ಟು ಸಮಾಲೋಚನೆಗಾಗಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ದಿನಾಂಕವನ್ನು ನಮೂದಿಸಿ (DD/MM), ಉದಾ., ಮಾರ್ಚ್ 25 ಕ್ಕೆ 25/03: (Please enter your preferred date for consultation)"
//   };
//   
//   return {
//     message: datePrompts[language],
//     currentState: CONVERSATION_STATES.CONSULTATION_DATE
//   };
// }
