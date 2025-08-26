// Test Management Service for Kiwi TCMS MCP Server

import { KiwiApiClient } from '../kiwiApiClient.js';
import { Logger } from '../utils/logger.js';
import { validateId, validateLimitAndOffset } from '../utils/validation.js';
import {
  ToolResult,
  ListProductsInput,
  ListPlansInput,
  ListCasesInput,
  GetCaseInput,
  CursorPaginatedResponse
} from '../types/index.js';

export class TestManagementService {
  private logger: Logger;

  constructor(private apiClient: KiwiApiClient) {
    this.logger = new Logger('TestManagementService');
  }

  async listProducts(input: ListProductsInput): Promise<ToolResult> {
    try {
      this.logger.info('Listing products', input);
      
      const query = input.query || {};
      const { limit, offset } = validateLimitAndOffset(query.limit, 0);
      
      const params: any = { limit, offset };
      if (query.name_contains) {
        params.name = query.name_contains;
      }

      const response = await this.apiClient.getProducts(params);
      
      // Convert to cursor-based pagination format
      const items = response.results.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        created_at: product.created_at
      }));

      const result: CursorPaginatedResponse<any> = {
        items,
        next_cursor: response.next ? `offset_${offset + limit}` : undefined
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error listing products:', error);
      return {
        content: [{
          type: 'text',
          text: `Error listing products: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async listPlans(input: ListPlansInput): Promise<ToolResult> {
    try {
      this.logger.info('Listing test plans', input);
      
      if (!validateId(input.product_id)) {
        throw new Error('Invalid product_id: must be a positive integer');
      }

      const { limit, offset } = validateLimitAndOffset(input.limit, 0);
      
      const params: any = { 
        limit, 
        offset, 
        product: input.product_id 
      };

      if (input.version) {
        // Find version by value
        const builds = await this.apiClient.getBuilds({ version: input.product_id });
        const build = builds.results.find(b => b.name === input.version);
        if (build) {
          params.product_version = build.id;
        }
      }

      const response = await this.apiClient.getTestPlans(params);
      
      const items = response.results.map(plan => ({
        id: plan.id,
        name: plan.name,
        product_id: plan.product,
        version: input.version || null,
        is_active: plan.is_active,
        created_date: plan.create_date
      }));

      const result: CursorPaginatedResponse<any> = {
        items,
        next_cursor: response.next ? `offset_${offset + limit}` : undefined
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error listing test plans:', error);
      return {
        content: [{
          type: 'text',
          text: `Error listing test plans: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async listCases(input: ListCasesInput): Promise<ToolResult> {
    try {
      this.logger.info('Listing test cases', input);
      
      const { limit, offset } = validateLimitAndOffset(input.limit, 0);
      
      const params: any = { limit, offset };
      
      if (input.plan_id && validateId(input.plan_id)) {
        params.plan = input.plan_id;
      }
      
      if (input.product_id && validateId(input.product_id)) {
        // Get cases for all plans in the product
        const plans = await this.apiClient.getTestPlans({ product: input.product_id });
        if (plans.results.length > 0) {
          params.plan = plans.results[0].id; // Simplified: use first plan
        }
      }
      
      if (input.text) {
        params.summary = input.text;
      }
      
      if (input.tags && input.tags.length > 0) {
        params.tag = input.tags[0]; // Simplified: use first tag
      }

      const response = await this.apiClient.getTestCases(params);
      
      const items = response.results.map(testCase => ({
        id: testCase.id,
        summary: testCase.summary,
        priority: this.apiClient.getPriorityName(testCase.priority),
        tags: [], // Tags would need separate API call
        component: testCase.category || null,
        is_automated: testCase.is_automated,
        author: testCase.author,
        create_date: testCase.create_date
      }));

      const result: CursorPaginatedResponse<any> = {
        items,
        next_cursor: response.next ? `offset_${offset + limit}` : undefined
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error listing test cases:', error);
      return {
        content: [{
          type: 'text',
          text: `Error listing test cases: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async getCase(input: GetCaseInput): Promise<ToolResult> {
    try {
      this.logger.info('Getting test case', input);
      
      if (!validateId(input.case_id)) {
        throw new Error('Invalid case_id: must be a positive integer');
      }

      const testCase = await this.apiClient.getTestCase(input.case_id);
      
      // Parse test steps from text fields
      const steps = this.parseTestSteps(testCase.action, testCase.expected_result);
      
      const result = {
        id: testCase.id,
        summary: testCase.summary,
        steps,
        preconds: testCase.setup || null,
        tags: [], // Would need separate API call to get tags
        component: testCase.category || null,
        priority: this.apiClient.getPriorityName(testCase.priority),
        is_automated: testCase.is_automated,
        text: testCase.text,
        setup: testCase.setup,
        breakdown: testCase.breakdown,
        notes: testCase.notes,
        author: testCase.author,
        create_date: testCase.create_date
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error getting test case:', error);
      return {
        content: [{
          type: 'text',
          text: `Error getting test case: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private parseTestSteps(action: string, expected: string): Array<{ action: string; expected: string }> {
    // Simple parsing - in real implementation, this would be more sophisticated
    // Kiwi TCMS stores steps in text fields, so we need to parse them
    
    if (!action && !expected) {
      return [];
    }
    
    // Split by common delimiters
    const actionSteps = action ? action.split(/\n|\d+\.|Step \d+:/).filter(s => s.trim()) : [''];
    const expectedSteps = expected ? expected.split(/\n|\d+\.|Expected:/).filter(s => s.trim()) : [''];
    
    const steps: Array<{ action: string; expected: string }> = [];
    const maxSteps = Math.max(actionSteps.length, expectedSteps.length);
    
    for (let i = 0; i < maxSteps; i++) {
      steps.push({
        action: actionSteps[i]?.trim() || '',
        expected: expectedSteps[i]?.trim() || ''
      });
    }
    
    return steps.filter(step => step.action || step.expected);
  }
}
