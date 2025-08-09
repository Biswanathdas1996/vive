import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalysisResult, FileStructure } from "@shared/schema";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_API_KEY || "AIzaSyAUwIZJSoHYFp2IZQs1NMdBVH-78yHk6tI"
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
        }`
      );
    }
  }

  async generateFileStructure(
    analysisResult: AnalysisResult
  ): Promise<FileStructure> {
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

Generate comprehensive file structure with extremely detailed prompts for: ${JSON.stringify(
        analysisResult
      )}

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
        }`
      );
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
        `Failed to generate content for ${fileName}: ${
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
        }`
      );
    }
  }
}

export const llmService = new LLMService();
