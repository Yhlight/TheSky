# TheSky Development Roadmap

This document outlines the development plan for the web game "TheSky".

## Phase 1: Core Engine & Player Mechanics (MVP)
- [ ] **Project Setup:** Create initial HTML, CSS, and JS files.
- [ ] **Canvas & Rendering:** Set up the main canvas and a basic rendering loop.
- [ ] **Player Crystal:**
    - [ ] Draw a simple crystal shape on the screen.
    - [ ] Implement player movement logic (rightward acceleration).
    - [ ] Handle user input (D key and Space bar) for acceleration.
    - [ ] Implement the 3-second hold to lock movement.
- [ ] **Basic Scenery:**
    - [ ] Implement a simple parallax background.
    - [ ] Create a single, static scene (e.g., a simple grassy field).

## Phase 2: Visuals & Scene Transitions
- [ ] **Theme System:** Design a data structure to hold different scene themes (colors, props, etc.).
- [ ] **Scene Generation:**
    - [ ] Implement procedural generation for terrain (mountains, ground).
    - [ ] Implement dynamic elements (sun/moon).
- [ ] **Seamless Transitions:**
    - [ ] Create logic to smoothly interpolate between two themes.
    - [ ] Update UI to show the current scene name.
- [ ] **Player Effects:**
    - [ ] Implement the player's trail effect.
    - [ ] Add visual feedback for acceleration.

## Phase 3: Advanced Visual Effects & Content Expansion
- [ ] **Particle System:**
    - [ ] Create a flexible particle system for effects like snow, petals, rain, etc.
    - [ ] Integrate particles into the theme system.
- [ ] **Prop System:**
    - [ ] Implement a system for drawing unique props for each scene (ruins, crystals, etc.).
- [ ] **Content Expansion:**
    - [ ] Add multiple new themes as described in `TheSky.md` (Desert, Snow, Starry Sky, etc.).
    - [ ] Refine the visual style to be more "soft" and "sacred".
- [ ] **Cinematic Filters:**
    - [ ] Add post-processing effects like vignette and film grain.

## Phase 4: Optimization & Polishing
- [ ] **Performance Tuning:**
    - [ ] Optimize the rendering loop.
    - [ ] Investigate WebAssembly (WASM) for performance-critical parts (optional).
- [ ] **UI/UX:**
    - [ ] Refine the UI elements.
    - [ ] Add a title screen or loading indicator.
- [ ] **Audio:**
    - [ ] Add background music and sound effects (if desired).
- [ ] **Final Polish:**
    - [ ] Bug fixing and cross-browser compatibility checks.
