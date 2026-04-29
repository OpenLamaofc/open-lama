# OPEN LAMA Agent Skills

This document provides technical guidelines for AI agents (OPENLAMA) to manage and develop the OPEN LAMA project effectively.

## 1. Core Architecture
- **AI Engine**: Powered by `node-llama-cpp`. All models must be stored in the `model/` directory in `.gguf` format.
- **WhatsApp Bridge**: Powered by `@whiskeysockets/baileys`. Session data is stored in `session_fresh_lama`.
- **User Interface**: High-fidelity Terminal UI (TUI) built with `chalk`, `figlet`, and `gradient-string`.

## 2. Development Standards
- **Language**: Strictly use **TypeScript**.
- **Module System**: Use **ESM (ECMAScript Modules)**. Local imports must include the `.js` extension.
- **Session Persistence**: Never delete the WhatsApp session folder automatically on startup. Cleanups must only occur when explicitly requested via the "Clear History" menu.
- **TUI Aesthetics**: Maintain a "Retro-Tech" look. Use `Dashboard.clear()` to prevent flickering and `Dashboard.drawBanner()` for consistent branding.

## 3. Workflow: Extending WhatsApp Features
When implementing new WhatsApp capabilities:
1. Locate the `messages.upsert` listener in `src/Bridge.ts`.
2. **Presence**: Always use `this.sock.sendPresenceUpdate('composing', jid)` during processing.
3. **Vision**: Since Llama 3.2 3B is text-only, use multimodal APIs (Pollinations/Vision) to describe images. Feed these descriptions into the engine as context: `IMPORTANT: You are looking at an image. Description: ...`.
4. Ensure all responses are asynchronous and handled within try-catch blocks to prevent bridge crashes.

## 4. Workflow: Model Management
1. Scan the `model/` directory using `fs.readdirSync`.
2. Filter for files with the `.gguf` extension.
3. Implement a selection prompt if multiple models are detected during boot.
4. Pass the selected model name to the `Dashboard` for real-time status reporting.

---
*These skills ensure the long-term stability and architectural integrity of OPEN LAMA.*
