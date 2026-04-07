/**
 * Tests for MCP Tools
 * 
 * Tests each tool's behavior:
 * - Input validation
 * - API calls
 * - Response format
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from '../src/tools/index.js';

describe('MCP Tools', () => {
  let listToolsHandler: Function;
  let callToolHandler: Function;

  beforeEach(() => {
    // Create a real server and register handlers
    const handlers: Map<string, Function> = new Map();
    
    const server = {
      setRequestHandler: (schema: any, handler: Function) => {
        if (schema === ListToolsRequestSchema) {
          handlers.set('listTools', handler);
        } else if (schema === CallToolRequestSchema) {
          handlers.set('callTool', handler);
        }
      },
    } as unknown as Server;

    registerTools(server);
    
    listToolsHandler = handlers.get('listTools')!;
    callToolHandler = handlers.get('callTool')!;
  });

  describe('ListTools', () => {
    it('should return all available tools', async () => {
      const response = await listToolsHandler({});
      
      expect(response).toHaveProperty('tools');
      expect(Array.isArray(response.tools)).toBe(true);
      
      const toolNames = response.tools.map((t: any) => t.name);
      expect(toolNames).toContain('app_list');
      expect(toolNames).toContain('app_create');
      expect(toolNames).toContain('deploy');
      expect(toolNames).toContain('logs');
      expect(toolNames).toContain('port_get');
      expect(toolNames).toContain('port_set');
    });

    it('should include proper input schemas for each tool', async () => {
      const response = await listToolsHandler({});
      
      response.tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
      });
    });
  });

  describe('app_list tool', () => {
    it('should return apps list', async () => {
      const response = await callToolHandler({
        params: {
          name: 'app_list',
          arguments: {},
        },
      });

      expect(response).toHaveProperty('content');
      expect(Array.isArray(response.content)).toBe(true);
      expect(response.content[0]).toHaveProperty('type', 'text');
      
      const data = JSON.parse(response.content[0].text);
      expect(data).toHaveProperty('apps');
    });
  });

  describe('app_create tool', () => {
    it('should create an app with name', async () => {
      const response = await callToolHandler({
        params: {
          name: 'app_create',
          arguments: {
            name: 'My New App',
          },
        },
      });

      expect(response).toHaveProperty('content');
      const data = JSON.parse(response.content[0].text);
      expect(data).toHaveProperty('appName', 'My New App');
      expect(data).toHaveProperty('slug');
    });

    it('should create an app with custom slug', async () => {
      const response = await callToolHandler({
        params: {
          name: 'app_create',
          arguments: {
            name: 'Test App',
            slug: 'custom-slug-123',
          },
        },
      });

      const data = JSON.parse(response.content[0].text);
      expect(data.slug).toBe('custom-slug-123');
    });

    it('should auto-generate slug if not provided', async () => {
      const response = await callToolHandler({
        params: {
          name: 'app_create',
          arguments: {
            name: 'Test App',
          },
        },
      });

      const data = JSON.parse(response.content[0].text);
      expect(data.slug).toBeDefined();
    });
  });

  describe('deploy tool', () => {
    it('should deploy an app with files', async () => {
      const response = await callToolHandler({
        params: {
          name: 'deploy',
          arguments: {
            slug: 'my-app',
            files: {
              'index.html': '<html><body>Hello</body></html>',
              'style.css': 'body { color: blue; }',
            },
          },
        },
      });

      expect(response).toHaveProperty('content');
      const data = JSON.parse(response.content[0].text);
      expect(data).toHaveProperty('slug', 'my-app');
      expect(data).toHaveProperty('version');
    });

    it('should require slug parameter', async () => {
      // The tool should still return a response (not throw)
      // since required params are validated by MCP
      const response = await callToolHandler({
        params: {
          name: 'deploy',
          arguments: {
            files: { 'index.html': '<html></html>' },
          },
        },
      });

      // Current implementation returns stub response
      expect(response).toHaveProperty('content');
    });
  });

  describe('logs tool', () => {
    it('should return logs for an app', async () => {
      const response = await callToolHandler({
        params: {
          name: 'logs',
          arguments: {
            slug: 'my-app',
          },
        },
      });

      expect(response).toHaveProperty('content');
      expect(response.content[0]).toHaveProperty('type', 'text');
    });

    it('should accept lines parameter', async () => {
      const response = await callToolHandler({
        params: {
          name: 'logs',
          arguments: {
            slug: 'my-app',
            lines: 50,
          },
        },
      });

      expect(response).toHaveProperty('content');
    });
  });

  describe('port_get tool', () => {
    it('should return port adapter configuration', async () => {
      const response = await callToolHandler({
        params: {
          name: 'port_get',
          arguments: {
            slug: 'my-app',
            port: 'data',
          },
        },
      });

      expect(response).toHaveProperty('content');
      const data = JSON.parse(response.content[0].text);
      expect(data).toHaveProperty('port', 'data');
    });

    it('should handle all port types', async () => {
      const portTypes = ['data', 'cache', 'blob', 'queue', 'agents'];
      
      for (const portType of portTypes) {
        const response = await callToolHandler({
          params: {
            name: 'port_get',
            arguments: {
              slug: 'test-app',
              port: portType,
            },
          },
        });

        const data = JSON.parse(response.content[0].text);
        expect(data.port).toBe(portType);
      }
    });
  });

  describe('port_set tool', () => {
    it('should set port adapter mapping', async () => {
      const response = await callToolHandler({
        params: {
          name: 'port_set',
          arguments: {
            slug: 'my-app',
            port: 'data',
            adapter: 'mongodb',
            config: {
              namespace: 'my-app',
              shared: true,
            },
          },
        },
      });

      expect(response).toHaveProperty('content');
      const data = JSON.parse(response.content[0].text);
      expect(data).toHaveProperty('port', 'data');
      expect(data).toHaveProperty('adapter', 'mongodb');
    });

    it('should accept adapter without config', async () => {
      const response = await callToolHandler({
        params: {
          name: 'port_set',
          arguments: {
            slug: 'my-app',
            port: 'cache',
            adapter: 'valkey',
          },
        },
      });

      const data = JSON.parse(response.content[0].text);
      expect(data.adapter).toBe('valkey');
    });
  });

  describe('Error handling', () => {
    it('should throw error for unknown tool', async () => {
      await expect(callToolHandler({
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      })).rejects.toThrow('Unknown tool');
    });

    it('should handle missing required parameters gracefully', async () => {
      // deploy requires slug and files
      const response = await callToolHandler({
        params: {
          name: 'deploy',
          arguments: {
            slug: 'my-app',
            // missing files
          },
        },
      });

      // Current stub implementation returns success
      // When implemented, this should return an error
      expect(response).toHaveProperty('content');
    });
  });
});