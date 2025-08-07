import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalysisResult, FileStructure } from "@shared/schema";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export class LLMService {
  async analyzePrompt(prompt: string): Promise<AnalysisResult> {
    try {
      const systemPrompt = `You are an expert web application analyst. Analyze the user's request and extract features, pages, and technical requirements. Respond with JSON in this exact format:
      {
        "features": ["feature1", "feature2", ...],
        "pages": ["page1", "page2", ...],
        "technical_requirements": {
          "responsive": boolean,
          "authentication": boolean,
          "data_persistence": "localStorage" | "database" | "none",
          "ui_framework": string
        }
      }

Analyze this web application request: ${prompt}`;

      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      const parsedResult = JSON.parse(jsonMatch[0]);
      return parsedResult as AnalysisResult;
    } catch (error) {
      throw new Error(`Failed to analyze prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateFileStructure(analysisResult: AnalysisResult): Promise<FileStructure> {
    try {
      const prompt = `You are an expert web developer. Based on the analysis results, generate a complete file structure for the web application. Include HTML files for each page, CSS files, and JavaScript files. Respond with JSON in this format:
      {
        "public": {
          "type": "directory",
          "children": {
            "index.html": { "type": "file" },
            "styles.css": { "type": "file" },
            "app.js": { "type": "file" }
          }
        }
      }

Generate file structure for: ${JSON.stringify(analysisResult)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      const parsedResult = JSON.parse(jsonMatch[0]);
      return parsedResult as FileStructure;
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
      const prompt = `You are an expert web developer. Generate complete, functional HTML content for the specified file. The HTML should be modern, responsive, and fully functional. Include inline CSS and JavaScript as needed. Make it production-ready and visually appealing.

Generate content for file: ${fileName}
Based on analysis: ${JSON.stringify(analysisResult)}
File structure context: ${JSON.stringify(fileStructure)}

Create a complete, modern, responsive HTML file with inline styles and functionality.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
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
      const prompt = `You are an expert web developer. Modify the existing file content based on the user's request. Return only the complete modified content, maintaining the file's structure and functionality.

File: ${fileName}
Current content: ${currentContent}

Modification request: ${modificationRequest}

Please provide the complete modified file content.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      throw new Error(`Failed to modify ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const llmService = new LLMService();
