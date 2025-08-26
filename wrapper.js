// Kiwi TCMS MCP HTTP Wrapper
// Provides HTTP interface to Kiwi TCMS MCP (stdio)
// Based on existing MCP wrapper patterns in Prometheus

import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KiwiTcmsMCPWrapper {
  constructor() {
    this.app = express();
    this.mcpProcess = null;
    this.isReady = false;
    this.requestQueue = [];
    this.responseBuffer = ''; // Buffer for large responses
    
    this.setupRoutes();
    this.initializeMCP();
  }

  setupRoutes() {
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        mcpReady: this.isReady,
        service: 'Kiwi TCMS MCP Server',
        capabilities: [
          'Test Discovery', 
          'Test Planning', 
          'Test Execution', 
          'Test Reporting',
          'Test Authoring',
          'Jira Integration',
          'Artifact Management'
        ],
        toolCategories: {
          'Discovery': ['list_products', 'list_plans', 'list_cases', 'get_case'],
          'Execution': ['create_run', 'add_cases_to_run', 'get_run', 'execute_case'],
          'Reporting': ['run_report', 'attach_artifact', 'link_jira'],
          'Authoring': ['create_case', 'update_case']
        }
      });
    });

    // Main MCP endpoint - forwards requests to stdio MCP
    this.app.post('/mcp', async (req, res) => {
      if (!this.isReady) {
        return res.status(503).json({
          error: 'Kiwi TCMS MCP not ready',
          message: 'MCP server is initializing'
        });
      }

      try {
        const response = await this.forwardToMCP(req.body);
        res.json(response);
      } catch (error) {
        console.error('❌ Kiwi TCMS MCP request failed:', error);
        res.status(500).json({
          error: 'Kiwi TCMS MCP request failed',
          message: error.message
        });
      }
    });

    // Info endpoint
    this.app.get('/info', (req, res) => {
      res.json({
        name: 'Kiwi TCMS MCP Server',
        version: '1.0.0',
        description: 'Model Context Protocol server for Kiwi TCMS - Open-source test management integration',
        github: 'https://github.com/kiwitcms/Kiwi',
        mcp_server: 'https://github.com/prometheus/kiwi-tcms-mcp-server',
        features: {
          'Test Discovery': 'Browse products, plans, and test cases with filtering and pagination',
          'Test Planning': 'Create and manage test runs with build and environment tracking',
          'Test Execution': 'Execute test cases, record results, and track evidence',
          'Test Reporting': 'Generate comprehensive reports in JSON, JUnit, and HTML formats',
          'Test Authoring': 'Create and update test cases with structured steps',
          'Jira Integration': 'Link test results to Jira issues for traceability',
          'Artifact Management': 'Attach screenshots, logs, and other evidence to test results'
        },
        endpoints: {
          '/health': 'Health check and capability overview',
          '/mcp': 'MCP JSON-RPC endpoint',
          '/info': 'Service information and features'
        },
        configuration: {
          'KIWI_BASE_URL': 'Base URL for Kiwi TCMS instance (required)',
          'KIWI_TOKEN': 'API token for Kiwi TCMS authentication (required)',
          'LOG_LEVEL': 'Logging level (DEBUG, INFO, WARN, ERROR)'
        }
      });
    });
  }

  async initializeMCP() {
    console.log('🚀 Initializing Kiwi TCMS MCP Server...');
    
    // Validate environment variables
    const kiwiBaseUrl = process.env.KIWI_BASE_URL;
    const kiwiToken = process.env.KIWI_TOKEN;
    
    if (!kiwiBaseUrl || !kiwiToken) {
      console.error('❌ Missing required Kiwi TCMS configuration:');
      console.error(`   KIWI_BASE_URL: ${kiwiBaseUrl ? '✓' : '✗'}`);
      console.error(`   KIWI_TOKEN: ${kiwiToken ? '✓' : '✗'}`);
      console.error('');
      console.error('💡 Configuration Help:');
      console.error('   1. Set KIWI_BASE_URL to your Kiwi TCMS instance URL (e.g., http://localhost:8080)');
      console.error('   2. Set KIWI_TOKEN to your API token from Kiwi TCMS user profile');
      process.exit(1);
    }

    console.log(`🔗 Connecting to Kiwi TCMS: ${kiwiBaseUrl}`);
    console.log(`🔑 Using API token (length: ${kiwiToken.length})`);
    
    try {
      // Get the path to the built Kiwi TCMS MCP server
      const mcpServerPath = path.join(__dirname, 'dist', 'index.js');
      
      // Spawn Kiwi TCMS MCP in stdio mode
      this.mcpProcess = spawn('node', [mcpServerPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Pass through environment variables
          KIWI_BASE_URL: kiwiBaseUrl,
          KIWI_TOKEN: kiwiToken,
          LOG_LEVEL: process.env.LOG_LEVEL || 'INFO'
        }
      });

      this.mcpProcess.stdout.on('data', (data) => {
        this.responseBuffer += data.toString();
        
        // Process complete lines (responses)
        const lines = this.responseBuffer.split('\n');
        this.responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        lines.forEach(line => {
          if (line.trim()) {
            this.handleMCPResponse(line.trim());
          }
        });
      });

      this.mcpProcess.stderr.on('data', (data) => {
        const message = data.toString();
        if (message.includes('ERROR') || message.includes('WARN')) {
          console.log('⚠️  Kiwi TCMS MCP:', message.trim());
        } else {
          console.log('📋 Kiwi TCMS MCP:', message.trim());
        }
      });

      this.mcpProcess.on('close', (code) => {
        console.log(`📛 Kiwi TCMS MCP process exited with code ${code}`);
        this.isReady = false;
        // Restart after 5 seconds
        setTimeout(() => this.initializeMCP(), 5000);
      });

      this.mcpProcess.on('error', (error) => {
        console.error('❌ Failed to start Kiwi TCMS MCP:', error);
        this.isReady = false;
      });

      // Wait for initialization
      setTimeout(() => {
        this.isReady = true;
        console.log('✅ Kiwi TCMS MCP ready');
        console.log('🛠️  Available tool categories:');
        console.log('   • Discovery: Browse products, plans, and test cases');
        console.log('   • Execution: Create runs and execute test cases');
        console.log('   • Reporting: Generate reports and manage artifacts');
        console.log('   • Authoring: Create and update test cases');
        this.processRequestQueue();
      }, 3000);

    } catch (error) {
      console.error('❌ Kiwi TCMS MCP initialization failed:', error);
      process.exit(1);
    }
  }

  async forwardToMCP(request) {
    return new Promise((resolve, reject) => {
      const requestId = request.id || Date.now();
      const timeout = 120000; // 2 minutes for large test management operations

      // Add to queue
      this.requestQueue.push({ id: requestId, resolve, reject });

      // Send to MCP
      try {
        this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      } catch (error) {
        reject(error);
        return;
      }

      // Timeout handling
      setTimeout(() => {
        const queueIndex = this.requestQueue.findIndex(req => req.id === requestId);
        if (queueIndex !== -1) {
          this.requestQueue.splice(queueIndex, 1);
          reject(new Error('Request timeout after 2 minutes'));
        }
      }, timeout);
    });
  }

  handleMCPResponse(responseText) {
    try {
      // Skip non-JSON responses (logs, messages)
      const trimmed = responseText.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        // This is likely a log message, ignore it
        return;
      }

      const response = JSON.parse(trimmed);
      const requestId = response.id;

      const queueIndex = this.requestQueue.findIndex(req => req.id === requestId);
      if (queueIndex !== -1) {
        const request = this.requestQueue[queueIndex];
        this.requestQueue.splice(queueIndex, 1);
        request.resolve(response);
      }
    } catch (error) {
      // Only log JSON parsing errors for what looks like JSON
      if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
        console.error('❌ Failed to parse Kiwi TCMS MCP response:', error.message);
        console.error('📋 Response text:', responseText.substring(0, 200));
      }
      // Ignore non-JSON responses silently
    }
  }

  processRequestQueue() {
    // Process any queued requests after initialization
    console.log(`🔄 Processing ${this.requestQueue.length} queued requests`);
  }

  start() {
    const port = process.env.PORT || 8184;
    this.app.listen(port, () => {
      console.log(`🌐 Kiwi TCMS MCP Wrapper listening on port ${port}`);
      console.log(`📋 Health check: http://localhost:${port}/health`);
      console.log(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`ℹ️  Service info: http://localhost:${port}/info`);
      console.log('');
      console.log('🧪 Example Usage:');
      console.log(`   curl http://localhost:${port}/health`);
      console.log(`   curl http://localhost:${port}/info`);
    });
  }
}

// Start the service
const wrapper = new KiwiTcmsMCPWrapper();
wrapper.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  if (wrapper.mcpProcess) {
    wrapper.mcpProcess.kill();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  if (wrapper.mcpProcess) {
    wrapper.mcpProcess.kill();
  }
  process.exit(0);
});
