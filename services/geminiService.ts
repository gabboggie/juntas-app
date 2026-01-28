
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Acceso seguro a la API KEY. 
 * En producción (GitHub Pages), process no está definido por defecto.
 */
const getApiKey = (): string => {
  try {
    // @ts-ignore
    const envKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
    return envKey || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
// Solo inicializamos si tenemos una llave válida para evitar errores de constructor
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getGeocodingFromGemini = async (locationName: string): Promise<{ lat: number; lng: number } | null> => {
  if (!ai) {
    console.warn("AI no inicializada: Falta API Key");
    return null;
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide the latitude and longitude coordinates for "${locationName}" in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
          required: ["lat", "lng"],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    if (data.lat && data.lng) return data;
    return null;
  } catch (error) {
    console.error("Error obteniendo coordenadas:", error);
    return null;
  }
};

export const suggestEmotionalNote = async (title: string, type: string, location: string): Promise<string> => {
  if (!ai) return "Un momento inolvidable juntas.";
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Escribe una frase muy corta, romántica y emocional para una memoria compartida entre dos mujeres sobre una actividad de ${type} llamada "${title}" en ${location}. Usa un tono íntimo y femenino. Máximo 15 palabras.`,
    });
    return response.text?.trim() || "Un momento inolvidable juntas.";
  } catch (error) {
    console.error("Error sugiriendo nota:", error);
    return "Un día hermoso juntas.";
  }
};
