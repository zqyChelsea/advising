import axios from 'axios';

const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY;

class DifySyncService {
  constructor() {
    this.apiUrl = DIFY_API_URL;
    this.apiKey = DIFY_API_KEY;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async isConfigured() {
    return !!this.apiKey;
  }

  transformUserToDifyVariables(user) {
    return {
      student_id: {
        type: 'string',
        value: user.studentId || ''
      },
      email: {
        type: 'string',
        value: user.email || ''
      },
      first_name: {
        type: 'string',
        value: user.firstName || ''
      },
      family_name: {
        type: 'string',
        value: user.familyName || ''
      },
      entry_year: {
        type: 'number',
        value: user.entryYear || new Date().getFullYear()
      },
      expected_graduation: {
        type: 'string',
        value: user.expectedGraduation || ''
      },
      department: {
        type: 'string',
        value: user.department || ''
      },
      major: {
        type: 'string',
        value: user.major || ''
      },
      gpa: {
        type: 'number',
        value: user.gpa || 0
      },
      total_credits: {
        type: 'number',
        value: user.totalCredits || 0
      }
    };
  }

  async syncUser(user) {
    if (!await this.isConfigured()) {
      console.log('Dify sync skipped: DIFY_API_KEY not configured');
      return { success: false, reason: 'not_configured' };
    }

    try {
      const variables = this.transformUserToDifyVariables(user);

      const response = await axios.post(
        `${this.apiUrl}/app/api-keys/${this.apiKey}/user-variables`,
        {
          user_id: user.studentId || user.email,
          variables
        },
        {
          headers: this.getHeaders(),
          timeout: 10000
        }
      );

      console.log(`Dify sync success for user: ${user.studentId}`);
      return { success: true, data: response.data };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`Dify sync error for user ${user.studentId}:`, errorMsg);

      return {
        success: false,
        reason: 'api_error',
        error: errorMsg
      };
    }
  }

  async batchSyncUsers(users) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const user of users) {
      const result = await this.syncUser(user);
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push({ userId: user.studentId, error: result.error });
        }
      }
    }

    return results;
  }
}

export const difySyncService = new DifySyncService();
export default difySyncService;
