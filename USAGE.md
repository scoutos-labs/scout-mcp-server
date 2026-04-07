# Scout MCP Server - Usage Guide

> MCP server for Scout Live platform - deployed at `mcp.scoutos.live`

## Quick Start

### Health Check

```bash
curl -k https://mcp.scoutos.live/health
```

Response:
```json
{"ok":true,"name":"scout-mcp-server","version":"0.1.0","timestamp":"2026-04-07T21:13:06.722Z"}
```

### Capabilities

```bash
curl -k https://mcp.scoutos.live/
```

Response:
```json
{
  "name": "scout-mcp-server",
  "version": "0.1.0",
  "capabilities": {
    "tools": {"list": true, "call": true},
    "resources": {"list": true, "read": true},
    "prompts": {"list": true, "get": true}
  },
  "endpoints": {
    "sse": "/sse",
    "message": "/message",
    "health": "/health"
  }
}
```

---

## Using with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "scout": {
      "url": "https://mcp.scoutos.live/sse"
    }
  }
}
```

### Using with Claude Code

Add to your Claude Code config (`~/.claude/config.json`):

```json
{
  "mcpServers": {
    "scout": {
      "url": "https://mcp.scoutos.live/sse"
    }
  }
}
```

---

## Available Tools

### `app_list`

List all apps for the authenticated user.

**Arguments:** None

**Example:**
```json
{
  "name": "app_list",
  "arguments": {}
}
```

**Response:**
```json
{
  "apps": [
    {"id": "app_xxx", "slug": "my-app", "status": "running"}
  ],
  "count": 1
}
```

---

### `app_create`

Create a new app on Scout Live.

**Arguments:**
- `name` (string, required): App name
- `slug` (string, optional): URL slug (auto-generated if not provided)

**Example:**
```json
{
  "name": "app_create",
  "arguments": {
    "name": "My App",
    "slug": "my-app"
  }
}
```

---

### `deploy`

Deploy a version of an app.

**Arguments:**
- `slug` (string, required): App slug
- `files` (object, required): Files to deploy (path → content)

**Example:**
```json
{
  "name": "deploy",
  "arguments": {
    "slug": "my-app",
    "files": {
      "index.html": "<html><body>Hello World</body></html>",
      "style.css": "body { color: blue; }"
    }
  }
}
```

---

### `logs`

Get recent logs for an app.

**Arguments:**
- `slug` (string, required): App slug
- `lines` (number, optional): Number of lines (default: 100)

---

### `port_get`

Get port adapter configuration.

**Arguments:**
- `slug` (string, required): App slug
- `port` (string, required): Port type (`data`, `cache`, `blob`, `queue`, `agents`)

---

### `port_set`

Set port adapter mapping.

**Arguments:**
- `slug` (string, required): App slug
- `port` (string, required): Port type
- `adapter` (string, required): Adapter type (`mongodb`, `valkey`, `spaces`, etc.)
- `config` (object, optional): Adapter configuration

---

## Available Resources

### `scout://apps`

List all apps for the authenticated user.

### `scout://adapters`

List available port adapters.

### `scout://app/{slug}`

Get details for a specific app.

---

## Available Prompts

### `deploy-new-app`

Create and deploy a new app on Scout Live.

**Arguments:**
- `name` (string, required): App name
- `type` (string, optional): App type (`static`, `hono`, `express`)

### `debug-errors`

Investigate errors in app logs.

**Arguments:**
- `slug` (string, required): App slug

---

## Authentication

Most operations require authentication via Scout Live API key:

1. Get your API key from [scoutos.live/dashboard](https://scoutos.live/dashboard)
2. Set the `SCOUT_API_KEY` environment variable when using locally
3. For HTTP/SSE transport, include in headers: `Authorization: Bearer YOUR_KEY`

---

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Server capabilities |
| `GET /health` | Health check |
| `GET /sse` | SSE transport for MCP |
| `POST /message` | Message endpoint for MCP |

---

## Source Code

- **Repository:** [github.com/scoutos-labs/scout-mcp-server](https://github.com/scoutos-labs/scout-mcp-server)
- **Issues:** [github.com/scoutos-labs/scout-mcp-server/issues](https://github.com/scoutos-labs/scout-mcp-server/issues)

---

## Status

🟡 **Operational** - SSL certificate pending (DNS-01 challenge needs DO API token refresh)

Last updated: 2026-04-07