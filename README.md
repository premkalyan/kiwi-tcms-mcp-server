# Kiwi TCMS MCP Server

**Model Context Protocol server for Kiwi TCMS integration**

## Overview

This MCP server provides AI agents with comprehensive access to Kiwi TCMS (Test Case Management System) functionality through a standardized tool interface. It enables automated test management, execution tracking, and reporting through the Model Context Protocol.

## Features

### 🔍 Test Discovery
- **Browse Products**: List and filter Kiwi TCMS products
- **Explore Plans**: Find test plans by product and version
- **Search Cases**: Filter test cases by multiple criteria
- **Case Details**: Get complete test case information with steps

### 🚀 Test Execution
- **Create Runs**: Set up test execution runs with builds and environments
- **Execute Cases**: Mark test cases as passed, failed, blocked, or error
- **Track Progress**: Monitor test execution status and results
- **Manage Evidence**: Attach logs, screenshots, and artifacts

### 📊 Test Reporting
- **Generate Reports**: Create reports in JSON, JUnit, and HTML formats
- **Export Results**: Get comprehensive test run statistics
- **Track Metrics**: Monitor pass/fail rates and execution times

### ✏️ Test Authoring
- **Create Cases**: Author new test cases with structured steps
- **Update Cases**: Modify existing test cases and metadata
- **Manage Tags**: Organize tests with labels and categories

### 🔗 Integration
- **Jira Linking**: Connect test results to Jira issues
- **Artifact Storage**: Support for S3 and other storage backends
- **API First**: RESTful integration with Kiwi TCMS

## Installation

### Prerequisites

- Node.js 16+ and npm
- Running Kiwi TCMS instance
- Valid Kiwi TCMS API token

### Quick Start

```bash
# Clone and setup
cd tools/kiwi-tcms/mcp-server
./setup-mcp.sh

# Configure environment
cp .env.example .env
# Edit .env with your Kiwi TCMS settings

# Install dependencies
npm install

# Build and start
npm run build
npm start
```

### Docker Setup

```bash
# Build container
docker build -t kiwi-tcms-mcp .

# Run with environment file
docker run -p 8184:8184 --env-file .env kiwi-tcms-mcp

# Or with direct environment variables
docker run -p 8184:8184 \
  -e KIWI_BASE_URL=http://localhost:8080 \
  -e KIWI_TOKEN=your-token-here \
  kiwi-tcms-mcp
```

## Configuration

### Required Environment Variables

```bash
# Kiwi TCMS Connection
KIWI_BASE_URL=http://localhost:8080    # Your Kiwi TCMS instance URL
KIWI_TOKEN=your-api-token-here         # API token from Kiwi TCMS user profile
```

### Optional Configuration

```bash
# Server Settings
PORT=8184                              # HTTP wrapper port (default: 8184)
LOG_LEVEL=INFO                         # Logging level (DEBUG, INFO, WARN, ERROR)

# Jira Integration
JIRA_URL=https://company.atlassian.net
JIRA_EMAIL=user@company.com
JIRA_API_TOKEN=jira-token

# File Storage
AWS_S3_BUCKET=test-artifacts
AWS_ACCESS_KEY_ID=access-key
AWS_SECRET_ACCESS_KEY=secret-key
AWS_REGION=us-west-2
```

### Getting Your Kiwi TCMS API Token

1. Login to your Kiwi TCMS instance
2. Go to **My Profile** → **API Tokens**
3. Click **Generate New Token**
4. Copy the token to your `.env` file

## API Tools

### Discovery Tools

#### `kiwi.list_products`
List all available products with optional filtering.

```json
{
  "tool_name": "kiwi.list_products",
  "arguments": {
    "query": {
      "name_contains": "web",
      "limit": 10
    }
  }
}
```

#### `kiwi.list_plans`
List test plans for a specific product.

```json
{
  "tool_name": "kiwi.list_plans",
  "arguments": {
    "product_id": 1,
    "version": "2.1.0",
    "limit": 20
  }
}
```

#### `kiwi.list_cases`
Search test cases with filtering options.

```json
{
  "tool_name": "kiwi.list_cases",
  "arguments": {
    "plan_id": 5,
    "tags": ["smoke", "critical"],
    "text": "login"
  }
}
```

#### `kiwi.get_case`
Get detailed information about a specific test case.

```json
{
  "tool_name": "kiwi.get_case",
  "arguments": {
    "case_id": 123
  }
}
```

### Execution Tools

#### `kiwi.create_run`
Create a new test run with specified cases.

```json
{
  "tool_name": "kiwi.create_run",
  "arguments": {
    "plan_id": 5,
    "build": "v2.1.0-rc1",
    "environment": "Chrome-Linux",
    "case_ids": [101, 102, 103]
  }
}
```

#### `kiwi.execute_case`
Execute a test case and record results.

```json
{
  "tool_name": "kiwi.execute_case",
  "arguments": {
    "run_id": 25,
    "case_id": 101,
    "status": "PASS",
    "actual_result": "Login successful",
    "duration_seconds": 15.5,
    "evidence": [
      {
        "type": "screenshot",
        "uri": "https://s3.amazonaws.com/artifacts/screenshot.png",
        "title": "Login Success Screenshot"
      }
    ]
  }
}
```

#### `kiwi.run_report`
Generate test run reports.

```json
{
  "tool_name": "kiwi.run_report",
  "arguments": {
    "run_id": 25,
    "format": "json"
  }
}
```

### Authoring Tools

#### `kiwi.create_case`
Create a new test case.

```json
{
  "tool_name": "kiwi.create_case",
  "arguments": {
    "product_id": 1,
    "summary": "User Login Test",
    "priority": "P1",
    "steps": [
      {
        "action": "Navigate to login page",
        "expected": "Login form is displayed"
      },
      {
        "action": "Enter valid credentials",
        "expected": "User is logged in successfully"
      }
    ],
    "tags": ["authentication", "smoke"]
  }
}
```

## Usage Examples

### Basic Test Execution Workflow

```bash
# 1. List available products
curl -X POST http://localhost:8184/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "kiwi.list_products"}}'

# 2. Find test plans for a product
curl -X POST http://localhost:8184/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "kiwi.list_plans", "arguments": {"product_id": 1}}}'

# 3. Create a test run
curl -X POST http://localhost:8184/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "kiwi.create_run", "arguments": {"plan_id": 5, "build": "v1.0", "environment": "staging", "case_ids": [1,2,3]}}}'

# 4. Execute a test case
curl -X POST http://localhost:8184/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "kiwi.execute_case", "arguments": {"run_id": 10, "case_id": 1, "status": "PASS"}}}'
```

### Integration with AI Agents

```python
# Example: AI Agent using Kiwi TCMS MCP
import requests

class TestAgent:
    def __init__(self, mcp_url="http://localhost:8184/mcp"):
        self.mcp_url = mcp_url
    
    def run_smoke_tests(self, product_id, build_version):
        # Find smoke test cases
        cases = self.call_tool("kiwi.list_cases", {
            "product_id": product_id,
            "tags": ["smoke"]
        })
        
        # Create test run
        run = self.call_tool("kiwi.create_run", {
            "plan_id": 1,
            "build": build_version,
            "environment": "automated",
            "case_ids": [c["id"] for c in cases["items"]]
        })
        
        # Execute tests and report
        for case in cases["items"]:
            result = self.execute_automated_test(case)
            self.call_tool("kiwi.execute_case", {
                "run_id": run["run_id"],
                "case_id": case["id"],
                "status": result["status"],
                "actual_result": result["details"]
            })
        
        # Generate report
        return self.call_tool("kiwi.run_report", {
            "run_id": run["run_id"],
            "format": "json"
        })
    
    def call_tool(self, tool_name, arguments):
        response = requests.post(self.mcp_url, json={
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments}
        })
        return response.json()["result"]
```

## Development

### Project Structure

```
src/
├── index.ts              # Main MCP server entry point
├── kiwiApiClient.ts      # Kiwi TCMS API client
├── toolRegistry.ts       # MCP tool definitions and routing
├── types/
│   └── index.ts         # TypeScript type definitions
├── utils/
│   ├── logger.ts        # Logging utility
│   └── validation.ts    # Input validation
└── services/
    ├── testManagementService.ts   # Discovery and browsing
    ├── testExecutionService.ts    # Execution and reporting
    └── testAuthoringService.ts    # Case creation and updates
```

### Development Commands

```bash
# Development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Production mode
npm start

# Clean build artifacts
npm run clean

# Run with HTTP wrapper
node wrapper.js
```

### Testing

```bash
# Test server health
curl http://localhost:8184/health

# Test MCP connection
curl -X POST http://localhost:8184/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'

# Test a specific tool
curl -X POST http://localhost:8184/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "kiwi.list_products"}}'
```

## Troubleshooting

### Common Issues

#### Connection Errors
```
❌ Error: connect ECONNREFUSED
```
- Check that Kiwi TCMS is running
- Verify `KIWI_BASE_URL` is correct
- Ensure network connectivity

#### Authentication Errors
```
❌ Error: 401 Unauthorized
```
- Verify `KIWI_TOKEN` is valid
- Check token hasn't expired
- Ensure user has required permissions

#### Build Errors
```
❌ Build failed - TypeScript errors
```
- Run `npm install` to update dependencies
- Check TypeScript version compatibility
- Review error messages for specific issues

### Debug Mode

Enable detailed logging:

```bash
# Set debug logging
export LOG_LEVEL=DEBUG

# Run with verbose output
npm run dev
```

### Health Monitoring

```bash
# Check service health
curl http://localhost:8184/health

# Get service information
curl http://localhost:8184/info

# Monitor logs
docker logs -f kiwi-tcms-mcp
```

## Integration with Prometheus MCP Ecosystem

### Adding to Docker Compose

Add to your main `docker-compose.yml`:

```yaml
services:
  kiwi-tcms-mcp:
    build: ./tools/kiwi-tcms/mcp-server
    container_name: prometheus-kiwi-tcms-mcp
    ports:
      - "8184:8184"
    environment:
      - KIWI_BASE_URL=http://kiwi-tcms:8080
      - KIWI_TOKEN=${KIWI_TOKEN}
    depends_on:
      - kiwi-tcms
    networks:
      - prometheus-network
    restart: unless-stopped
```

### MCP Client Configuration

For use with AI agents, add to your MCP client config:

```json
{
  "mcpServers": {
    "kiwi-tcms": {
      "command": "node",
      "args": ["/path/to/kiwi-tcms/mcp-server/dist/index.js"],
      "env": {
        "KIWI_BASE_URL": "http://localhost:8080",
        "KIWI_TOKEN": "your-token"
      }
    }
  }
}
```

## Contributing

### Adding New Tools

1. Define the tool in `toolRegistry.ts`
2. Add input/output types in `types/index.ts`
3. Implement the service method
4. Add validation logic
5. Update documentation

### Code Style

- Use TypeScript strict mode
- Follow existing patterns for error handling
- Add comprehensive logging
- Include input validation
- Document all public methods

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: See Kiwi TCMS official docs
- **Issues**: Create GitHub issues for bugs
- **Community**: Join the Kiwi TCMS community forums
- **API Reference**: http://localhost:8080/api/v1/ (your Kiwi instance)

## Related Projects

- **Kiwi TCMS**: https://github.com/kiwitcms/Kiwi
- **MCP SDK**: https://github.com/modelcontextprotocol/sdk
- **Prometheus SDLC**: Parent project with full AI-enhanced workflow
