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
import { Settings, Save, Zap, Brain, MessageSquare, Key, Monitor } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Available AI models configuration
const AI_MODELS = {
  gemini: {
    name: "Google Gemini",
    icon: "🧠",
    models: [
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Fast and efficient" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Advanced reasoning" },
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental)", description: "Latest experimental" }
    ]
  },
  openai: {
    name: "OpenAI",
    icon: "🤖",
    models: [
      { id: "gpt-4o", name: "GPT-4o", description: "Latest multimodal model" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Faster and cheaper" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Advanced reasoning" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Cost-effective" }
    ]
  },
  claude: {
    name: "Anthropic Claude",
    icon: "⚡",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude 4.0 Sonnet", description: "Latest and most capable" },
      { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", description: "Enhanced capabilities" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Balanced performance" },
      { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", description: "Fast and efficient" }
    ]
  }
} as const;

interface AppSettings {
  aiProvider: keyof typeof AI_MODELS;
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

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (data: AppSettings) => apiRequest("/api/settings", "POST", data),
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

  const handleProviderChange = (provider: keyof typeof AI_MODELS) => {
    const defaultModel = AI_MODELS[provider].models[0].id;
    setFormData(prev => ({
      ...prev,
      aiProvider: provider,
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

  const getProviderStatus = (provider: keyof typeof AI_MODELS) => {
    const hasApiKey = formData.apiKeys[provider];
    const isSelected = formData.aiProvider === provider;
    
    if (isSelected && hasApiKey) return { status: "active", color: "bg-green-500" };
    if (hasApiKey) return { status: "configured", color: "bg-blue-500" };
    return { status: "inactive", color: "bg-gray-500" };
  };

  if (isLoading) {
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
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="models" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>AI Models</span>
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
                    <span className="text-2xl">{AI_MODELS[formData.aiProvider]?.icon}</span>
                    <div>
                      <p className="font-medium">{AI_MODELS[formData.aiProvider]?.name}</p>
                      <p className="text-sm text-slate-400">
                        {AI_MODELS[formData.aiProvider]?.models.find(m => m.id === formData.aiModel)?.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Provider Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Select AI Provider</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(AI_MODELS).map(([key, provider]) => {
                      const status = getProviderStatus(key as keyof typeof AI_MODELS);
                      const isSelected = formData.aiProvider === key;
                      
                      return (
                        <Card
                          key={key}
                          className={`cursor-pointer transition-colors border-2 ${
                            isSelected 
                              ? "border-blue-500 bg-slate-800" 
                              : "border-slate-600 bg-slate-900 hover:border-slate-500"
                          }`}
                          onClick={() => handleProviderChange(key as keyof typeof AI_MODELS)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl">{provider.icon}</span>
                              <div className={`w-3 h-3 rounded-full ${status.color}`} />
                            </div>
                            <h3 className="font-semibold mb-1">{provider.name}</h3>
                            <p className="text-xs text-slate-400">
                              {provider.models.length} models available
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
                      {AI_MODELS[formData.aiProvider]?.models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
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
                {Object.entries(AI_MODELS).map(([key, provider]) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center space-x-2">
                        <span className="text-lg">{provider.icon}</span>
                        <span>{provider.name} API Key</span>
                      </Label>
                      <Badge variant={formData.apiKeys[key] ? "default" : "secondary"}>
                        {formData.apiKeys[key] ? "Configured" : "Not Set"}
                      </Badge>
                    </div>
                    <Input
                      type="password"
                      placeholder={`Enter your ${provider.name} API key`}
                      value={formData.apiKeys[key] || ""}
                      onChange={(e) => handleApiKeyChange(key, e.target.value)}
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