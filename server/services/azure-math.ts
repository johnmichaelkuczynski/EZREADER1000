/**
 * Azure OpenAI integration for superior math document processing
 */
import { OpenAI } from 'openai';

const azureOpenAI = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-4o/`,
  defaultQuery: { 'api-version': '2024-02-15-preview' },
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_KEY,
  },
});

/**
 * Extract and process math from PDF using Azure OpenAI with vision capabilities
 */
export async function processMathPDFWithAzure(pdfBuffer: Buffer): Promise<string> {
  if (!process.env.AZURE_OPENAI_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    throw new Error('Azure OpenAI credentials not configured');
  }

  try {
    // Convert PDF to base64 for Azure OpenAI vision
    const base64Pdf = pdfBuffer.toString('base64');
    
    const response = await azureOpenAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting mathematical content from documents. Extract ALL text and mathematical formulas, preserving the exact mathematical notation. 

CRITICAL MATH FORMATTING RULES:
- Use LaTeX format for ALL mathematical expressions
- Inline math: wrap in \\( and \\) 
- Display math: wrap in \\[ and \\]
- Preserve exact mathematical symbols, fractions, integrals, etc.
- Example: The fraction 22/7 should become \\(\\frac{22}{7}\\)
- Example: π should become \\(\\pi\\)
- Example: Integration should use \\(\\int\\), summation \\(\\sum\\), etc.

Extract the complete document with all text and properly formatted LaTeX math.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text and mathematical content from this PDF document. Format all math expressions in proper LaTeX notation.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });

    return response.choices[0].message.content || '';
  } catch (error: any) {
    console.error('Azure OpenAI PDF processing error:', error);
    throw new Error(`Failed to process PDF with Azure OpenAI: ${error.message}`);
  }
}

/**
 * Extract and process math from image using Azure OpenAI vision
 */
export async function processMathImageWithAzure(imageBuffer: Buffer, mimeType: string): Promise<string> {
  if (!process.env.AZURE_OPENAI_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    throw new Error('Azure OpenAI credentials not configured');
  }

  try {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await azureOpenAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting mathematical content from images. Extract ALL text and mathematical formulas, preserving the exact mathematical notation.

CRITICAL MATH FORMATTING RULES:
- Use LaTeX format for ALL mathematical expressions
- Inline math: wrap in \\( and \\)
- Display math: wrap in \\[ and \\]
- Preserve exact mathematical symbols, fractions, integrals, etc.
- Example: The fraction 22/7 should become \\(\\frac{22}{7}\\)
- Example: π should become \\(\\pi\\)
- Example: Integration should use \\(\\int\\), summation \\(\\sum\\), etc.

Extract all content with properly formatted LaTeX math.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text and mathematical content from this image. Format all math expressions in proper LaTeX notation.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });

    return response.choices[0].message.content || '';
  } catch (error: any) {
    console.error('Azure OpenAI image processing error:', error);
    throw new Error(`Failed to process image with Azure OpenAI: ${error.message}`);
  }
}

/**
 * Clean and enhance mathematical text formatting using Azure OpenAI
 */
export async function enhanceMathFormatting(text: string): Promise<string> {
  if (!text || !process.env.AZURE_OPENAI_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
    return text;
  }

  try {
    const response = await azureOpenAI.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert at formatting mathematical text. Your job is to take text with mathematical content and ensure ALL mathematical expressions are properly formatted in LaTeX.

CRITICAL FORMATTING RULES:
- Convert ALL mathematical expressions to proper LaTeX format
- Inline math: wrap in \\( and \\)
- Display math: wrap in \\[ and \\]
- Fractions: \\(\\frac{numerator}{denominator}\\)
- Greek letters: \\(\\pi\\), \\(\\alpha\\), \\(\\beta\\), etc.
- Integrals: \\(\\int\\), summations: \\(\\sum\\)
- Subscripts: \\(x_1\\), superscripts: \\(x^2\\)
- Functions: \\(\\sin\\), \\(\\cos\\), \\(\\log\\), etc.

Return the EXACT same text but with all mathematical expressions properly formatted in LaTeX. Do not change any other content.`
        },
        {
          role: 'user',
          content: `Please format all mathematical expressions in this text using proper LaTeX notation:\n\n${text}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });

    return response.choices[0].message.content || text;
  } catch (error: any) {
    console.error('Azure OpenAI math formatting error:', error);
    return text; // Return original text if enhancement fails
  }
}