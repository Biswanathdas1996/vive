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
      const prompt = `You are an expert web developer. Based on the analysis results, generate a complete file structure with FULL HTML content for each file. Each HTML file must be self-contained with embedded CSS and JavaScript.

IMPORTANT: Include the complete HTML content for each file in the "content" property.

Respond with JSON in this exact format:
{
  "public": {
    "type": "directory",
    "children": {
      "index.html": { 
        "type": "file",
        "content": "<!DOCTYPE html>\\n<html lang=\\"en\\">\\n<head>\\n<meta charset=\\"UTF-8\\">\\n<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\">\\n<title>Title</title>\\n<style>\\n/* All CSS styles here */\\n</style>\\n</head>\\n<body>\\n<!-- All HTML content here -->\\n<script>\\n// All JavaScript here\\n</script>\\n</body>\\n</html>"
      }
    }
  }
}

Requirements for each HTML file:
- Complete HTML5 document with DOCTYPE
- All CSS styles in <style> tags in <head>
- All JavaScript in <script> tags
- Modern, responsive design
- Full functionality for all requested features
- Professional styling and layout
- Mobile-responsive design
- Proper semantic HTML
- No external file references

Generate complete file structure with content for: ${JSON.stringify(analysisResult)}

Make sure each file has complete, functional HTML content that implements the requested features.`;

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
      const prompt = `You are an expert web developer. Generate a complete, self-contained HTML file with ALL styles and JavaScript embedded within the HTML file using <style> and <script> tags. Do NOT reference external CSS or JS files.

Requirements:
- Complete HTML5 document with DOCTYPE
- All CSS styles embedded in <style> tags in the <head>
- All JavaScript embedded in <script> tags
- Modern, responsive design using CSS Grid/Flexbox
- Clean, professional styling
- Full functionality for the requested features
- Mobile-responsive design
- Proper semantic HTML

Generate content for file: ${fileName}
Based on analysis: ${JSON.stringify(analysisResult)}
File structure context: ${JSON.stringify(fileStructure)}

Return ONLY the complete HTML content, nothing else. No markdown formatting or code blocks.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      // Clean up any markdown code blocks if present
      const cleanContent = content
        .replace(/```html\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      return cleanContent;
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
      const prompt = `You are an expert web developer. Modify the existing HTML file based on the user's request. The file must remain completely self-contained with all CSS in <style> tags and all JavaScript in <script> tags. Do not reference external files.

File: ${fileName}
Current content: ${currentContent}

Modification request: ${modificationRequest}

Requirements:
- Keep all styles embedded in <style> tags
- Keep all JavaScript embedded in <script> tags  
- Maintain responsive design
- Return complete HTML document
- No external file references

Return ONLY the complete modified HTML content, no markdown formatting.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      // Clean up any markdown code blocks if present
      const cleanContent = content
        .replace(/```html\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      return cleanContent;
    } catch (error) {
      throw new Error(`Failed to modify ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const llmService = new LLMService();
