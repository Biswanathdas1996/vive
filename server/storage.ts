import { 
  type Project, 
  type InsertProject,
  type ChatSession,
  type InsertChatSession,
  type GeneratedFile,
  type InsertGeneratedFile,
  type ChatMessage
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private projects: Map<string, Project>;
  private chatSessions: Map<string, ChatSession>;
  private generatedFiles: Map<string, GeneratedFile>;

  constructor() {
    this.projects = new Map();
    this.chatSessions = new Map();
    this.generatedFiles = new Map();
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = { 
      ...insertProject, 
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
}

export const storage = new MemStorage();
