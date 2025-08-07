import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalysisResult, FileStructure } from "@shared/schema";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

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
      throw new Error(
        `Failed to analyze prompt: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async generateFileStructure(
    analysisResult: AnalysisResult,
  ): Promise<FileStructure> {
    try {
      const prompt = `You are an expert web developer and project architect. Generate a file structure with  descriptive prompts with all feature content, forms, cards, menus, content needed for each HTML file that will be used to generate content later.

Return a JSON object representing the file structure where each HTML file contains a small text prompt describing what should be generated for that file. Use this exact format:

{
  "public": {
    "type": "directory",
    "children": {
      "index.html": { 
        "type": "file",
        "prompt": "Create the main landing page with navigation, hero section, and responsive design"
      },
      "about.html": { 
        "type": "file",
        "prompt": "Create an about page with company information and team section"
      }
    }
  }
}

Generate file structure with small prompts for: ${JSON.stringify(analysisResult)}

Requirements:
- Each file should have a short, descriptive "prompt" field (1-2 sentences)
- The prompt should describe what content/features that specific file should have
- Consider the overall project structure and how files relate to each other
- Keep prompts focused on the specific purpose of each file`;

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
      throw new Error(
        `Failed to generate file structure: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async generateFileContent(
    fileName: string,
    analysisResult: AnalysisResult,
    fileStructure: FileStructure,
  ): Promise<string> {
    try {
      // Extract the specific prompt for this file from the structure
      let filePrompt = "Create a basic HTML page";
      if (
        fileStructure.public?.children?.[fileName] &&
        "prompt" in fileStructure.public.children[fileName]
      ) {
        filePrompt = (fileStructure.public.children[fileName] as any).prompt;
      }

      const prompt = `You are an expert modern web developer specialized in creating high-quality, contemporary HTML5 applications. Generate a complete, self-contained HTML5 file with ALL styles and JavaScript embedded using <style> and <script> tags. Do NOT reference external CSS, JS, or image files.

MODERN DESIGN REQUIREMENTS:
- Use contemporary design patterns (glassmorphism, neumorphism, gradient overlays, subtle shadows)
- Implement modern color palettes (soft gradients, complementary colors, proper contrast ratios)
- Apply modern typography (font stacks, proper sizing hierarchy, line-height optimization)
- Create smooth animations and micro-interactions with CSS transitions/transforms
- Use CSS custom properties (variables) for consistent theming
- Implement modern spacing and layout principles

VISUAL ELEMENTS:
- Replace ALL images with colored geometric shapes, gradients, or CSS-generated icons
- Use colored rectangles, circles, or rounded boxes as placeholders
- Create visual appeal through color combinations, gradients, and shapes
- Implement CSS icons using ::before/::after pseudo-elements when needed
- Use box-shadow, border-radius, and background gradients for visual depth

TECHNICAL SPECIFICATIONS:
- Modern HTML5 semantic structure (header, nav, main, section, article, footer)
- CSS Grid and Flexbox for sophisticated layouts
- Mobile-first responsive design with fluid typography (clamp, rem, em units)
- CSS animations and transitions for polished interactions
- Modern JavaScript (ES6+) with proper event handling
- Accessibility features (ARIA labels, semantic markup, keyboard navigation)
- Performance optimizations (efficient selectors, minimal reflow)

CSS STYLE GUIDELINES:
- Use CSS custom properties for colors and spacing
- Implement modern color schemes (dark/light themes when appropriate)
- Apply sophisticated hover effects and focus states
- Use backdrop-filter, filter effects, and modern CSS features
- Implement smooth scrolling and polished user interactions
- Create depth with layered shadows and subtle gradients

File: ${fileName}
Specific requirements: ${filePrompt}
Project context: ${JSON.stringify(analysisResult)}

Generate a production-ready, visually stunning HTML5 application that demonstrates modern web development best practices. Return ONLY the complete HTML content without markdown formatting.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();

      // Clean up any markdown code blocks if present
      const cleanContent = content
        .replace(/```html\n?/g, "")
        .replace(/```\n?$/g, "")
        .trim();

      return cleanContent;
    } catch (error) {
      throw new Error(
        `Failed to generate content for ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async modifyFileContent(
    fileName: string,
    currentContent: string,
    modificationRequest: string,
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
        .replace(/```html\n?/g, "")
        .replace(/```\n?$/g, "")
        .trim();

      return cleanContent;
    } catch (error) {
      throw new Error(
        `Failed to modify ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const llmService = new LLMService();
