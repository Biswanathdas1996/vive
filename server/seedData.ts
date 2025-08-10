import { storage } from "./storage";

// Seed default AI providers and models
export async function seedAIModels() {
  try {
    console.log("Seeding AI providers and models...");
    
    // Check if providers already exist
    const existingProviders = await storage.getAllAiProviders();
    if (existingProviders.length > 0) {
      console.log("AI providers already exist, skipping seed");
      return;
    }

    // Create Gemini provider
    const geminiProvider = await storage.createAiProvider({
      key: "gemini",
      name: "Google Gemini",
      icon: "🧠",
      description: "Google's advanced AI language models"
    });

    // Create OpenAI provider
    const openaiProvider = await storage.createAiProvider({
      key: "openai", 
      name: "OpenAI",
      icon: "🤖",
      description: "OpenAI's GPT models"
    });

    // Create Claude provider
    const claudeProvider = await storage.createAiProvider({
      key: "claude",
      name: "Anthropic Claude", 
      icon: "⚡",
      description: "Anthropic's Claude AI models"
    });

    // Create Gemini models
    await storage.createAiModel({
      providerId: geminiProvider.id,
      key: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      description: "Fast and efficient",
      isDefault: true
    });

    await storage.createAiModel({
      providerId: geminiProvider.id,
      key: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro", 
      description: "Advanced reasoning"
    });

    await storage.createAiModel({
      providerId: geminiProvider.id,
      key: "gemini-2.0-flash-exp",
      name: "Gemini 2.0 Flash (Experimental)",
      description: "Latest experimental"
    });

    // Create OpenAI models
    await storage.createAiModel({
      providerId: openaiProvider.id,
      key: "gpt-4o",
      name: "GPT-4o",
      description: "Latest multimodal model",
      isDefault: true
    });

    await storage.createAiModel({
      providerId: openaiProvider.id,
      key: "gpt-4o-mini",
      name: "GPT-4o Mini",
      description: "Faster and cheaper"
    });

    await storage.createAiModel({
      providerId: openaiProvider.id,
      key: "gpt-4-turbo", 
      name: "GPT-4 Turbo",
      description: "Advanced reasoning"
    });

    await storage.createAiModel({
      providerId: openaiProvider.id,
      key: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      description: "Cost-effective"
    });

    // Create Claude models
    await storage.createAiModel({
      providerId: claudeProvider.id,
      key: "claude-sonnet-4-20250514",
      name: "Claude 4.0 Sonnet",
      description: "Latest and most capable",
      isDefault: true
    });

    await storage.createAiModel({
      providerId: claudeProvider.id,
      key: "claude-3-7-sonnet-20250219",
      name: "Claude 3.7 Sonnet",
      description: "Enhanced capabilities"
    });

    await storage.createAiModel({
      providerId: claudeProvider.id,
      key: "claude-3-5-sonnet-20241022", 
      name: "Claude 3.5 Sonnet",
      description: "Balanced performance"
    });

    await storage.createAiModel({
      providerId: claudeProvider.id,
      key: "claude-3-haiku-20240307",
      name: "Claude 3 Haiku",
      description: "Fast and efficient"
    });

    console.log("AI providers and models seeded successfully!");

  } catch (error) {
    console.error("Error seeding AI models:", error);
    throw error;
  }
}