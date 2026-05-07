import Groq from "groq-sdk";
import { Mistral } from "@mistralai/mistralai";
import { Marketplace } from "../types";

export type AISericeEngine = 'groq' | 'mistral';

const GET_PROMPT = (keywordCount: number, useSingleWordKeywords: boolean = false, marketplace: Marketplace = 'shutterstock') => {
  const marketplaceNames: Record<Marketplace, string> = {
    shutterstock: "Shutterstock"
  };

  const name = marketplaceNames[marketplace];
  const keywordInstruction = useSingleWordKeywords 
    ? "Each keyword MUST be a SINGLE WORD only (no phrases, no spaces)." 
    : "Keywords can be single words or highly relevant short phrases.";

  return `Analyze this image and generate professional metadata strictly for the ${name} marketplace.
DO NOT use any special or "social" characters such as forward slashes (/), hashtags (#), or at symbols (@) in the description or keywords.
${keywordInstruction}
You MUST return ONLY a valid JSON object with EXACTLY these fields:
{
  "description": "A descriptive, SEO-optimized title (70-200 characters). Describe the literal content, setting, and mood without flowery adjectives. NO FORWARD SLASHES (/).",
  "keywords": ["keyword1", "keyword2", "... at least 25 and up to ${keywordCount} keywords"],
  "category1": "Main Category Name",
  "category2": "Optional Sub-Category Name or empty string"
}

Pick categories from this list: Abstract, Animals/Wildlife, Arts, Backgrounds/Textures, Beauty/Fashion, Buildings/Landmarks, Business/Finance, Celebrities, Education, Food and drink, Healthcare/Medical, Holidays, Industrial, Interiors, Miscellaneous, Nature, Objects, Parks/Outdoor, People, Religion, Science, Signs/Symbols, Sports/Recreation, Technology, Transportation, Vintage.

Category 1 is the primary focus. Category 2 should be a secondary relevant theme or left as an empty string if no other category fits.

Commercial focus is mandatory. Use specific technical terms, color descriptions, and conceptual keywords (e.g., 'sustainability', 'future', 'copy space'). 
PRIORITIZE keywords based on high commercial search volume and marketplace relevance for ${name}.
YOU MUST PROVIDE AT LEAST 25 AND UP TO ${keywordCount} KEYWORDS. NEVER EXCEED 50 KEYWORDS UNDER ANY CIRCUMSTANCES.`;
};

export const generateMetadata = async (
  base64Image: string, 
  mimeType: string, 
  engine: AISericeEngine = 'mistral',
  customApiKey?: string,
  keywordCount: number = 35,
  useSingleWordKeywords: boolean = false,
  marketplace: Marketplace = 'shutterstock'
) => {
  const prompt = GET_PROMPT(keywordCount, useSingleWordKeywords, marketplace);
  let result;
  if (engine === 'groq') {
    result = await generateMetadataGroq(base64Image, mimeType, prompt, customApiKey);
  } else {
    result = await generateMetadataMistral(base64Image, mimeType, prompt, customApiKey);
  }

  // Strict sanitization to remove social characters as requested (e.g., /)
  const sanitize = (str: string) => str.replace(/[/@#]/g, ' ').replace(/\s+/g, ' ').trim();

  if (result) {
    if (typeof result.description === 'string') {
      result.description = sanitize(result.description);
    }
    if (Array.isArray(result.keywords)) {
      result.keywords = result.keywords
        .map((k: any) => {
          if (typeof k !== 'string') return '';
          let sanitized = sanitize(k);
          if (useSingleWordKeywords) {
            // Keep only the first word if single word is enforced
            sanitized = sanitized.split(' ')[0] || '';
          }
          return sanitized;
        })
        .filter((k: string) => k && k.length > 0)
        .slice(0, Math.min(keywordCount, 50));
    }
  }
  
  return result;
};

const generateMetadataGroq = async (base64Image: string, mimeType: string, prompt: string, customApiKey?: string) => {
  if (!customApiKey) throw new Error("Groq API Key is required");
  
  const groq = new Groq({ apiKey: customApiKey, dangerouslyAllowBrowser: true });
  const model = "llama-3.2-11b-vision-instruct"; // Updated to instruct model as per user query context

  try {
    const chatCompletion = await groq.chat.completions.create({
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": prompt
            },
            {
              "type": "image_url",
              "image_url": {
                "url": `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      "model": model,
      "temperature": 0.5,
      "max_tokens": 1024,
      "top_p": 1,
      "stream": false,
      "response_format": {
        "type": "json_object"
      },
      "stop": null
    });

    const text = chatCompletion.choices[0]?.message?.content || "{}";
    return parseJSONData(text);
  } catch (error) {
    console.error("Groq API Error details:", error);
    throw error;
  }
};

const generateMetadataMistral = async (base64Image: string, mimeType: string, prompt: string, customApiKey?: string) => {
  if (!customApiKey) throw new Error("Mistral API Key is required");
  
  const client = new Mistral({ apiKey: customApiKey });
  const model = "pixtral-12b-2409";

  try {
    const response = await client.chat.complete({
      model: model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              imageUrl: `data:${mimeType};base64,${base64Image}`
            }
          ]
        }
      ],
      responseFormat: {
        type: "json_object"
      }
    });

    // Handle potential array response from Mistral
    const content: any = response.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content : (Array.isArray(content) ? content[0]?.text : "{}") || "{}";
    return parseJSONData(text);
  } catch (error: any) {
    if (error.message && error.message.includes('401')) {
      throw new Error(`Mistral Unauthorized: Please check if API Key is valid and active.`);
    }
    console.error("Mistral API Error details:", error);
    throw error;
  }
};

const parseJSONData = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.error("JSON Parse Error. Raw Text:", text);
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Invalid AI response format");
  }
};
