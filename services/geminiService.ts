import { FormData, CalculationResult } from '../types';

// Use a plain JSON schema (no dependency on @google/genai Type enum) so the
// file can be bundled safely for the client. The server-side implementation
// (which uses the official client) may re-use this schema when invoking the
// model.
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
    const prompt = buildPrompt(formData, distance_km);
    // Always call our server proxy. Do not initialize the GenAI client in the browser.
    const resp = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, responseSchema }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Gemini proxy error (${resp.status}): ${text}`);
    }

    const result = await resp.json();
    
    if (result && typeof result.total_co2 === 'number' && Array.isArray(result.advice)) {
      return result as CalculationResult;
    } else {
      throw new Error("Invalid response format from API");
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof SyntaxError) {
      // Most likely the server returned HTML (e.g., 404 page) or a non-JSON error.
      throw new Error('Invalid response from server. Is the /api/gemini endpoint running?');
    }
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to get travel advice from AI.');
  }
}