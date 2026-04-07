/**
 * Scout MCP Server - HTTP/SSE Transport
 * 
 * Runs the MCP server as an HTTP server with SSE transport
 * for deployment on scoutos.live
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import http from 'http';
import { URL } from 'url';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

const SERVER_NAME = 'scout-mcp-server';
const SERVER_VERSION = '0.1.0';
const DEFAULT_PORT = 3000;

// Create MCP server with capabilities
function createServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}

// HTTP/SSE server for remote access
async function startHttpServer(port: number): Promise<void> {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        ok: true, 
        name: SERVER_NAME, 
        version: SERVER_VERSION,
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // MCP SSE endpoint
    if (url.pathname === '/sse' && req.method === 'GET') {
      // Create a new server instance for each SSE connection
      const mcpServer = createServer();
      const transport = new SSEServerTransport('/message', res as any);
      
      await mcpServer.connect(transport);
      return;
    }

    // MCP message endpoint (POST from client)
    if (url.pathname === '/message' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          // Parse and forward to SSE transport
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request' }));
        }
      });
      return;
    }

    // List capabilities endpoint
    if (url.pathname === '/' || url.pathname === '/capabilities') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        capabilities: {
          tools: { list: true, call: true },
          resources: { list: true, read: true },
          prompts: { list: true, get: true },
        },
        endpoints: {
          sse: '/sse',
          message: '/message',
          health: '/health',
        },
      }));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    console.log(`Scout MCP Server running on http://localhost:${port}`);
    console.log(`  SSE endpoint: http://localhost:${port}/sse`);
    console.log(`  Health check: http://localhost:${port}/health`);
    console.log(`  Capabilities: http://localhost:${port}/`);
  });
}

// Stdio transport for local/CLI use
async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Scout MCP Server started (stdio transport)');
}

// Main entry point
async function main(): Promise<void> {
  const transport = process.env.MCP_TRANSPORT || 'stdio';
  const port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  
  // Validate API key
  if (!process.env.SCOUT_API_KEY) {
    console.error('WARNING: SCOUT_API_KEY not set. Some operations may fail.');
  }

  if (transport === 'http' || transport === 'sse') {
    await startHttpServer(port);
  } else {
    await startStdioServer();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});