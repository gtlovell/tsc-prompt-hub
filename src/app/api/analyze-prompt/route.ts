import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const analysisPrompt = `Analyze the following prompt and provide feedback on its clarity, specificity, and potential for generating a high-quality response. Then, offer an enhanced version of the prompt that incorporates your feedback.\n\nOriginal Prompt: "${prompt}"`;

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const text = await response.text();

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error("Error analyzing prompt:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
