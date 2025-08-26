// Test Authoring Service for Kiwi TCMS MCP Server

import { KiwiApiClient } from '../kiwiApiClient.js';
import { Logger } from '../utils/logger.js';
import { validateId, validatePriority, validateTestSteps } from '../utils/validation.js';
import {
  ToolResult,
  CreateCaseInput,
  UpdateCaseInput
} from '../types/index.js';

export class TestAuthoringService {
  private logger: Logger;

  constructor(private apiClient: KiwiApiClient) {
    this.logger = new Logger('TestAuthoringService');
  }

  async createCase(input: CreateCaseInput): Promise<ToolResult> {
    try {
      this.logger.info('Creating test case', input);
      
      // Validate inputs
      if (!validateId(input.product_id)) {
        throw new Error('Invalid product_id: must be a positive integer');
      }
      
      if (!input.summary || input.summary.trim().length === 0) {
        throw new Error('Summary is required and cannot be empty');
      }
      
      if (!validateTestSteps(input.steps)) {
        throw new Error('Invalid steps: must be a non-empty array with action and expected fields');
      }
      
      if (!validatePriority(input.priority)) {
        throw new Error('Invalid priority: must be P1, P2, P3, or P4');
      }

      // Get current user for author field
      const currentUser = await this.apiClient.getCurrentUser();
      
      // Convert steps to Kiwi TCMS format
      const { action, expected_result } = this.formatTestSteps(input.steps);
      
      // Get category ID if component is specified
      let categoryId = 1; // Default category
      if (input.component) {
        // In a full implementation, you'd look up or create the category
        // For now, we'll use default
        this.logger.debug('Component specified but category lookup not implemented:', input.component);
      }

      // Create test case data
      const caseData = {
        summary: input.summary.trim(),
        text: input.preconds || '',
        setup: input.preconds || '',
        breakdown: '', // Could be derived from steps
        action,
        expected_result,
        notes: `Created via MCP at ${new Date().toISOString()}`,
        case_status: 1, // Active
        category: categoryId,
        priority: this.apiClient.getPriorityId(input.priority),
        author: currentUser.id,
        default_tester: currentUser.id,
        is_automated: false,
        script: '',
        arguments: '',
        extra_link: '',
        requirement: ''
      };

      const testCase = await this.apiClient.createTestCase(caseData);
      
      // Handle tags if specified
      if (input.tags && input.tags.length > 0) {
        this.logger.info('Tags specified but tag assignment not implemented:', input.tags);
        // In a full implementation, you'd assign tags to the test case
      }

      const result = {
        case_id: testCase.id,
        summary: testCase.summary,
        priority: this.apiClient.getPriorityName(testCase.priority),
        product_id: input.product_id,
        author: currentUser.username,
        created_date: testCase.create_date,
        steps: input.steps,
        tags: input.tags || []
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error creating test case:', error);
      return {
        content: [{
          type: 'text',
          text: `Error creating test case: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async updateCase(input: UpdateCaseInput): Promise<ToolResult> {
    try {
      this.logger.info('Updating test case', input);
      
      if (!validateId(input.case_id)) {
        throw new Error('Invalid case_id: must be a positive integer');
      }
      
      if (!input.patch || Object.keys(input.patch).length === 0) {
        throw new Error('Patch object is required and cannot be empty');
      }

      // Get existing test case
      const existingCase = await this.apiClient.getTestCase(input.case_id);
      
      // Build update data
      const updateData: any = {};
      
      if (input.patch.summary) {
        if (input.patch.summary.trim().length === 0) {
          throw new Error('Summary cannot be empty');
        }
        updateData.summary = input.patch.summary.trim();
      }
      
      if (input.patch.steps) {
        if (!validateTestSteps(input.patch.steps)) {
          throw new Error('Invalid steps: must be a non-empty array with action and expected fields');
        }
        
        const { action, expected_result } = this.formatTestSteps(input.patch.steps);
        updateData.action = action;
        updateData.expected_result = expected_result;
      }
      
      // Handle other patch fields
      Object.keys(input.patch).forEach(key => {
        if (key !== 'summary' && key !== 'steps' && key !== 'tags') {
          updateData[key] = input.patch[key];
        }
      });
      
      // Add update metadata
      updateData.notes = (existingCase.notes || '') + `\nUpdated via MCP at ${new Date().toISOString()}`;

      const updatedCase = await this.apiClient.updateTestCase(input.case_id, updateData);
      
      // Handle tags if specified
      if (input.patch.tags) {
        this.logger.info('Tags update specified but tag assignment not implemented:', input.patch.tags);
        // In a full implementation, you'd update tags for the test case
      }

      const result = {
        case_id: updatedCase.id,
        updated_at: new Date().toISOString(),
        summary: updatedCase.summary,
        priority: this.apiClient.getPriorityName(updatedCase.priority),
        steps: input.patch.steps || this.parseTestSteps(updatedCase.action, updatedCase.expected_result),
        updated_fields: Object.keys(updateData)
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error updating test case:', error);
      return {
        content: [{
          type: 'text',
          text: `Error updating test case: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private formatTestSteps(steps: Array<{ action: string; expected: string }>): { action: string; expected_result: string } {
    // Convert MCP format steps to Kiwi TCMS text format
    const actions = steps.map((step, index) => `${index + 1}. ${step.action}`).join('\n');
    const expectations = steps.map((step, index) => `${index + 1}. ${step.expected}`).join('\n');
    
    return {
      action: actions,
      expected_result: expectations
    };
  }

  private parseTestSteps(action: string, expected: string): Array<{ action: string; expected: string }> {
    // Convert Kiwi TCMS text format back to MCP format steps
    if (!action && !expected) {
      return [];
    }
    
    // Split by numbered steps
    const actionSteps = action ? action.split(/\n?\d+\.\s*/).filter(s => s.trim()) : [''];
    const expectedSteps = expected ? expected.split(/\n?\d+\.\s*/).filter(s => s.trim()) : [''];
    
    const steps: Array<{ action: string; expected: string }> = [];
    const maxSteps = Math.max(actionSteps.length, expectedSteps.length);
    
    for (let i = 0; i < maxSteps; i++) {
      const actionText = actionSteps[i]?.trim() || '';
      const expectedText = expectedSteps[i]?.trim() || '';
      
      if (actionText || expectedText) {
        steps.push({
          action: actionText,
          expected: expectedText
        });
      }
    }
    
    return steps;
  }
}
