# AGENTS.md — CarDex Engineering & Design Environment

This workspace (`CarDex`) is configured for high-craft, AI-native mobile software engineering in Google Antigravity. All agents working in this repository must strictly adhere to the guidelines, component hierarchies, and workflows detailed below.

---

## 1. Project Identity & Purpose

- **Project**: CarDex
- **Type**: Expo React Native + TypeScript mobile application (compatible with Expo Go).
- **Core Purpose**: A "Pokédex for cars" built for a BCA final-year college project (AI Tools and Techniques).
- **Primary Flow**: Take/select car photo → resize → send to secure proxy → Gemini vision identifies Make, Model, Variant, AI Colour & Bounding Box → local pixel colour pipeline (crop, downscale, PNG decode, k-means, HSV) calculates Paint Palette colour → deterministic Rarity Engine assigns collectible tier → display collectible card → save to My Garage (AsyncStorage).
- **Guiding Principles**: Simple, working, demonstrable in Expo Go, explainable in viva/interview, student-sized, free-tier/open-source components, strictly zero secrets in client or repo.

---

## 2. Component & Implementation Hierarchy

CarDex is a **pure React Native mobile application**. The old web hierarchy (`shadcn → 21st.dev → GSAP`) is **STRICTLY INVALID** and must not be used.

### Implementation Hierarchy:
1. **Native React Native Primitives**: `View`, `Text`, `Pressable`, `Image`, `ScrollView`, `FlatList`, `Modal`, `SafeAreaView`.
2. **Expo APIs**: Official Expo SDK packages (`expo-router`, `expo-image-picker`, `expo-image-manipulator`).
3. **Approved Dependencies**:
   - `expo` & `expo-router`
   - `expo-image-picker`
   - `expo-image-manipulator`
   - `@react-native-async-storage/async-storage`
   - `upng-js`
   - `react-native-reanimated`
4. **Specialist Design Skills**:
   - `@logo-design`: Brand concept, mark, wordmark, app icon, splash identity.
   - `@design-taste-frontend`: Visual quality, hierarchy, typography, composition.
   - `@web-design-guidelines`: Accessibility, spacing, and interface structure principles.
   - `emil-design-eng`: Tactile feedback, physical interactions, spring physics, meaningful micro-interactions.
   - `building-native-ui`: Native Expo Router navigation, layout patterns, and Reanimated patterns.
5. **Animation & Motion**:
   - `react-native-reanimated` for all native animations.
   - Must run on GPU (`transform`, `opacity`), honor `prefers-reduced-motion`, and avoid blocking interaction.
6. **Ponytail Review**:
   - Mandatory ongoing pass for over-engineering, dead code, speculative abstractions, and needless dependencies (`@ponytail-review`).
7. **Separate Correctness, Security & Performance Review**:
   - Deep verification for bugs, race conditions, permission failures, malformed JSON, and secret leakage.

> [!CAUTION]
> **NO WEB COMPONENT IMPORTS**:
> - Never import `shadcn/ui` React DOM components.
> - Never import `21st.dev` web components.
> - Never import browser-only libraries or GSAP DOM components into React Native screens.
> - `shadcn` and `21st.dev` MCPs are **reference-only** design resources and must never become runtime dependencies.

---

## 3. Design North Star: Retro Handheld Hardware

- **Inspiration**: The physical machine personality of classic 1990s/early-2000s handheld electronic field guides (e.g. classic Kanto Pokédex):
  - Purpose-built field device personality.
  - Bold red hardware identity accents.
  - Dark display readout panels.
  - Warm off-white/light framing for data cards.
  - Blue lens/control accents and tactile physical-button feel.
  - High information density with crisp technical labels.
- **Originality Rule**:
  - Do NOT copy Pokémon logos, Poké Balls, copyrighted artwork, or exact device silhouettes.
  - Translate the industrial design language into an original, modern automotive field scanner.
- **No Design Slop Rule**:
  - No generic purple/indigo AI gradients.
  - No generic SaaS dashboard cards or floating blobs.
  - No arbitrary glassmorphism without physical rationale.
  - No fake retro pixel fonts for essential body copy; preserve crisp mobile readability.

---

## 4. Secret Safety & API Architecture

The mobile application **MUST NEVER** call Gemini directly using an API key.

```
EXPO APP (Client)
  ↓  HTTPS POST (base64 image)
CLOUDFLARE WORKER (Serverless Proxy)
  ↓  Gemini REST API (API key stored as Worker secret)
GEMINI VISION (Structured JSON Output)
  ↓  Validated Response
EXPO APP (Client)
```

### Non-Negotiable Secret Rules:
- Never print, echo, or inspect API keys or tokens into chat.
- Never place secrets in Expo source code, `app.json`, `app.config.*`, `.env` client files, test fixtures, or Git commits.
- Client only knows public proxy URL (`EXPO_PUBLIC_API_URL`).
- All server-side secrets live strictly in the serverless proxy secret store.
- If a secret is required, tell the user the secret NAME and WHERE to set it; never ask the user to paste it into chat.

---

## 5. Dependency Management & Approval Rule

### Approved Allowlist:
- `expo`, `expo-router`
- `expo-image-picker`
- `expo-image-manipulator`
- `@react-native-async-storage/async-storage`
- `upng-js`
- `react-native-reanimated`

### Rule:
Before installing ANY dependency or tool outside this allowlist:
1. Stop.
2. Explain in ONE sentence why it is strictly required.
3. Provide the exact install command.
4. Wait for explicit user approval before running the command.
5. Never silently install packages.

---

## 6. Engineering & Review Workflow

### Full Milestone Workflow:
```
RESEARCH → SPEC → PLAN (Concise) → IMPLEMENT → TEST → PONYTAIL REVIEW → CORRECTNESS/SECURITY REVIEW → USER CHECKPOINT
```

### The Ponytail Review Loop:
After every meaningful implementation and before proposing any commit:
1. Inspect `git diff`.
2. Run Ponytail over-engineering review (`/ponytail-review` or `@ponytail-review`).
3. Apply legitimate deletion and simplification recommendations.
4. Run second-pass correctness, security, error-handling, and performance check.
5. Re-verify tests and TypeScript types.
6. Await explicit user approval before committing.

---

## 7. Skill Ecosystem & Boundaries

- **AAS (Agentic Awesome Skills)**: Curated subset active in workspace (`building-native-ui`, `typescript-pro`, `api-design-principles`, `cloudflare-workers`, `client-secret-exposure-audit`, `concise-planning`, `systematic-debugging`, `app-builder`). Do NOT mass-install unrelated AAS skills.
- **Ponytail**: Active in workspace (`ponytail`, `ponytail-review`, `ponytail-audit`).
- **Logo Design**: Branding must strictly invoke `@logo-design` at Milestone 5; do not hand-roll generic car logos.
- **Workspace Boundary**: All operations, files, and installations must remain strictly confined to `c:\VGI-AI\CarDex`. No modifications to `~/.gemini`, `~/.config`, Windows user environment variables, or global npm configurations.
