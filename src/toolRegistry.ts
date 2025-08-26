// Tool Registry for Kiwi TCMS MCP Server

import { KiwiApiClient } from './kiwiApiClient.js';
import { ToolDefinition, ToolResult } from './types/index.js';
import { Logger } from './utils/logger.js';
import { 
  TestManagementService,
  TestExecutionService,
  TestAuthoringService
} from './services/index.js';

export class KiwiToolRegistry {
  private logger: Logger;
  private testManagementService: TestManagementService;
  private testExecutionService: TestExecutionService;
  private testAuthoringService: TestAuthoringService;

  constructor(private apiClient: KiwiApiClient) {
    this.logger = new Logger('KiwiToolRegistry');
    
    // Initialize services
    this.testManagementService = new TestManagementService(apiClient);
    this.testExecutionService = new TestExecutionService(apiClient);
    this.testAuthoringService = new TestAuthoringService(apiClient);
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      // Discovery / Lookup Tools
      {
        name: 'kiwi.list_products',
        description: 'List all available Kiwi TCMS products with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              properties: {
                name_contains: {
                  type: 'string',
                  description: 'Filter products by name containing this string'
                },
                limit: {
                  type: 'integer',
                  description: 'Maximum number of products to return (default: 50, max: 1000)',
                  minimum: 1,
                  maximum: 1000
                },
                cursor: {
                  type: 'string',
                  description: 'Pagination cursor for retrieving next page'
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.list_plans',
        description: 'List test plans for a specific product with optional version filtering',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'integer',
              description: 'Product ID to list plans for'
            },
            version: {
              type: ['string', 'null'],
              description: 'Filter by specific version/build name'
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of plans to return (default: 50)',
              minimum: 1,
              maximum: 1000
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor'
            }
          },
          required: ['product_id'],
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.list_cases',
        description: 'List test cases with various filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: ['integer', 'null'],
              description: 'Filter by test plan ID'
            },
            product_id: {
              type: ['integer', 'null'],
              description: 'Filter by product ID'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags'
            },
            component: {
              type: ['string', 'null'],
              description: 'Filter by component/category'
            },
            text: {
              type: ['string', 'null'],
              description: 'Filter by text in summary or description'
            },
            limit: {
              type: 'integer',
              description: 'Maximum number of cases to return (default: 100)',
              minimum: 1,
              maximum: 1000
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor'
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.get_case',
        description: 'Get detailed information about a specific test case including steps',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'integer',
              description: 'Test case ID to retrieve'
            }
          },
          required: ['case_id'],
          additionalProperties: false
        }
      },

      // Plan / Run Lifecycle Tools
      {
        name: 'kiwi.create_run',
        description: 'Create a new test run for a test plan with specified test cases',
        inputSchema: {
          type: 'object',
          properties: {
            plan_id: {
              type: 'integer',
              description: 'Test plan ID to create run for'
            },
            build: {
              type: 'string',
              description: 'Build/version identifier for the test run'
            },
            environment: {
              type: 'string',
              description: 'Test environment name (e.g., "Windows-Chrome", "Linux-Firefox")'
            },
            assignee: {
              type: ['string', 'null'],
              description: 'Username of the default assignee for test executions'
            },
            case_ids: {
              type: 'array',
              items: { type: 'integer' },
              minItems: 1,
              description: 'Array of test case IDs to include in the run'
            }
          },
          required: ['plan_id', 'build', 'environment', 'case_ids'],
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.add_cases_to_run',
        description: 'Add additional test cases to an existing test run',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'integer',
              description: 'Test run ID to add cases to'
            },
            case_ids: {
              type: 'array',
              items: { type: 'integer' },
              minItems: 1,
              description: 'Array of test case IDs to add to the run'
            }
          },
          required: ['run_id', 'case_ids'],
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.get_run',
        description: 'Get detailed information about a test run including all executions',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'integer',
              description: 'Test run ID to retrieve'
            }
          },
          required: ['run_id'],
          additionalProperties: false
        }
      },

      // Execution & Results Tools
      {
        name: 'kiwi.execute_case',
        description: 'Mark a test case as executed with results, evidence, and optional Jira linking',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'integer',
              description: 'Test run ID containing the case'
            },
            case_id: {
              type: 'integer',
              description: 'Test case ID to execute'
            },
            status: {
              type: 'string',
              enum: ['PASS', 'FAIL', 'BLOCKED', 'ERROR'],
              description: 'Execution result status'
            },
            actual_result: {
              type: ['string', 'null'],
              description: 'Actual result description or failure details'
            },
            evidence: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['log', 'screenshot', 'artifact'],
                    description: 'Type of evidence'
                  },
                  uri: {
                    type: 'string',
                    description: 'URI to the evidence file (http://, https://, s3://, file://)'
                  },
                  title: {
                    type: ['string', 'null'],
                    description: 'Optional title/description for the evidence'
                  }
                },
                required: ['type', 'uri'],
                additionalProperties: false
              },
              description: 'Array of evidence attachments'
            },
            duration_seconds: {
              type: 'number',
              minimum: 0,
              description: 'Execution duration in seconds'
            },
            rerun: {
              type: 'boolean',
              description: 'Whether this is a rerun of a previously executed case'
            },
            jira_issue_key: {
              type: ['string', 'null'],
              description: 'Jira issue key to link (e.g., "PROJ-123")'
            }
          },
          required: ['run_id', 'case_id', 'status'],
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.attach_artifact',
        description: 'Attach an artifact (file, screenshot, log) to a test execution',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: 'integer',
              description: 'Test execution ID to attach artifact to'
            },
            type: {
              type: 'string',
              enum: ['log', 'screenshot', 'artifact'],
              description: 'Type of artifact'
            },
            uri: {
              type: 'string',
              description: 'URI to the artifact file'
            },
            title: {
              type: ['string', 'null'],
              description: 'Optional title for the artifact'
            }
          },
          required: ['execution_id', 'type', 'uri'],
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.link_jira',
        description: 'Link a Jira issue to a test execution or test case',
        inputSchema: {
          type: 'object',
          properties: {
            execution_id: {
              type: ['integer', 'null'],
              description: 'Test execution ID to link (optional if case_id provided)'
            },
            case_id: {
              type: ['integer', 'null'],
              description: 'Test case ID to link (optional if execution_id provided)'
            },
            issue_key: {
              type: 'string',
              description: 'Jira issue key (e.g., "PROJ-123")'
            }
          },
          required: ['issue_key'],
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.run_report',
        description: 'Generate a test run report in various formats',
        inputSchema: {
          type: 'object',
          properties: {
            run_id: {
              type: 'integer',
              description: 'Test run ID to generate report for'
            },
            format: {
              type: 'string',
              enum: ['json', 'junit', 'html'],
              description: 'Report format'
            }
          },
          required: ['run_id', 'format'],
          additionalProperties: false
        }
      },

      // Test Authoring Tools (Optional)
      {
        name: 'kiwi.create_case',
        description: 'Create a new test case with steps, priority, and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'integer',
              description: 'Product ID to create the test case for'
            },
            summary: {
              type: 'string',
              description: 'Test case summary/title'
            },
            preconds: {
              type: ['string', 'null'],
              description: 'Test preconditions'
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    description: 'Test action/step description'
                  },
                  expected: {
                    type: 'string',
                    description: 'Expected result for this step'
                  }
                },
                required: ['action', 'expected'],
                additionalProperties: false
              },
              minItems: 1,
              description: 'Array of test steps'
            },
            priority: {
              type: 'string',
              enum: ['P1', 'P2', 'P3', 'P4'],
              description: 'Test case priority'
            },
            component: {
              type: ['string', 'null'],
              description: 'Component/category name'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tags for the test case'
            }
          },
          required: ['product_id', 'summary', 'steps', 'priority'],
          additionalProperties: false
        }
      },
      {
        name: 'kiwi.update_case',
        description: 'Update an existing test case with new information',
        inputSchema: {
          type: 'object',
          properties: {
            case_id: {
              type: 'integer',
              description: 'Test case ID to update'
            },
            patch: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'New summary/title'
                },
                steps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      action: { type: 'string' },
                      expected: { type: 'string' }
                    },
                    required: ['action', 'expected'],
                    additionalProperties: false
                  },
                  description: 'Updated test steps'
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Updated tags'
                }
              },
              additionalProperties: true,
              description: 'Fields to update (only specified fields will be changed)'
            }
          },
          required: ['case_id', 'patch'],
          additionalProperties: false
        }
      }
    ];
  }

  async executeTool(name: string, args: any): Promise<ToolResult> {
    this.logger.info(`Executing tool: ${name}`);
    
    try {
      switch (name) {
        // Discovery / Lookup Tools
        case 'kiwi.list_products':
          return await this.testManagementService.listProducts(args);
        case 'kiwi.list_plans':
          return await this.testManagementService.listPlans(args);
        case 'kiwi.list_cases':
          return await this.testManagementService.listCases(args);
        case 'kiwi.get_case':
          return await this.testManagementService.getCase(args);

        // Plan / Run Lifecycle Tools
        case 'kiwi.create_run':
          return await this.testExecutionService.createRun(args);
        case 'kiwi.add_cases_to_run':
          return await this.testExecutionService.addCasesToRun(args);
        case 'kiwi.get_run':
          return await this.testExecutionService.getRun(args);

        // Execution & Results Tools
        case 'kiwi.execute_case':
          return await this.testExecutionService.executeCase(args);
        case 'kiwi.attach_artifact':
          return await this.testExecutionService.attachArtifact(args);
        case 'kiwi.link_jira':
          return await this.testExecutionService.linkJira(args);
        case 'kiwi.run_report':
          return await this.testExecutionService.runReport(args);

        // Test Authoring Tools
        case 'kiwi.create_case':
          return await this.testAuthoringService.createCase(args);
        case 'kiwi.update_case':
          return await this.testAuthoringService.updateCase(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Tool execution failed for ${name}:`, error);
      
      return {
        content: [{
          type: 'text',
          text: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
}
