const axios = require('axios');

/**
 * Service for managing patient data and interactions with the OPPD database
 */
class PatientService {
  constructor() {
    this.oppdApiEndpoint = process.env.OPPD_API_ENDPOINT;
    this.oppdApiKey = process.env.OPPD_API_KEY;
    
    // Mock doctor data (to be replaced with actual API calls)
    this.mockDoctors = [
      { code: 'DOC001', name: 'Dr. Smith', specialization: 'General Physician' },
      { code: 'DOC002', name: 'Dr. Johnson', specialization: 'Cardiologist' },
      { code: 'DOC003', name: 'Dr. Williams', specialization: 'Pediatrician' }
    ];
  }

  /**
   * Get doctor information by doctor code
   * 
   * @param {string} doctorCode - The doctor's unique code
   * @returns {Promise<Object|null>} Doctor information or null if not found
   */
  async getDoctorByCode(doctorCode) {
    try {
      // In production, this would be an API call to the OPPD backend
      // For now, we'll use the mock data
      
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const doctor = this.mockDoctors.find(doc => doc.code === doctorCode);
      return doctor || null;
    } catch (error) {
      console.error('Error retrieving doctor information:', error);
      throw new Error(`Failed to retrieve doctor information: ${error.message}`);
    }
  }

  /**
   * Save the patient data to the OPPD database
   * 
   * @param {Object} patientData - Complete patient information with AI responses
   * @returns {Promise<Object>} The result of the save operation
   */
  async savePatientData(patientData) {
    try {
      // Format the data according to the OPPD API requirements
      const formattedData = this.formatPatientData(patientData);
      
      // In production, this would be an actual API call
      // For now, we'll simulate a successful response
      
      // Uncomment this when ready to integrate with actual OPPD API
      /*
      const response = await axios.post(
        `${this.oppdApiEndpoint}/patients`,
        formattedData,
        {
          headers: {
            'Authorization': `Bearer ${this.oppdApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
      */
      
      // For development, return a mock success response
      console.log('Would save patient data to OPPD:', formattedData);
      
      return {
        success: true,
        patientId: `P${Math.floor(Math.random() * 100000)}`,
        message: 'Patient data saved successfully'
      };
    } catch (error) {
      console.error('Error saving patient data:', error);
      throw new Error(`Failed to save patient data: ${error.message}`);
    }
  }

  /**
   * Format patient data according to OPPD API requirements
   * 
   * @param {Object} patientData - Raw patient data from WhatsApp conversation
   * @returns {Object} Formatted patient data for OPPD API
   */
  formatPatientData(patientData) {
    // Transform the data structure to match what the OPPD API expects
    return {
      patient: {
        name: patientData.name,
        age: patientData.age,
        gender: patientData.gender,
        phoneNumber: patientData.phoneNumber,
        registrationSource: 'whatsapp'
      },
      consultation: {
        doctorCode: patientData.doctorCode,
        reasonForVisit: patientData.reasonForVisit,
        additionalInformation: patientData.responses.map(response => ({
          question: response.question,
          answer: response.answer
        }))
      },
      metadata: {
        createdAt: new Date().toISOString(),
        status: 'pending'
      }
    };
  }
}

module.exports = PatientService;
