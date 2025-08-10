import { 
  type Project, 
  type InsertProject,
  type ChatSession,
  type InsertChatSession,
  type GeneratedFile,
  type InsertGeneratedFile,
  type Settings,
  type InsertSettings,
  type ChatMessage,
  projects,
  chatSessions,
  generatedFiles,
  settings
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Storage interface for the application
export interface IStorage {
  // Project methods
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  
  // Chat session methods
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;
  
  // Generated file methods
  createGeneratedFile(file: InsertGeneratedFile): Promise<GeneratedFile>;
  getGeneratedFile(id: string): Promise<GeneratedFile | undefined>;
  getProjectFiles(projectId: string): Promise<GeneratedFile[]>;
  
  // Settings methods
  getSettings(userId?: string): Promise<Settings | undefined>;
  upsertSettings(settings: InsertSettings): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private chatSessions: Map<string, ChatSession>;
  private generatedFiles: Map<string, GeneratedFile>;
  private settings: Map<string, Settings>;

  constructor() {
    this.projects = new Map();
    this.chatSessions = new Map();
    this.generatedFiles = new Map();
    this.settings = new Map();
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = { 
      ...insertProject, 
      description: insertProject.description || null,
      fileStructure: insertProject.fileStructure || null,
      id,
      createdAt: new Date()
    };
    this.projects.set(id, project);
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = { 
      ...insertSession, 
      projectId: insertSession.projectId || null,
      messages: (insertSession.messages as ChatMessage[]) || [],
      status: insertSession.status || "active",
      id,
      createdAt: new Date()
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.chatSessions.set(id, updatedSession);
    return updatedSession;
  }

  async createGeneratedFile(insertFile: InsertGeneratedFile): Promise<GeneratedFile> {
    const id = randomUUID();
    const file: GeneratedFile = { 
      ...insertFile, 
      projectId: insertFile.projectId || null,
      status: insertFile.status || "generated",
      id,
      createdAt: new Date()
    };
    this.generatedFiles.set(id, file);
    return file;
  }

  async getGeneratedFile(id: string): Promise<GeneratedFile | undefined> {
    return this.generatedFiles.get(id);
  }

  async getProjectFiles(projectId: string): Promise<GeneratedFile[]> {
    return Array.from(this.generatedFiles.values()).filter(
      file => file.projectId === projectId
    );
  }

  async getSettings(userId: string = "default"): Promise<Settings | undefined> {
    return this.settings.get(userId);
  }

  async upsertSettings(insertSettings: InsertSettings): Promise<Settings> {
    const userId = insertSettings.userId || "default";
    const existing = this.settings.get(userId);
    
    const settings: Settings = {
      id: existing?.id || randomUUID(),
      userId,
      aiProvider: insertSettings.aiProvider || "gemini",
      aiModel: insertSettings.aiModel || "gemini-1.5-flash",
      apiKeys: insertSettings.apiKeys || {},
      preferences: insertSettings.preferences || {},
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    this.settings.set(userId, settings);
    return settings;
  }
}

export class DatabaseStorage implements IStorage {
  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const sessionData = {
      projectId: insertSession.projectId || null,
      messages: insertSession.messages || [],
      status: insertSession.status || "active"
    };
    
    const [session] = await db
      .insert(chatSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const [session] = await db
      .update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.id, id))
      .returning();
    return session || undefined;
  }

  async createGeneratedFile(insertFile: InsertGeneratedFile): Promise<GeneratedFile> {
    const [file] = await db
      .insert(generatedFiles)
      .values(insertFile)
      .returning();
    return file;
  }

  async getGeneratedFile(id: string): Promise<GeneratedFile | undefined> {
    const [file] = await db.select().from(generatedFiles).where(eq(generatedFiles.id, id));
    return file || undefined;
  }

  async getProjectFiles(projectId: string): Promise<GeneratedFile[]> {
    return await db.select().from(generatedFiles).where(eq(generatedFiles.projectId, projectId));
  }

  async getSettings(userId: string = "default"): Promise<Settings | undefined> {
    const [userSettings] = await db.select().from(settings).where(eq(settings.userId, userId));
    return userSettings || undefined;
  }

  async upsertSettings(insertSettings: InsertSettings): Promise<Settings> {
    const userId = insertSettings.userId || "default";
    
    // Try to update existing settings first
    const [updated] = await db
      .update(settings)
      .set({
        aiProvider: insertSettings.aiProvider || "gemini",
        aiModel: insertSettings.aiModel || "gemini-1.5-flash",
        apiKeys: insertSettings.apiKeys || {},
        preferences: insertSettings.preferences || {},
        updatedAt: new Date()
      })
      .where(eq(settings.userId, userId))
      .returning();

    if (updated) {
      return updated;
    }

    // If no existing settings, insert new ones
    const [created] = await db
      .insert(settings)
      .values({
        userId,
        aiProvider: insertSettings.aiProvider || "gemini",
        aiModel: insertSettings.aiModel || "gemini-1.5-flash",
        apiKeys: insertSettings.apiKeys || {},
        preferences: insertSettings.preferences || {}
      })
      .returning();
    
    return created;
  }
}

export const storage = new DatabaseStorage();
