import { GoogleGenAI, Type } from "@google/genai";
import { ClassificationResult } from "../types";

// Initialize GenAI
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

// Helper to convert blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const classifyAudioWithGemini = async (
  audioBlob: Blob,
  modelContext: string
): Promise<ClassificationResult> => {
  
  const base64Audio = await blobToBase64(audioBlob);

  // gemini-2.5-flash supports audio input via generateContent
  const modelId = "gemini-2.5-flash";

  const prompt = `
    You are an expert Urban Sound Classifier system. 
    Analyze the provided audio clip. 
    
    The user is interested in a classification model described by this notebook context (optional reference):
    ${modelContext.substring(0, 2000)}... (truncated for brevity)

    Classify the audio into one of these urban categories:
    - Siren
    - Dog Bark
    - Drilling
    - Car Horn
    - Street Music
    - Engine Idling
    - Gun Shot
    - Jackhammer
    - Children Playing
    - Air Conditioner
    - Traffic
    
    Return a JSON object with:
    1. "label": The most likely category.
    2. "accuracy": A confidence score between 0 and 100.
    3. "probabilities": An array of objects with "name" (category) and "value" (percentage 0-100) for the top 5 classes.
    4. "explanation": A brief, technical explanation of the audio features (spectral centroid, rhythm, etc.) that led to this decision.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/wav',
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            accuracy: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
            probabilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as ClassificationResult;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to classify audio. Please try again.");
  }
};