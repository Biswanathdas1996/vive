import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { llmService } from "./services/llm";
import { fileGeneratorService } from "./services/fileGenerator";
import { ObjectStorageService, ObjectPermission } from "./objectStorage";
import { imageAnalysisService } from "./services/imageAnalysis";
import { databaseManager } from "./databaseManager";
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
      let settings = await storage.getSettings(userId);
      
      // Create default settings if none exist
      if (!settings) {
        settings = await storage.upsertSettings({
          userId,
          aiProvider: "gemini",
          aiModel: "gemini-1.5-flash",
          apiKeys: {},
          preferences: {
            theme: ["dark"],
            language: ["en"],
            autoSave: [true],
            showAdvanced: [false]
          },
          databaseConfig: null
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
        preferences: settingsData.preferences || {},
        databaseConfig: settingsData.databaseConfig || null
      });
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Test database connection
  app.post("/api/database/test", async (req, res) => {
    try {
      const { databaseConfig } = req.body;
      
      if (!databaseConfig) {
        return res.status(400).json({ error: "Database configuration is required" });
      }

      const isConnected = await databaseManager.testConnection(databaseConfig);
      
      res.json({
        connected: isConnected,
        message: isConnected ? "Database connection successful" : "Database connection failed"
      });
    } catch (error) {
      res.status(500).json({
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get current database status
  app.get("/api/database/status", async (req, res) => {
    try {
      const settings = await storage.getSettings("default");
      
      res.json({
        configured: !!(settings?.databaseConfig?.connectionString),
        usingEnvironment: !settings?.databaseConfig?.connectionString && !!process.env.DATABASE_URL,
        hasEnvironmentFallback: !!process.env.DATABASE_URL,
        currentConfig: settings?.databaseConfig ? {
          hasConnectionString: !!settings.databaseConfig.connectionString,
          ssl: settings.databaseConfig.ssl
        } : null
      });
    } catch (error) {
      console.error('Database status error:', error);
      res.status(500).json({
        configured: false,
        usingEnvironment: false,
        hasEnvironmentFallback: false,
        error: error instanceof Error ? error.message : String(error),
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

  const httpServer = createServer(app);
  return httpServer;
}
