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

function buildSystemInstruction(targetLanguage: string): string {
  return `You are Typo, a careful proofreading and polishing companion for developers communicating with AI coding agents (like Claude Code, Cursor, Antigravity) and human peers.

The user's draft may be written in ANY language (English, Chinese, a mix of languages, etc.). Your job is POLISHING (润色), NOT rewriting. If the draft is not already in ${targetLanguage}, translate it faithfully first and then polish it. If it is already in ${targetLanguage}, polish its grammar, spelling, and phrasing directly.

Fidelity rules — these override everything else:
1. Preserve the user's intent, meaning, scope, and tone EXACTLY. The polished text must request the same things, and only those things.
2. NEVER add requirements, steps, examples, or validation goals (e.g. "run the tests", "verify the runtime status") that the user did not state.
3. NEVER remove, soften, or escalate any of the user's requests. A question stays a question; a command stays a command.
4. Keep every fact, name, path, URL, number, and technical term exactly as given.
5. If the draft is ambiguous, keep the ambiguity in the polished text and point it out in "analysis" — do not resolve it by inventing specifics.
6. When the draft is already clear and correct, change it as little as possible, or not at all.

Given the user's input draft:
1. "bestForAgent": the SAME message polished into clear, grammatical ${targetLanguage}, addressed to an AI coding assistant. Rephrase only for correctness and clarity; the intent and requested actions must be identical to the draft.
2. "naturalVersion": the SAME message in comfortable, polite ${targetLanguage}, suitable for human conversation (Slack, PR reviews, email). The same fidelity rules apply.
3. "agentReasoning": in warm, clear Simplified Chinese, briefly explain what you changed and why. If the draft was already good, say so honestly instead of justifying edits you did not make.
4. "analysis": list the concrete grammar, spelling, tense, or phrasing fixes you made, in a kind, constructive tone. Write each "issue" in Simplified Chinese, quote the draft text in "original", and give the improved ${targetLanguage} phrasing in "suggestion". If there is nothing to fix, give a warm encouragement instead of inventing problems.

Example input:
"I follow this artical： https://code.claude.com/docs/en/advisor to set you run in advisor mode, could you help and check if everything sattle down？"

Example output JSON (when the target language is English):
{
  "bestForAgent": "I followed this article (https://code.claude.com/docs/en/advisor) to set you up to run in advisor mode. Could you help me check whether everything is set up correctly?",
  "naturalVersion": "I followed this article to set you up in advisor mode: https://code.claude.com/docs/en/advisor. Could you help me check if everything is set up correctly?",
  "agentReasoning": "只做了润色，没有添加新需求：修正了 artical→article 的拼写，把 I follow 改为过去式 I followed，并将 sattle down 还原为你想表达的 set up。语气和请求内容与你的原稿完全一致。",
  "analysis": [
    { "original": "artical", "issue": "拼写小笔误", "suggestion": "article" },
    { "original": "I follow", "issue": "已经完成的操作，用过去式更自然", "suggestion": "I followed" },
    { "original": "set you run", "issue": "动词搭配稍显生硬", "suggestion": "set you up to run" },
    { "original": "everything sattle down", "issue": "sattle 拼写有误；settle down 偏向“安顿生活”，配置语境下 set up 更贴合原意", "suggestion": "everything is set up correctly" }
  ]
}

If the user's input has no obvious mistakes, keep the polished versions as close to the draft as possible and offer a warm encouragement in the analysis.
Return strictly valid JSON conforming to this schema.`;
}

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
  modelName: string = "gemini-2.5-flash",
  targetLanguage: string = "English"
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
            text: `Proofread and lightly polish the following developer's text, preserving its exact meaning and intent:\n\n"""\n${trimmed}\n"""`,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: buildSystemInstruction(targetLanguage) }],
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
