#!/bin/bash

# Kiwi TCMS MCP Server Setup Script
set -e

echo "🚀 Setting up Kiwi TCMS MCP Server..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node --version)"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your Kiwi TCMS configuration"
    echo "📝 Required: KIWI_BASE_URL and KIWI_TOKEN"
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript source..."
npm run build

# Verify build
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

echo ""
echo "✅ Kiwi TCMS MCP Server setup complete!"
echo ""
echo "🔧 Configuration:"
echo "   • Edit .env file with your Kiwi TCMS settings"
echo "   • Required: KIWI_BASE_URL (e.g., http://localhost:8080)"
echo "   • Required: KIWI_TOKEN (get from Kiwi TCMS user profile)"
echo ""
echo "🚀 Starting Options:"
echo "   • Development: npm run dev"
echo "   • Production: npm start"
echo "   • HTTP Wrapper: node wrapper.js"
echo "   • Docker: docker build -t kiwi-tcms-mcp . && docker run -p 8184:8184 --env-file .env kiwi-tcms-mcp"
echo ""
echo "🌐 Once running:"
echo "   • Health: http://localhost:8184/health"
echo "   • Info: http://localhost:8184/info"
echo "   • MCP: http://localhost:8184/mcp"
echo ""
