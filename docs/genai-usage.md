# Gen AI Usage Documentation

## Overview
Generative AI played a crucial role in rapidly prototyping and building the Synapse application during the hackathon.

## AI Tools Used
- **Google AI Studio (Gemini 3.5 Flash / Gemini 3.1 Pro)**: Used for code generation, UI/UX conceptualization, and asset creation.

## Concrete Examples
1. **Asset Generation**: Used Gemini's image generation capabilities to create cinematic background assets (e.g., `world_cup_stadium_hero`) and icons (e.g., `digital_soccer_ball`).
   *Prompt used*: "Cinematic wide-angle view of a futuristic 2026 FIFA World Cup stadium at night..."
2. **Component Logic & UI Design**: AI was used to generate complex interactive SVG components, such as the Sensory Calm Penalty Shootout game and the Interactive Tactical Pitch Board, including the logic for ball trajectory and scoring.
3. **Multilingual Broadcast**: AI is designed to be integrated into the Staff Console to automatically translate plain-text warnings into multiple languages and formats (PA script, push notification, caption board, cognitive assist) using the `gemini-2.5-flash` model via an API endpoint.
