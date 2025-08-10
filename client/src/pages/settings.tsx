import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
  const { data: providers = [], isLoading: providersLoading } = useQuery<
    AiProvider[]
  >({
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
      showAdvanced: false,
    },
  });

  const [activeTab, setActiveTab] = useState("models");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(
    null,
  );
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (data: AppSettings) =>
      apiRequest("POST", "/api/settings", data),
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

  // Get current provider and its models
  const currentProvider = providers.find((p) => p.key === formData.aiProvider);
  const currentProviderModels = currentProvider
    ? models.filter((m) => m.providerId === currentProvider.id)
    : [];
  const currentModel = currentProviderModels.find(
    (m) => m.key === formData.aiModel,
  );

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
          <p className="text-slate-400">
            Configure AI models and application preferences
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="models" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>AI Models</span>
            </TabsTrigger>
            <TabsTrigger
              value="management"
              className="flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>AI Management</span>
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>API Keys</span>
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex items-center space-x-2"
            >
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
                  <Select
                    value={formData.aiModel}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, aiModel: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {currentProviderModels.map((model) => (
                        <SelectItem key={model.id} value={model.key}>
                          <div className="flex flex-col">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-slate-400">
                              {model.description}
                            </span>
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
                      onClick={() => {
                        providerForm.reset({ name: "", key: "", icon: "" });
                        setShowAddProvider(true);
                      }}
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
                    <div
                      key={provider.id}
                      className="p-3 bg-slate-800 rounded-lg border border-slate-600"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{provider.icon}</span>
                          <div>
                            <p className="font-medium">{provider.name}</p>
                            <p className="text-xs text-slate-400">
                              Key: {provider.key}
                            </p>
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
                            onClick={() =>
                              deleteProviderMutation.mutate(provider.id)
                            }
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
                      onClick={() => {
                        modelForm.reset({
                          name: "",
                          key: "",
                          description: "",
                          providerId: providers[0]?.id || "",
                          isDefault: false,
                        });
                        setShowAddModel(true);
                      }}
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
                    const provider = providers.find(
                      (p) => p.id === model.providerId,
                    );
                    return (
                      <div
                        key={model.id}
                        className="p-3 bg-slate-800 rounded-lg border border-slate-600"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{model.name}</p>
                            <p className="text-xs text-slate-400">
                              {provider?.name} • Key: {model.key}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {model.description}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => {
                                setEditingModel(model);
                              }}
                              size="sm"
                              variant="outline"
                              className="border-slate-600"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() =>
                                deleteModelMutation.mutate(model.id)
                              }
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
                      <Badge
                        variant={
                          formData.apiKeys[provider.key]
                            ? "default"
                            : "secondary"
                        }
                      >
                        {formData.apiKeys[provider.key]
                          ? "Configured"
                          : "Not Set"}
                      </Badge>
                    </div>
                    <Input
                      type="password"
                      placeholder={`Enter your ${provider.name} API key`}
                      value={formData.apiKeys[provider.key] || ""}
                      onChange={(e) =>
                        handleApiKeyChange(provider.key, e.target.value)
                      }
                      className="bg-slate-800 border-slate-600 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      Required to use {provider.name} models. Keys are stored
                      securely.
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
                      <p className="text-sm text-slate-400">
                        Automatically save your work
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

                  <Separator className="bg-slate-700" />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-medium">
                        Show Advanced Options
                      </Label>
                      <p className="text-sm text-slate-400">
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

                  <Separator className="bg-slate-700" />

                  <div className="space-y-3">
                    <Label className="font-medium">Interface Language</Label>
                    <Select
                      value={formData.preferences.language}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          preferences: { ...prev.preferences, language: value },
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

      {/* Add Provider Dialog */}
      <Dialog open={showAddProvider} onOpenChange={setShowAddProvider}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add AI Provider</DialogTitle>
            <DialogDescription>
              Create a new AI provider configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...providerForm}>
            <form
              onSubmit={providerForm.handleSubmit((data) =>
                createProviderMutation.mutate(data),
              )}
              className="space-y-4"
            >
              <FormField
                control={providerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., OpenAI"
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
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
                      <Input
                        placeholder="e.g., openai"
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
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
                      <Input
                        placeholder="e.g., 🤖"
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddProvider(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProviderMutation.isPending}
                >
                  {createProviderMutation.isPending
                    ? "Creating..."
                    : "Create Provider"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog
        open={!!editingProvider}
        onOpenChange={() => setEditingProvider(null)}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit AI Provider</DialogTitle>
            <DialogDescription>
              Update the AI provider configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...providerForm}>
            <form
              onSubmit={providerForm.handleSubmit((data) =>
                updateProviderMutation.mutate({
                  id: editingProvider!.id,
                  ...data,
                }),
              )}
              className="space-y-4"
            >
              <FormField
                control={providerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
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
                      <Input
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
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
                      <Input
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProvider(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProviderMutation.isPending}
                >
                  {updateProviderMutation.isPending
                    ? "Updating..."
                    : "Update Provider"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Model Dialog */}
      <Dialog open={showAddModel} onOpenChange={setShowAddModel}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add AI Model</DialogTitle>
            <DialogDescription>
              Create a new AI model configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...modelForm}>
            <form
              onSubmit={modelForm.handleSubmit((data) =>
                createModelMutation.mutate(data),
              )}
              className="space-y-4"
            >
              <FormField
                control={modelForm.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => {
                          const numValue = parseInt(value, 10);
                          if (!isNaN(numValue)) {
                            field.onChange(numValue);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {providers.map((provider) => (
                            <SelectItem
                              key={provider.id}
                              value={provider.id.toString()}
                            >
                              {provider.icon} {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                      <Input
                        placeholder="e.g., GPT-4"
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
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
                      <Input
                        placeholder="e.g., gpt-4"
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
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
                      <Input
                        placeholder="e.g., Advanced reasoning model"
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={modelForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>
                      Set as default model for this provider
                    </FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModel(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createModelMutation.isPending}>
                  {createModelMutation.isPending
                    ? "Creating..."
                    : "Create Model"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Model Dialog */}
      <Dialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit AI Model</DialogTitle>
            <DialogDescription>
              Update the AI model configuration.
            </DialogDescription>
          </DialogHeader>
          <Form {...modelForm}>
            <form
              onSubmit={modelForm.handleSubmit((data) => {
                if (editingModel) {
                  updateModelMutation.mutate({ 
                    id: editingModel.id,
                    ...data 
                  });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={modelForm.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ""}
                        onValueChange={(value) => field.onChange(value)}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {providers.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.icon} {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                      <Input
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
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
                      <Input
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
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
                      <Input
                        {...field}
                        className="bg-slate-800 border-slate-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={modelForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>
                      Set as default model for this provider
                    </FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingModel(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateModelMutation.isPending}>
                  {updateModelMutation.isPending
                    ? "Updating..."
                    : "Update Model"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
