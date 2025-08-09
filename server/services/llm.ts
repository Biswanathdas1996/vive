import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AnalysisResult, FileStructure } from "@shared/schema";
import { storage } from "../storage";

/**
 * Configuration constants for the LLM service
 */
const CONFIG = {
  JSON_EXTRACTION_REGEX: /\{[\s\S]*\}/,
  MARKDOWN_CODE_BLOCK_REGEX: /```html\n?/g,
  MARKDOWN_END_REGEX: /```\n?$/g,
} as const;

/**
 * Error messages for better error handling
 */
const ERROR_MESSAGES = {
  NO_API_KEY: "API key is not configured for the selected provider",
  NO_JSON_RESPONSE: "No valid JSON found in AI response",
  JSON_PARSE_ERROR: "Failed to parse JSON response from AI",
  CONTENT_GENERATION_FAILED: "Failed to generate content",
  PROMPT_ANALYSIS_FAILED: "Failed to analyze prompt",
  FILE_STRUCTURE_FAILED: "Failed to generate file structure",
  PROMPT_ENHANCEMENT_FAILED: "Failed to enhance prompt",
  FILE_MODIFICATION_FAILED: "Failed to modify file content",
} as const;

// AI Model configurations
const AI_MODELS = {
  gemini: {
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
    defaultModel: "gemini-1.5-flash"
  },
  openai: {
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o"
  },
  claude: {
    models: ["claude-sonnet-4-20250514", "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    defaultModel: "claude-sonnet-4-20250514"
  }
} as const;

interface AIConfig {
  provider: keyof typeof AI_MODELS;
  model: string;
  apiKey: string;
}

/**
 * Get AI configuration from settings or environment
 */
async function getAIConfig(): Promise<AIConfig> {
  const settings = await storage.getSettings("default");
  
  if (!settings) {
    // Default to Gemini with environment variable
    return {
      provider: "gemini",
      model: "gemini-1.5-flash",
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ""
    };
  }

  const apiKey = (settings.apiKeys && settings.apiKeys[settings.aiProvider]) || 
                 process.env[`${settings.aiProvider.toUpperCase()}_API_KEY`] || "";

  return {
    provider: settings.aiProvider as keyof typeof AI_MODELS,
    model: settings.aiModel,
    apiKey
  };
}

/**
 * Generate content using the configured AI provider
 */
async function generateContent(prompt: string): Promise<string> {
  const config = await getAIConfig();

  if (!config.apiKey) {
    throw new Error(`${ERROR_MESSAGES.NO_API_KEY}: ${config.provider}`);
  }

  try {
    switch (config.provider) {
      case "gemini":
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: config.model });
        const geminiResult = await geminiModel.generateContent(prompt);
        return geminiResult.response.text();

      case "openai":
        const openai = new OpenAI({ apiKey: config.apiKey });
        const openaiResponse = await openai.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 4000
        });
        return openaiResponse.choices[0].message.content || "";

      case "claude":
        const claude = new Anthropic({ apiKey: config.apiKey });
        const claudeResponse = await claude.messages.create({
          model: config.model,
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }]
        });
        return claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text : "";

      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  } catch (error) {
    console.error(`Error generating content with ${config.provider}:`, error);
    throw new Error(`${config.provider} API error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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

      const responseText = await generateContent(systemPrompt);

      // Extract JSON from response
      const jsonMatch = responseText.match(CONFIG.JSON_EXTRACTION_REGEX);
      if (!jsonMatch) {
        throw new Error(ERROR_MESSAGES.NO_JSON_RESPONSE);
      }

      const parsedResult = JSON.parse(jsonMatch[0]);
      return parsedResult as AnalysisResult;
    } catch (error) {
      throw new Error(
        `${ERROR_MESSAGES.PROMPT_ANALYSIS_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async generateFileStructure(
    analysisResult: AnalysisResult
  ): Promise<FileStructure> {
    try {
      const prompt = `You're a web dev and architect. Craft a file structure with detailed prompts, rich in UI elements, features, and interactivity for each HTML file.

Keep files top-level in the "public" directory, maintaining simplicity.

Return a JSON of the file structure, each HTML file with a detailed prompt including as many elements as possible for robust pages.

Format:
{
  "public": {
    "type": "directory",
    "children": {
      "index.html": { 
        "type": "file",
        "prompt": "Create a landing page with at least 10 UI elements: [1] responsive navbar, [2] hero section with CTA, [3] features section, [4] statistics counter, [5] testimonials carousel, [6] services overview, [7] about us section, [8] newsletter signup, [9] social widget, [10] footer with details. Use animations, effects, and interactive elements."
      },
      "dashboard.html": { 
        "type": "file",
        "prompt": "Create a dashboard with at least 10 UI elements: [1] top navbar, [2] sidebar with menu, [3] content area, [4] statistics cards, [5] data tables, [6] progress bars, [7] activity feed, [8] quick actions, [9] calendar widget, [10] weather widget. Include responsive layout, data visualization, real-time updates."
      }
    }
  }
}

Generate for: ${JSON.stringify(analysisResult)}

Criteria:
- Every prompt must list at least 10 UI elements
- Each page includes navigation bars, feature cards, forms, tables, modals, sliders, alerts, notifications, footers, banners, buttons, sidebar, headers, carousels, images, and videos.
- ENFORCE: Must have at least 10 UI elements per page.`;

      const responseText = await generateContent(prompt);

      // Extract JSON from response
      const jsonMatch = responseText.match(CONFIG.JSON_EXTRACTION_REGEX);
      if (!jsonMatch) {
        throw new Error(ERROR_MESSAGES.NO_JSON_RESPONSE);
      }

      const parsedResult = JSON.parse(jsonMatch[0]);
      return parsedResult as FileStructure;
    } catch (error) {
      throw new Error(
        `${ERROR_MESSAGES.FILE_STRUCTURE_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async enhanceFilePrompt(
    basePrompt: string,
    fileName: string,
    analysisResult: AnalysisResult
  ): Promise<string> {
    try {
      const enhancementPrompt = `Analyze and enhance the following page prompt to include a comprehensive list of modern UI elements and features:

BASE PROMPT: ${basePrompt}
PAGE: ${fileName}
CONTEXT: ${JSON.stringify(analysisResult)}

Return a detailed and structured list of elements for this page, categorized as follows:

LAYOUT & NAVIGATION:
- [specific element]: [brief description]
- [specific element]: [brief description]

INTERACTIVE COMPONENTS:
- [specific element]: [brief description]
- [specific element]: [brief description]

CONTENT SECTIONS:
- [specific element]: [brief description]
- [specific element]: [brief description]

MODERN FEATURES:
- [specific element]: [brief description]
- [specific element]: [brief description]

DESIGN PATTERNS:
- [specific styling]: [implementation note]
- [specific effect]: [implementation note]

Focus on including as many elements as possible, such as:
• Advanced navigation (sticky headers, mega menus, breadcrumbs)
• Interactive widgets (modals, accordions, carousels, dropdowns, tooltips)
• Content-rich sections (hero banners, feature highlights, testimonials, FAQs, pricing tables)
• Modern forms (multi-step forms, validation, file uploads, search bars)
• Data visualization (charts, graphs, progress bars, statistics cards)
• Responsive layouts (CSS Grid, Flexbox, mobile-first design)
• Accessibility features (ARIA roles, semantic HTML, keyboard navigation)
• Performance optimizations (lazy loading, animations, efficient rendering)

Make each element specific, actionable, and tailored for ${fileName}. Be concise but comprehensive.`;

      const result = await generateContent(enhancementPrompt);
      return result.trim();
    } catch (error) {
      console.warn(
        `Failed to enhance prompt for ${fileName}, using original:`,
        error
      );
      return basePrompt; // Fallback to original prompt if enhancement fails
    }
  }

  async generateFileContent(
    fileName: string,
    analysisResult: AnalysisResult,
    fileStructure: FileStructure
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

      // Enhance the file prompt with AI-generated detailed specifications
      const enhancedFilePrompt = await this.enhanceFilePrompt(
        filePrompt,
        fileName,
        analysisResult
      );

      const prompt = `You are an expert modern web developer specialized in creating high-quality, contemporary HTML5 applications. 
      
Generate a complete, self-contained HTML5 file with ALL styles and JavaScript embedded using <style> and <script> tags for the below BRD

BRD: ${enhancedFilePrompt},

. Do NOT reference external CSS, JS, or image files.

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

Project context: ${JSON.stringify(analysisResult)}

Generate a production-ready, visually stunning HTML5 application that demonstrates modern web development best practices. Return ONLY the complete HTML content without markdown formatting.`;

      const result = await generateContent(prompt);

      // Clean up any markdown code blocks if present
      const cleanContent = result
        .replace(CONFIG.MARKDOWN_CODE_BLOCK_REGEX, "")
        .replace(CONFIG.MARKDOWN_END_REGEX, "")
        .trim();

      return cleanContent;
    } catch (error) {
      throw new Error(
        `${ERROR_MESSAGES.CONTENT_GENERATION_FAILED} for ${fileName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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

      const result = await generateContent(prompt);

      // Clean up any markdown code blocks if present
      const cleanContent = result
        .replace(CONFIG.MARKDOWN_CODE_BLOCK_REGEX, "")
        .replace(CONFIG.MARKDOWN_END_REGEX, "")
        .trim();

      return cleanContent;
    } catch (error) {
      throw new Error(
        `${ERROR_MESSAGES.FILE_MODIFICATION_FAILED} for ${fileName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

export const llmService = new LLMService();
