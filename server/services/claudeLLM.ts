import Anthropic from "@anthropic-ai/sdk";
import { AnalysisResult, FileStructure } from "@shared/schema";

/**
 * Configuration constants for the Claude LLM service
 */
const CONFIG = {
  DEFAULT_MODEL: "claude-sonnet-4-20250514", // The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229"
  JSON_EXTRACTION_REGEX: /\{[\s\S]*\}/,
  MARKDOWN_CODE_BLOCK_REGEX: /```html\n?/g,
  MARKDOWN_END_REGEX: /```\n?$/g,
} as const;

/**
 * Error messages for better error handling
 */
const ERROR_MESSAGES = {
  NO_API_KEY: "Anthropic API key is not configured",
  NO_JSON_RESPONSE: "No valid JSON found in AI response",
  JSON_PARSE_ERROR: "Failed to parse JSON response from AI",
  CONTENT_GENERATION_FAILED: "Failed to generate content",
  PROMPT_ANALYSIS_FAILED: "Failed to analyze prompt",
  FILE_STRUCTURE_FAILED: "Failed to generate file structure",
  PROMPT_ENHANCEMENT_FAILED: "Failed to enhance prompt",
  FILE_MODIFICATION_FAILED: "Failed to modify file content",
} as const;

export class ClaudeLLMService {
  private client: Anthropic;
  private modelName: string;

  constructor(apiKey: string, modelName: string = CONFIG.DEFAULT_MODEL) {
    if (!apiKey) {
      throw new Error(ERROR_MESSAGES.NO_API_KEY);
    }

    this.client = new Anthropic({ apiKey });
    this.modelName = modelName;
    
    console.log(`✓ Initialized Claude with model: ${modelName}`);
  }

  private async generateContent(prompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.modelName,
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      });

      return response.content[0].type === "text" ? response.content[0].text : "";
    } catch (error) {
      console.error("Claude API error:", error);
      throw new Error(`Claude generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

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

      const response = await this.generateContent(systemPrompt);
      
      // Extract JSON from response
      const jsonMatch = response.match(CONFIG.JSON_EXTRACTION_REGEX);
      if (!jsonMatch) {
        throw new Error(ERROR_MESSAGES.NO_JSON_RESPONSE);
      }

      const parsedResult = JSON.parse(jsonMatch[0]);
      return parsedResult as AnalysisResult;
    } catch (error) {
      throw new Error(`${ERROR_MESSAGES.PROMPT_ANALYSIS_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generateFileStructure(analysisResult: AnalysisResult): Promise<FileStructure> {
    try {
      const prompt = `You are an expert web developer and project architect. Generate a comprehensive file structure with extremely detailed prompts containing extensive feature content, forms, cards, menus, interactive elements, and UI components for each HTML file.

Do not generate any nested directories or complex structures. Each file should be a top-level HTML file in the "public" directory.      

Return a JSON object representing the file structure where each HTML file contains an extremely detailed, comprehensive prompt describing ALL content, features, and UI elements that should be generated for that file. Include as many elements as possible to create rich, feature-complete pages.

Use this exact format:

{
  "public": {
    "type": "directory",
    "children": {
      "index.html": { 
        "type": "file",
        "prompt": "Create a comprehensive landing page with at least 10 distinct UI elements: [1] responsive navigation bar including logo, menu items (Home, Products, Services, About, Contact), mobile hamburger menu; [2] hero section with compelling headline, subheadline, call-to-action buttons, background image/video; [3] features section with icon cards highlighting key benefits; [4] statistics counter with animated numbers; [5] testimonials carousel with client quotes and photos; [6] services overview with service cards including icons, descriptions, and pricing; [7] about us preview section with team photos; [8] newsletter signup form with email validation; [9] social media integration widget; [10] footer with company info, social media links, quick links, contact details, copyright; [11] live chat widget; [12] scroll-to-top button; [13] cookie consent banner; [14] search bar with autocomplete; [15] breadcrumb navigation. Include modern animations, hover effects, smooth scrolling navigation, modal popups, responsive grid layouts, parallax scrolling, and interactive elements with accessibility features."
      }
    }
  }
}

Generate comprehensive file structure with extremely detailed prompts for: ${JSON.stringify(analysisResult)}

Requirements:
- Each prompt should be extremely detailed (10-20+ sentences minimum)
- MANDATORY: Each page MUST include at least 10 distinct UI elements from different categories
- ENFORCE MINIMUM REQUIREMENT: Count and explicitly list at least 10 different UI elements for each page using numbered format [1], [2], [3], etc.
- FORMAT REQUIREMENT: Each prompt must start with "Create a [page type] with at least 10 distinct UI elements:" followed by numbered list of elements

CRITICAL: Every single page must have numbered UI elements [1] through [10] minimum.`;

      const response = await this.generateContent(prompt);
      
      // Extract JSON from response
      const jsonMatch = response.match(CONFIG.JSON_EXTRACTION_REGEX);
      if (!jsonMatch) {
        throw new Error(ERROR_MESSAGES.NO_JSON_RESPONSE);
      }

      const parsedResult = JSON.parse(jsonMatch[0]);
      return parsedResult as FileStructure;
    } catch (error) {
      throw new Error(`${ERROR_MESSAGES.FILE_STRUCTURE_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async enhanceFilePrompt(basePrompt: string, fileName: string, analysisResult: AnalysisResult): Promise<string> {
    try {
      const enhancementPrompt = `Analyze this page prompt and generate a comprehensive modern UI feature list:

BASE PROMPT: ${basePrompt}
PAGE: ${fileName}
CONTEXT: ${JSON.stringify(analysisResult)}

Return a structured list of specific modern web elements and features for this page. Format as:

LAYOUT & NAVIGATION:
- [specific element]: [brief description]

INTERACTIVE COMPONENTS:
- [specific element]: [brief description]

CONTENT SECTIONS:
- [specific element]: [brief description]

MODERN FEATURES:
- [specific element]: [brief description]

DESIGN PATTERNS:
- [specific styling]: [implementation note]

Focus on contemporary UI patterns, interactive elements, modern forms, data visualization, responsive layouts, accessibility features, and performance optimizations.

Make each element specific and actionable for ${fileName}. Be concise but comprehensive.`;

      const result = await this.generateContent(enhancementPrompt);
      return result.trim();
    } catch (error) {
      console.warn(`${ERROR_MESSAGES.PROMPT_ENHANCEMENT_FAILED} for ${fileName}, using original:`, error);
      return basePrompt;
    }
  }

  async generateFileContent(fileName: string, analysisResult: AnalysisResult, fileStructure: FileStructure): Promise<string> {
    try {
      // Extract the specific prompt for this file from the structure
      let filePrompt = "Create a basic HTML page";
      if (fileStructure.public?.children?.[fileName] && "prompt" in fileStructure.public.children[fileName]) {
        filePrompt = (fileStructure.public.children[fileName] as any).prompt;
      }

      // Enhance the file prompt with AI-generated detailed specifications
      const enhancedFilePrompt = await this.enhanceFilePrompt(filePrompt, fileName, analysisResult);

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

File: ${fileName}
Enhanced Specific Requirements: ${enhancedFilePrompt}
Project context: ${JSON.stringify(analysisResult)}

Generate a production-ready, visually stunning HTML5 application that demonstrates modern web development best practices. Return ONLY the complete HTML content without markdown formatting.`;

      const result = await this.generateContent(prompt);
      
      // Clean up any markdown code blocks if present
      const cleanContent = result
        .replace(CONFIG.MARKDOWN_CODE_BLOCK_REGEX, "")
        .replace(CONFIG.MARKDOWN_END_REGEX, "")
        .trim();

      return cleanContent;
    } catch (error) {
      throw new Error(`${ERROR_MESSAGES.CONTENT_GENERATION_FAILED} for ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async modifyFileContent(fileName: string, currentContent: string, modificationRequest: string): Promise<string> {
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

      const result = await this.generateContent(prompt);
      
      // Clean up any markdown code blocks if present
      const cleanContent = result
        .replace(CONFIG.MARKDOWN_CODE_BLOCK_REGEX, "")
        .replace(CONFIG.MARKDOWN_END_REGEX, "")
        .trim();

      return cleanContent;
    } catch (error) {
      throw new Error(`${ERROR_MESSAGES.FILE_MODIFICATION_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}