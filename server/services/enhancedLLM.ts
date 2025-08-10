import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { AnalysisResult, FileStructure, Settings } from "@shared/schema";
import { storage } from "../storage";

// AI provider validation now comes from database

interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
}

export class EnhancedLLMService {
  private currentConfig: AIConfig | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;
  private openaiClient: OpenAI | null = null;
  private claudeClient: Anthropic | null = null;

  /**
   * Initialize AI clients based on current settings
   */
  private async initializeClients(config: AIConfig) {
    this.currentConfig = config;

    try {
      switch (config.provider) {
        case "gemini":
          this.geminiClient = new GoogleGenerativeAI(config.apiKey);
          break;
        case "openai":
          this.openaiClient = new OpenAI({ apiKey: config.apiKey });
          break;
        case "claude":
          this.claudeClient = new Anthropic({ apiKey: config.apiKey });
          break;
      }
      console.log(`✓ Initialized ${config.provider} client with model ${config.model}`);
    } catch (error) {
      console.error(`Failed to initialize ${config.provider} client:`, error);
      throw error;
    }
  }

  /**
   * Get current settings and configure AI provider
   */
  private async getAIConfig(): Promise<AIConfig> {
    const settings = await storage.getSettings("default");
    
    if (!settings) {
      throw new Error("No settings found in database. Please configure AI provider and API keys in settings.");
    }

    // Validate provider exists in database
    const provider = await storage.getAiProviderByKey(settings.aiProvider);
    if (!provider) {
      throw new Error(`AI provider '${settings.aiProvider}' not found in database.`);
    }

    // Validate model exists for this provider
    const models = await storage.getAiModelsByProvider(provider.id);
    const selectedModel = models.find(m => m.key === settings.aiModel);
    if (!selectedModel) {
      throw new Error(`AI model '${settings.aiModel}' not found for provider '${settings.aiProvider}'.`);
    }

    const apiKey = (settings.apiKeys && settings.apiKeys[settings.aiProvider]) || "";
    if (!apiKey) {
      throw new Error(`API key not found for ${settings.aiProvider}. Please configure it in settings.`);
    }

    return {
      provider: settings.aiProvider,
      model: settings.aiModel,
      apiKey
    };
  }

  /**
   * Generate content using the configured AI provider
   */
  private async generateContent(prompt: string): Promise<string> {
    const config = await this.getAIConfig();
    
    if (!this.currentConfig || 
        this.currentConfig.provider !== config.provider || 
        this.currentConfig.model !== config.model ||
        this.currentConfig.apiKey !== config.apiKey) {
      await this.initializeClients(config);
    }

    if (!config.apiKey) {
      throw new Error(`API key not found for ${config.provider}. Please configure it in settings.`);
    }

    try {
      switch (config.provider) {
        case "gemini":
          const geminiModel = this.geminiClient!.getGenerativeModel({ model: config.model });
          const geminiResult = await geminiModel.generateContent(prompt);
          return geminiResult.response.text();

        case "openai":
          const openaiResponse = await this.openaiClient!.chat.completions.create({
            model: config.model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000
          });
          return openaiResponse.choices[0].message.content || "";

        case "claude":
          const claudeResponse = await this.claudeClient!.messages.create({
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
      const jsonMatch = response.match(/\{[\s\S]*\}/);
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
      },
      "dashboard.html": { 
        "type": "file",
        "prompt": "Create a feature-rich dashboard with at least 10 distinct UI elements: [1] top navigation bar with user profile dropdown, notifications bell, search bar, settings gear; [2] sidebar navigation with collapsible menu items, user avatar, role indicator; [3] main content area with welcome message and personalized greeting; [4] statistics cards with charts/graphs showing KPIs; [5] data tables with sorting/filtering/pagination controls; [6] progress bars showing completion status; [7] activity feed with real-time updates; [8] quick action buttons for common tasks; [9] calendar widget showing upcoming events; [10] weather widget with location-based data; [11] recent activities list with timestamps; [12] performance metrics dashboard; [13] notification center with toast messages; [14] user profile modal with edit capabilities; [15] settings panel with form controls for preferences, theme switcher, account management options; [16] dark/light mode toggle; [17] interactive charts with drill-down functionality; [18] export/download buttons; [19] help tooltip system; [20] breadcrumb navigation. Include responsive layout, data visualization, real-time updates, drag-and-drop widgets, and comprehensive accessibility features."
      }
    }
  }
}

Generate comprehensive file structure with extremely detailed prompts for: ${JSON.stringify(analysisResult)}

Requirements:
- Each prompt should be extremely detailed (10-20+ sentences minimum)
- MANDATORY: Each page MUST include at least 10 distinct UI elements from different categories
- Include ALL possible UI components: navigation bars, hero sections, feature cards, testimonial carousels, pricing tables, contact forms, login/signup forms, data tables with sorting/filtering, modal dialogs, dropdown menus, accordions, tabs, progress bars, charts/graphs, statistics counters, image galleries, video players, search bars, filters, pagination, breadcrumbs, tooltips, alerts, notifications, sidebars, footers with multiple sections, banners, call-to-action buttons, social media widgets, rating systems, comment sections, subscription boxes, countdown timers, loading spinners, progress indicators, status badges, tag clouds, comparison tables, slider controls, toggle switches, step indicators, breadcrumb navigation, mega menus, floating action buttons, sticky headers, scroll-to-top buttons, image carousels, video backgrounds, parallax sections, testimonial cards, team member cards, service showcase grids, product catalog displays
- Specify comprehensive interactive elements: hover animations, click effects, smooth transitions, parallax scrolling, sticky navigation, mobile hamburger menus, carousel controls, form validation with real-time feedback, multi-step wizards, collapsible sections, expandable cards, infinite scroll, drag-and-drop functionality, sortable lists, resizable panels, interactive maps, zoom functionality, lightbox galleries, video players with custom controls, audio players, interactive timelines, filterable portfolios, live search suggestions, real-time chat interfaces, notification toasts, modal overlays, slide-out panels, accordion menus, tabbed content areas, progress tracking, step-by-step guides, interactive tutorials, gamification elements
- Detail extensive content sections: multi-level navigation, hero with video/image backgrounds, feature highlight areas, service/product showcases, team member profiles, client testimonials, FAQ sections, blog previews, social media feeds, newsletter signups, company information, location maps, contact details, pricing comparison tables, feature matrices, case studies, portfolio galleries, resource libraries, download centers, event calendars, news sections, press releases, career listings, partner showcases, award displays, certification badges, security compliance indicators
- Include advanced modern web features: fully responsive layouts for all screen sizes, progressive web app features, dark/light theme toggles, accessibility compliance, SEO optimization, performance optimization, lazy loading, image optimization, offline functionality, push notifications, geolocation services, camera integration, voice search, AI chatbots, real-time collaboration, live updates, websocket connections, API integrations, third-party service connections
- Specify comprehensive form elements: text inputs with validation, email fields, password fields with strength indicators, select dropdowns, multi-select options, radio buttons, checkboxes, date pickers, time pickers, color pickers, range sliders, file upload with drag-drop, WYSIWYG editors, markdown editors, code editors, search with autocomplete, filters with real-time results, conditional form fields, multi-step forms, form progress indicators, field dependencies, dynamic form generation, form templates, autosave functionality, form analytics
- Add extensive data visualization: interactive charts (line, bar, pie, donut, scatter, bubble, radar, heatmap, treemap, candlestick), real-time dashboards, progress indicators, KPI cards, comparison tables, trend graphs, analytics panels, data tables with advanced filtering, sorting and pagination, export functionality, data drill-down capabilities, custom date range selectors, metric calculators, performance benchmarks, goal tracking displays, conversion funnels, user journey maps
- Include complete user interface systems: user authentication (login/signup/forgot password/2FA), user profiles with avatars and settings, notification systems, messaging interfaces, admin panels, role-based access controls, activity logs, preference settings, account management, billing interfaces, subscription management, permission systems, audit trails, system monitoring dashboards, user onboarding flows, help systems, knowledge bases, ticketing systems, feedback collection
- Consider comprehensive accessibility: ARIA labels, keyboard navigation, screen reader compatibility, color contrast compliance, focus indicators, semantic HTML structure, alternative text for images, captions for videos, high contrast modes, font size controls, screen reader announcements, skip navigation links, focus management
- ENFORCE MINIMUM REQUIREMENT: Count and explicitly list at least 10 different UI elements for each page using numbered format [1], [2], [3], etc.
- FORMAT REQUIREMENT: Each prompt must start with "Create a [page type] with at least 10 distinct UI elements:" followed by numbered list of elements
- VALIDATION: Verify each page has minimum 10 numbered UI elements before generating the JSON
- Make each page a complete, production-ready application with maximum features and functionality

CRITICAL: Every single page must have numbered UI elements [1] through [10] minimum. If a page has fewer than 10 elements, add more until it reaches at least 10 numbered elements.`;

      const response = await this.generateContent(prompt);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsedResult = JSON.parse(jsonMatch[0]);
      return parsedResult as FileStructure;
    } catch (error) {
      throw new Error(`Failed to generate file structure: ${error instanceof Error ? error.message : String(error)}`);
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

      const result = await this.generateContent(enhancementPrompt);
      return result.trim();
    } catch (error) {
      console.warn(`Failed to enhance prompt for ${fileName}, using original:`, error);
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

CSS STYLE GUIDELINES:
- Use CSS custom properties for colors and spacing
- Implement modern color schemes (dark/light themes when appropriate)
- Apply sophisticated hover effects and focus states
- Use backdrop-filter, filter effects, and modern CSS features
- Implement smooth scrolling and polished user interactions
- Create depth with layered shadows and subtle gradients

File: ${fileName}
Enhanced Specific Requirements: ${enhancedFilePrompt}
Project context: ${JSON.stringify(analysisResult)}

Generate a production-ready, visually stunning HTML5 application that demonstrates modern web development best practices. Return ONLY the complete HTML content without markdown formatting.`;

      const result = await this.generateContent(prompt);
      
      // Clean up any markdown code blocks if present
      const cleanContent = result
        .replace(/```html\n?/g, "")
        .replace(/```\n?$/g, "")
        .trim();

      return cleanContent;
    } catch (error) {
      throw new Error(`Failed to generate content for ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
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
        .replace(/```html\n?/g, "")
        .replace(/```\n?$/g, "")
        .trim();

      return cleanContent;
    } catch (error) {
      throw new Error(`Failed to modify file content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available models for a specific provider from database
   */
  async getAvailableModels(providerKey: string): Promise<string[]> {
    try {
      const provider = await storage.getAiProviderByKey(providerKey);
      if (!provider) {
        return [];
      }
      const models = await storage.getAiModelsByProvider(provider.id);
      return models.map(model => model.key);
    } catch (error) {
      console.error(`Error fetching models for provider ${providerKey}:`, error);
      return [];
    }
  }

  /**
   * Get current AI configuration
   */
  async getCurrentConfig(): Promise<AIConfig> {
    return await this.getAIConfig();
  }
}

export const enhancedLLMService = new EnhancedLLMService();