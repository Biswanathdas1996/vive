import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Save,
  Zap,
  Brain,
  MessageSquare,
  Key,
  Monitor,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Code2,
  Database,
  Terminal,
  Globe,
  Cpu,
  Network,
  Shield
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";

// Database-driven AI provider and model types
interface AiProvider {
  id: string;
  key: string;
  name: string;
  icon: string;
  description?: string;
  isActive: boolean;
}

interface AiModel {
  id: string;
  providerId: string;
  key: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
}

interface AppSettings {
  aiProvider: string;
  aiModel: string;
  apiKeys: Record<string, string>;
  preferences: {
    theme?: "light" | "dark";
    language?: string;
    autoSave?: boolean;
    showAdvanced?: boolean;
  };
}

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

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Settings state
  const [formData, setFormData] = useState<AppSettings>({
    aiProvider: "gemini",
    aiModel: "gemini-1.5-flash",
    apiKeys: {},
    preferences: {
      theme: "dark",
      language: "en",
      autoSave: true,
      showAdvanced: false,
    },
  });

  const [activeTab, setActiveTab] = useState("models");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);

  // MCP state
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [toolArgs, setToolArgs] = useState<string>("");
  const [selectedResource, setSelectedResource] = useState<string>("");
  const [mcpResult, setMcpResult] = useState<any>(null);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  // Fetch AI providers from database
  const { data: providers = [], isLoading: providersLoading } = useQuery<AiProvider[]>({
    queryKey: ["/api/ai-providers"],
  });

  // Fetch AI models from database
  const { data: models = [], isLoading: modelsLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/ai-models"],
  });

  // Fetch MCP server info
  const { data: mcpInfo, isLoading: mcpInfoLoading } = useQuery<MCPInfo>({
    queryKey: ['/api/mcp/info'],
  });

  // Fetch available resources
  const { data: resourcesData, isLoading: resourcesLoading } = useQuery<{ resources: MCPResource[] }>({
    queryKey: ['/api/mcp/resources'],
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (data: AppSettings) => apiRequest("POST", "/api/settings", data),
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutations for AI provider management
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ai-providers/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Provider deleted",
        description: "AI provider deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-models"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete provider.",
        variant: "destructive",
      });
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ai-models/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Model deleted",
        description: "AI model deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-models"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete model.",
        variant: "destructive",
      });
    },
  });

  // MCP Tool call mutation
  const toolCallMutation = useMutation({
    mutationFn: async ({ name, arguments: args }: { name: string; arguments: any }) => {
      const response = await fetch('/api/mcp/tools/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, arguments: args }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }
      
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => setMcpResult(data),
    onError: (error) => setMcpResult({ error: error.message }),
  });

  // MCP Resource fetch mutation
  const resourceMutation = useMutation({
    mutationFn: async (uri: string) => {
      const encodedUri = encodeURIComponent(uri);
      const response = await fetch(`/api/mcp/resources/fetch?uri=${encodedUri}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }
      
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => setMcpResult(data),
    onError: (error) => setMcpResult({ error: error.message }),
  });

  // Form schemas
  const providerFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    key: z.string().min(1, "Key is required"),
    icon: z.string().min(1, "Icon is required"),
  });

  const modelFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    key: z.string().min(1, "Key is required"),
    description: z.string().min(1, "Description is required"),
    providerId: z.string().min(1, "Please select a provider"),
    isDefault: z.boolean().default(false),
  });

  // Forms
  const providerForm = useForm<z.infer<typeof providerFormSchema>>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: { name: "", key: "", icon: "" },
  });

  const modelForm = useForm<z.infer<typeof modelFormSchema>>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      providerId: "",
      isDefault: false,
    },
  });

  // Create mutations with form handling
  const createProviderMutation = useMutation({
    mutationFn: async (data: z.infer<typeof providerFormSchema>) => {
      return apiRequest("POST", "/api/ai-providers", data);
    },
    onSuccess: () => {
      toast({
        title: "Provider added",
        description: "AI provider created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      setShowAddProvider(false);
      providerForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create provider.",
        variant: "destructive",
      });
    },
  });

  const updateProviderMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string } & z.infer<typeof providerFormSchema>) => {
      return apiRequest("PUT", `/api/ai-providers/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Provider updated",
        description: "AI provider updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      setEditingProvider(null);
      providerForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update provider.",
        variant: "destructive",
      });
    },
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: z.infer<typeof modelFormSchema>) => {
      return apiRequest("POST", "/api/ai-models", data);
    },
    onSuccess: () => {
      toast({
        title: "Model added",
        description: "AI model created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-models"] });
      setShowAddModel(false);
      modelForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create model.",
        variant: "destructive",
      });
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: { id: string } & z.infer<typeof modelFormSchema>) => {
      return apiRequest("PUT", `/api/ai-models/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Model updated",
        description: "AI model updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-models"] });
      setEditingModel(null);
      modelForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update model.",
        variant: "destructive",
      });
    },
  });

  // Handle editing
  useEffect(() => {
    if (editingProvider) {
      providerForm.reset({
        name: editingProvider.name,
        key: editingProvider.key,
        icon: editingProvider.icon,
      });
    }
  }, [editingProvider, providerForm]);

  useEffect(() => {
    if (editingModel) {
      modelForm.reset({
        name: editingModel.name,
        key: editingModel.key,
        description: editingModel.description,
        providerId: editingModel.providerId,
        isDefault: editingModel.isDefault,
      });
    }
  }, [editingModel]);

  const handleProviderChange = (providerKey: string) => {
    const provider = providers.find((p) => p.key === providerKey);
    if (!provider) return;

    const providerModels = models.filter((m) => m.providerId === provider.id);
    const defaultModel =
      providerModels.find((m) => m.isDefault)?.key ||
      providerModels[0]?.key ||
      "";

    setFormData((prev) => ({
      ...prev,
      aiProvider: providerKey,
      aiModel: defaultModel,
    }));
  };

  const handleApiKeyChange = (provider: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [provider]: value,
      },
    }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const getProviderStatus = (providerKey: string) => {
    const hasApiKey = formData.apiKeys[providerKey];
    const isSelected = formData.aiProvider === providerKey;

    if (isSelected && hasApiKey)
      return { status: "active", color: "bg-green-500" };
    if (hasApiKey) return { status: "configured", color: "bg-blue-500" };
    return { status: "inactive", color: "bg-gray-500" };
  };

  // MCP Tool handling
  const handleToolCall = () => {
    if (!selectedTool || !toolArgs.trim()) return;
    
    try {
      const args = JSON.parse(toolArgs);
      toolCallMutation.mutate({ name: selectedTool, arguments: args });
    } catch (error) {
      setMcpResult({ error: 'Invalid JSON in arguments' });
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

  // Get current provider and its models
  const currentProvider = providers.find((p) => p.key === formData.aiProvider);
  const currentProviderModels = currentProvider
    ? models.filter((m) => m.providerId === currentProvider.id)
    : [];
  const currentModel = currentProviderModels.find(
    (m) => m.key === formData.aiModel,
  );

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

  if (isLoading || providersLoading || modelsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-purple-500" />
              <div>
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <p className="text-slate-400">
                  Manage AI models, settings, and MCP server configuration
                </p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700">
                Back to App
              </Button>
            </Link>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-6 bg-slate-800">
            <TabsTrigger value="models" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>AI Models</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>AI Management</span>
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>API Keys</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="mcp-tools" className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>MCP Tools</span>
            </TabsTrigger>
            <TabsTrigger value="mcp-server" className="flex items-center space-x-2">
              <Network className="w-4 h-4" />
              <span>MCP Server</span>
            </TabsTrigger>
          </TabsList>

          {/* AI Models Tab */}
          <TabsContent value="models" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span>AI Provider & Model Selection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Selection */}
                <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">
                      Current Configuration
                    </Label>
                    <Badge
                      variant="secondary"
                      className="bg-green-600 text-white"
                    >
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {currentProvider?.icon || "🤖"}
                    </span>
                    <div>
                      <p className="font-medium">
                        {currentProvider?.name || "No Provider Selected"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {currentModel?.name || "No Model Selected"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Provider Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Select AI Provider
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {providers.map((provider) => {
                      const status = getProviderStatus(provider.key);
                      const isSelected = formData.aiProvider === provider.key;
                      const providerModels = models.filter(
                        (m) => m.providerId === provider.id,
                      );

                      return (
                        <Card
                          key={provider.id}
                          className={`cursor-pointer transition-colors border-2 ${
                            isSelected
                              ? "border-blue-500 bg-slate-800"
                              : "border-slate-600 bg-slate-900 hover:border-slate-500"
                          }`}
                          onClick={() => handleProviderChange(provider.key)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl">{provider.icon}</span>
                              <div
                                className={`w-3 h-3 rounded-full ${status.color}`}
                              />
                            </div>
                            <h3 className="font-semibold mb-1">
                              {provider.name}
                            </h3>
                            <p className="text-xs text-slate-400 mb-2">
                              {providerModels.length} models available
                            </p>
                            <Badge
                              variant={isSelected ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {isSelected ? "Active" : status.status}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Model Selection */}
                {currentProviderModels.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium">
                      Select Model for {currentProvider?.name}
                    </Label>
                    <Select
                      value={formData.aiModel}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          aiModel: value,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {currentProviderModels.map((model) => (
                          <SelectItem key={model.id} value={model.key}>
                            <div className="flex items-center space-x-2">
                              <span>{model.name}</span>
                              {model.isDefault && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-blue-600"
                                >
                                  Default
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentModel && (
                      <p className="text-sm text-slate-400">
                        {currentModel.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Management Tab */}
          <TabsContent value="management" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Providers Management */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>AI Providers</span>
                    <Button
                      size="sm"
                      onClick={() => setShowAddProvider(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Provider
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{provider.icon}</span>
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-xs text-slate-400">{provider.key}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingProvider(provider)}
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteProviderMutation.mutate(provider.id)}
                          className="border-red-600 text-red-400 hover:bg-red-900"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Models Management */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>AI Models</span>
                    <Button
                      size="sm"
                      onClick={() => setShowAddModel(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Model
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-64">
                    {models.map((model) => {
                      const provider = providers.find((p) => p.id === model.providerId);
                      return (
                        <div
                          key={model.id}
                          className="flex items-center justify-between p-3 bg-slate-800 rounded-lg mb-2"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{provider?.icon}</span>
                            <div>
                              <p className="font-medium">{model.name}</p>
                              <p className="text-xs text-slate-400">
                                {model.key} • {provider?.name}
                              </p>
                            </div>
                            {model.isDefault && (
                              <Badge variant="secondary" className="text-xs bg-blue-600">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingModel(model)}
                              className="border-slate-600 hover:bg-slate-700"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteModelMutation.mutate(model.id)}
                              className="border-red-600 text-red-400 hover:bg-red-900"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  <span>API Key Management</span>
                </CardTitle>
                <CardDescription>
                  Configure API keys for each AI provider. Keys are securely stored and required for AI functionality.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {providers.map((provider) => {
                  const status = getProviderStatus(provider.key);
                  return (
                    <div
                      key={provider.id}
                      className="p-4 bg-slate-800 rounded-lg border border-slate-600"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{provider.icon}</span>
                          <div>
                            <h3 className="font-semibold">{provider.name}</h3>
                            <p className="text-sm text-slate-400">
                              Provider Key: {provider.key}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${status.color}`}
                          />
                          <span className="text-sm capitalize">
                            {status.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          API Key
                        </Label>
                        <Input
                          type="password"
                          placeholder={`Enter ${provider.name} API key...`}
                          value={formData.apiKeys[provider.key] || ""}
                          onChange={(e) =>
                            handleApiKeyChange(provider.key, e.target.value)
                          }
                          className="bg-slate-900 border-slate-600 text-slate-300"
                        />
                        <p className="text-xs text-slate-500">
                          Required for using {provider.name} models
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveSettingsMutation.isPending ? "Saving..." : "Save API Keys"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="w-5 h-5 text-blue-500" />
                  <span>Application Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Theme</Label>
                      <Select
                        value={formData.preferences.theme}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              theme: value as "light" | "dark",
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Language</Label>
                      <Select
                        value={formData.preferences.language}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              language: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Auto Save</Label>
                        <p className="text-xs text-slate-400">
                          Automatically save changes
                        </p>
                      </div>
                      <Switch
                        checked={formData.preferences.autoSave}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              autoSave: checked,
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          Show Advanced Options
                        </Label>
                        <p className="text-xs text-slate-400">
                          Display advanced configuration options
                        </p>
                      </div>
                      <Switch
                        checked={formData.preferences.showAdvanced}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              showAdvanced: checked,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saveSettingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveSettingsMutation.isPending ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Tools Tab */}
          <TabsContent value="mcp-tools" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tool Selection */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5" />
                    Available MCP Tools
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
                          className="min-h-32 font-mono text-sm bg-slate-800 border-slate-600"
                        />
                        <Button 
                          onClick={handleToolCall}
                          disabled={!selectedTool || !toolArgs.trim() || toolCallMutation.isPending}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          {toolCallMutation.isPending ? 'Calling Tool...' : 'Call Tool'}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Results */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle>Tool Results</CardTitle>
                  <CardDescription>Tool execution results and resource content</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96 w-full border rounded-md p-4 bg-slate-800">
                    {mcpResult ? (
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {JSON.stringify(mcpResult, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-muted-foreground">No results yet. Call a tool or fetch a resource to see output here.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MCP Server Tab */}
          <TabsContent value="mcp-server" className="space-y-6">
            {/* Server Status */}
            <Card className="bg-slate-900 border-slate-700">
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
                        <strong>Note:</strong> The MCP server requires valid AI configuration to process tool calls.
                        Make sure you have configured your AI provider and API keys in the settings above.
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

            {/* MCP Resources */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  MCP Resources
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
                        <p className="text-xs text-slate-500 mt-1">URI: {resource.uri}</p>
                      </div>
                    ))}
                    {selectedResource && (
                      <div className="pt-3">
                        <Button 
                          onClick={handleResourceFetch}
                          disabled={!selectedResource || resourceMutation.isPending}
                          className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                          {resourceMutation.isPending ? 'Fetching Resource...' : 'Fetch Resource'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No MCP resources available</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Integration Instructions */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  MCP Integration Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Standalone Server</h4>
                    <div className="bg-slate-800 rounded p-3 font-mono text-sm">
                      npx tsx scripts/mcp-server.ts
                    </div>
                    <p className="text-sm text-slate-400">
                      Run the standalone MCP server for external tool integration
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">HTTP API</h4>
                    <div className="bg-slate-800 rounded p-3 font-mono text-sm">
                      POST /api/mcp/tools/call
                    </div>
                    <p className="text-sm text-slate-400">
                      Access MCP tools through REST API endpoints
                    </p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <h4 className="font-medium mb-2">Claude Desktop Integration</h4>
                  <div className="bg-slate-800 rounded p-4 font-mono text-sm">
                    <div className="text-slate-400 mb-2">// claude_desktop_config.json</div>
                    <pre>{`{
  "mcpServers": {
    "agentcode": {
      "command": "npx",
      "args": ["tsx", "scripts/mcp-server.ts"],
      "cwd": "/path/to/agentcode"
    }
  }
}`}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Provider Form Dialog */}
        <Dialog open={showAddProvider || !!editingProvider} onOpenChange={(open) => {
          if (!open) {
            setShowAddProvider(false);
            setEditingProvider(null);
            providerForm.reset();
          }
        }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? "Edit Provider" : "Add AI Provider"}
              </DialogTitle>
              <DialogDescription>
                {editingProvider ? "Update the AI provider details" : "Add a new AI provider to the system"}
              </DialogDescription>
            </DialogHeader>
            <Form {...providerForm}>
              <form onSubmit={providerForm.handleSubmit((data) => {
                if (editingProvider) {
                  updateProviderMutation.mutate({ id: editingProvider.id, ...data });
                } else {
                  createProviderMutation.mutate(data);
                }
              })} className="space-y-4">
                <FormField
                  control={providerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-slate-800 border-slate-600" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={providerForm.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Key</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-slate-800 border-slate-600" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={providerForm.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon (emoji)</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-slate-800 border-slate-600" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createProviderMutation.isPending || updateProviderMutation.isPending}>
                    {editingProvider ? "Update" : "Create"} Provider
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Model Form Dialog */}
        <Dialog open={showAddModel || !!editingModel} onOpenChange={(open) => {
          if (!open) {
            setShowAddModel(false);
            setEditingModel(null);
            modelForm.reset();
          }
        }}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? "Edit Model" : "Add AI Model"}
              </DialogTitle>
              <DialogDescription>
                {editingModel ? "Update the AI model details" : "Add a new AI model to the system"}
              </DialogDescription>
            </DialogHeader>
            <Form {...modelForm}>
              <form onSubmit={modelForm.handleSubmit((data) => {
                if (editingModel) {
                  updateModelMutation.mutate({ id: editingModel.id, ...data });
                } else {
                  createModelMutation.mutate(data);
                }
              })} className="space-y-4">
                <FormField
                  control={modelForm.control}
                  name="providerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Provider</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-800 border-slate-600">
                            <SelectValue placeholder="Select a provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {providers.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.icon} {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={modelForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-slate-800 border-slate-600" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={modelForm.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Key</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-slate-800 border-slate-600" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={modelForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="bg-slate-800 border-slate-600" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={modelForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-600 p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Default Model</FormLabel>
                        <div className="text-sm text-slate-400">
                          Set as the default model for this provider
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createModelMutation.isPending || updateModelMutation.isPending}>
                    {editingModel ? "Update" : "Create"} Model
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}