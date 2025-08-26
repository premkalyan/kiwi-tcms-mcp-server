// Test Execution Service for Kiwi TCMS MCP Server

import { KiwiApiClient } from '../kiwiApiClient.js';
import { Logger } from '../utils/logger.js';
import { validateId, validateStatus, validateJiraIssueKey } from '../utils/validation.js';
import {
  ToolResult,
  CreateRunInput,
  AddCasesToRunInput,
  GetRunInput,
  ExecuteCaseInput,
  AttachArtifactInput,
  LinkJiraInput,
  RunReportInput,
  TestRunReport
} from '../types/index.js';

export class TestExecutionService {
  private logger: Logger;

  constructor(private apiClient: KiwiApiClient) {
    this.logger = new Logger('TestExecutionService');
  }

  async createRun(input: CreateRunInput): Promise<ToolResult> {
    try {
      this.logger.info('Creating test run', input);
      
      // Validate inputs
      if (!validateId(input.plan_id)) {
        throw new Error('Invalid plan_id: must be a positive integer');
      }
      
      if (!input.build || input.build.trim().length === 0) {
        throw new Error('Build name is required');
      }
      
      if (!input.environment || input.environment.trim().length === 0) {
        throw new Error('Environment name is required');
      }
      
      if (!Array.isArray(input.case_ids) || input.case_ids.length === 0) {
        throw new Error('case_ids must be a non-empty array');
      }
      
      if (!input.case_ids.every(id => validateId(id))) {
        throw new Error('All case_ids must be positive integers');
      }

      // Get the test plan to validate it exists
      const testPlan = await this.apiClient.getTestPlan(input.plan_id);
      
      // Find or create build
      let build;
      const builds = await this.apiClient.getBuilds({ version: testPlan.product });
      const existingBuild = builds.results.find(b => b.name === input.build);
      
      if (existingBuild) {
        build = existingBuild;
      } else {
        // Create new build
        build = await this.apiClient.createBuild({
          name: input.build,
          version: testPlan.product_version || testPlan.product
        });
      }

      // Find or get default assignee
      let managerId = testPlan.owner || testPlan.author;
      if (input.assignee) {
        const users = await this.apiClient.getUsers({ username: input.assignee });
        if (users.results.length > 0) {
          managerId = users.results[0].id;
        }
      }

      // Create test run
      const runData = {
        summary: `Test Run for ${testPlan.name} - Build ${input.build}`,
        notes: `Environment: ${input.environment}\nCreated via MCP`,
        plan: input.plan_id,
        build: build.id,
        manager: managerId,
        default_tester: managerId
      };

      const testRun = await this.apiClient.createTestRun(runData);
      
      // Add test cases to the run (create test executions)
      const createdCases = [];
      for (const caseId of input.case_ids) {
        try {
          const execution = await this.apiClient.createTestExecution({
            run: testRun.id,
            case: caseId,
            assignee: managerId,
            status: this.apiClient.getStatusId('IDLE')
          });
          
          createdCases.push({
            case_id: caseId,
            execution_id: execution.id
          });
        } catch (error) {
          this.logger.warn(`Failed to add case ${caseId} to run:`, error);
          // Continue with other cases
        }
      }

      const result = {
        run_id: testRun.id,
        created_cases: createdCases,
        environment: input.environment,
        build: input.build,
        total_cases: createdCases.length
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error creating test run:', error);
      return {
        content: [{
          type: 'text',
          text: `Error creating test run: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async addCasesToRun(input: AddCasesToRunInput): Promise<ToolResult> {
    try {
      this.logger.info('Adding cases to test run', input);
      
      if (!validateId(input.run_id)) {
        throw new Error('Invalid run_id: must be a positive integer');
      }
      
      if (!Array.isArray(input.case_ids) || input.case_ids.length === 0) {
        throw new Error('case_ids must be a non-empty array');
      }
      
      if (!input.case_ids.every(id => validateId(id))) {
        throw new Error('All case_ids must be positive integers');
      }

      // Get test run to validate it exists
      const testRun = await this.apiClient.getTestRun(input.run_id);
      
      // Add test cases to the run
      const added = [];
      for (const caseId of input.case_ids) {
        try {
          const execution = await this.apiClient.createTestExecution({
            run: input.run_id,
            case: caseId,
            assignee: testRun.default_tester,
            status: this.apiClient.getStatusId('IDLE')
          });
          
          added.push({
            case_id: caseId,
            execution_id: execution.id
          });
        } catch (error) {
          this.logger.warn(`Failed to add case ${caseId} to run:`, error);
          // Continue with other cases
        }
      }

      const result = {
        run_id: input.run_id,
        added,
        total_added: added.length
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error adding cases to run:', error);
      return {
        content: [{
          type: 'text',
          text: `Error adding cases to run: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async getRun(input: GetRunInput): Promise<ToolResult> {
    try {
      this.logger.info('Getting test run', input);
      
      if (!validateId(input.run_id)) {
        throw new Error('Invalid run_id: must be a positive integer');
      }

      const testRun = await this.apiClient.getTestRun(input.run_id);
      const executions = await this.apiClient.getTestExecutions({ run: input.run_id });
      
      // Get build info
      const build = await this.apiClient.getBuild(testRun.build);
      
      // Get plan info
      const plan = await this.apiClient.getTestPlan(testRun.plan);

      const result = {
        run_id: testRun.id,
        plan_id: testRun.plan,
        plan_name: plan.name,
        build: build.name,
        environment: 'Default', // Would need to be stored in notes or custom field
        summary: testRun.summary,
        notes: testRun.notes,
        start_date: testRun.start_date,
        stop_date: testRun.stop_date,
        executions: executions.results.map(exec => ({
          execution_id: exec.id,
          case_id: exec.case,
          status: this.apiClient.getStatusName(exec.status),
          assignee: exec.assignee,
          tested_by: exec.tested_by,
          start_date: exec.start_date,
          stop_date: exec.stop_date,
          actual_duration: exec.actual_duration
        }))
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error getting test run:', error);
      return {
        content: [{
          type: 'text',
          text: `Error getting test run: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async executeCase(input: ExecuteCaseInput): Promise<ToolResult> {
    try {
      this.logger.info('Executing test case', input);
      
      if (!validateId(input.run_id)) {
        throw new Error('Invalid run_id: must be a positive integer');
      }
      
      if (!validateId(input.case_id)) {
        throw new Error('Invalid case_id: must be a positive integer');
      }
      
      if (!validateStatus(input.status)) {
        throw new Error('Invalid status: must be PASS, FAIL, BLOCKED, or ERROR');
      }

      // Find the test execution for this case in this run
      const executions = await this.apiClient.getTestExecutions({ 
        run: input.run_id, 
        case: input.case_id 
      });
      
      if (executions.results.length === 0) {
        throw new Error(`No execution found for case ${input.case_id} in run ${input.run_id}`);
      }
      
      const execution = executions.results[0];
      
      // Update execution with results
      const updateData: any = {
        status: this.apiClient.getStatusId(input.status),
        stop_date: new Date().toISOString(),
        tested_by: execution.assignee
      };
      
      if (input.actual_result) {
        // Store in notes since Kiwi TCMS doesn't have a direct actual_result field
        updateData.notes = input.actual_result;
      }
      
      if (input.duration_seconds) {
        updateData.actual_duration = Math.round(input.duration_seconds);
      }
      
      if (!execution.start_date) {
        updateData.start_date = new Date().toISOString();
      }

      const updatedExecution = await this.apiClient.updateTestExecution(execution.id, updateData);
      
      // Handle evidence/attachments (simplified - would need file upload API)
      if (input.evidence && input.evidence.length > 0) {
        this.logger.info('Evidence attachments requested but not implemented', input.evidence);
        // In a full implementation, this would upload files to Kiwi TCMS
      }
      
      // Handle Jira linking (simplified - would need Jira integration)
      if (input.jira_issue_key) {
        if (validateJiraIssueKey(input.jira_issue_key)) {
          this.logger.info('Jira linking requested but not implemented', input.jira_issue_key);
          // In a full implementation, this would create a link to Jira
        }
      }

      const result = {
        execution_id: updatedExecution.id,
        status: this.apiClient.getStatusName(updatedExecution.status),
        updated_at: new Date().toISOString(),
        case_id: input.case_id,
        run_id: input.run_id
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error executing test case:', error);
      return {
        content: [{
          type: 'text',
          text: `Error executing test case: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async attachArtifact(input: AttachArtifactInput): Promise<ToolResult> {
    try {
      this.logger.info('Attaching artifact', input);
      
      // Simplified implementation - Kiwi TCMS file attachments would need proper file upload
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            attachment_id: Date.now(), // Mock ID
            message: 'Artifact attachment not fully implemented - would require file upload API'
          }, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error attaching artifact:', error);
      return {
        content: [{
          type: 'text',
          text: `Error attaching artifact: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async linkJira(input: LinkJiraInput): Promise<ToolResult> {
    try {
      this.logger.info('Linking Jira issue', input);
      
      if (input.issue_key && !validateJiraIssueKey(input.issue_key)) {
        throw new Error('Invalid Jira issue key format');
      }
      
      // Simplified implementation - would need Jira integration
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            linked: true,
            message: 'Jira linking not fully implemented - would require Jira API integration'
          }, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Error linking Jira issue:', error);
      return {
        content: [{
          type: 'text',
          text: `Error linking Jira issue: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  async runReport(input: RunReportInput): Promise<ToolResult> {
    try {
      this.logger.info('Generating run report', input);
      
      if (!validateId(input.run_id)) {
        throw new Error('Invalid run_id: must be a positive integer');
      }
      
      const validFormats = ['json', 'junit', 'html'];
      if (!validFormats.includes(input.format)) {
        throw new Error('Invalid format: must be json, junit, or html');
      }

      // Get test run and executions
      const testRun = await this.apiClient.getTestRun(input.run_id);
      const executions = await this.apiClient.getTestExecutions({ run: input.run_id });
      
      // Calculate statistics
      const stats = {
        pass: 0,
        fail: 0,
        blocked: 0,
        error: 0,
        idle: 0
      };
      
      executions.results.forEach(exec => {
        const status = this.apiClient.getStatusName(exec.status).toLowerCase();
        if (status in stats) {
          stats[status as keyof typeof stats]++;
        }
      });
      
      const total = executions.results.length;
      
      if (input.format === 'json') {
        const report: TestRunReport = {
          pass: stats.pass,
          fail: stats.fail,
          blocked: stats.blocked,
          error: stats.error,
          total
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(report, null, 2)
          }]
        };
      } else {
        // For junit/html, return base64 encoded content (simplified)
        const mockContent = input.format === 'junit' 
          ? `<?xml version="1.0" encoding="UTF-8"?><testsuite tests="${total}" failures="${stats.fail}" errors="${stats.error}" skipped="${stats.blocked}"></testsuite>`
          : `<html><body><h1>Test Report</h1><p>Total: ${total}, Pass: ${stats.pass}, Fail: ${stats.fail}</p></body></html>`;
        
        const content_b64 = Buffer.from(mockContent).toString('base64');
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ content_b64 }, null, 2)
          }]
        };
      }
    } catch (error) {
      this.logger.error('Error generating run report:', error);
      return {
        content: [{
          type: 'text',
          text: `Error generating run report: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
}
