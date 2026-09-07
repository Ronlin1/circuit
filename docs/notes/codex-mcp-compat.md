# Codex MCP compatibility

CIRCUIT supports the modern MCP `2026-07-28` stateless lifecycle and the handshake revisions `2024-11-05`, `2025-03-26`, `2025-06-18`, and `2025-11-25`.

This compatibility range is intentional because current Codex releases may still initialize remote MCP servers using the shipping legacy `2025-06-18` handshake before tool discovery.
