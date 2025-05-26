/**
 * Azure OpenAI integration for superior math document processing
 */
import { OpenAI } from 'openai';

const azureOpenAI = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-35-turbo/`,
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
      model: 'gpt-35-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting mathematical content from documents. Extract ALL text and mathematical formulas, preserving the exact mathematical notation. 

CRITICAL MATH FORMATTING RULES:
- Use LaTeX format for ALL mathematical expressions
- Inline math: wrap in \\( and \\) 
- Display math: wrap in \\[ and \\]
- Preserve exact mathematical symbols, formulas, and equations
- Include ALL text content along with the mathematical expressions
- Maintain document structure and formatting`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text and mathematical content from this PDF document. Ensure all mathematical expressions are properly formatted in LaTeX notation.'
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

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Azure OpenAI PDF processing error:', error);
    throw new Error('Failed to process PDF with Azure OpenAI');
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
      model: 'gpt-35-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert at extracting mathematical content from images. Extract ALL text and mathematical formulas, preserving the exact mathematical notation.

CRITICAL MATH FORMATTING RULES:
- Use LaTeX format for ALL mathematical expressions
- Inline math: wrap in \\( and \\)
- Display math: wrap in \\[ and \\]
- Preserve exact mathematical symbols, formulas, and equations
- Include ALL text content along with the mathematical expressions
- Maintain document structure and formatting`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text and mathematical content from this image. Ensure all mathematical expressions are properly formatted in LaTeX notation.'
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

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Azure OpenAI image processing error:', error);
    throw new Error('Failed to process image with Azure OpenAI');
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
      model: 'gpt-35-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert at formatting mathematical text. Your job is to take text with mathematical content and ensure ALL mathematical expressions are properly formatted in LaTeX.

CRITICAL FORMATTING RULES:
- Convert all mathematical expressions to proper LaTeX format
- Inline math: wrap in \\( and \\)
- Display math: wrap in \\[ and \\]
- Preserve all text content exactly as provided
- Only enhance the mathematical formatting, do not change the content
- Ensure fractions use \\frac{numerator}{denominator}
- Ensure superscripts use ^ and subscripts use _
- Preserve mathematical symbols like π, ∞, ∑, ∫, etc.

Return the text with enhanced mathematical formatting but preserve all original content.`
        },
        {
          role: 'user',
          content: `Please enhance the mathematical formatting in this text while preserving all content:\n\n${text}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });

    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error('Azure OpenAI math formatting error:', error);
    // Return original text if formatting fails
    return text;
  }
}