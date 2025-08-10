import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  Tool,
  Prompt,
  Resource,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { LLMService } from './llm.js';
import { storage } from '../storage.js';
import { AnalysisResult, FileStructure } from '@shared/schema.js';

/**
 * MCP Server that exposes LLM capabilities through the Model Context Protocol
 * This allows external MCP clients to access our AI generation capabilities
 */
export class MCPLLMServer {
  private server: Server;
  private llmService: LLMService;

  constructor() {
    this.server = new Server(
      {
        name: 'ai-code-generator-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.llmService = new LLMService();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'ai-config://current',
            name: 'Current AI Configuration',
            description: 'Shows the current AI provider and model configuration',
            mimeType: 'application/json',
          },

          {
            uri: 'ai-providers://list',
            name: 'AI Providers',
            description: 'List of available AI providers and models',
            mimeType: 'application/json',
          },
        ] as Resource[],
      };
    });

    // Get specific resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'ai-config://current':
          try {
            const settings = await storage.getSettings('default');
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  type: 'text',
                  text: JSON.stringify({
                    provider: settings?.aiProvider || 'not configured',
                    model: settings?.aiModel || 'not configured',
                    hasApiKey: !!(settings?.apiKeys && Object.keys(settings.apiKeys).length > 0),
                  }, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  type: 'text',
                  text: JSON.stringify({
                    error: 'No AI configuration found',
                    message: 'Please configure AI provider and API keys',
                  }, null, 2),
                },
              ],
            };
          }

        case 'ai-providers://list':
          try {
            const providers = await storage.getAllAiProviders();
            const providerModels = [];
            
            for (const provider of providers) {
              const models = await storage.getAiModelsByProvider(provider.id);
              providerModels.push({
                ...provider,
                models: models,
              });
            }
            
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  type: 'text',
                  text: JSON.stringify(providerModels, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  type: 'text',
                  text: JSON.stringify({ error: 'Failed to fetch AI providers' }, null, 2),
                },
              ],
            };
          }

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'analyze_prompt',
            description: 'Analyze a user prompt to extract features, pages, and technical requirements',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'The user prompt to analyze',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: 'generate_file_structure',
            description: 'Generate a file structure based on analysis results',
            inputSchema: {
              type: 'object',
              properties: {
                analysis: {
                  type: 'object',
                  description: 'Analysis result object with features, pages, and requirements',
                },
                prompt: {
                  type: 'string',
                  description: 'Original user prompt',
                },
              },
              required: ['analysis', 'prompt'],
            },
          },
          {
            name: 'generate_file_content',
            description: 'Generate content for a specific file',
            inputSchema: {
              type: 'object',
              properties: {
                fileName: {
                  type: 'string',
                  description: 'Name of the file to generate content for',
                },
                requirements: {
                  type: 'string',
                  description: 'Requirements for the file content',
                },
                context: {
                  type: 'object',
                  description: 'Additional context including project structure',
                },
              },
              required: ['fileName', 'requirements'],
            },
          },
          {
            name: 'enhance_prompt',
            description: 'Enhance a user prompt with additional details and context',
            inputSchema: {
              type: 'object',
              properties: {
                originalPrompt: {
                  type: 'string',
                  description: 'The original prompt to enhance',
                },
                context: {
                  type: 'object',
                  description: 'Additional context for enhancement',
                },
              },
              required: ['originalPrompt'],
            },
          },
          {
            name: 'modify_file_content',
            description: 'Modify existing file content based on instructions',
            inputSchema: {
              type: 'object',
              properties: {
                currentContent: {
                  type: 'string',
                  description: 'Current content of the file',
                },
                instructions: {
                  type: 'string',
                  description: 'Instructions for modifying the content',
                },
                fileName: {
                  type: 'string',
                  description: 'Name of the file being modified',
                },
              },
              required: ['currentContent', 'instructions', 'fileName'],
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'analyze_prompt':
            const analysis = await this.llmService.analyzePrompt(args?.prompt || '');
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(analysis, null, 2),
                },
              ],
            };

          case 'generate_file_structure':
            const fileStructure = await this.llmService.generateFileStructure(
              args?.analysis || {},
              args?.prompt || ''
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(fileStructure, null, 2),
                },
              ],
            };

          case 'generate_file_content':
            const content = await this.llmService.generateFileContent(
              args?.fileName || '',
              args?.requirements || {},
              args?.context || {}
            );
            return {
              content: [
                {
                  type: 'text',
                  text: content,
                },
              ],
            };

          case 'enhance_prompt':
            const enhancedPrompt = await this.llmService.enhanceFilePrompt(
              args?.originalPrompt || '',
              'index.html',
              args?.context || {}
            );
            return {
              content: [
                {
                  type: 'text',
                  text: enhancedPrompt,
                },
              ],
            };

          case 'modify_file_content':
            const modifiedContent = await this.llmService.modifyFileContent(
              args?.currentContent || '',
              args?.instructions || '',
              args?.fileName || ''
            );
            return {
              content: [
                {
                  type: 'text',
                  text: modifiedContent,
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            } as TextContent,
          ],
          isError: true,
        } as CallToolResult;
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'web_app_generator',
            description: 'Generate a complete web application based on user requirements',
            arguments: [
              {
                name: 'requirements',
                description: 'User requirements for the web application',
                required: true,
              },
              {
                name: 'complexity',
                description: 'Application complexity level (simple, medium, complex)',
                required: false,
              },
            ],
          },
          {
            name: 'code_enhancement',
            description: 'Enhance existing code with additional features',
            arguments: [
              {
                name: 'code',
                description: 'Existing code to enhance',
                required: true,
              },
              {
                name: 'enhancements',
                description: 'Desired enhancements',
                required: true,
              },
            ],
          },
          {
            name: 'technical_analysis',
            description: 'Analyze technical requirements and suggest architecture',
            arguments: [
              {
                name: 'requirements',
                description: 'Technical requirements to analyze',
                required: true,
              },
            ],
          },
        ] as Prompt[],
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'web_app_generator':
          const complexity = args?.complexity || 'medium';
          return {
            description: `Generate a ${complexity} web application based on requirements`,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Create a ${complexity} web application with the following requirements: ${args?.requirements || 'No requirements specified'}

Please analyze the requirements and generate:
1. Feature list
2. Page structure
3. Technical architecture
4. File structure
5. Implementation details

Focus on modern web development practices and ensure the application is responsive, accessible, and user-friendly.`,
                },
              },
            ],
          };

        case 'code_enhancement':
          return {
            description: 'Enhance existing code with new features',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Enhance the following code with these improvements: ${args?.enhancements || 'No enhancements specified'}

Existing code:
${args?.code || 'No code provided'}

Please provide:
1. Enhanced code
2. Explanation of changes
3. Testing recommendations
4. Performance considerations`,
                },
              },
            ],
          };

        case 'technical_analysis':
          return {
            description: 'Analyze technical requirements and suggest architecture',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Analyze these technical requirements and suggest an appropriate architecture: ${args?.requirements || 'No requirements specified'}

Please provide:
1. Technical analysis
2. Recommended architecture
3. Technology stack suggestions
4. Scalability considerations
5. Security recommendations
6. Performance optimization strategies`,
                },
              },
            ],
          };

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('MCP AI Code Generator Server started');
  }

  /**
   * Get server instance for integration with other systems
   */
  getServer() {
    return this.server;
  }
}

/**
 * Create and export a server instance
 */
export const mcpServer = new MCPLLMServer();

/**
 * Start server if this file is run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  mcpServer.start().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}