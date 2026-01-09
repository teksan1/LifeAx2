# LifeAx: Aura Sentinel Build (LifeAx2)

LifeAx is an advanced behavioral intelligence and temporal planning platform. This version, **Aura Sentinel**, is engineered for deep user profiling and high-resilience AI interactions.

## Core Features

- **Behavioral Profiling**: Multi-step onboarding captures identity, biological rhythms, and strategic objectives to build a permanent baseline dossier.
- **Aura Sentinel Engine**: An inquisitive AI persona that uses your dossier to identify productivity triggers and map behavioral risk patterns.
- **Resilient Orchestration**:
    - **Adaptive Model Fallback**: Automatically switches between Gemini 3 Flash and Gemini 2.5 Flash Lite based on traffic and quota.
    - **Temporal Debouncing**: Enforced cooldown periods (3-5s) to maintain stable RPM (Requests Per Minute) within free-tier limits.
    - **Sliding Context Window**: Tight 6-message history to optimize token usage and prevent context overflow.
- **Secure Access**: Integrated Identity Core authentication and mandatory API key selection flow.

## Project Structure

- `index.tsx`: Main application entry point, including Auth, Onboarding, and Intelligence views.
- `types.ts`: TypeScript definitions for the user baseline and system state.
- `index.css`: Immersive "Sentinel" dark-mode theme with high-performance animations.
- `components/`:
    - `DottedGlowBackground.tsx`: Interactive, high-performance background canvas.
    - `SideDrawer.tsx`: System architecture and dossier management overlay.
    - `Icons.tsx`: Custom SVG icon set.

## Deployment Instructions

1. Ensure the environment variable `process.env.API_KEY` is configured via your hosting provider or local environment.
2. The application is built as an ES6 module. Serve `index.html` from any static file server.
3. Users will be prompted to authenticate via the **Identity Core** upon first load.

---
*Developed by teksan1 - LifeAx2 Branch Build*
