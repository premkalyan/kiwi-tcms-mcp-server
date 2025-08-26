// Kiwi TCMS API Client

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { Logger } from './utils/logger.js';
import { 
  KiwiProduct, 
  KiwiTestPlan, 
  KiwiTestCase, 
  KiwiTestRun, 
  KiwiTestExecution,
  KiwiBuild,
  KiwiEnvironment,
  KiwiTag,
  KiwiUser,
  PaginatedResponse,
  KiwiApiError
} from './types/index.js';

export class KiwiApiClient {
  private client: AxiosInstance;
  private logger: Logger;
  private baseUrl: string;
  private token: string;
  private mockMode: boolean;

  constructor() {
    this.logger = new Logger('KiwiApiClient');
    this.baseUrl = process.env.KIWI_BASE_URL!;
    this.token = process.env.KIWI_TOKEN!;
    this.mockMode = process.env.MOCK_MODE === 'true' || this.token === 'MOCK_MODE_FOR_TESTING';

    if (this.mockMode) {
      this.logger.info('🔧 Running in MOCK MODE - using test data');
    }

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1/`,
      headers: {
        'Authorization': `Token ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data
        });
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug(`Response from ${response.config.url}:`, {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleApiError(error: AxiosError): void {
    const status = error.response?.status;
    const data = error.response?.data;
    
    this.logger.error(`API Error - Status: ${status}`, {
      url: error.config?.url,
      method: error.config?.method,
      data: data
    });

    // Convert to standardized error format
    const kiwiError: KiwiApiError = {
      code: this.mapStatusToErrorCode(status),
      message: this.extractErrorMessage(data),
      upstream_status: status,
      details: { kiwi_response: data }
    };

    throw kiwiError;
  }

  private mapStatusToErrorCode(status?: number): KiwiApiError['code'] {
    switch (status) {
      case 400: return 'VALIDATION';
      case 401:
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 429: return 'RATE_LIMIT';
      default: return 'UPSTREAM_ERROR';
    }
  }

  private extractErrorMessage(data: any): string {
    if (typeof data === 'string') return data;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return 'Unknown API error';
  }

  async testConnection(): Promise<void> {
    if (this.mockMode) {
      this.logger.info('🔧 Mock mode connection test - SUCCESS', {
        mockData: 'Using test data for demo purposes'
      });
      return;
    }

    try {
      const response = await this.client.get('products/', { params: { limit: 1 } });
      this.logger.info('Kiwi TCMS connection test successful', {
        status: response.status,
        itemCount: response.data.count
      });
    } catch (error) {
      this.logger.error('Kiwi TCMS connection test failed:', error);
      throw error;
    }
  }

  // Mock data for testing
  private getMockProducts(): PaginatedResponse<KiwiProduct> {
    return {
      count: 2,
      next: undefined,
      previous: undefined,
      results: [
        {
          id: 1,
          name: 'Demo Web Application',
          description: 'Test management for our demo web application'
        },
        {
          id: 2,
          name: 'Mobile App Testing',
          description: 'Test cases for mobile application features'
        }
      ]
    };
  }

  private getMockTestPlans(): PaginatedResponse<KiwiTestPlan> {
    return {
      count: 3,
      next: undefined,
      previous: undefined,
      results: [
        {
          id: 1,
          name: 'Login & Authentication Tests',
          text: 'Comprehensive testing of login functionality',
          product: 1,
          product_version: 1,
          author: 1,
          type: 1,
          is_active: true,
          create_date: '2025-01-01T10:00:00Z'
        },
        {
          id: 2,
          name: 'API Endpoint Tests',
          text: 'Testing all REST API endpoints',
          product: 1,
          product_version: 1,
          author: 1,
          type: 1,
          is_active: true,
          create_date: '2025-01-02T10:00:00Z'
        },
        {
          id: 3,
          name: 'Mobile UI Tests',
          text: 'User interface testing on mobile devices',
          product: 2,
          product_version: 1,
          author: 1,
          type: 1,
          is_active: true,
          create_date: '2025-01-03T10:00:00Z'
        }
      ]
    };
  }

  private getMockTestCases(): PaginatedResponse<KiwiTestCase> {
    return {
      count: 5,
      next: undefined,
      previous: undefined,
      results: [
        {
          id: 1,
          summary: 'Test user login with valid credentials',
          text: 'Navigate to login page, enter valid credentials, and verify successful login',
          setup: 'Browser opened, test environment ready',
          breakdown: 'Close browser, clean test data',
          action: '1. Navigate to login page\n2. Enter valid username and password\n3. Click login button',
          expected_result: 'User should be logged in successfully and redirected to dashboard',
          notes: 'Test with different valid user accounts',
          case_status: 1,
          category: 1,
          priority: 2,
          author: 1,
          create_date: '2025-01-01T10:00:00Z',
          is_automated: false
        },
        {
          id: 2,
          summary: 'Test user login with invalid credentials',
          text: 'Verify error handling for invalid login attempts',
          setup: 'Browser opened, test environment ready',
          breakdown: 'Close browser',
          action: '1. Navigate to login page\n2. Enter invalid username or password\n3. Click login button',
          expected_result: 'Error message should be displayed, user not logged in',
          notes: 'Test various invalid combinations',
          case_status: 1,
          category: 1,
          priority: 2,
          author: 1,
          create_date: '2025-01-01T11:00:00Z',
          is_automated: false
        },
        {
          id: 3,
          summary: 'Test password reset functionality',
          text: 'Verify password reset email functionality',
          setup: 'Test email account configured',
          breakdown: 'Clean email inbox',
          action: '1. Click forgot password link\n2. Enter email address\n3. Submit form',
          expected_result: 'Password reset email should be sent',
          notes: 'Check email delivery and reset link',
          case_status: 1,
          category: 1,
          priority: 3,
          author: 1,
          create_date: '2025-01-01T12:00:00Z',
          is_automated: false
        },
        {
          id: 4,
          summary: 'Test GET /api/users endpoint',
          text: 'API endpoint validation for user retrieval',
          setup: 'API test environment, valid auth token',
          breakdown: 'Clean test data',
          action: '1. Send GET request to /api/users\n2. Verify response status\n3. Validate response format',
          expected_result: '200 status with valid user list JSON',
          notes: 'Automated API test',
          case_status: 1,
          category: 2,
          priority: 2,
          author: 1,
          create_date: '2025-01-02T10:00:00Z',
          is_automated: true
        },
        {
          id: 5,
          summary: 'Test mobile navigation menu',
          text: 'Mobile UI navigation functionality',
          setup: 'Mobile device/emulator ready',
          breakdown: 'Close app',
          action: '1. Open mobile app\n2. Tap hamburger menu\n3. Verify all menu items',
          expected_result: 'All navigation options should be visible and functional',
          notes: 'Test on multiple screen sizes',
          case_status: 1,
          category: 3,
          priority: 2,
          author: 1,
          create_date: '2025-01-03T10:00:00Z',
          is_automated: false
        }
      ]
    };
  }

  private getMockTestRuns(): PaginatedResponse<KiwiTestRun> {
    return {
      count: 2,
      next: undefined,
      previous: undefined,
      results: [
        {
          id: 1,
          summary: 'Authentication Test Run - Sprint 1',
          plan: 1,
          build: 1,
          manager: 1,
          default_tester: 1,
          start_date: '2025-01-10T09:00:00Z',
          stop_date: undefined,
          notes: 'Testing all login and authentication features for sprint 1'
        },
        {
          id: 2,
          summary: 'API Testing Run - Sprint 1',
          plan: 2,
          build: 1,
          manager: 1,
          default_tester: 1,
          start_date: '2025-01-11T09:00:00Z',
          stop_date: undefined,
          notes: 'Comprehensive API endpoint testing'
        }
      ]
    };
  }

  // Products
  async getProducts(params: { limit?: number; offset?: number; name?: string } = {}): Promise<PaginatedResponse<KiwiProduct>> {
    if (this.mockMode) {
      this.logger.debug('🔧 Mock: getProducts', params);
      return this.getMockProducts();
    }
    const response = await this.client.get('products/', { params });
    return response.data;
  }

  async getProduct(id: number): Promise<KiwiProduct> {
    if (this.mockMode) {
      const products = this.getMockProducts().results;
      const product = products.find(p => p.id === id);
      if (!product) throw { code: 'NOT_FOUND', message: `Product ${id} not found` };
      return product;
    }
    const response = await this.client.get(`products/${id}/`);
    return response.data;
  }

  // Test Plans
  async getTestPlans(params: { limit?: number; offset?: number; product?: number; name?: string } = {}): Promise<PaginatedResponse<KiwiTestPlan>> {
    if (this.mockMode) {
      this.logger.debug('🔧 Mock: getTestPlans', params);
      return this.getMockTestPlans();
    }
    const response = await this.client.get('testplans/', { params });
    return response.data;
  }

  async getTestPlan(id: number): Promise<KiwiTestPlan> {
    if (this.mockMode) {
      const plans = this.getMockTestPlans().results;
      const plan = plans.find(p => p.id === id);
      if (!plan) throw { code: 'NOT_FOUND', message: `Test Plan ${id} not found` };
      return plan;
    }
    const response = await this.client.get(`testplans/${id}/`);
    return response.data;
  }

  // Test Cases
  async getTestCases(params: { 
    limit?: number; 
    offset?: number; 
    plan?: number; 
    summary?: string;
    tag?: string;
  } = {}): Promise<PaginatedResponse<KiwiTestCase>> {
    if (this.mockMode) {
      this.logger.debug('🔧 Mock: getTestCases', params);
      let cases = this.getMockTestCases().results;
      
      // In mock mode, we simulate plan filtering by case categories
      // (since plan relationships would be in a separate table in real Kiwi TCMS)
      if (params.plan) {
        // Mock filter logic: plan 1 = category 1, plan 2 = category 2, etc.
        cases = cases.filter(c => c.category === params.plan!);
      }
      
      return {
        count: cases.length,
        next: undefined,
        previous: undefined,
        results: cases
      };
    }
    const response = await this.client.get('testcases/', { params });
    return response.data;
  }

  async getTestCase(id: number): Promise<KiwiTestCase> {
    if (this.mockMode) {
      const cases = this.getMockTestCases().results;
      const testCase = cases.find(c => c.id === id);
      if (!testCase) throw { code: 'NOT_FOUND', message: `Test Case ${id} not found` };
      return testCase;
    }
    const response = await this.client.get(`testcases/${id}/`);
    return response.data;
  }

  async createTestCase(caseData: Partial<KiwiTestCase>): Promise<KiwiTestCase> {
    if (this.mockMode) {
      this.logger.debug('🔧 Mock: createTestCase', caseData);
      return {
        id: 999,
        summary: caseData.summary || 'New Test Case',
        text: caseData.text || 'Test case created in mock mode',
        setup: caseData.setup || 'Mock setup',
        breakdown: caseData.breakdown || 'Mock breakdown',
        action: caseData.action || 'Mock action steps',
        expected_result: caseData.expected_result || 'Mock expected result',
        notes: caseData.notes || 'Created via mock mode',
        case_status: caseData.case_status || 1,
        category: caseData.category || 1,
        priority: caseData.priority || 2,
        author: caseData.author || 1,
        create_date: new Date().toISOString(),
        is_automated: caseData.is_automated || false
      };
    }
    const response = await this.client.post('testcases/', caseData);
    return response.data;
  }

  async updateTestCase(id: number, caseData: Partial<KiwiTestCase>): Promise<KiwiTestCase> {
    if (this.mockMode) {
      this.logger.debug('🔧 Mock: updateTestCase', { id, caseData });
      const existing = await this.getTestCase(id);
      return { ...existing, ...caseData };
    }
    const response = await this.client.patch(`testcases/${id}/`, caseData);
    return response.data;
  }

  // Test Runs
  async getTestRuns(params: { 
    limit?: number; 
    offset?: number; 
    plan?: number; 
    summary?: string;
  } = {}): Promise<PaginatedResponse<KiwiTestRun>> {
    const response = await this.client.get('testruns/', { params });
    return response.data;
  }

  async getTestRun(id: number): Promise<KiwiTestRun> {
    const response = await this.client.get(`testruns/${id}/`);
    return response.data;
  }

  async createTestRun(runData: Partial<KiwiTestRun>): Promise<KiwiTestRun> {
    const response = await this.client.post('testruns/', runData);
    return response.data;
  }

  // Test Executions
  async getTestExecutions(params: { 
    limit?: number; 
    offset?: number; 
    run?: number; 
    case?: number;
    status?: number;
  } = {}): Promise<PaginatedResponse<KiwiTestExecution>> {
    const response = await this.client.get('testexecutions/', { params });
    return response.data;
  }

  async getTestExecution(id: number): Promise<KiwiTestExecution> {
    const response = await this.client.get(`testexecutions/${id}/`);
    return response.data;
  }

  async createTestExecution(executionData: Partial<KiwiTestExecution>): Promise<KiwiTestExecution> {
    const response = await this.client.post('testexecutions/', executionData);
    return response.data;
  }

  async updateTestExecution(id: number, executionData: Partial<KiwiTestExecution>): Promise<KiwiTestExecution> {
    const response = await this.client.patch(`testexecutions/${id}/`, executionData);
    return response.data;
  }

  // Builds
  async getBuilds(params: { limit?: number; offset?: number; version?: number } = {}): Promise<PaginatedResponse<KiwiBuild>> {
    const response = await this.client.get('builds/', { params });
    return response.data;
  }

  async getBuild(id: number): Promise<KiwiBuild> {
    const response = await this.client.get(`builds/${id}/`);
    return response.data;
  }

  async createBuild(buildData: { name: string; version: number }): Promise<KiwiBuild> {
    const response = await this.client.post('builds/', buildData);
    return response.data;
  }

  // Environments
  async getEnvironments(params: { limit?: number; offset?: number } = {}): Promise<PaginatedResponse<KiwiEnvironment>> {
    const response = await this.client.get('environments/', { params });
    return response.data;
  }

  async getEnvironment(id: number): Promise<KiwiEnvironment> {
    const response = await this.client.get(`environments/${id}/`);
    return response.data;
  }

  // Tags
  async getTags(params: { limit?: number; offset?: number; name?: string } = {}): Promise<PaginatedResponse<KiwiTag>> {
    const response = await this.client.get('tags/', { params });
    return response.data;
  }

  async getTag(id: number): Promise<KiwiTag> {
    const response = await this.client.get(`tags/${id}/`);
    return response.data;
  }

  // Users
  async getUsers(params: { limit?: number; offset?: number; username?: string } = {}): Promise<PaginatedResponse<KiwiUser>> {
    const response = await this.client.get('users/', { params });
    return response.data;
  }

  async getUser(id: number): Promise<KiwiUser> {
    const response = await this.client.get(`users/${id}/`);
    return response.data;
  }

  async getCurrentUser(): Promise<KiwiUser> {
    const response = await this.client.get('auth/me/');
    return response.data;
  }

  // Helper methods for status mapping
  private statusMap = {
    'IDLE': 1,
    'PASS': 2,
    'FAIL': 3,
    'BLOCKED': 4,
    'ERROR': 5
  };

  private priorityMap = {
    'P1': 1,
    'P2': 2,
    'P3': 3,
    'P4': 4
  };

  getStatusId(status: string): number {
    return this.statusMap[status.toUpperCase() as keyof typeof this.statusMap] || 1;
  }

  getPriorityId(priority: string): number {
    return this.priorityMap[priority.toUpperCase() as keyof typeof this.priorityMap] || 3;
  }

  getStatusName(statusId: number): string {
    const entry = Object.entries(this.statusMap).find(([, id]) => id === statusId);
    return entry ? entry[0] : 'IDLE';
  }

  getPriorityName(priorityId: number): string {
    const entry = Object.entries(this.priorityMap).find(([, id]) => id === priorityId);
    return entry ? entry[0] : 'P3';
  }
}
