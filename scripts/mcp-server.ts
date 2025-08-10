#!/usr/bin/env tsx

/**
 * Standalone MCP Server Script
 * 
 * This script runs the MCP server independently using stdio transport.
 * It can be used by MCP clients like Claude Desktop, Cursor, or other tools.
 * 
 * Usage:
 *   npx tsx scripts/mcp-server.ts
 * 
 * Configuration for Claude Desktop:
 * Add this to your Claude Desktop configuration:
 * 
 * {
 *   "mcpServers": {
 *     "ai-code-generator": {
 *       "command": "npx",
 *       "args": ["-y", "tsx", "scripts/mcp-server.ts"],
 *       "cwd": "/path/to/your/project"
 *     }
 *   }
 * }
 */

import { mcpServer } from '../server/services/mcpServer.js';

async function main() {
  try {
    console.error('Starting AI Code Generator MCP Server...');
    await mcpServer.start();
    console.error('MCP Server is running and ready for connections');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Unhandled error in MCP server:', error);
  process.exit(1);
});