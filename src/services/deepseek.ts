import { AvailableModel, DEFAULT_DEEPSEEK_MODELS } from "./storage";
import { PolishResult, buildSystemInstruction } from "./gemini";

/**
 * Robustly extract and parse PolishResult JSON from LLM output.
 */
export function extractPolishResult(rawText: string): PolishResult {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

function normalizeBaseUrl(baseUrl?: string): string {
  let url = (baseUrl || "https://api.deepseek.com").trim();
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
}

/**
 * Fetch available models from DeepSeek API (OpenAI compatible endpoint /models)
 */
export async function fetchDeepseekModels(
  apiKey: string,
  baseUrl: string = "https://api.deepseek.com"
): Promise<AvailableModel[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Please enter your DeepSeek API Key first.");
  }

  const endpoint = `${normalizeBaseUrl(baseUrl)}/models`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `DeepSeek API returned status ${response.status}`;
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
  if (!data?.data || !Array.isArray(data.data)) {
    return DEFAULT_DEEPSEEK_MODELS;
  }

  const models: AvailableModel[] = data.data.map((item: any) => {
    const id = item.id;
    if (id === "deepseek-chat") {
      return {
        id,
        displayName: "DeepSeek-V3 (Chat)",
        description: "Fast, accurate, and optimal for real-time writing & coding",
      };
    }
    if (id === "deepseek-reasoner") {
      return {
        id,
        displayName: "DeepSeek-R1 (Reasoner)",
        description: "Deep reasoning model with chain-of-thought analysis",
      };
    }
    return {
      id,
      displayName: id,
      description: item.owned_by ? `Owned by ${item.owned_by}` : undefined,
    };
  });

  return models.length > 0 ? models : DEFAULT_DEEPSEEK_MODELS;
}

/**
 * Polish draft text using DeepSeek API
 */
export async function polishTextWithDeepseek(
  text: string,
  apiKey: string,
  modelName: string = "deepseek-chat",
  targetLanguage: string = "English",
  baseUrl: string = "https://api.deepseek.com"
): Promise<PolishResult> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("DeepSeek API Key is missing. Please set it in preferences.");
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Draft text is empty.");
  }

  const systemInstruction = buildSystemInstruction(targetLanguage);
  const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;

  const isReasoner = modelName.includes("reasoner");

  const payload: Record<string, any> = {
    model: modelName,
    messages: [
      {
        role: "system",
        content: systemInstruction,
      },
      {
        role: "user",
        content: `Draft to polish:\n"""\n${trimmedText}\n"""\n\nReturn strictly valid JSON conforming to the schema.`,
      },
    ],
    temperature: isReasoner ? undefined : 0.3,
  };

  // deepseek-chat supports response_format: { type: "json_object" }
  if (!isReasoner) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `DeepSeek API returned status ${response.status}`;
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
  const rawText = data?.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new Error("No response received from DeepSeek.");
  }

  try {
    return extractPolishResult(rawText);
  } catch (err) {
    console.error("Failed to parse DeepSeek response as JSON:", rawText, err);
    throw new Error("Failed to parse DeepSeek response into structured format.");
  }
}

/**
 * Organize the mistake notebook with DeepSeek
 */
export async function organizeNotebookWithDeepseek(
  notebookMarkdown: string,
  apiKey: string,
  modelName: string = "deepseek-chat",
  baseUrl: string = "https://api.deepseek.com"
): Promise<string> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("DeepSeek API Key is missing. Please set it in preferences.");
  }

  const trimmed = notebookMarkdown.trim();
  if (!trimmed) {
    throw new Error("Notebook is empty.");
  }

  const systemInstruction = `You are organizing a developer's English mistake notebook written in Markdown.

Rules:
1. Merge duplicate or near-duplicate mistakes (same wrong phrase and same correction) into one entry, keeping the most helpful explanation.
2. Group entries under clear "## " category headings (e.g. 拼写 Spelling, 语法 Grammar, 时态 Tense, 措辞 Phrasing, 标点 Punctuation, 其他 Other). Keep entries inside their correct category.
3. Keep every entry's original wording (the wrong phrase, the correction, the explanation) — reorganize and dedupe only, never invent new content.
4. Keep the entry format: "- ~~wrong~~ → **correction** — explanation *(date)*". When merging duplicates from different dates, keep the most recent date.
5. Start the document with "# Typo Mistake Notebook" followed by a one-line summary in Simplified Chinese of entry counts per category.
6. Return ONLY the organized Markdown, no code fences, no commentary.`;

  const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;
  const isReasoner = modelName.includes("reasoner");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: "system",
          content: systemInstruction,
        },
        {
          role: "user",
          content: `Organize this mistake notebook:\n\n"""\n${trimmed}\n"""`,
        },
      ],
      temperature: isReasoner ? undefined : 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMsg = `DeepSeek API returned status ${response.status}`;
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
  let rawText = data?.choices?.[0]?.message?.content;

  if (!rawText || !rawText.trim()) {
    throw new Error("No response received from DeepSeek.");
  }

  rawText = rawText.trim();
  if (rawText.startsWith("```markdown")) {
    rawText = rawText.slice(11);
  } else if (rawText.startsWith("```")) {
    rawText = rawText.slice(3);
  }
  if (rawText.endsWith("```")) {
    rawText = rawText.slice(0, -3);
  }

  return rawText.trim();
}
