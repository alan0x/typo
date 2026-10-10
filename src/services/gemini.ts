import { AvailableModel } from "./storage";

export interface PolishAnalysisItem {
  original: string;
  issue: string;
  suggestion: string;
}

export interface PolishResult {
  bestForAgent: string;
  naturalVersion: string;
  agentReasoning: string;
  analysis: PolishAnalysisItem[];
}

const WARM_SYSTEM_INSTRUCTION = `You are Typo, a warm, thoughtful, and encouraging English writing companion for developers communicating with AI coding agents (like Claude Code, Cursor, Antigravity) and human peers.

Your goal is to guide developers gently, making them feel supported while learning natural English and achieving maximum efficiency.

Given the user's input draft:
1. "bestForAgent": Formulate an optimal, unambiguous, action-oriented prompt tailored for an AI coding assistant. Make sure instructions, expectations, and any validation goals (e.g. verifying status, running tests) are crystal clear.
2. "naturalVersion": Offer a comfortable, natural, and polite phrasing suitable for human conversation (Slack, PR reviews, email).
3. "agentReasoning": Explain in warm, clear Chinese why the agent version is crafted this way (e.g. what potential misinterpretation is prevented).
4. "analysis": Break down specific grammar, spelling, tense, or phrasing improvements in a kind, constructive tone.

Example input:
"I follow this artical： https://code.claude.com/docs/en/advisor to set you run in advisor mode, could you help and check if everything sattle down？"

Example output JSON:
{
  "bestForAgent": "I followed this guide to enable advisor mode: https://code.claude.com/docs/en/advisor. Could you check whether advisor mode is configured correctly and working as expected?",
  "naturalVersion": "I followed this guide: https://code.claude.com/docs/en/advisor to enable advisor mode for you. Could you help me verify that everything is set up correctly?",
  "agentReasoning": "发给 AI Agent 时，明确写出 'working as expected' 比单纯询问是否搞定更具体，能引导 Agent 自动检查配置并验证运行状态，避免被模糊带过。",
  "analysis": [
    { "original": "artical", "issue": "拼写小笔误", "suggestion": "article 或 guide" },
    { "original": "I follow", "issue": "已经完成的操作，用过去式更自然", "suggestion": "I followed" },
    { "original": "set you run", "issue": "动词搭配稍显生硬", "suggestion": "enable advisor mode for you" },
    { "original": "could you help and check", "issue": "句式可以更简练利落", "suggestion": "could you check / verify whether" },
    { "original": "everything sattle down", "issue": "sattle 拼写有误，且 settle down 偏向安顿生活", "suggestion": "everything is set up correctly" }
  ]
}

If the user's input has no obvious mistakes, still provide the refined "bestForAgent" version and a warm encouragement in the analysis.
Return strictly valid JSON conforming to this schema.`;

/**
 * Fetch available generative models from Google Gemini API
 */
export async function fetchGeminiModels(apiKey: string): Promise<AvailableModel[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Please enter your Gemini API Key first.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `Failed to fetch models (HTTP ${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        errorMsg = parsed.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const rawModels: any[] = data.models || [];

  // Filter models that support generateContent and are not embedding/vision-only specialized models
  const contentModels = rawModels.filter((m) => {
    const methods: string[] = m.supportedGenerationMethods || [];
    const name: string = m.name || "";
    return (
      methods.includes("generateContent") &&
      !name.includes("embedding") &&
      !name.includes("aqa")
    );
  });

  // Strip 'models/' prefix for convenience
  const formatted: AvailableModel[] = contentModels.map((m) => {
    const id = m.name.replace(/^models\//, "");
    return {
      id,
      displayName: m.displayName || id,
      description: m.description || "",
    };
  });

  // Prioritize modern Flash & Pro models at top
  const priorityOrder = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ];

  formatted.sort((a, b) => {
    const indexA = priorityOrder.indexOf(a.id);
    const indexB = priorityOrder.indexOf(b.id);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.id.localeCompare(b.id);
  });

  if (formatted.length === 0) {
    throw new Error("No generative models found for this API key.");
  }

  return formatted;
}

/**
 * Polish text using Google Gemini generateContent API
 */
export async function polishTextWithGemini(
  text: string,
  apiKey: string,
  modelName: string = "gemini-2.5-flash"
): Promise<PolishResult> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Gemini API Key is missing. Please set it in settings.");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Input text is empty.");
  }

  // Strip models/ prefix if present
  const cleanModel = modelName.replace(/^models\//, "");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze and optimize the following developer's text with care:\n\n"""\n${trimmed}\n"""`,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: WARM_SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `Gemini API returned status ${response.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        errorMsg = parsed.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("No response received from Gemini.");
  }

  try {
    const result: PolishResult = JSON.parse(rawText);
    return result;
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON:", rawText, err);
    throw new Error("Failed to parse AI response into structured format.");
  }
}
