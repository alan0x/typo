# Typo — AI English Coach & Prompt Lab 🚀

> **A quiet, editorial-grade desktop HUD for developers to refine English drafts and craft unambiguous AI prompts in real time.**  
> Highlight text anywhere → Trigger via `Alt + Shift + E` (or `⌥⇧E`) → Review proofreading notes & optimized prompts → Press `Enter` to replace in-place.

---

<p align="center">
  <img src="assets/screenshot-main.png" alt="Typo Real Interface Screenshot" width="85%" style="border-radius: 12px; box-shadow: 0 16px 36px rgba(0,0,0,0.12);" />
</p>

---

## 💡 Why Typo?

When pairing with autonomous AI coding agents like **Claude Code**, **Cursor**, or **Antigravity**, English provides the most reliable instruction following and technical context. However, non-native English speakers frequently encounter three friction points:

1. **Spelling & grammatical oversights**: Small slips like `artical` or `I follow` (when `I followed` was intended) degrade prompt quality.
2. **Ambiguous directives**: Vague wording like *"check if everything settled down"* invites superficial replies rather than thorough execution.
3. **Severe context switching**: Copying back and forth between terminal/IDE and web LLM chats fragments developer flow.

**Typo compresses this entire review cycle into a single keystroke**:
- 🔍 **Proofreading Marginalia**: Striking through errors and offering concise notes on idiomatic nuance.
- 🤖 **Agent-First Directives**: Generating action-oriented prompts that instruct agents to verify runtime status and execute tests.
- 💬 **Peer Phrasing**: Providing natural colloquial alternatives for Slack and GitHub reviews.
- ⚡ **Zero-Friction In-Place Replacement**: Pressing `Enter` automatically writes the refined text back to your editor and dismisses the window.

---

## 📸 Real Interface Tour

### 1. The Prompt Workshop & Editorial Breakdown
Actual capture of the desktop HUD in action:

<p align="center">
  <img src="assets/screenshot-main.png" alt="Typo Prompt Workshop Screenshot" width="85%" style="border-radius: 12px; box-shadow: 0 16px 36px rgba(0,0,0,0.12);" />
</p>

- **01 / Optimal For AI Agent**: Precision prompt with an editorial observation (*`Obs.`*) explaining why the phrasing elicits superior agent behavior.
- **02 / Casual & Peer Phrasing**: Clean alternatives for team communications.
- **03 / Proofreading Notes**: Side-by-side annotations showing crossed-out original text with grammatical rationale.

---

### 2. BYOK & Dynamic Model Discovery
Bring Your Own Key directly from Google AI Studio. Typo automatically queries the Google Generative AI registry to populate your active key's real model options:

<p align="center">
  <img src="assets/screenshot-preferences.png" alt="Preferences and Real Model Discovery Screenshot" width="70%" style="border-radius: 12px; box-shadow: 0 16px 36px rgba(0,0,0,0.12);" />
</p>

---

## ✨ Core Features

- **🎯 Cross-Platform Global Summon**: Works globally on Windows (`Alt + Shift + E`) and macOS (`⌥⇧E`).
- **⚡ Native Text Capture**: Automatically grabs selected text upon hotkey trigger without manual `Ctrl+C`.
- **🖐️ Full Titlebar Dragging**: Smooth, native window movement anywhere across the top bar.
- **🤖 Dynamic Model Routing**: Query and switch between `gemini-2.5-flash`, `gemini-2.5-pro`, and any available generative model.
- **🌿 Quiet Craftsmanship**: Warm linen canvas (`#f7f6f2`), quiet typography, and zero flashy gimmicks.
- **🪶 Ultra-Low Footprint**: Powered by **Tauri 2.0 (Rust) + React 19 + Tailwind CSS**, consuming only ~30MB of RAM.

---

## ⌨️ Shortcuts Reference

| Action | Windows / Linux | macOS |
| :--- | :--- | :--- |
| **Summon Typo HUD** | `Alt + Shift + E` | `⌥⇧E` |
| **Replace in Source & Dismiss** | `Enter` (when card is focused) | `Return` |
| **Refine Draft Input** | `Ctrl + Enter` | `⌘↵` |
| **Dismiss Window** | `Esc` | `Esc` |

---

## 🛠️ Tech Stack

- **Desktop Framework**: [Tauri 2.0](https://tauri.app/) (Rust backend)
- **Frontend Architecture**: React 19 + TypeScript + Vite + Tailwind CSS
- **Model Provider**: Google Gemini API via official endpoint
- **System Capabilities**:
  - `tauri-plugin-global-shortcut`: System-level key listeners
  - `tauri-plugin-clipboard-manager`: Local clipboard integration
  - `enigo` & native virtual key events: Fast selection grab & paste-back
  - System Tray integration

---

## 🚀 Quickstart

### Prerequisites
- Node.js (v18+) & `pnpm`
- Rust & Cargo (1.75+)

### Installation

```bash
# Clone the repository
git clone https://github.com/alan0x/typo.git
cd typo

# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

### Configuration
1. Open Typo and click the **Preferences (Sliders)** icon in the header.
2. Enter your [Google Gemini API Key](https://aistudio.google.com/app/apikey).
3. Click **Test Connection & Query Available Models** to discover your available models.
4. Select your preferred model (e.g. `gemini-2.5-flash`) and click **Apply Preferences**.

---

## 🗺️ Roadmap

- [ ] **Flashcards & Mistake Notebook**: Periodically review your most common slips (spelling, tenses).
- [ ] **TTS Pronunciation**: Listen to natural speech synthesis for verified sentences.
- [ ] **Multi-Provider Support**: Anthropic Claude, OpenAI, DeepSeek, and local Ollama.

---

## 📄 License

MIT License © 2026 alan0x
