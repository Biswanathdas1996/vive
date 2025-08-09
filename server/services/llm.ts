import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalysisResult, FileStructure } from "@shared/schema";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY || "AIzaSyAUwIZJSoHYFp2IZQs1NMdBVH-78yHk6tI",
);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

console.log("Google API Key:", process.env.GOOGLE_API_KEY);

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
        `Failed to analyze prompt: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async generateFileStructure(
    analysisResult: AnalysisResult,
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
        `Failed to generate file structure: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async enhanceFilePrompt(
    basePrompt: string,
    fileName: string,
    analysisResult: AnalysisResult,
  ): Promise<string> {
    try {
      const enhancementPrompt = `Analyze this page prompt and generate a comprehensive modern UI feature list:

BASE PROMPT: ${basePrompt}
PAGE: ${fileName}
CONTEXT: ${JSON.stringify(analysisResult)}

Return a structured list of specific modern web elements and features for this page. Format as:

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

Focus on:
• Contemporary UI patterns (glassmorphism, neumorphism, gradients)
• Interactive elements (modals, dropdowns, carousels, accordions)
• Modern forms (multi-step, validation, file upload, search)
• Data visualization (charts, progress bars, statistics cards)
• Responsive layouts (CSS Grid, Flexbox, mobile-first)
• Accessibility features (ARIA, semantic HTML, keyboard nav)
• Performance optimizations (lazy loading, animations)

Make each element specific and actionable for ${fileName}. Be concise but comprehensive.`;

      const result = await model.generateContent(enhancementPrompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.warn(
        `Failed to enhance prompt for ${fileName}, using original:`,
        error,
      );
      return basePrompt; // Fallback to original prompt if enhancement fails
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

      // Enhance the file prompt with AI-generated detailed specifications
      const enhancedFilePrompt = await this.enhanceFilePrompt(
        filePrompt,
        fileName,
        analysisResult,
      );

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
Must have Requirements: ${enhancedFilePrompt}
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
        `Failed to generate content for ${fileName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
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
        `Failed to modify ${fileName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

export const llmService = new LLMService();
