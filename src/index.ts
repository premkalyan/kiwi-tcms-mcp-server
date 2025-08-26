#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { KiwiApiClient } from './kiwiApiClient.js';
import { KiwiToolRegistry } from './toolRegistry.js';
import { Logger } from './utils/logger.js';
import { validateEnvironment } from './utils/validation.js';

const logger = new Logger('KiwiMCPServer');

class KiwiMCPServer {
  private server: Server;
  private apiClient: KiwiApiClient;
  private toolRegistry: KiwiToolRegistry;

  constructor() {
    // Validate environment variables
    validateEnvironment();

    this.server = new Server(
      {
        name: 'kiwi-tcms-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.apiClient = new KiwiApiClient();
    this.toolRegistry = new KiwiToolRegistry(this.apiClient);
    
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('Listing available Kiwi TCMS tools');
      return {
        tools: this.toolRegistry.getToolDefinitions(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params;
      
      logger.info(`Executing Kiwi TCMS tool: ${name}`, { args });

      try {
        const result = await this.toolRegistry.executeTool(name, args || {});
        logger.info(`Kiwi TCMS tool ${name} executed successfully`);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error executing Kiwi TCMS tool ${name}:`, error);
        
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute ${name}: ${errorMessage}`
        );
      }
    });

    // Handle server shutdown gracefully
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down Kiwi TCMS MCP server gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down Kiwi TCMS MCP server gracefully...');
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    try {
      // Test Kiwi TCMS connection
      await this.apiClient.testConnection();
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('Kiwi TCMS MCP Server is running on stdio');
      logger.info('Available tool categories:');
      logger.info('  • Discovery: list_products, list_plans, list_cases, get_case');
      logger.info('  • Execution: create_run, add_cases_to_run, get_run, execute_case');
      logger.info('  • Reporting: run_report, attach_artifact, link_jira');
      logger.info('  • Authoring: create_case, update_case');
    } catch (error) {
      logger.error('Failed to start Kiwi TCMS MCP server:', error);
      process.exit(1);
    }
  }
}

// Start the server
async function main() {
  const server = new KiwiMCPServer();
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error starting Kiwi TCMS MCP Server:', error);
  process.exit(1);
});
