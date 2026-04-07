/**
 * Tests for MCP Prompts
 * 
 * Tests each prompt:
 * - Prompt listing
 * - Prompt retrieval
 * - Argument handling
 * - Message generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerPrompts } from '../src/prompts/index.js';

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

describe('MCP Prompts', () => {
  let server: Server;
  let listPromptsHandler: Function;
  let getPromptHandler: Function;

  beforeEach(() => {
    server = createMockServer();
    registerPrompts(server);
    
    listPromptsHandler = (server as any).getRequestHandler(ListPromptsRequestSchema)!;
    getPromptHandler = (server as any).getRequestHandler(GetPromptRequestSchema)!;
  });

  describe('ListPrompts', () => {
    it('should return all available prompts', async () => {
      const response = await listPromptsHandler({});
      
      expect(response).toHaveProperty('prompts');
      expect(Array.isArray(response.prompts)).toBe(true);
      expect(response.prompts.length).toBeGreaterThan(0);
    });

    it('should include deploy-new-app prompt', async () => {
      const response = await listPromptsHandler({});
      
      const deployPrompt = response.prompts.find((p: any) => p.name === 'deploy-new-app');
      expect(deployPrompt).toBeDefined();
      expect(deployPrompt.description).toContain('Create and deploy');
    });

    it('should include debug-errors prompt', async () => {
      const response = await listPromptsHandler({});
      
      const debugPrompt = response.prompts.find((p: any) => p.name === 'debug-errors');
      expect(debugPrompt).toBeDefined();
      expect(debugPrompt.description).toContain('Investigate errors');
    });

    it('should include prompt arguments', async () => {
      const response = await listPromptsHandler({});
      
      const deployPrompt = response.prompts.find((p: any) => p.name === 'deploy-new-app');
      expect(deployPrompt.arguments).toBeDefined();
      expect(Array.isArray(deployPrompt.arguments)).toBe(true);
      
      // Check required argument
      const nameArg = deployPrompt.arguments.find((a: any) => a.name === 'name');
      expect(nameArg).toBeDefined();
      expect(nameArg.required).toBe(true);
      
      // Check optional argument
      const typeArg = deployPrompt.arguments.find((a: any) => a.name === 'type');
      expect(typeArg).toBeDefined();
      expect(typeArg.required).toBe(false);
    });
  });

  describe('deploy-new-app prompt', () => {
    it('should generate prompt with app name', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'deploy-new-app',
          arguments: { name: 'MyApp' },
        },
      });

      expect(response).toHaveProperty('description');
      expect(response).toHaveProperty('messages');
      expect(Array.isArray(response.messages)).toBe(true);
      expect(response.messages.length).toBeGreaterThan(0);
      
      const userMessage = response.messages.find((m: any) => m.role === 'user');
      expect(userMessage).toBeDefined();
      expect(userMessage.content.text).toContain('MyApp');
    });

    it('should include app type in prompt', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'deploy-new-app',
          arguments: { name: 'TestApp', type: 'hono' },
        },
      });

      const userMessage = response.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content.text).toContain('hono');
    });

    it('should default to static type when not specified', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'deploy-new-app',
          arguments: { name: 'TestApp' },
        },
      });

      const userMessage = response.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content.text).toContain('static app');
    });

    it('should include deployment steps', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'deploy-new-app',
          arguments: { name: 'TestApp' },
        },
      });

      const userMessage = response.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content.text).toContain('app_create');
      expect(userMessage.content.text).toContain('deploy');
    });

    it('should handle missing arguments gracefully', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'deploy-new-app',
          arguments: {},
        },
      });

      // Should use defaults
      expect(response).toHaveProperty('messages');
      const userMessage = response.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content.text).toContain('my-app'); // default name
    });
  });

  describe('debug-errors prompt', () => {
    it('should generate prompt with app slug', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'debug-errors',
          arguments: { slug: 'my-app' },
        },
      });

      expect(response).toHaveProperty('description');
      expect(response).toHaveProperty('messages');
      
      const userMessage = response.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content.text).toContain('my-app');
    });

    it('should include debugging steps', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'debug-errors',
          arguments: { slug: 'test-app' },
        },
      });

      const userMessage = response.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content.text).toContain('logs');
      expect(userMessage.content.text).toContain('error');
    });

    it('should handle missing slug gracefully', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'debug-errors',
          arguments: {},
        },
      });

      expect(response).toHaveProperty('messages');
      const userMessage = response.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content.text).toContain('unknown'); // default slug
    });
  });

  describe('Error handling', () => {
    it('should throw error for unknown prompt', async () => {
      await expect(getPromptHandler({
        params: {
          name: 'unknown-prompt',
          arguments: {},
        },
      })).rejects.toThrow('Unknown prompt');
    });

    it('should validate prompt name', async () => {
      await expect(getPromptHandler({
        params: {
          name: 'invalid_prompt_name',
          arguments: {},
        },
      })).rejects.toThrow();
    });
  });

  describe('Prompt message format', () => {
    it('should return valid message structure', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'deploy-new-app',
          arguments: { name: 'Test' },
        },
      });

      // Validate message structure
      response.messages.forEach((message: any) => {
        expect(message).toHaveProperty('role');
        expect(['user', 'assistant', 'system']).toContain(message.role);
        expect(message).toHaveProperty('content');
        expect(message.content).toHaveProperty('type', 'text');
        expect(message.content).toHaveProperty('text');
        expect(typeof message.content.text).toBe('string');
      });
    });

    it('should return description', async () => {
      const response = await getPromptHandler({
        params: {
          name: 'deploy-new-app',
          arguments: { name: 'Test' },
        },
      });

      expect(typeof response.description).toBe('string');
      expect(response.description.length).toBeGreaterThan(0);
    });
  });
});