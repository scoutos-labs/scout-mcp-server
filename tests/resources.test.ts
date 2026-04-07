/**
 * Tests for MCP Resources
 * 
 * Tests each resource endpoint:
 * - Resource listing
 * - Resource reading
 * - URI parsing
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerResources } from '../src/resources/index.js';

// Helper to create a mock server and capture handlers
function createMockServer() {
  const handlers: Map<string, Function> = new Map();
  
  const server = {
    setRequestHandler: (schema: any, handler: Function) => {
      const schemaName = schema.value || schema.name || 'unknown';
      handlers.set(schemaName, handler);
      handlers.set(schema, handler);
    },
    getRequestHandler: (schema: any) => handlers.get(schema),
  } as unknown as Server;

  return server;
}

describe('MCP Resources', () => {
  let server: Server;
  let listResourcesHandler: Function;
  let readResourceHandler: Function;

  beforeEach(() => {
    server = createMockServer();
    registerResources(server);
    
    listResourcesHandler = (server as any).getRequestHandler(ListResourcesRequestSchema)!;
    readResourceHandler = (server as any).getRequestHandler(ReadResourceRequestSchema)!;
  });

  describe('ListResources', () => {
    it('should return all available resources', async () => {
      const response = await listResourcesHandler({});
      
      expect(response).toHaveProperty('resources');
      expect(Array.isArray(response.resources)).toBe(true);
      expect(response.resources.length).toBeGreaterThan(0);
    });

    it('should include core resources', async () => {
      const response = await listResourcesHandler({});
      
      const uris = response.resources.map((r: any) => r.uri);
      expect(uris).toContain('scout://apps');
      expect(uris).toContain('scout://adapters');
    });

    it('should include resource metadata', async () => {
      const response = await listResourcesHandler({});
      
      response.resources.forEach((resource: any) => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType');
        expect(resource.mimeType).toBe('application/json');
      });
    });
  });

  describe('ReadResource - scout://apps', () => {
    it('should return apps list', async () => {
      const response = await readResourceHandler({
        params: { uri: 'scout://apps' },
      });

      expect(response).toHaveProperty('contents');
      expect(Array.isArray(response.contents)).toBe(true);
      expect(response.contents[0]).toHaveProperty('uri', 'scout://apps');
      expect(response.contents[0]).toHaveProperty('mimeType', 'application/json');
      
      const data = JSON.parse(response.contents[0].text);
      expect(data).toHaveProperty('apps');
    });
  });

  describe('ReadResource - scout://adapters', () => {
    it('should return available adapters', async () => {
      const response = await readResourceHandler({
        params: { uri: 'scout://adapters' },
      });

      expect(response).toHaveProperty('contents');
      const data = JSON.parse(response.contents[0].text);
      
      expect(data).toHaveProperty('adapters');
      expect(data.adapters).toHaveProperty('data');
      expect(data.adapters).toHaveProperty('cache');
      expect(data.adapters).toHaveProperty('blob');
      expect(data.adapters).toHaveProperty('queue');
    });

    it('should list valid adapter types', async () => {
      const response = await readResourceHandler({
        params: { uri: 'scout://adapters' },
      });

      const data = JSON.parse(response.contents[0].text);
      
      // Check that each port type has valid adapters
      expect(data.adapters.data).toContain('mongodb');
      expect(data.adapters.cache).toContain('valkey');
      expect(data.adapters.blob).toContain('spaces');
    });
  });

  describe('ReadResource - scout://app/{slug}', () => {
    it('should return app details for valid slug', async () => {
      const response = await readResourceHandler({
        params: { uri: 'scout://app/my-test-app' },
      });

      expect(response).toHaveProperty('contents');
      const data = JSON.parse(response.contents[0].text);
      
      expect(data).toHaveProperty('slug', 'my-test-app');
      expect(data).toHaveProperty('name');
    });

    it('should handle app with special characters in slug', async () => {
      const response = await readResourceHandler({
        params: { uri: 'scout://app/my-app-123-test' },
      });

      const data = JSON.parse(response.contents[0].text);
      expect(data.slug).toBe('my-app-123-test');
    });
  });

  describe('ReadResource - Error handling', () => {
    it('should throw error for unknown resource', async () => {
      await expect(readResourceHandler({
        params: { uri: 'scout://unknown' },
      })).rejects.toThrow('Unknown resource');
    });

    it('should throw error for malformed URI', async () => {
      await expect(readResourceHandler({
        params: { uri: 'invalid-uri' },
      })).rejects.toThrow();
    });

    it('should handle missing URI parameter', async () => {
      await expect(readResourceHandler({
        params: {},
      })).rejects.toThrow();
    });
  });

  describe('Resource URI patterns', () => {
    it('should support scout://apps URI', async () => {
      const response = await readResourceHandler({
        params: { uri: 'scout://apps' },
      });
      expect(response.contents[0].uri).toBe('scout://apps');
    });

    it('should support scout://adapters URI', async () => {
      const response = await readResourceHandler({
        params: { uri: 'scout://adapters' },
      });
      expect(response.contents[0].uri).toBe('scout://adapters');
    });

    it('should support scout://app/{slug} URI pattern', async () => {
      const testSlugs = ['my-app', 'test-123', 'app-with-dashes'];
      
      for (const slug of testSlugs) {
        const response = await readResourceHandler({
          params: { uri: `scout://app/${slug}` },
        });
        const data = JSON.parse(response.contents[0].text);
        expect(data.slug).toBe(slug);
      }
    });
  });
});