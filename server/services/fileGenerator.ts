import fs from "fs/promises";
import path from "path";
import { FileStructure, GeneratedFile } from "@shared/schema";

export class FileGeneratorService {
  private publicDir = path.resolve(import.meta.dirname, "..", "..", "public");

  async ensurePublicDir(): Promise<void> {
    try {
      await fs.access(this.publicDir);
    } catch {
      await fs.mkdir(this.publicDir, { recursive: true });
    }
  }

  async createFile(fileName: string, content: string, projectId: string): Promise<GeneratedFile> {
    await this.ensurePublicDir();
    
    const filePath = path.join(this.publicDir, fileName);
    const dir = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content, "utf-8");

    return {
      id: crypto.randomUUID(),
      projectId,
      fileName,
      filePath: `/public/${fileName}`,
      content,
      status: "generated",
      createdAt: new Date(),
    };
  }

  async updateFile(fileName: string, content: string): Promise<void> {
    await this.ensurePublicDir();
    
    const filePath = path.join(this.publicDir, fileName);
    await fs.writeFile(filePath, content, "utf-8");
  }

  async readFile(fileName: string): Promise<string> {
    const filePath = path.join(this.publicDir, fileName);
    return await fs.readFile(filePath, "utf-8");
  }

  async listFiles(): Promise<string[]> {
    await this.ensurePublicDir();
    
    const files: string[] = [];
    
    const readDir = async (dir: string, basePath: string = ""): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          await readDir(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };
    
    await readDir(this.publicDir);
    return files;
  }

  async deleteFile(fileName: string): Promise<void> {
    const filePath = path.join(this.publicDir, fileName);
    await fs.unlink(filePath);
  }

  getFileUrl(fileName: string): string {
    return `/public/${fileName}`;
  }
}

export const fileGeneratorService = new FileGeneratorService();
