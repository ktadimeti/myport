import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  const GOOGLE_GEMINI_API_KEY = process.env.GEMINI_API;
  const GOOGLE_GEMINI_AI_MODEL_NAME = 'gemini-1.5-flash';

  if (!GOOGLE_GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API key is not set' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GOOGLE_GEMINI_AI_MODEL_NAME });

  try {
    const { prompt, imageData } = await request.json();

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: "image/png"
        }
      }
    ]);

    const response = await result.response;
    const generatedInsights = response.text();

    return NextResponse.json({ text: generatedInsights });
  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
