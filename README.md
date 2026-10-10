# Typo - AI English Coach for Developers 🚀

> **A lightweight desktop HUD companion for developers to polish English and optimize AI prompts in real time.**  
> Select any text → Press hotkey (`Alt + Shift + E`) → Review structured diagnostic cards & AI-optimized prompts → Hit `Enter` to replace in-place.

---

## 💡 Why Typo?

When pairing with AI coding agents like **Claude Code**, **Cursor**, or **Antigravity**, English provides the highest accuracy, minimal ambiguity, and best instruction following. However, non-native English speakers frequently encounter:
1. **Spelling & grammatical oversights** (e.g., `artical`, `sattle down`, or `I follow` when `I followed` was intended).
2. **Ambiguous or sub-optimal prompt structure** (AI agents may misinterpret vague phrases or fail to run status verification).
3. **Broken workflow & context switching**: Manually copying drafts to ChatGPT/Gemini web interfaces, asking for grammar review, and pasting them back disrupts developer flow.

**Typo turns this cumbersome loop into a 1-second background action**:
- 🔍 **Instant Diagnostics**: A breakdown table detailing the original error, underlying grammar/tense/spelling issue, and recommended fixes.
- 🤖 **Agent-First Prompt Optimization**: Generates an unambiguous, action-oriented prompt tailored specifically for AI coding assistants.
- 💬 **Idiomatic Natural Phrasing**: Provides a fluent alternative suitable for human colleagues, GitHub PRs, and Slack.
- ⚡ **Zero-Click In-Place Replacement**: Press `Enter` to automatically overwrite your selected text with the polished prompt and dismiss the HUD.
- 🔑 **Privacy & BYOK**: Bring Your Own Key (Google Gemini API). Your API keys are stored locally on your device and never uploaded to any intermediate servers.

---

## ✨ Features

- **Global Trigger (`Alt + Shift + E`)**: Captures selected text in terminals, IDEs, or browsers without opening a bulky window.
- **Floating HUD Window**: Pops up directly next to your cursor with sleek, transparent frosted-glass styling and boundary detection.
- **Diagnostic Table**: Learn *why* a phrase was modified (`Original` | `Issue` | `Suggestion`), accelerating natural language acquisition.
- **AI Agent Rationales**: Explains why specific wording prompts better agent verification (e.g., asking to check runtime status vs. just configuration files).
- **One-Key In-Place Paste (`Enter`)**: Replaces the source text in your active editor or terminal and hides itself seamlessly.
- **Ultra Lightweight**: Built with **Tauri 2.0 (Rust) + React 19 + Tailwind CSS**, consuming only ~30MB of RAM.

---

## 🛠️ Tech Stack

- **Desktop Framework**: [Tauri 2.0](https://tauri.app/) (Rust backend)
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Iconography**: [Lucide React](https://lucide.dev/)
- **Model Integration**: Google Gemini API (`gemini-2.5-flash` by default for ultra-low latency & high intelligence)
- **Native OS Capabilities**:
  - `tauri-plugin-global-shortcut`: System-level global hotkey listener
  - `tauri-plugin-clipboard-manager`: Safe clipboard management
  - `enigo`: Native key simulation for text selection grab and in-place replacement
  - System Tray integration

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+) & `pnpm`
- Rust & Cargo (1.75+)

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/<org>/typo.git
cd typo

# Install frontend dependencies
pnpm install

# Launch in development mode
pnpm tauri dev
```

### Configuration (BYOK)

1. Launch Typo and click the **Settings (⚙️)** icon in the HUD header.
2. Enter your [Google Gemini API Key](https://aistudio.google.com/app/apikey).
3. Click **Test Gemini Connection** to verify your key.
4. Click **Save Changes**.

---

## ⌨️ Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Summon Typo HUD** | `Alt + Shift + E` |
| **Replace in Source & Dismiss** | `Enter` (when HUD card is focused) |
| **Polish Custom Input** | `Ctrl + Enter` / `Cmd + Enter` |
| **Dismiss HUD** | `Esc` |

---

## 🗺️ Roadmap

- [ ] **Mistake & Vocabulary Notebook**: Automatically collect recurrent spelling and tense mistakes for weekly review.
- [ ] **Selection Hover Widget**: Optional floating pill near the cursor on text selection without needing key combos.
- [ ] **Pronunciation (TTS)**: Listen to native pronunciation of polished expressions.
- [ ] **Multi-Provider Support**: Add OpenAI, Anthropic Claude, DeepSeek, and local Ollama integrations.

---

## 📄 License

MIT License © 2026
