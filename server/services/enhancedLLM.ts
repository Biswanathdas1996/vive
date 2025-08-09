import { AnalysisResult, FileStructure } from "@shared/schema";
import { storage } from "../storage";
import { GeminiLLMService } from "./geminiLLM";
import { OpenAILLMService } from "./openaiLLM";
import { ClaudeLLMService } from "./claudeLLM";

// AI Model configurations
const AI_MODELS = {
  gemini: {
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
    defaultModel: "gemini-1.5-flash"
  },
  openai: {
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o"
  },
  claude: {
    models: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    defaultModel: "claude-sonnet-4-20250514"
  }
} as const;

interface AIConfig {
  provider: keyof typeof AI_MODELS;
  model: string;
  apiKey: string;
}

export class EnhancedLLMService {
  private currentConfig: AIConfig | null = null;
  private geminiService: GeminiLLMService | null = null;
  private openaiService: OpenAILLMService | null = null;
  private claudeService: ClaudeLLMService | null = null;

  /**
   * Initialize AI service based on current settings
   */
  private async initializeService(config: AIConfig) {
    this.currentConfig = config;

    try {
      switch (config.provider) {
        case "gemini":
          this.geminiService = new GeminiLLMService(config.apiKey, config.model);
          break;
        case "openai":
          this.openaiService = new OpenAILLMService(config.apiKey, config.model);
          break;
        case "claude":
          this.claudeService = new ClaudeLLMService(config.apiKey, config.model);
          break;
      }
      console.log(`✓ Initialized ${config.provider} service with model ${config.model}`);
    } catch (error) {
      console.error(`Failed to initialize ${config.provider} service:`, error);
      throw error;
    }
  }

  /**
   * Get current settings and configure AI provider
   */
  private async getAIConfig(): Promise<AIConfig> {
    const settings = await storage.getSettings("default");
    
    if (!settings) {
      // Default to Gemini with environment variable
      return {
        provider: "gemini",
        model: "gemini-1.5-flash",
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ""
      };
    }

    // Check for API key in settings first, then environment variables
    let apiKey = "";
    if (settings.apiKeys && settings.apiKeys[settings.aiProvider]) {
      apiKey = settings.apiKeys[settings.aiProvider];
    } else {
      // Fallback to environment variables
      switch (settings.aiProvider) {
        case "gemini":
          apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
          break;
        case "openai":
          apiKey = process.env.OPENAI_API_KEY || "";
          break;
        case "claude":
          apiKey = process.env.ANTHROPIC_API_KEY || "";
          break;
      }
    }

    return {
      provider: settings.aiProvider as keyof typeof AI_MODELS,
      model: settings.aiModel,
      apiKey
    };
  }

  /**
   * Get the appropriate AI service based on current settings
   */
  private async getAIService() {
    const config = await this.getAIConfig();
    
    if (!this.currentConfig || 
        this.currentConfig.provider !== config.provider || 
        this.currentConfig.model !== config.model ||
        this.currentConfig.apiKey !== config.apiKey) {
      await this.initializeService(config);
    }

    if (!config.apiKey) {
      throw new Error(`API key not found for ${config.provider}. Please configure it in settings.`);
    }

    switch (config.provider) {
      case "gemini":
        return this.geminiService!;
      case "openai":
        return this.openaiService!;
      case "claude":
        return this.claudeService!;
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  async analyzePrompt(prompt: string): Promise<AnalysisResult> {
    const service = await this.getAIService();
    return service.analyzePrompt(prompt);
  }

  async generateFileStructure(analysisResult: AnalysisResult): Promise<FileStructure> {
    const service = await this.getAIService();
    return service.generateFileStructure(analysisResult);
  }

  async enhanceFilePrompt(basePrompt: string, fileName: string, analysisResult: AnalysisResult): Promise<string> {
    const service = await this.getAIService();
    return service.enhanceFilePrompt(basePrompt, fileName, analysisResult);
  }

  async generateFileContent(fileName: string, analysisResult: AnalysisResult, fileStructure: FileStructure): Promise<string> {
    const service = await this.getAIService();
    return service.generateFileContent(fileName, analysisResult, fileStructure);
  }

  async modifyFileContent(fileName: string, currentContent: string, modificationRequest: string): Promise<string> {
    const service = await this.getAIService();
    return service.modifyFileContent(fileName, currentContent, modificationRequest);
  }

  /**
   * Get available models for a specific provider
   */
  getAvailableModels(provider: keyof typeof AI_MODELS): string[] {
    return [...AI_MODELS[provider].models];
  }

  /**
   * Get current AI configuration
   */
  async getCurrentConfig(): Promise<AIConfig> {
    return await this.getAIConfig();
  }
}

export const enhancedLLMService = new EnhancedLLMService();