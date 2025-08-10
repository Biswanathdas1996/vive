# MCP Server Integration

This project now includes a complete **Model Context Protocol (MCP)** server that exposes the AI code generation capabilities through a standardized protocol. This allows external tools like Claude Desktop, Cursor, Windsurf, and other MCP clients to directly access our LLM services.

## What is MCP?

Model Context Protocol (MCP) is an open protocol that enables secure connections between host applications (like Claude Desktop) and local services. It provides a standardized way to expose tools, resources, and prompts to Large Language Models.

## Features

### 🛠️ **Tools Available**
- **`analyze_prompt`** - Analyze user requirements and extract features, pages, and technical specifications
- **`generate_file_structure`** - Create complete file structures based on analysis results
- **`generate_file_content`** - Generate HTML content for specific files with modern web standards
- **`enhance_prompt`** - Enhance user prompts with detailed UI specifications
- **`modify_file_content`** - Modify existing file content based on instructions

### 📚 **Resources Available**
- **`ai-config://current`** - Current AI provider and model configuration
- **`ai-providers://list`** - List of available AI providers and models with capabilities

### 🎯 **Prompts Available**
- **`web_app_generator`** - Generate complete web applications based on requirements
- **`code_enhancement`** - Enhance existing code with additional features
- **`technical_analysis`** - Analyze technical requirements and suggest architecture

## Usage Options

### Option 1: Standalone MCP Server (Recommended)

Run the MCP server independently for use with external MCP clients:

```bash
# Start the MCP server
npx tsx scripts/mcp-server.ts
```

### Option 2: HTTP API Integration

Access MCP capabilities through HTTP endpoints while the main application is running:

```bash
# Start the main application (includes MCP HTTP endpoints)
npm run dev
```

#### Available HTTP Endpoints:
- `GET /api/mcp/info` - Server information and capabilities
- `POST /api/mcp/tools/call` - Call MCP tools
- `GET /api/mcp/resources` - List available resources
- `GET /api/mcp/resources/:uri` - Get specific resource content

## Configuration for MCP Clients

### Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-code-generator": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/your/project/scripts/mcp-server.ts"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### Cursor/Windsurf Configuration

Similar configuration can be used for other MCP-compatible editors.

## Example Usage

### 1. Analyze a User Prompt

```bash
# Via HTTP API
curl -X POST http://localhost:5000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "analyze_prompt",
    "arguments": {
      "prompt": "Create a modern e-commerce website with shopping cart"
    }
  }'
```

### 2. Generate File Structure

```bash
curl -X POST http://localhost:5000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "generate_file_structure",
    "arguments": {
      "analysis": {
        "features": ["shopping cart", "product catalog", "user auth"],
        "pages": ["index.html", "products.html", "cart.html"],
        "technical_requirements": {"responsive": true, "modern": true}
      },
      "prompt": "Create a modern e-commerce website"
    }
  }'
```

### 3. Get AI Configuration

```bash
curl http://localhost:5000/api/mcp/resources/ai-config/current
```

## Integration Benefits

### For Developers:
- **Standardized Protocol**: Use industry-standard MCP for tool integration
- **Multiple Access Methods**: HTTP API for web integration, stdio for desktop tools
- **Rich Capabilities**: Access to full LLM pipeline including analysis, generation, and enhancement
- **Real-time Configuration**: Dynamic AI provider and model selection

### For AI Tools:
- **Contextual Generation**: Access to project context and existing configurations
- **Multi-Provider Support**: Works with Gemini, OpenAI, and Claude models
- **Structured Outputs**: Well-defined JSON schemas for reliable integration
- **Resource Discovery**: Programmatic access to available capabilities

## Technical Architecture

The MCP implementation consists of:

1. **MCP Server** (`server/services/mcpServer.ts`) - Core MCP protocol implementation
2. **MCP Client** (`server/services/mcpClient.ts`) - Internal client for HTTP API integration
3. **Standalone Script** (`scripts/mcp-server.ts`) - Independent server for external tools
4. **HTTP Endpoints** (`server/routes.ts`) - REST API wrapper for web access

## Security Considerations

- API keys are stored securely in the database
- MCP server validates all inputs before processing
- Resource access is controlled and authenticated
- Error handling prevents information leakage

## Troubleshooting

### Common Issues:

1. **Server Not Starting**
   - Ensure database is configured and accessible
   - Check that AI provider API keys are set in settings
   - Verify TypeScript dependencies are installed

2. **Tools Not Working**
   - Check that AI configuration is complete in `/api/settings`
   - Verify the selected AI provider has valid API keys
   - Review server logs for specific error messages

3. **Client Connection Issues**
   - Ensure the stdio transport is working correctly
   - Check file paths in MCP client configuration
   - Verify permissions for script execution

### Debugging:

```bash
# Check MCP server status
curl http://localhost:5000/api/mcp/info

# Test tool functionality
curl -X POST http://localhost:5000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name": "analyze_prompt", "arguments": {"prompt": "test"}}'

# View available resources
curl http://localhost:5000/api/mcp/resources
```

## Future Enhancements

- **Real-time Collaboration**: Live updates to connected MCP clients
- **Custom Tool Registration**: Allow dynamic tool addition through API
- **Advanced Security**: OAuth integration and fine-grained permissions
- **Performance Optimization**: Caching and connection pooling
- **Multi-language Support**: SDKs for Python, Go, and other languages

This MCP integration transforms your AI code generator into a powerful, standardized service that can be accessed by any MCP-compatible tool, significantly expanding its usability and integration potential.