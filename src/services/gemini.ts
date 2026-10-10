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

const SYSTEM_INSTRUCTION = `You are Typo, an expert English writing coach specifically designed for developers communicating with AI coding agents (such as Claude Code, Cursor, Antigravity) and human colleagues.

Your job is to analyze the user's input text (which may contain spelling errors, grammatical mistakes, awkward phrasing, or Chinese thoughts), and provide:
1. "bestForAgent": The optimal, clear, and unambiguous English prompt tailored for AI coding agents. It should explicitly convey intent, state expectations, and guide the AI agent to verify or perform the required actions without ambiguity.
2. "naturalVersion": A natural, idiomatic, polite English expression for human colleagues (e.g., Slack, GitHub, email).
3. "agentReasoning": A brief explanation in Chinese highlighting why this phrasing is superior for an AI Agent (e.g., what ambiguity was eliminated, what instruction was made explicit).
4. "analysis": A breakdown array of specific errors found in the original text (such as spelling errors, tense misuse, unidiomatic collocations, redundant phrases), with clear Chinese explanations.

Example of expected output structure:
Input: "I follow this artical： https://code.claude.com/docs/en/advisor to set you run in advisor mode, could you help and check if everything sattle down？"
Output JSON:
{
  "bestForAgent": "I followed this guide to enable advisor mode: https://code.claude.com/docs/en/advisor. Could you check whether advisor mode is configured correctly and working as expected?",
  "naturalVersion": "I followed this guide: https://code.claude.com/docs/en/advisor to enable advisor mode for you. Could you help me verify that everything is set up correctly?",
  "agentReasoning": "发给 AI Agent 时，使用 'working as expected' 比单纯询问是否就绪更具体，能促使 Agent 主动核对配置并验证实际运行状态，避免误解。",
  "analysis": [
    { "original": "artical", "issue": "拼写错误", "suggestion": "article 或 guide" },
    { "original": "I follow", "issue": "配置已完成，应使用一般过去时", "suggestion": "I followed" },
    { "original": "set you run in advisor mode", "issue": "搭配与语法不自然", "suggestion": "enable advisor mode for you" },
    { "original": "could you help and check", "issue": "句式表达稍显冗余", "suggestion": "could you help me verify / check whether" },
    { "original": "everything sattle down", "issue": "sattle 拼写错误，且 settle down 不符合此语境", "suggestion": "everything is set up correctly / configured properly" }
  ]
}

If the user's input already has no obvious errors, still offer the polished "bestForAgent" version and a compliment/affirmation in the analysis array.
Always reply with valid JSON matching the schema.`;

export async function polishTextWithGemini(
  text: string,
  apiKey: string,
  modelName: string = "gemini-2.5-flash"
): Promise<PolishResult> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Gemini API Key is missing. Please configure it in settings.");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Input text is empty.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze and optimize the following developer's text:\n\n"""\n${trimmed}\n"""`,
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
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
