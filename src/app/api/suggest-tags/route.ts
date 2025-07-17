import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { promptContent } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY environment variable not set." },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze the following AI prompt and suggest 3 to 5 relevant, one-or-two-word tags for categorization. The tags should be lowercase and represent the prompt's core concepts, domain, or intent. Respond with only a comma-separated list of the tags.`,
            },
          ],
        },
        {
          role: "model",
          parts: [{ text: "marketing, creative, headline" }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.3,
      },
    });

    const result = await chat.sendMessage(promptContent);
    const response = await result.response;
    const text = response.text();
    const tags = text.split(",").map((tag: string) => tag.trim());
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error suggesting tags from Gemini API:", error);
    return NextResponse.json(
      { error: "Error suggesting tags from Gemini API." },
      { status: 500 }
    );
  }
}
