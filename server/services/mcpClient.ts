import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  CallToolRequest,
  GetResourceRequest,
  GetPromptRequest,
  ListResourcesRequest,
  ListToolsRequest,
  ListPromptsRequest,
  CallToolResult,
  GetResourceResult,
  GetPromptResult,
  ListResourcesResult,
  ListToolsResult,
  ListPromptsResult,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';

/**
 * MCP Client that connects to our MCP LLM Server
 * This allows internal services to use MCP protocol for AI operations
 */
export class MCPLLMClient {
  private client: Client;
  private transport?: StdioClientTransport;
  private connected: boolean = false;

  constructor() {
    this.client = new Client(
      {
        name: 'ai-code-generator-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Spawn the MCP server process
      const serverProcess = spawn('tsx', ['server/services/mcpServer.ts'], {
        stdio: ['pipe', 'pipe', 'inherit'],
        cwd: process.cwd(),
      });

      // Create stdio transport
      this.transport = new StdioClientTransport({
        readable: serverProcess.stdout,
        writable: serverProcess.stdin,
      });

      // Connect client to server
      await this.client.connect(this.transport);
      this.connected = true;
      
      console.log('MCP Client connected to LLM server');
    } catch (error) {
      console.error('Failed to connect MCP client:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.connected = false;
      console.log('MCP Client disconnected');
    }
  }

  /**
   * Ensure the client is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * List available resources
   */
  async listResources(): Promise<ListResourcesResult> {
    await this.ensureConnected();
    return await this.client.request(
      { method: 'resources/list' },
      ListResourcesRequest
    );
  }

  /**
   * Get a specific resource
   */
  async getResource(uri: string): Promise<GetResourceResult> {
    await this.ensureConnected();
    return await this.client.request(
      {
        method: 'resources/read',
        params: { uri },
      },
      GetResourceRequest
    );
  }

  /**
   * List available tools
   */
  async listTools(): Promise<ListToolsResult> {
    await this.ensureConnected();
    return await this.client.request(
      { method: 'tools/list' },
      ListToolsRequest
    );
  }

  /**
   * Call a tool
   */
  async callTool(name: string, arguments_: any): Promise<CallToolResult> {
    await this.ensureConnected();
    return await this.client.request(
      {
        method: 'tools/call',
        params: {
          name,
          arguments: arguments_,
        },
      },
      CallToolRequest
    );
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<ListPromptsResult> {
    await this.ensureConnected();
    return await this.client.request(
      { method: 'prompts/list' },
      ListPromptsRequest
    );
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, arguments_?: any): Promise<GetPromptResult> {
    await this.ensureConnected();
    return await this.client.request(
      {
        method: 'prompts/get',
        params: {
          name,
          arguments: arguments_,
        },
      },
      GetPromptRequest
    );
  }

  /**
   * High-level convenience methods
   */

  /**
   * Analyze a user prompt using MCP
   */
  async analyzePrompt(prompt: string): Promise<any> {
    const result = await this.callTool('analyze_prompt', { prompt });
    if (result.isError) {
      throw new Error(`Analysis failed: ${result.content[0]?.text || 'Unknown error'}`);
    }
    return JSON.parse(result.content[0]?.text || '{}');
  }

  /**
   * Generate file structure using MCP
   */
  async generateFileStructure(analysis: any, prompt: string): Promise<any> {
    const result = await this.callTool('generate_file_structure', { analysis, prompt });
    if (result.isError) {
      throw new Error(`File structure generation failed: ${result.content[0]?.text || 'Unknown error'}`);
    }
    return JSON.parse(result.content[0]?.text || '{}');
  }

  /**
   * Generate file content using MCP
   */
  async generateFileContent(fileName: string, requirements: string, context?: any): Promise<string> {
    const result = await this.callTool('generate_file_content', { 
      fileName, 
      requirements, 
      context 
    });
    if (result.isError) {
      throw new Error(`File content generation failed: ${result.content[0]?.text || 'Unknown error'}`);
    }
    return result.content[0]?.text || '';
  }

  /**
   * Enhance a prompt using MCP
   */
  async enhancePrompt(originalPrompt: string, context?: any): Promise<string> {
    const result = await this.callTool('enhance_prompt', { originalPrompt, context });
    if (result.isError) {
      throw new Error(`Prompt enhancement failed: ${result.content[0]?.text || 'Unknown error'}`);
    }
    return result.content[0]?.text || '';
  }

  /**
   * Modify file content using MCP
   */
  async modifyFileContent(currentContent: string, instructions: string, fileName: string): Promise<string> {
    const result = await this.callTool('modify_file_content', { 
      currentContent, 
      instructions, 
      fileName 
    });
    if (result.isError) {
      throw new Error(`File modification failed: ${result.content[0]?.text || 'Unknown error'}`);
    }
    return result.content[0]?.text || '';
  }

  /**
   * Get current AI configuration
   */
  async getAIConfig(): Promise<any> {
    const result = await this.getResource('ai-config://current');
    return JSON.parse(result.contents[0]?.text || '{}');
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<any[]> {
    const result = await this.getResource('projects://list');
    return JSON.parse(result.contents[0]?.text || '[]');
  }

  /**
   * Get AI providers and models
   */
  async getAIProviders(): Promise<any[]> {
    const result = await this.getResource('ai-providers://list');
    return JSON.parse(result.contents[0]?.text || '[]');
  }
}

/**
 * Singleton MCP client instance
 */
export const mcpClient = new MCPLLMClient();

/**
 * Graceful shutdown handler
 */
process.on('SIGINT', async () => {
  await mcpClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mcpClient.disconnect();
  process.exit(0);
});