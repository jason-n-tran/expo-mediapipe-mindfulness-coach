# Expo Mediapipe Mindfulness Coach

An Expo (React Native) application that demonstrates a fully local mindfulness coach chatbot powered by on-device Google MediaPipe sensing and a local LLM/chat model so it works offline.

This repository is a working prototype and learning project showing how to combine mobile computer-vision posture/gesture sensing with an interactive, privacy-preserving chatbot that helps users with short mindfulness exercises and coaching prompts — all without sending video or chat content to external servers.

---

## Key goals

- Deliver an offline-first Expo app that runs on-device (Android / iOS via Expo) and provides a conversational mindfulness coach experience.
- Use Google MediaPipe running locally for lightweight pose/face/hands detection to sense user posture and activity in real-time. The app can adapt prompts or progressions based on the user's physical state (for example, recognizing slumped posture vs. upright posture, eye closure, or hand gestures).
- Run the chat/LLM model locally or with an embedded small model so conversation and user data never leave the device. The app is designed around pluggable LLM backends that can be swapped between a local runtime (preferred) and a remote API for development.
- Prioritize privacy, low-latency interactions, and the ability to function offline.

## Who is this for

- Mobile developers exploring on-device ML and offline LLMs
- Researchers building privacy-preserving wellness apps
- Hobbyists who want to combine MediaPipe with conversational agents on mobile

## Repository overview

Top-level files and directories you’ll find in this project:

- `app/` — Expo app routes and screens (chat, settings, model setup, chat-history, etc.)
- `components/` — Reusable UI components (chat UI, model status, loading button, etc.)
- `hooks/` — React hooks used across the app (chat, model manager, network, stores)
- `services/` — LLM and MediaPipe integration, data stores, and error handling
- `assets/` — Static assets (icons, images)
- `types/` & `constants/` — Type definitions, prompts, and configuration
- `__tests__/` — Unit and integration tests for core logic
- Configuration: `package.json`, `tsconfig.json`, `jest.config.js`, `babel.config.js`

Files of immediate interest:

- `app/(drawer)/chat.tsx` — Main chat screen
- `services/llm/LLMService.ts` — Abstracts the language model calls and local model management
- `services/llm/ModelManager.ts` — Handles downloads, model availability, and switching
- `services/llm/PromptBuilder.ts` — Centralized prompt construction for the coach persona
- `services/storage/ChatHistoryStore.ts` — Persists conversation history locally
- `components/chat/StreamingText.tsx` — Renders streaming responses (if supported)

## Architecture and design

High-level architecture:

- UI (Expo/React Native): navigation, chat UI, settings, and model setup flows.
- Local sensing (MediaPipe): camera frames are processed on-device; features such as pose landmarks, face mesh, and hand landmarks are exposed as events or hook-driven data.
- LLM (local or remote): the app is designed to use a pluggable LLM backend. For offline/edge usage, a small quantized model running via an on-device runtime (for example, a TFLite-based or native library with a bridging layer) is recommended. For development or machines with better resources, use a local server runtime (e.g., llama.cpp on-device, or a background service) or a remote API.
- Storage: Chat history and settings are stored locally (file or SQLite) so the app can retrieve prior sessions and work offline.

Data flow summary:

1. Camera frames captured by the app are passed to MediaPipe for inference.
2. MediaPipe returns landmarks / metrics; a lightweight processor transforms those into high-level events (e.g., "slumped posture detected", "eyes closed", "hands raised").
3. The `PromptBuilder` uses those events and the chat history to craft context-aware prompts for the LLM.
4. The LLM responds locally and the UI streams or renders the bot message. Conversation is appended to `ChatHistoryStore`.

Privacy note: Raw frames are NOT uploaded anywhere. All sensing and inference occurs locally. The only optional network interactions are for model downloads (if you choose to download a model package) or optional remote LLM APIs when configured.

## Local MediaPipe integration

This project expects MediaPipe to run locally on the device. There are multiple ways to achieve this depending on platform and constraints:

- For Android (recommended): use a native MediaPipe Android solution or a prebuilt TFLite model that replicates the MediaPipe pipeline. You can integrate via native modules or community wrappers that expose pose/hand/face detection to React Native.
- For iOS: use MediaPipe iOS frameworks or convert pipelines to Core ML / TFLite if required.
- For cross-platform JS-only experimentation (not suitable for production offline), you can prototype with the WebGL/WebAssembly MediaPipe builds inside an Expo webview — but this will not be truly native offline on mobile without additional native packaging.

This repository includes an abstraction layer in `services/llm` and `hooks/useModelManager.ts` so you can plug in the concrete MediaPipe integration of your choice. See `services/llm/ModelManager.ts` for model download and availability checks.

## Local LLM recommendations

Running an LLM fully offline on-device has trade-offs. For mobile devices, consider:

- Very small, quantized models (e.g., LLaMA family small variants quantized with 4-bit) using an on-device runtime like llama.cpp compiled to mobile, GGML-based mobile runtimes, or specialized mobile inference engines.
- TFLite models optimized for mobile; simpler transformer or seq2seq small models are more feasible for low-latency chat.
- For development, you may run a local desktop runtime (llama.cpp, GPT4All, etc.) and connect the app to it on the same network as a stopgap.

Model selection checklist:

- Size & memory footprint: pick a model that fits target device RAM.
- Quantization: 4-bit/8-bit for reduced memory and faster inference.
- Latency: aim for <3s response for acceptable UX.
- Safety: use prompt engineering to keep the coach helpful and non-harmful.

Pluggable backend approach

- `LLMService.ts` is an abstraction that accepts a backend implementation. Implementations can be:
  - Local runtime bridge (preferred): a native module that exposes model inference methods.
  - Local background server: a node or python service on-device reachable via localhost.
  - Remote API: a fallback to OpenAI or other hosted providers for development.

## Getting started (development)

Prerequisites

- Node.js (LTS recommended)
- yarn or npm
- Expo CLI (if using the managed workflow)
- Android Studio (for Android emulator) or Xcode for iOS simulators (macOS only)

Install dependencies

```powershell
cd c:\Users\thism\mobiledev\first-chatbot
npm install
# or
yarn install
```

Running the app

Development (Expo)

```powershell
npx expo start
```

Then open the Expo Go app on your device or an emulator. Note: MediaPipe native integrations typically require building a custom dev client or a bare workflow app (not Expo Go) because native packages need to be included.

Building a custom dev client (if you use native MediaPipe packages)

Use EAS or Expo prebuild to include native modules. Example (EAS):

```powershell
eas build --platform android --profile development
```

Or prebuild and run

```powershell
npx expo prebuild
npx react-native run-android
```

Note: if you plan to integrate native MediaPipe directly, you'll need to follow MediaPipe's native installation instructions and possibly add custom native modules.

Model setup

- The app includes a `ModelManager` that can download and manage local models. By default the app starts in an uninitialized state and lets you choose to download a model or connect to a remote endpoint via settings.
- Check `app/model-setup.tsx` in the app routes to run the model download flow.

Using the app

1. Open the app and go to Settings → Model Setup.
2. Choose a local model (if available) or configure a remote endpoint.
3. Start the Chat screen and allow camera permissions for posture sensing.
4. Try a short guided exercise; the bot will adapt prompts based on detected posture/gestures.

## Testing

Unit and integration tests are in the `__tests__` folder and use Jest. Run tests with:

```powershell
npm test
# or
yarn test
```

There are tests covering the chat logic, LLMService abstraction, and message store. When you change native integrations, add unit tests for the JS-side abstractions and integration tests for any bridge shim code.

## Developer notes

- The app is TypeScript-first. Keep types updated in `types/` and use strict checks where possible.
- Prompt engineering lives in `constants/prompts.ts` and `services/llm/PromptBuilder.ts`. Keep the coach persona friendly, concise, and safety-first.
- `useModelManager.ts` and `services/llm/ModelManager.ts` handle model lifecycle and downloads. Offline-first behavior: prefer already-downloaded local models and fall back to cached responses if a model isn't available.

Performance tips

- Hardware acceleration: enable device NN APIs (Android NNAPI, iOS Metal) for faster inference.
- Use batching and limited frame sampling for MediaPipe inputs (e.g., 10–15 FPS) to reduce CPU and battery use.
- Quantize models aggressively for mobile deployment and test across devices.

Safety and content guidance

- The mindfulness coach is not a replacement for professional mental health care. Add clear disclaimers in the settings and onboarding.
- Use guardrails in `PromptBuilder` to avoid generating harmful advice. Consider small local classifiers to detect risky messages before display.

Contributing

Contributions are welcome. Suggested workflow:

1. Fork the repo.
2. Create a feature branch.
3. Open a PR describing the change and the test coverage.

Areas where help is valuable:

- Native MediaPipe integrations and example modules for Android/iOS
- Small, efficient on-device LLM runtime adapters
- UX improvements for low-bandwidth devices and accessibility
- More unit and E2E tests for chat flows and model management

License

This project is provided for educational and research purposes. Please include an appropriate open-source license if you plan to publish or distribute the app. (No license file included by default.)

Acknowledgements

- Google MediaPipe for the on-device sensing pipelines
- Open-source on-device LLM projects (llama.cpp, GGML, GPT4All) for reference implementations

## TODO / Next steps

- Add platform-specific setup guides for Android and iOS MediaPipe integration.
- Provide an example native module wrapper for MediaPipe to bridge into React Native.
- Add a small sample quantized model and a reference adapter for a local runtime.

---

If you'd like, I can now add platform-specific setup instructions (Android/iOS), create a sample native module stub for MediaPipe integration, or craft an example `eas.json`/build profile for producing custom dev clients. Tell me which you'd like next.
