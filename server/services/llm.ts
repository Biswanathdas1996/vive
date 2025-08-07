import OpenAI from "openai";
import { AnalysisResult, FileStructure } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export class LLMService {
  async analyzePrompt(prompt: string): Promise<AnalysisResult> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert web application analyst. Analyze the user's request and extract features, pages, and technical requirements. Respond with JSON in this exact format:
            {
              "features": ["feature1", "feature2", ...],
              "pages": ["page1", "page2", ...],
              "technical_requirements": {
                "responsive": boolean,
                "authentication": boolean,
                "data_persistence": "localStorage" | "database" | "none",
                "ui_framework": string
              }
            }`
          },
          {
            role: "user",
            content: `Analyze this web application request: ${prompt}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as AnalysisResult;
    } catch (error) {
      throw new Error(`Failed to analyze prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateFileStructure(analysisResult: AnalysisResult): Promise<FileStructure> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert web developer. Based on the analysis results, generate a complete file structure for the web application. Include HTML files for each page, CSS files, and JavaScript files. Respond with JSON in this format:
            {
              "public": {
                "type": "directory",
                "children": {
                  "index.html": { "type": "file" },
                  "styles.css": { "type": "file" },
                  "app.js": { "type": "file" }
                }
              }
            }`
          },
          {
            role: "user",
            content: `Generate file structure for: ${JSON.stringify(analysisResult)}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as FileStructure;
    } catch (error) {
      throw new Error(`Failed to generate file structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateFileContent(
    fileName: string,
    analysisResult: AnalysisResult,
    fileStructure: FileStructure
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert web developer. Generate complete, functional HTML content for the specified file. The HTML should be modern, responsive, and fully functional. Include inline CSS and JavaScript as needed. Make it production-ready and visually appealing.`
          },
          {
            role: "user",
            content: `Generate content for file: ${fileName}
            Based on analysis: ${JSON.stringify(analysisResult)}
            File structure context: ${JSON.stringify(fileStructure)}
            
            Create a complete, modern, responsive HTML file with inline styles and functionality.`
          }
        ],
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`Failed to generate content for ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async modifyFileContent(
    fileName: string,
    currentContent: string,
    modificationRequest: string
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert web developer. Modify the existing file content based on the user's request. Return only the complete modified content, maintaining the file's structure and functionality.`
          },
          {
            role: "user",
            content: `File: ${fileName}
            Current content: ${currentContent}
            
            Modification request: ${modificationRequest}
            
            Please provide the complete modified file content.`
          }
        ],
      });

      return response.choices[0].message.content || currentContent;
    } catch (error) {
      throw new Error(`Failed to modify ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const llmService = new LLMService();
