# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwarmUI is a modular AI image generation web UI built with C#/.NET 8 backend and vanilla JavaScript frontend. The "Swarm" name refers to multi-GPU support for parallel image generation. It supports Stable Diffusion, Flux, video models, and more through a backend system (primarily ComfyUI).

## Build & Run Commands

```bash
# Build (Release configuration)
dotnet build src/SwarmUI.csproj --configuration Release -o ./src/bin/live_release

# Run via launch scripts (handles build automatically)
./launch-linux.sh      # Linux
./launch-macos.sh      # macOS
launch-windows.bat     # Windows

# Development mode (rebuilds every time)
./launch-linux-dev.sh
./launch-macos-dev.sh
launch-windows-dev.ps1
```

Default URL: `http://localhost:7801`

## Architecture

```
Frontend (HTML/JS/CSS in src/wwwroot/)
    ↓
Web Server (ASP.NET Core)
    ↓
Modular APIs (src/WebAPI/)
    ↓
Backend System (src/Backends/)
    ↓
AI Backends (ComfyUI, Auto WebUI, etc.)
```

**Key Directories:**
- `src/Core/` - Program entry, Settings, ExtensionsManager, WebServer
- `src/Backends/` - Backend abstractions and BackendHandler orchestration
- `src/Text2Image/` - T2I model handling, parameters, workflow generation
- `src/WebAPI/` - REST/WebSocket API implementations (T2IAPI, ModelsAPI, AdminAPI)
- `src/BuiltinExtensions/` - Core extensions (ComfyUIBackend, GridGenerator, etc.)
- `src/wwwroot/js/genpage/` - Generation interface JavaScript modules

**Extension System:**
- Extensions inherit from `Extension` base class
- Lifecycle hooks: `OnFirstInit()`, `OnPreInit()`, `OnInit()`, `OnPreLaunch()`, `OnShutdown()`
- Located in `src/Extensions/` or `src/BuiltinExtensions/`

**API Pattern:**
- REST: POST to `/API/{route}` with JSON body
- WebSocket: Routes with `WS` suffix for streaming
- All requests require `session_id` cookie

## Code Style Requirements

### C#
- All functions, fields, properties require `///` XML doc comments
- Modern C# syntax (records, nullable reference types)
- Thread-safe code required (true multithreading, no GIL)
- Namespace: `SwarmUI.{Category}`

### JavaScript
- Use `let`, never `const`
- Use `==` unless `===` is logically required
- Standard `for` loops instead of `forEach`
- Use `genericRequest()` for HTTP calls (not `fetch`)
- Class-based systems use `/**` doc comments

### Python (ComfyUI nodes)
- Follow comfy standards
- Write nodes compatible with regular ComfyUI installs

### Themes
- All themes must use `modern.css` as base
- Core themes should only modify colors
- Register in `WebServer.cs` `PreInit()` block

## Important Notes

- No automated test suite in core; manual testing via web UI or API
- LLM code assistance is fine for autocomplete/tips, but understand every line you submit
- Discuss changes on Discord or GitHub before PRing
- Extensions list: `launchtools/extension_list.fds`
