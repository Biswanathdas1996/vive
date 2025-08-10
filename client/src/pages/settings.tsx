import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Zap, Brain, MessageSquare, Key, Monitor, Plus, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const [formData, setFormData] = useState<AppSettings>({
    aiProvider: "gemini",
    aiModel: "gemini-1.5-flash",
    apiKeys: {},
    preferences: {
      theme: "dark",
      language: "en",
      autoSave: true,
      showAdvanced: false
    }
  });

  const [activeTab, setActiveTab] = useState("models");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);

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
    mutationFn: async (id: number) => {
      return apiRequest(`/api/ai-providers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Provider deleted", description: "AI provider deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-models"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to delete provider.", variant: "destructive" });
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/ai-models/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Model deleted", description: "AI model deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-models"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to delete model.", variant: "destructive" });
    },
  });

  const handleProviderChange = (providerKey: string) => {
    const provider = providers.find(p => p.key === providerKey);
    if (!provider) return;
    
    const providerModels = models.filter(m => m.providerId === provider.id);
    const defaultModel = providerModels.find(m => m.isDefault)?.key || providerModels[0]?.key || "";
    
    setFormData(prev => ({
      ...prev,
      aiProvider: providerKey,
      aiModel: defaultModel
    }));
  };

  const handleApiKeyChange = (provider: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [provider]: value
      }
    }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const getProviderStatus = (providerKey: string) => {
    const hasApiKey = formData.apiKeys[providerKey];
    const isSelected = formData.aiProvider === providerKey;
    
    if (isSelected && hasApiKey) return { status: "active", color: "bg-green-500" };
    if (hasApiKey) return { status: "configured", color: "bg-blue-500" };
    return { status: "inactive", color: "bg-gray-500" };
  };

  // Get current provider and its models
  const currentProvider = providers.find(p => p.key === formData.aiProvider);
  const currentProviderModels = currentProvider ? models.filter(m => m.providerId === currentProvider.id) : [];
  const currentModel = currentProviderModels.find(m => m.key === formData.aiModel);

  if (isLoading || providersLoading || modelsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>
          <p className="text-slate-400">Configure AI models and application preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
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
                    <Label className="text-sm font-medium">Current Configuration</Label>
                    <Badge variant="secondary" className="bg-green-600 text-white">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{currentProvider?.icon || "🤖"}</span>
                    <div>
                      <p className="font-medium">{currentProvider?.name || "No Provider Selected"}</p>
                      <p className="text-sm text-slate-400">
                        {currentModel?.name || "No Model Selected"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Provider Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Select AI Provider</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {providers.map((provider) => {
                      const status = getProviderStatus(provider.key);
                      const isSelected = formData.aiProvider === provider.key;
                      const providerModels = models.filter(m => m.providerId === provider.id);
                      
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
                              <div className={`w-3 h-3 rounded-full ${status.color}`} />
                            </div>
                            <h3 className="font-semibold mb-1">{provider.name}</h3>
                            <p className="text-xs text-slate-400">
                              {providerModels.length} models available
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Select Model</Label>
                  <Select value={formData.aiModel} onValueChange={(value) => setFormData(prev => ({ ...prev, aiModel: value }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {currentProviderModels.map((model) => (
                        <SelectItem key={model.id} value={model.key}>
                          <div className="flex flex-col">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-slate-400">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Management Tab */}
          <TabsContent value="management" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Providers Management */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-blue-500" />
                      <span>AI Providers</span>
                    </CardTitle>
                    <Button
                      onClick={() => setShowAddProvider(true)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Provider
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {providers.map((provider) => (
                    <div key={provider.id} className="p-3 bg-slate-800 rounded-lg border border-slate-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{provider.icon}</span>
                          <div>
                            <p className="font-medium">{provider.name}</p>
                            <p className="text-xs text-slate-400">Key: {provider.key}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => setEditingProvider(provider)}
                            size="sm"
                            variant="outline"
                            className="border-slate-600"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => deleteProviderMutation.mutate(provider.id)}
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* AI Models Management */}
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      <span>AI Models</span>
                    </CardTitle>
                    <Button
                      onClick={() => setShowAddModel(true)}
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Model
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                  {models.map((model) => {
                    const provider = providers.find(p => p.id === model.providerId);
                    return (
                      <div key={model.id} className="p-3 bg-slate-800 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{model.name}</p>
                            <p className="text-xs text-slate-400">
                              {provider?.name} • Key: {model.key}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{model.description}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => setEditingModel(model)}
                              size="sm"
                              variant="outline"
                              className="border-slate-600"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => deleteModelMutation.mutate(model.id)}
                              size="sm"
                              variant="outline"
                              className="border-red-600 text-red-400 hover:bg-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5 text-green-500" />
                  <span>API Keys Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {providers.map((provider) => (
                  <div key={provider.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center space-x-2">
                        <span className="text-lg">{provider.icon}</span>
                        <span>{provider.name} API Key</span>
                      </Label>
                      <Badge variant={formData.apiKeys[provider.key] ? "default" : "secondary"}>
                        {formData.apiKeys[provider.key] ? "Configured" : "Not Set"}
                      </Badge>
                    </div>
                    <Input
                      type="password"
                      placeholder={`Enter your ${provider.name} API key`}
                      value={formData.apiKeys[provider.key] || ""}
                      onChange={(e) => handleApiKeyChange(provider.key, e.target.value)}
                      className="bg-slate-800 border-slate-600 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      Required to use {provider.name} models. Keys are stored securely.
                    </p>
                    <Separator className="bg-slate-700" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="w-5 h-5 text-purple-500" />
                  <span>Application Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Auto Save</Label>
                      <p className="text-sm text-slate-400">Automatically save your work</p>
                    </div>
                    <Switch
                      checked={formData.preferences.autoSave}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, autoSave: checked }
                        }))
                      }
                    />
                  </div>
                  
                  <Separator className="bg-slate-700" />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">Show Advanced Options</Label>
                      <p className="text-sm text-slate-400">Display advanced configuration options</p>
                    </div>
                    <Switch
                      checked={formData.preferences.showAdvanced}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, showAdvanced: checked }
                        }))
                      }
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  <div className="space-y-3">
                    <Label className="font-medium">Interface Language</Label>
                    <Select 
                      value={formData.preferences.language} 
                      onValueChange={(value) => 
                        setFormData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, language: value }
                        }))
                      }
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="zh">中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end space-x-3 mt-8">
          <Button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}