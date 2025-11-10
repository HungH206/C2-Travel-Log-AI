import { GoogleGenAI } from "@google/genai";
import { FormData, CalculationResult } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY is not set');
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const responseSchema = {
  type: 'object',
  properties: {
    route_co2: { type: 'number' },
    electric_co2: { type: 'number' },
    total_co2: { type: 'number' },
    distance_km: { type: 'number' },
    summary: { type: 'string' },
    advice: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['route_co2', 'electric_co2', 'total_co2', 'distance_km', 'summary', 'advice'],
};

function buildPrompt(formData: FormData, distance_km: number): string {
    return `
You are an expert in calculating carbon footprints for travel. Your task is to analyze the user's travel and energy data, calculate the CO₂ emissions, and provide actionable advice for reducing their environmental impact.

User's Data:
- Start Location: ${formData.start_location}
- Destination: ${formData.destination}
- Route Distance: ${distance_km.toFixed(1)} km (This is a precise value, do not estimate it)
- Transport Mode: ${formData.transport_mode}
- Electricity Used (for EV, optional): ${formData.electricity_kwh || '0'} kWh

Instructions:
1.  **Use Provided Distance:** Use the exact route distance provided above.
2.  **Calculate Route CO₂:** Using the provided distance, calculate the CO₂ emissions for the route based on the transport mode. Use these emission factors:
    - car: 0.21 kg CO₂ per km
    - bus: 0.06 kg CO₂ per km
    - bike: 0.0 kg CO₂ per km
    - plane: 0.25 kg CO₂ per km
3.  **Calculate Electric CO₂:** If electricity usage is provided (value greater than 0), calculate the CO₂ emissions from charging an electric vehicle. Use an emission factor of 0.45 kg CO₂ per kWh. If no electricity is used, this value must be 0.
4.  **Calculate Total CO₂:** Sum the route and electric CO₂ emissions.
5.  **Create Summary:** Write a brief, one-sentence summary of the total emissions for the trip.
6.  **Generate Advice:** Provide a list of 3-4 personalized, actionable, and encouraging tips for reducing their carbon footprint based on their specific inputs. For example, if they drove a car, suggest public transport or carpooling and quantify the savings. If they used an EV, commend them and suggest off-peak charging. For a plane, suggest alternative transport for shorter distances or flying economy.
7.  **Format Output:** Return the entire response as a JSON object that strictly adheres to the provided schema. The 'distance_km' in the response must match the provided distance. Round all CO₂ values to one decimal place. Do not include any markdown formatting like \`\`\`json in your response.
`;
}

export async function getTravelAdvice(formData: FormData, distance_km: number): Promise<CalculationResult> {
  try {
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    const prompt = buildPrompt(formData, distance_km);
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    let jsonText = response.text.trim();
    
    // Clean up potential markdown formatting from the response
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice("```json".length).trim();
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3).trim();
    }

    const result = JSON.parse(jsonText);
    
    if (result && typeof result.total_co2 === 'number' && Array.isArray(result.advice)) {
      return result as CalculationResult;
    } else {
      throw new Error("Invalid response format from API");
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY.');
      }
      if (error instanceof SyntaxError) {
        throw new Error("Received invalid response from Gemini API. Please check your API key and try again.");
      }
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error("Failed to get travel advice from AI. Please try again.");
  }
}