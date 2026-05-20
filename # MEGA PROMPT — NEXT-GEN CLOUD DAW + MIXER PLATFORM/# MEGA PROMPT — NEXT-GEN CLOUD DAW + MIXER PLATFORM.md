# MEGA PROMPT — NEXT-GEN CLOUD DAW + MIXER PLATFORM  
## Objective  
You are a senior staff-level software architect, audio DSP engineer, DAW UX specialist, systems engineer, and AI-assisted music production expert.  
  
Your task is to redesign and evolve my existing online music mixing app into a world-class professional DAW platform inspired by:  
  
- :contentReference[oaicite:0]{index=0}  
- :contentReference[oaicite:1]{index=1}  
- :contentReference[oaicite:2]{index=2}  
- :contentReference[oaicite:3]{index=3}  
- :contentReference[oaicite:4]{index=4}  
- :contentReference[oaicite:5]{index=5}  
  
The platform already includes:  
- Mixer  
- Timeline  
- Basic DAW functionality  
  
But it must evolve into:  
- A professional-grade online DAW  
- Ultra-low latency  
- Full multitrack production environment  
- Cloud + local hybrid processing  
- Plugin hosting bridge  
- AI-assisted production workflows  
- Modern UX optimized for creators  
- Capable of competing with desktop DAWs  
  
The BIG VISION:  
Create the FIRST truly serious browser/cloud DAW that can securely use plugins already installed on the user’s local computer.  
  
---  
  
# CORE PRODUCT VISION  
  
The app must feel:  
- Instant  
- Professional  
- Musical  
- Cinematic  
- Hardware-inspired  
- Fluid like native desktop software  
  
The UX should combine:  
- Logic Pro elegance  
- LUNA analog feel  
- Ableton speed  
- Figma-level collaboration  
- Linear + clip-based workflow hybrid  
  
The experience should NEVER feel like:  
- A toy  
- A simplified editor  
- A laggy web app  
- A mobile-first compromise  
  
This should feel like:  
“Professional music production in the browser.”  
  
---  
  
# PRIMARY GOALS  
  
## 1. BUILD A REAL PROFESSIONAL DAW  
  
Implement or redesign:  
  
### Timeline Engine  
- Sample-accurate timeline  
- Zooming  
- Snapping  
- Ripple editing  
- Time stretching  
- Slip editing  
- Crossfades  
- Automation lanes  
- Markers  
- Arrangement tracks  
- Folder tracks  
- Group tracks  
- Tempo map  
- Time signature changes  
  
### Audio Engine  
- WebAudio API + AudioWorklets  
- WASM DSP engine  
- Real-time processing  
- Offline bounce rendering  
- Sample-accurate automation  
- Buffer optimization  
- Multicore scheduling  
- Low-latency streaming  
- Dynamic buffering  
  
### Mixer  
Create a world-class mixer:  
- Channel strips  
- Gain staging  
- Sends  
- Returns  
- Bus routing  
- Sidechain  
- VCA groups  
- Parallel processing  
- Metering  
- LUFS  
- Spectrum analyzer  
- Stereo imaging  
- Mid/side tools  
- Plugin chains  
- Presets  
- Channel snapshots  
  
Inspired by:  
- SSL consoles  
- Neve workflow  
- Logic mixer  
- LUNA mixer  
  
---  
  
# 2. LOCAL PLUGIN SUPPORT (MOST IMPORTANT)  
  
This is the breakthrough feature.  
  
The browser DAW must support plugins already installed on the user's computer.  
  
Support:  
- VST3  
- AU (macOS)  
- CLAP  
- Eventually VST2 compatibility layer  
  
---  
  
# ARCHITECTURE FOR LOCAL PLUGIN SUPPORT  
  
Design a secure hybrid architecture:  
  
## Browser Layer  
Frontend web app:  
- React / Next.js  
- WebAudio  
- WebAssembly  
- SharedArrayBuffer  
- AudioWorklets  
- WebRTC data/audio channels  
  
## Native Bridge App  
Build a lightweight local companion app:  
- Electron OR Rust native app  
- Installed locally  
- Detects installed plugins  
- Sandboxed execution  
- Streams audio + MIDI to browser  
- Returns processed audio  
  
This local bridge should:  
- Scan plugins  
- Load plugin GUIs  
- Host plugins safely  
- Manage crashes  
- Handle latency compensation  
- Sync transport state  
  
---  
  
# CRITICAL FEATURE REQUIREMENTS  
  
## Plugin Scanning  
Implement:  
- Plugin indexing  
- Metadata extraction  
- Categories  
- Vendor parsing  
- Preset scanning  
- Blacklist management  
- Crash recovery  
  
## Plugin Sandboxing  
Plugins must never crash the DAW.  
  
Implement:  
- Separate plugin processes  
- Sandboxed execution  
- Process isolation  
- Watchdog monitoring  
- Auto restart  
- Plugin crash reporting  
  
## Plugin UI Rendering  
Research and implement:  
- Native window streaming  
- GPU texture streaming  
- Embedded plugin windows  
- Remote rendering  
- Browser compositing  
  
Goal:  
Plugin GUIs should appear INSIDE the browser DAW naturally.  
  
## Plugin Audio Routing  
Implement:  
- Real-time audio streaming  
- MIDI routing  
- Sidechain routing  
- Multi-output plugins  
- Automation  
- Preset save/load  
- State serialization  
  
---  
  
# 3. AUDIO PERFORMANCE  
  
The app must target:  
- Professional producers  
- Mix engineers  
- Composers  
- Beatmakers  
  
Performance targets:  
- <10ms monitoring latency  
- Stable playback with 100+ tracks  
- Smooth scrolling at 60fps+  
- GPU accelerated rendering  
- Real-time waveform generation  
  
Implement:  
- WASM DSP pipeline  
- SIMD optimization  
- Worker thread scheduling  
- Shared memory transport  
- Efficient garbage collection strategies  
- Lazy rendering  
- Audio chunk streaming  
  
---  
  
# 4. DAW FEATURES  
  
Implement professional features:  
  
## Recording  
- Multitrack recording  
- Punch in/out  
- Loop recording  
- Take folders  
- Comping  
- Monitoring modes  
- Latency calibration  
  
## MIDI  
- Piano roll  
- MIDI effects  
- Quantization  
- Groove extraction  
- MIDI learn  
- MIDI mapping  
- MIDI CC editing  
- Chord tools  
- Scale helpers  
  
## Editing  
- Flex time  
- Warp markers  
- Beat detection  
- Transient detection  
- Vocal alignment  
- Clip gain  
- Region FX  
  
## Automation  
- Track automation  
- Plugin automation  
- Touch/latch/write modes  
- Curves  
- Modulation lanes  
  
## Collaboration  
- Real-time collaboration  
- Presence system  
- Comments  
- Cloud sessions  
- Version history  
- Project branching  
- Multiplayer editing  
  
---  
  
# 5. AI FEATURES  
  
Implement advanced AI-assisted workflows.  
  
## AI Mixing Assistant  
Capabilities:  
- Auto gain staging  
- EQ suggestions  
- Compression suggestions  
- Vocal chain generation  
- Mastering assistance  
- Mix references  
  
## AI Music Assistant  
Features:  
- Chord progression generation  
- Drum pattern generation  
- Arrangement suggestions  
- Stem separation  
- Lyrics assistant  
- Melody generation  
  
## AI Workflow Features  
- Natural language commands  
- “Make vocals brighter”  
- “Add punch to drums”  
- “Create a Travis Scott style chain”  
- “Humanize MIDI”  
  
---  
  
# 6. MODERN UX/UI SYSTEM  
  
The UI must feel:  
- Premium  
- Minimal  
- Fast  
- Cinematic  
- Hardware-inspired  
  
Design principles:  
- Large spacing  
- Glassmorphism only where useful  
- No clutter  
- Clear hierarchy  
- Smooth animations  
- Dockable panels  
- Resizable workspaces  
  
Create:  
- Professional dark theme  
- Multiple workspace layouts  
- Mixer view  
- Edit view  
- Mastering view  
- Clip launcher mode  
- Fullscreen focus mode  
  
---  
  
# 7. TECH STACK RECOMMENDATIONS  
  
Recommend optimal architecture.  
  
## Frontend  
- Next.js  
- React  
- TypeScript  
- Zustand  
- WebAudio API  
- Tailwind  
- Framer Motion  
- PixiJS or WebGL rendering  
  
## Audio Engine  
- Rust DSP engine  
- WASM  
- AudioWorklets  
- SIMD  
- SharedArrayBuffer  
  
## Backend  
- Node.js OR Rust services  
- WebRTC  
- CRDT collaboration  
- PostgreSQL  
- Redis  
- S3-compatible storage  
  
## Native Bridge  
Strongly evaluate:  
- Rust + Tauri  
- Rust + wry  
- Electron fallback  
- JUCE integration  
- CLAP hosting SDK  
- VST3 SDK  
  
---  
  
# 8. DESIGN THE COMPLETE SYSTEM ARCHITECTURE  
  
Generate:  
- Monorepo structure  
- Module architecture  
- Audio pipeline  
- State management  
- Plugin bridge protocol  
- IPC design  
- Streaming protocols  
- Security model  
- Rendering pipeline  
  
Include:  
- Diagrams  
- Folder structures  
- Data flow  
- Audio flow  
- Plugin lifecycle  
- Session serialization  
  
---  
  
# 9. SECURITY MODEL  
  
This is critical.  
  
The local plugin bridge must be:  
- Secure  
- Sandboxed  
- Permission-based  
  
Implement:  
- Explicit plugin permissions  
- Localhost secure transport  
- Signed binaries  
- Plugin isolation  
- Rate limiting  
- Secure session tokens  
  
Prevent:  
- Arbitrary code execution  
- Browser exploit vectors  
- Plugin privilege escalation  
  
---  
  
# 10. BUILD EXECUTION PLAN  
  
Provide:  
- MVP roadmap  
- Milestone architecture  
- Scalability strategy  
- Technical debt prevention  
- Refactor priorities  
- Performance benchmarks  
  
Break roadmap into:  
1. Core engine  
2. Mixer redesign  
3. Timeline rewrite  
4. Native bridge  
5. Plugin support  
6. Collaboration  
7. AI layer  
8. Production optimization  
  
---  
  
# 11. CODE QUALITY REQUIREMENTS  
  
All generated code must be:  
- Production-ready  
- Typed  
- Modular  
- Performant  
- Testable  
- Maintainable  
  
Avoid:  
- Spaghetti state  
- Massive components  
- Audio glitches  
- UI blocking  
- Memory leaks  
  
Use:  
- Domain-driven architecture  
- Event-driven systems  
- Functional DSP pipelines  
- Strict typing  
  
---  
  
# 12. OUTPUT FORMAT  
  
For EVERY proposal include:  
- WHY it matters  
- Tradeoffs  
- Scalability implications  
- Performance implications  
- Browser limitations  
- Native limitations  
- Best-in-class examples  
  
Generate:  
- Architecture proposals  
- Technical specs  
- UX systems  
- Code examples  
- Folder structures  
- DSP strategy  
- Plugin bridge design  
- Rendering strategy  
- Deployment strategy  
  
---  
  
# 13. IMPORTANT CONSTRAINTS  
  
The DAW must:  
- Work in browser  
- Feel native  
- Scale professionally  
- Support large projects  
- Be future-proof  
- Handle real studio workflows  
  
Avoid:  
- Toy implementations  
- Fake plugin support  
- High-latency architectures  
- Naive WebAudio usage  
- Single-threaded DSP bottlenecks  
  
---  
  
# 14. FINAL GOAL  
  
The final product should be capable of:  
- Replacing desktop DAWs for many users  
- Running professional sessions  
- Supporting real plugin ecosystems  
- Enabling collaborative cloud production  
- Becoming the “Figma for music production”  
  
This should be a category-defining platform.  
  
Now:  
1. Analyze my current likely architecture  
2. Identify limitations  
3. Propose a revolutionary architecture  
4. Design the complete technical system  
5. Propose the optimal stack  
6. Create implementation phases  
7. Generate critical code examples  
8. Design the plugin bridge architecture in depth  
9. Optimize for ultra-low latency audio  
10. Design a premium professional UX  
  
Be exhaustive, opinionated, and technically deep.  
