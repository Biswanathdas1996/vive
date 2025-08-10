import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { llmService } from "./services/llm";
import { mcpServer } from "./services/mcpServer";
import { fileGeneratorService } from "./services/fileGenerator";
import { ObjectStorageService, ObjectPermission } from "./objectStorage";
import { imageAnalysisService } from "./services/imageAnalysis";
import express from "express";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from public directory
  app.use(
    "/public",
    express.static(path.resolve(import.meta.dirname, "..", "public")),
  );

  // Start new chat session
  app.post("/api/chat/start", async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Step 1: Analyze prompt
      const analysisResult = await llmService.analyzePrompt(prompt);

      // Create project
      const project = await storage.createProject({
        name: "Generated App",
        description: prompt,
        fileStructure: {},
      });

      // Create chat session
      const chatSession = await storage.createChatSession({
        projectId: project.id,
        messages: [
          {
            id: crypto.randomUUID(),
            role: "user",
            content: prompt,
            timestamp: new Date(),
          },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Analysis complete. Extracted ${analysisResult.features.length} features and ${analysisResult.pages.length} pages.`,
            timestamp: new Date(),
            workflow: {
              step: 1,
              stepName: "Requirements Analysis",
              status: "completed",
              data: analysisResult,
            },
          },
        ],
      });

      res.json({
        projectId: project.id,
        chatSessionId: chatSession.id,
        analysisResult,
        workflow: {
          step: 1,
          stepName: "Requirements Analysis",
          status: "completed",
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });

  // Generate file structure
  app.post("/api/chat/:sessionId/generate-structure", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { analysisResult } = req.body;

      const fileStructure =
        await llmService.generateFileStructure(analysisResult);
      console.log("Generated file structure:", fileStructure);
      // Update chat session
      const chatSession = await storage.getChatSession(sessionId);
      if (!chatSession) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      // File structure now contains prompts, not content
      // Files will be generated individually in the next step

      const updatedMessages = [
        ...(chatSession.messages || []),
        {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content:
            "File structure generated successfully. Ready to generate individual HTML files.",
          timestamp: new Date(),
          workflow: {
            step: 2,
            stepName: "File Structure Generation",
            status: "completed" as const,
            data: fileStructure,
          },
        },
      ];

      await storage.updateChatSession(sessionId, { messages: updatedMessages });

      res.json({
        fileStructure,
        workflow: {
          step: 2,
          stepName: "File Structure Generation",
          status: "completed",
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });

  // Generate file content
  app.post("/api/chat/:sessionId/generate-content", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { fileName, analysisResult, fileStructure } = req.body;

      const content = await llmService.generateFileContent(
        fileName,
        analysisResult,
        fileStructure,
      );

      const chatSession = await storage.getChatSession(sessionId);
      if (!chatSession) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      // Save file to public directory
      const generatedFile = await fileGeneratorService.createFile(
        fileName,
        content,
        chatSession.projectId!,
      );
      await storage.createGeneratedFile({
        projectId: chatSession.projectId!,
        fileName,
        filePath: generatedFile.filePath,
        content,
      });

      res.json({
        fileName,
        content,
        filePath: generatedFile.filePath,
        workflow: {
          step: 3,
          stepName: "Content Generation",
          status: "completed",
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });

  // Modify file
  app.post("/api/chat/:sessionId/modify", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { fileName, modificationRequest } = req.body;

      const currentContent = await fileGeneratorService.readFile(fileName);
      const modifiedContent = await llmService.modifyFileContent(
        fileName,
        currentContent,
        modificationRequest,
      );

      await fileGeneratorService.updateFile(fileName, modifiedContent);

      const chatSession = await storage.getChatSession(sessionId);
      if (!chatSession) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      const updatedMessages = [
        ...(chatSession.messages || []),
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          content: modificationRequest,
          timestamp: new Date(),
        },
        {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: `Modified ${fileName} successfully.`,
          timestamp: new Date(),
        },
      ];

      await storage.updateChatSession(sessionId, { messages: updatedMessages });

      res.json({
        fileName,
        content: modifiedContent,
        success: true,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });

  // Get project files
  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const { projectId } = req.params;
      const files = await storage.getProjectFiles(projectId);
      const fileList = await fileGeneratorService.listFiles();

      res.json({
        files: files.map((file: any) => ({
          ...file,
          url: fileGeneratorService.getFileUrl(file.fileName),
        })),
        fileList,
      });
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });

  // Get file content
  app.get("/api/files/:fileName", async (req, res) => {
    try {
      const { fileName } = req.params;
      const content = await fileGeneratorService.readFile(fileName);
      res.json({ fileName, content });
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });

  // Get chat session
  app.get("/api/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const chatSession = await storage.getChatSession(sessionId);

      if (!chatSession) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      res.json(chatSession);
    } catch (error) {
      res
        .status(500)
        .json({
          error: error instanceof Error ? error.message : String(error),
        });
    }
  });

  // Object storage routes for image uploads
  // AI Configuration endpoint
  app.get("/api/ai-config", async (req, res) => {
    try {
      const settings = await storage.getSettings("default");
      
      if (!settings) {
        return res.status(404).json({ 
          error: "No AI configuration found. Please configure AI provider and API keys in settings.",
          hasApiKey: false,
          provider: null,
          model: null
        });
      }

      const hasApiKey = !!(settings.apiKeys && settings.apiKeys[settings.aiProvider]);
      
      res.json({
        provider: settings.aiProvider,
        model: settings.aiModel,
        hasApiKey,
        availableProviders: ["gemini", "openai", "claude"]
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
        hasApiKey: false,
        provider: null,
        model: null
      });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default";
      const settings = await storage.getSettings(userId);
      
      if (!settings) {
        return res.status(404).json({
          error: "No settings found. Please configure AI provider and API keys in settings."
        });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settingsData = req.body;
      const userId = settingsData.userId || "default";
      
      const settings = await storage.upsertSettings({
        userId,
        aiProvider: settingsData.aiProvider,
        aiModel: settingsData.aiModel,
        apiKeys: settingsData.apiKeys || {},
        preferences: settingsData.preferences || {}
      });
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // AI Providers routes
  app.get("/api/ai-providers", async (req, res) => {
    try {
      const providers = await storage.getAllAiProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/ai-providers", async (req, res) => {
    try {
      const provider = await storage.createAiProvider(req.body);
      res.json(provider);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.put("/api/ai-providers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const provider = await storage.updateAiProvider(id, req.body);
      if (!provider) {
        return res.status(404).json({ error: "Provider not found" });
      }
      res.json(provider);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.delete("/api/ai-providers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAiProvider(id);
      if (!success) {
        return res.status(404).json({ error: "Provider not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // AI Models routes
  app.get("/api/ai-models", async (req, res) => {
    try {
      const { providerId } = req.query;
      const models = providerId 
        ? await storage.getAiModelsByProvider(providerId as string)
        : await storage.getAllAiModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/ai-models", async (req, res) => {
    try {
      const model = await storage.createAiModel(req.body);
      res.json(model);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.put("/api/ai-models/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const model = await storage.updateAiModel(id, req.body);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }
      res.json(model);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.delete("/api/ai-models/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteAiModel(id);
      if (!success) {
        return res.status(404).json({ error: "Model not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/objects/design-image", async (req, res) => {
    try {
      const { imageURL, fileName } = req.body;
      
      if (!imageURL || !fileName) {
        return res.status(400).json({ error: "imageURL and fileName are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        imageURL,
        {
          owner: "user", // Simple user identification for now
          visibility: "public", // Make design images public for web app use
        },
      );

      // Analyze the uploaded image to extract design information
      let imageAnalysis = "";
      try {
        console.log("Analyzing uploaded image:", imageURL);
        // Get the object file for direct analysis
        const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
        imageAnalysis = await imageAnalysisService.analyzeImageFromFile(objectFile);
        console.log("Image analysis complete:", imageAnalysis.substring(0, 200) + "...");
      } catch (analysisError) {
        console.error("Image analysis failed:", analysisError);
        // Continue without analysis rather than failing the upload
        imageAnalysis = "Image uploaded successfully but analysis failed. The image will still be used as a visual reference.";
      }

      res.status(200).json({
        objectPath: objectPath,
        imageURL: imageURL,
        imageAnalysis: imageAnalysis,
      });
    } catch (error) {
      console.error("Error setting design image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve uploaded images
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: "user", // Simple user identification for now
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(401);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      return res.sendStatus(404);
    }
  });

  // MCP Server endpoints
  app.get("/api/mcp/info", async (req, res) => {
    try {
      res.json({
        name: "AI Code Generator MCP Server",
        version: "1.0.0",
        capabilities: {
          resources: true,
          tools: true,
          prompts: true,
        },
        status: "running",
        description: "MCP server that exposes LLM capabilities for AI-powered code generation",
      });
    } catch (error) {
      console.error("Error getting MCP server info:", error);
      res.status(500).json({ error: "Failed to get MCP server info" });
    }
  });

  app.post("/api/mcp/tools/call", async (req, res) => {
    try {
      const { name, arguments: args } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Tool name is required" });
      }

      // Get the MCP server instance
      const server = mcpServer.getServer();
      
      // Simulate MCP tool call
      let result;
      switch (name) {
        case 'analyze_prompt':
          const analysis = await llmService.analyzePrompt(args?.prompt || '');
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify(analysis, null, 2),
            }],
          };
          break;
          
        case 'generate_file_structure':
          const fileStructure = await llmService.generateFileStructure(
            args?.analysis || {},
            args?.prompt || ''
          );
          result = {
            content: [{
              type: 'text',
              text: JSON.stringify(fileStructure, null, 2),
            }],
          };
          break;
          
        case 'generate_file_content':
          const content = await llmService.generateFileContent(
            args?.fileName || '',
            args?.requirements || {},
            args?.context || {}
          );
          result = {
            content: [{
              type: 'text',
              text: content,
            }],
          };
          break;
          
        case 'enhance_prompt':
          const enhancedPrompt = await llmService.enhanceFilePrompt(
            args?.originalPrompt || '',
            'index.html',
            args?.context || {}
          );
          result = {
            content: [{
              type: 'text',
              text: enhancedPrompt,
            }],
          };
          break;
          
        case 'modify_file_content':
          const modifiedContent = await llmService.modifyFileContent(
            args?.currentContent || '',
            args?.instructions || '',
            args?.fileName || ''
          );
          result = {
            content: [{
              type: 'text',
              text: modifiedContent,
            }],
          };
          break;
          
        default:
          return res.status(400).json({ error: `Unknown tool: ${name}` });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error calling MCP tool:", error);
      res.status(500).json({ 
        error: "Failed to call MCP tool",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/mcp/resources", async (req, res) => {
    try {
      const resources = [
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
      ];
      
      res.json({ resources });
    } catch (error) {
      console.error("Error listing MCP resources:", error);
      res.status(500).json({ error: "Failed to list MCP resources" });
    }
  });

  app.get("/api/mcp/resources/fetch", async (req, res) => {
    try {
      const uri = req.query.uri as string;
      
      if (!uri) {
        return res.status(400).json({ error: "URI parameter is required" });
      }
      
      switch (uri) {
        case 'ai-config://current':
          try {
            const settings = await storage.getSettings('default');
            res.json({
              uri: 'ai-config://current',
              content: {
                provider: settings?.aiProvider || 'not configured',
                model: settings?.aiModel || 'not configured',
                hasApiKey: !!(settings?.apiKeys && Object.keys(settings.apiKeys).length > 0),
              }
            });
          } catch (error) {
            res.json({
              uri: 'ai-config://current',
              content: {
                error: 'No AI configuration found',
                message: 'Please configure AI provider and API keys',
              }
            });
          }
          break;
          
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
            
            res.json({
              uri: 'ai-providers://list',
              content: providerModels
            });
          } catch (error) {
            res.json({
              uri: 'ai-providers://list',
              content: { 
                error: 'Failed to fetch AI providers',
                message: 'Unable to retrieve provider information'
              }
            });
          }
          break;
          
        default:
          res.status(404).json({ error: `Unknown resource: ${uri}` });
      }
    } catch (error) {
      console.error("Error fetching MCP resource:", error);
      res.status(500).json({ error: "Failed to fetch MCP resource" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
