import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Code2, Database, Zap, Terminal, Globe, Cpu } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";

interface MCPInfo {
  name: string;
  version: string;
  capabilities: {
    resources: boolean;
    tools: boolean;
    prompts: boolean;
  };
  status: string;
  description: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export default function MCPPage() {
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [toolArgs, setToolArgs] = useState<string>("");
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [result, setResult] = useState<any>(null);

  // Fetch MCP server info
  const { data: mcpInfo, isLoading: mcpInfoLoading } = useQuery<MCPInfo>({
    queryKey: ['/api/mcp/info'],
  });

  // Fetch available resources
  const { data: resourcesData, isLoading: resourcesLoading } = useQuery<{ resources: MCPResource[] }>({
    queryKey: ['/api/mcp/resources'],
  });

  // Tool call mutation
  const toolCallMutation = useMutation({
    mutationFn: async ({ name, arguments: args }: { name: string; arguments: any }) => {
      const response = await fetch('/api/mcp/tools/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, arguments: args }),
      });
      const data = await response.json();
      
      // Return both successful and error responses to display to user
      return data;
    },
    onSuccess: (data) => setResult(data),
    onError: (error) => setResult({ error: error.message }),
  });

  // Resource fetch mutation
  const resourceMutation = useMutation({
    mutationFn: async (uri: string) => {
      const cleanUri = uri.replace('://', '/');
      const response = await fetch(`/api/mcp/resources/${cleanUri}`);
      const data = await response.json();
      
      // Return both successful and error responses to display to user
      return data;
    },
    onSuccess: (data) => setResult(data),
    onError: (error) => setResult({ error: error.message }),
  });

  const handleToolCall = () => {
    if (!selectedTool || !toolArgs.trim()) return;
    
    try {
      const args = JSON.parse(toolArgs);
      toolCallMutation.mutate({ name: selectedTool, arguments: args });
    } catch (error) {
      setResult({ error: 'Invalid JSON in arguments' });
    }
  };

  const handleResourceFetch = () => {
    if (!selectedResource) return;
    resourceMutation.mutate(selectedResource);
  };

  // Get example JSON for each tool
  const getToolExampleJson = (toolName: string): string => {
    const examples = {
      'analyze_prompt': {
        "prompt": "Create a modern e-commerce website with shopping cart and user authentication"
      },
      'generate_file_structure': {
        "analysis": {
          "features": ["shopping cart", "user auth", "product catalog"],
          "pages": ["index.html", "products.html", "cart.html"],
          "technical_requirements": {"responsive": true}
        },
        "prompt": "Create a modern e-commerce website"
      },
      'generate_file_content': {
        "fileName": "index.html",
        "requirements": "Modern homepage with hero section, navigation, and footer",
        "context": {"theme": "professional", "colors": "blue and white"}
      },
      'enhance_prompt': {
        "originalPrompt": "Create a blog website",
        "context": {"style": "modern", "features": ["comments", "search"]}
      },
      'modify_file_content': {
        "currentContent": "<html><head><title>My Site</title></head><body><h1>Welcome</h1></body></html>",
        "instructions": "Add a contact form section with email and message fields",
        "fileName": "index.html"
      }
    };
    
    return JSON.stringify(examples[toolName as keyof typeof examples] || {}, null, 2);
  };

  // Auto-populate textarea when tool selection changes
  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
    setToolArgs(getToolExampleJson(toolName));
  };

  const tools: MCPTool[] = [
    {
      name: "analyze_prompt",
      description: "Analyze a user prompt to extract features, pages, and technical requirements",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "The user prompt to analyze" }
        },
        required: ["prompt"]
      }
    },
    {
      name: "generate_file_structure",
      description: "Generate a file structure based on analysis results",
      inputSchema: {
        type: "object",
        properties: {
          analysis: { type: "object", description: "Analysis result object" },
          prompt: { type: "string", description: "Original user prompt" }
        },
        required: ["analysis", "prompt"]
      }
    },
    {
      name: "generate_file_content",
      description: "Generate content for a specific file",
      inputSchema: {
        type: "object",
        properties: {
          fileName: { type: "string", description: "Name of the file" },
          requirements: { type: "string", description: "Requirements for the file" },
          context: { type: "object", description: "Additional context" }
        },
        required: ["fileName", "requirements"]
      }
    },
    {
      name: "enhance_prompt",
      description: "Enhance a user prompt with additional details and context",
      inputSchema: {
        type: "object",
        properties: {
          originalPrompt: { type: "string", description: "The original prompt to enhance" },
          context: { type: "object", description: "Additional context for enhancement" }
        },
        required: ["originalPrompt"]
      }
    },
    {
      name: "modify_file_content",
      description: "Modify existing file content based on instructions",
      inputSchema: {
        type: "object",
        properties: {
          currentContent: { type: "string", description: "Current content of the file" },
          instructions: { type: "string", description: "Instructions for modifying the content" },
          fileName: { type: "string", description: "Name of the file being modified" }
        },
        required: ["currentContent", "instructions", "fileName"]
      }
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
          MCP Server Integration
        </h1>
        <p className="text-lg text-muted-foreground">
          Model Context Protocol server that exposes AI capabilities to external tools
        </p>
      </div>

      {/* Server Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            MCP Server Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mcpInfoLoading ? (
            <div className="animate-pulse">Loading server info...</div>
          ) : mcpInfo ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Server Status</p>
                  <Badge variant={mcpInfo.status === 'running' ? 'default' : 'destructive'}>
                    {mcpInfo.status === 'running' ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                    {mcpInfo.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Version</p>
                  <p className="text-sm text-muted-foreground">{mcpInfo.version}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Capabilities</p>
                  <div className="flex gap-1 flex-wrap">
                    {mcpInfo.capabilities.tools && <Badge variant="outline">Tools</Badge>}
                    {mcpInfo.capabilities.resources && <Badge variant="outline">Resources</Badge>}
                    {mcpInfo.capabilities.prompts && <Badge variant="outline">Prompts</Badge>}
                  </div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> To use MCP tools, first configure your AI provider and API keys in the{" "}
                  <Link href="/settings" className="text-primary hover:underline">Settings</Link> page.
                  The MCP server requires valid AI configuration to process tool calls.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Unable to connect to MCP server</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="tools" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Integration
          </TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tool Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Available Tools
                </CardTitle>
                <CardDescription>
                  Select a tool and provide arguments to test MCP functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {tools.map((tool) => (
                    <div
                      key={tool.name}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTool === tool.name
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleToolSelect(tool.name)}
                    >
                      <h4 className="font-medium">{tool.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                    </div>
                  ))}
                </div>
                
                {selectedTool && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Arguments (JSON)</label>
                      <Textarea
                        placeholder="Select a tool above to see example arguments"
                        value={toolArgs}
                        onChange={(e) => setToolArgs(e.target.value)}
                        className="min-h-32 font-mono text-sm"
                      />
                      <Button 
                        onClick={handleToolCall}
                        disabled={!selectedTool || !toolArgs.trim() || toolCallMutation.isPending}
                        className="w-full"
                      >
                        {toolCallMutation.isPending ? 'Calling Tool...' : 'Call Tool'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>Tool execution results and resource content</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full border rounded-md p-4">
                  {result ? (
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">No results yet. Call a tool or fetch a resource to see output here.</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Available Resources
                </CardTitle>
                <CardDescription>
                  Access configuration and system information through MCP resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resourcesLoading ? (
                  <div className="animate-pulse">Loading resources...</div>
                ) : resourcesData?.resources ? (
                  <div className="space-y-3">
                    {resourcesData.resources.map((resource) => (
                      <div
                        key={resource.uri}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedResource === resource.uri
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedResource(resource.uri)}
                      >
                        <h4 className="font-medium">{resource.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {resource.uri}
                        </Badge>
                      </div>
                    ))}
                    <Button 
                      onClick={handleResourceFetch}
                      disabled={!selectedResource || resourceMutation.isPending}
                      className="w-full mt-4"
                    >
                      {resourceMutation.isPending ? 'Fetching...' : 'Fetch Resource'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No resources available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Content</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full border rounded-md p-4">
                  {result ? (
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">Select and fetch a resource to view its content.</p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Integration Guide
              </CardTitle>
              <CardDescription>
                How to integrate this MCP server with external tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Claude Desktop Configuration</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm mb-2">Add to your Claude Desktop config file:</p>
                  <pre className="text-xs font-mono bg-background p-3 rounded border overflow-x-auto">
{`{
  "mcpServers": {
    "ai-code-generator": {
      "command": "npx",
      "args": ["-y", "tsx", "scripts/mcp-server.ts"],
      "cwd": "/path/to/your/project"
    }
  }
}`}
                  </pre>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Standalone Server</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm mb-2">Run the MCP server independently:</p>
                  <pre className="text-xs font-mono bg-background p-3 rounded border">
npx tsx scripts/mcp-server.ts
                  </pre>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">HTTP API Endpoints</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/mcp/info</code>
                    <span className="text-muted-foreground">- Server information</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">POST</Badge>
                    <code>/api/mcp/tools/call</code>
                    <span className="text-muted-foreground">- Call MCP tools</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">GET</Badge>
                    <code>/api/mcp/resources</code>
                    <span className="text-muted-foreground">- List resources</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}