# Scout MCP Server

An MCP (Model Context Protocol) server that wraps the Scout SDK, enabling AI agents to interact with Scout Live platform capabilities through standardized MCP primitives.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is an open protocol that enables seamless integration between LLM applications and external data sources and tools. It provides:

- **Resources**: Context and data for AI models
- **Prompts**: Templated messages and workflows  
- **Tools**: Functions for AI models to execute

## Features

This MCP server exposes Scout Live capabilities as:

### Tools (Actions)

| Tool | Description | Auth Required |
|------|-------------|---------------|
| `app_list` | List user's apps | User |
| `app_create` | Create a new app | User |
| `deploy` | Deploy app version | App (owner) |
| `logs` | Get app logs | App |
| `port_get` | Get port adapter config | App |
| `port_set` | Set port adapter mapping | App (owner) |

### Resources (Data)

| Resource | Description | Auth Required |
|----------|-------------|---------------|
| `scout://apps` | List of all apps | User |
| `scout://adapters` | Available adapters | Public |
| `scout://app/{slug}` | App details | App |

### Prompts (Workflows)

| Prompt | Description |
|--------|-------------|
| `deploy-new-app` | Create and deploy a new app |
| `debug-errors` | Investigate app errors |

## Installation

```bash
# Clone the repository
git clone https://github.com/scoutos-labs/scout-mcp-server.git
cd scout-mcp-server

# Install dependencies
bun install

# Build
bun run build

# Run with stdio transport (local use)
bun run start

# Run with HTTP transport (server mode)
bun run start:http
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `SCOUT_API_KEY` | Scout Live API key | Yes |
| `SCOUT_API_URL` | API endpoint (default: https://scoutos.live) | No |
| `MCP_TRANSPORT` | Transport mode: `stdio` or `http` | No (default: stdio) |
| `PORT` | HTTP server port | No (default: 3000) |

### For Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "scout": {
      "command": "bun",
      "args": ["run", "/path/to/scout-mcp-server/dist/index.js"],
      "env": {
        "SCOUT_API_KEY": "your-api-key"
      }
    }
  }
}
```

### For Claude Code

```json
{
  "mcpServers": {
    "scout": {
      "command": "bun",
      "args": ["run", "/path/to/scout-mcp-server/dist/index.js"],
      "env": {
        "SCOUT_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Development

```bash
# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage

# Lint
bun run lint
```

## Deployment to scoutos.live

### Prerequisites

1. DigitalOcean Container Registry access
2. kubectl configured for scout-live cluster
3. Scout Live namespace exists

### Deploy

```bash
# Build and deploy
./deploy.sh v0.1.0

# Or manual steps:

# 1. Build
bun run build

# 2. Build Docker image
docker build -t registry.digitalocean.com/scout-live/mcp-server:v0.1.0 .

# 3. Push to registry
docker push registry.digitalocean.com/scout-live/mcp-server:v0.1.0

# 4. Apply Kubernetes manifests
kubectl apply -f k8s/deployment.yaml -n scout-live
kubectl apply -f k8s/ingress.yaml -n scout-live

# 5. Update deployment image
kubectl set image deployment/scout-mcp-server \
  mcp-server=registry.digitalocean.com/scout-live/mcp-server:v0.1.0 \
  -n scout-live
```

### Verify Deployment

```bash
# Check pod status
kubectl get pods -n scout-live -l app=scout-mcp-server

# Check logs
kubectl logs -f deployment/scout-mcp-server -n scout-live

# Health check
curl https://mcp.scoutos.live/health
```

### Access Endpoints

After deployment, the MCP server is available at:

| Endpoint | Description |
|----------|-------------|
| `https://mcp.scoutos.live/` | Server capabilities |
| `https://mcp.scoutos.live/health` | Health check |
| `https://mcp.scoutos.live/sse` | SSE transport endpoint |

## Architecture

```
┌──────────────────────────────────────────────┐
│               MCP Host (Claude, etc.)          │
└─────────────────────────┬────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────┐
│           Scout MCP Server (this repo)        │
│                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐   │
│  │ Tools   │  │Resources│  │ Prompts    │   │
│  └────┬────┘  └────┬────┘  └──────┬──────┘   │
│       │            │              │          │
│       └────────────┼──────────────┘          │
│                    │                         │
└────────────────────┼─────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│              Scout Live API                   │
│              (scoutos.live)                   │
└──────────────────────────────────────────────┘
```

## API Reference

### Tools

#### `app_list`
List all apps for the authenticated user.

```json
{
  "name": "app_list",
  "arguments": {}
}
```

#### `app_create`
Create a new app on Scout Live.

```json
{
  "name": "app_create",
  "arguments": {
    "name": "My App",
    "slug": "my-app" // optional, auto-generated if not provided
  }
}
```

#### `deploy`
Deploy a new version of an app.

```json
{
  "name": "deploy",
  "arguments": {
    "slug": "my-app",
    "files": {
      "index.html": "<html>...</html>",
      "style.css": "body { ... }"
    }
  }
}
```

#### `logs`
Get recent logs for an app.

```json
{
  "name": "logs",
  "arguments": {
    "slug": "my-app",
    "lines": 100 // optional
  }
}
```

### Resources

#### `scout://apps`
List all apps.

#### `scout://adapters`
List available port adapters.

#### `scout://app/{slug}`
Get details for a specific app.

### Prompts

#### `deploy-new-app`
Create and deploy a new app.

```json
{
  "name": "deploy-new-app",
  "arguments": {
    "name": "My App",
    "type": "static" // optional: static, hono, express
  }
}
```

#### `debug-errors`
Investigate errors in app logs.

```json
{
  "name": "debug-errors",
  "arguments": {
    "slug": "my-app"
  }
}
```

## License

MIT