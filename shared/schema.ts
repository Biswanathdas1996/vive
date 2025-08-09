import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  fileStructure: json("file_structure").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id),
  messages: json("messages").$type<ChatMessage[]>().default([]),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedFiles = pgTable("generated_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(),
  status: text("status").default("generated"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").default("default"),
  aiProvider: text("ai_provider").notNull().default("gemini"),
  aiModel: text("ai_model").notNull().default("gemini-1.5-flash"),
  apiKeys: json("api_keys").$type<Record<string, string>>().default({}),
  preferences: json("preferences").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  workflow?: {
    step: number;
    stepName: string;
    status: "pending" | "in-progress" | "completed" | "error";
    data?: any;
  };
}

export interface AnalysisResult {
  features: string[];
  pages: string[];
  technical_requirements: Record<string, any>;
}

export interface FileStructure {
  [key: string]: {
    type: "file" | "directory";
    content?: string;
    children?: FileStructure;
  };
}

export interface AIModelConfig {
  provider: "gemini" | "openai" | "claude";
  model: string;
  apiKey?: string;
}

export interface AppSettings {
  aiProvider: "gemini" | "openai" | "claude";
  aiModel: string;
  apiKeys: Record<string, string>;
  preferences: {
    theme?: "light" | "dark";
    language?: string;
    autoSave?: boolean;
    showAdvanced?: boolean;
  };
}

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedFileSchema = createInsertSchema(generatedFiles).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertGeneratedFile = z.infer<typeof insertGeneratedFileSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type Project = typeof projects.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type GeneratedFile = typeof generatedFiles.$inferSelect;
export type Settings = typeof settings.$inferSelect;
