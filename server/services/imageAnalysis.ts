import { File } from "@google-cloud/storage";
import { llmService } from "./llm";

export class ImageAnalysisService {
  async analyzeImageFromUrl(imageUrl: string): Promise<string> {
    try {
      // First, fetch the image to get the raw data
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString("base64");

      // Determine MIME type from the response headers or URL
      const contentType = response.headers.get("content-type") || "image/jpeg";

      const prompt = `Analyze this design image in detail. Describe the visual elements, layout, color scheme, typography, UI components, and overall design style. Focus on:

1. **Layout & Structure**: How elements are arranged, grid systems, spacing, alignment
2. **Color Palette**: Primary and secondary colors, gradients, contrast levels
3. **Typography**: Font styles, sizes, hierarchy, text treatments
4. **UI Elements**: Buttons, cards, forms, navigation, icons, and their styles
5. **Visual Style**: Modern/classic, minimalist/detailed, professional/casual tone
6. **Interactive Elements**: Hover states, shadows, borders, rounded corners
7. **Content Organization**: How information is grouped and presented

Provide a comprehensive description that a web developer could use to recreate this design style in HTML/CSS.`;

      const result = await llmService.analyzeImageWithPrompt(prompt, imageBase64, contentType);
      return result || "Could not analyze the image";
    } catch (error) {
      console.error("Error analyzing image:", error);
      throw new Error(
        `Failed to analyze image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async analyzeImageFromFile(file: File): Promise<string> {
    try {
      // Download the file data directly from object storage
      const [fileBuffer] = await file.download();
      const imageBase64 = fileBuffer.toString("base64");

      // Get file metadata to determine MIME type
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || "image/jpeg";

      const prompt = `Analyze this design image in detail. Describe the visual elements, layout, color scheme, typography, UI components, and overall design style. Focus on:

1. **Layout & Structure**: How elements are arranged, grid systems, spacing, alignment
2. **Color Palette**: Primary and secondary colors, gradients, contrast levels
3. **Typography**: Font styles, sizes, hierarchy, text treatments
4. **UI Elements**: Buttons, cards, forms, navigation, icons, and their styles
5. **Visual Style**: Modern/classic, minimalist/detailed, professional/casual tone
6. **Interactive Elements**: Hover states, shadows, borders, rounded corners
7. **Content Organization**: How information is grouped and presented

Provide a comprehensive description that a web developer could use to recreate this design style in HTML/CSS.`;

      const result = await llmService.analyzeImageWithPrompt(prompt, imageBase64, contentType);
      return result || "Could not analyze the image";
    } catch (error) {
      console.error("Error analyzing image from file:", error);
      throw new Error(
        `Failed to analyze image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

export const imageAnalysisService = new ImageAnalysisService();
