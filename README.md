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
| `app_create` | Create a new app | User |
| `app_list` | List user's apps | User |
| `app_delete` | Delete an app | User (owner) |
| `port_get` | Get port adapter config | App |
| `port_set` | Set port adapter mapping | App (owner) |
| `deploy` | Deploy app version | App (owner) |
| `logs` | Get app logs | App |

### Resources (Data)

| Resource | Description | Auth Required |
|----------|-------------|---------------|
| `app://{slug}` | App metadata | App |
| `adapter://{id}` | Adapter config | App |
| `logs://{slug}` | App logs | App |

### Prompts (Workflows)

| Prompt | Description |
|--------|-------------|
| `deploy-new-app` | Create and deploy a new app |
| `migrate-adapter` | Change app's adapter |
| `debug-errors` | Investigate app errors |

## Installation

```bash
# Clone the repository
git clone https://github.com/scoutos-labs/scout-mcp-server.git
cd scout-mcp-server

# Install dependencies
bun install

# Build
bun build src/index.ts --outdir dist

# Run with stdio transport
bun run dist/index.js
```

## Configuration

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

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SCOUT_API_KEY` | Scout Live API key | Yes |
| `SCOUT_API_URL` | API endpoint (default: https://scoutos.live) | No |

## Development

```bash
# Run in development mode with hot reload
bun dev

# Run tests
bun test

# Lint
bun lint
```

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
│  │ Tools   │  │Resources│  │ Prompts     │   │
│  └────┬────┘  └────┬────┘  └──────┬──────┘   │
│       │            │              │          │
│       └────────────┼──────────────┘          │
│                    │                         │
└────────────────────┼─────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│              Scout SDK (scout-live)           │
│                                               │
│  ┌───────┐  ┌──────────┐  ┌──────────────┐   │
│  │ ports │  │ adapters │  │ app-registry │   │
│  └───────┘  └──────────┘  └──────────────┘   │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│              Scout Live Platform              │
│              (scoutos.live / K8s)             │
└──────────────────────────────────────────────┘
```

## License

MIT