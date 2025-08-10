import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Zap, Bot, AlertCircle } from "lucide-react";

interface AIConfig {
  provider: string;
  model: string;
  hasApiKey: boolean;
  keySource: "settings" | "environment" | "none";
  status: string;
}

const PROVIDER_INFO = {
  gemini: { name: "Google Gemini", icon: Brain, color: "bg-blue-500" },
  openai: { name: "OpenAI", icon: Bot, color: "bg-green-500" },
  claude: { name: "Anthropic Claude", icon: Zap, color: "bg-purple-500" }
} as const;

export function AIStatusIndicator() {
  const { data: config, isLoading, error } = useQuery<AIConfig>({
    queryKey: ["/api/ai-config"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-slate-400">
        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
        <span>Loading AI...</span>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex items-center space-x-2 text-sm text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span>AI Error</span>
      </div>
    );
  }

  const providerInfo = PROVIDER_INFO[config.provider as keyof typeof PROVIDER_INFO];
  const Icon = providerInfo?.icon || Brain;

  return (
    <div className="flex items-center space-x-3 text-sm">
      <div className="flex items-center space-x-2">
        <div className={`p-1.5 rounded-md ${providerInfo?.color || "bg-slate-600"}`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <div className="text-slate-200">
          <div className="font-medium">
            {providerInfo?.name || config.provider}
          </div>
          <div className="text-xs text-slate-400">
            {config.model}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-1">
        <div 
          className={`w-2 h-2 rounded-full ${
            config.hasApiKey ? "bg-emerald-500" : "bg-red-500"
          } ${config.hasApiKey ? "animate-pulse" : ""}`}
        />
        <span className={`text-xs ${
          config.hasApiKey ? "text-emerald-400" : "text-red-400"
        }`}>
          {config.hasApiKey ? 
            (config.keySource === "environment" ? "Env Key" : "Settings Key") : 
            "No Key"
          }
        </span>
      </div>
    </div>
  );
}