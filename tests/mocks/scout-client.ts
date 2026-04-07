/**
 * Mock Scout Live API client for testing
 * 
 * Simulates responses from the Scout Live API endpoints
 * without making actual network requests.
 */

import { vi } from 'vitest';

export interface MockApp {
  id: string;
  slug: string;
  name: string;
  userId: string;
  createdAt: string;
  lastDeploy: string;
  hasBackend: boolean;
  runtime: 'process' | 'k8s' | 'hybrid';
  status: 'running' | 'stopped' | 'error' | 'building';
}

export interface MockAdapter {
  id: string;
  type: 'data' | 'cache' | 'blob' | 'queue' | 'agents';
  adapter: string;
  namespace: string;
  shared: boolean;
}

export interface MockLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

// Test fixtures
export const mockApps: MockApp[] = [
  {
    id: 'app_test123',
    slug: 'test-app',
    name: 'Test App',
    userId: 'user_abc',
    createdAt: '2026-04-01T10:00:00Z',
    lastDeploy: '2026-04-07T12:00:00Z',
    hasBackend: true,
    runtime: 'k8s',
    status: 'running',
  },
  {
    id: 'app_test456',
    slug: 'my-hono-app',
    name: 'My Hono App',
    userId: 'user_abc',
    createdAt: '2026-04-05T08:30:00Z',
    lastDeploy: '2026-04-06T14:00:00Z',
    hasBackend: true,
    runtime: 'k8s',
    status: 'running',
  },
  {
    id: 'app_test789',
    slug: 'static-site',
    name: 'Static Site',
    userId: 'user_xyz',
    createdAt: '2026-04-02T15:00:00Z',
    lastDeploy: '2026-04-02T15:30:00Z',
    hasBackend: false,
    runtime: 'process',
    status: 'running',
  },
];

export const mockAdapters: MockAdapter[] = [
  {
    id: 'adapter_mongodb_1',
    type: 'data',
    adapter: 'mongodb',
    namespace: 'test-app',
    shared: true,
  },
  {
    id: 'adapter_valkey_1',
    type: 'cache',
    adapter: 'valkey',
    namespace: 'test-app',
    shared: true,
  },
  {
    id: 'adapter_spaces_1',
    type: 'blob',
    adapter: 'spaces',
    namespace: 'test-app',
    shared: false,
  },
];

export const mockLogs: MockLogEntry[] = [
  { timestamp: '2026-04-07T14:00:00Z', level: 'info', message: 'Server started on port 3000' },
  { timestamp: '2026-04-07T14:00:01Z', level: 'info', message: 'Connected to database' },
  { timestamp: '2026-04-07T14:05:30Z', level: 'warn', message: 'Rate limit approaching' },
  { timestamp: '2026-04-07T14:10:00Z', level: 'error', message: 'Connection timeout' },
  { timestamp: '2026-04-07T14:10:05Z', level: 'info', message: 'Reconnected successfully' },
];

// Create a mock Scout client
export function createMockScoutClient() {
  return {
    listApps: vi.fn().mockResolvedValue(mockApps),
    getApp: vi.fn().mockImplementation(async (slug: string) => {
      const app = mockApps.find(a => a.slug === slug);
      if (!app) throw new Error(`App not found: ${slug}`);
      return app;
    }),
    createApp: vi.fn().mockImplementation(async (name: string, slug?: string) => ({
      id: `app_${Date.now()}`,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      userId: 'user_abc',
      createdAt: new Date().toISOString(),
      lastDeploy: new Date().toISOString(),
      hasBackend: false,
      runtime: 'process' as const,
      status: 'running' as const,
    })),
    deleteApp: vi.fn().mockResolvedValue({ deleted: true }),
    deploy: vi.fn().mockImplementation(async (slug: string, files: Record<string, string>) => ({
      version: 'v1.0.0',
      slug,
      deployedAt: new Date().toISOString(),
      fileCount: Object.keys(files).length,
    })),
    getLogs: vi.fn().mockImplementation(async (slug: string, lines?: number) => ({
      slug,
      logs: mockLogs.slice(-(lines || 100)),
    })),
    getAdapter: vi.fn().mockImplementation(async (slug: string, type: string) => {
      const adapter = mockAdapters.find(a => a.type === type && a.namespace === slug);
      if (!adapter) return null;
      return adapter;
    }),
    setAdapter: vi.fn().mockImplementation(async (slug: string, type: string, config: Record<string, unknown>) => ({
      id: `adapter_${type}_${slug}`,
      type,
      adapter: config.adapter,
      namespace: slug,
      shared: config.shared ?? true,
    })),
    listAdapters: vi.fn().mockResolvedValue(mockAdapters),
  };
}

// Mock fetch for Scout Live API
export function mockScoutApi() {
  const originalFetch = global.fetch;
  
  return {
    setup: () => {
      global.fetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
        const parsedUrl = new URL(url);
        const path = parsedUrl.pathname;
        const method = options?.method || 'GET';
        const body = options?.body ? JSON.parse(options.body as string) : null;

        // Mock responses based on endpoint
        if (path === '/api/apps' && method === 'GET') {
          return new Response(JSON.stringify({ apps: mockApps, count: mockApps.length }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (path === '/api/apps' && method === 'POST') {
          return new Response(JSON.stringify({
            id: `app_${Date.now()}`,
            slug: body?.slug || 'new-app',
            name: body?.name || 'New App',
            createdAt: new Date().toISOString(),
          }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (path.match(/\/api\/apps\/[^/]+$/) && method === 'DELETE') {
          const slug = path.split('/').pop();
          return new Response(JSON.stringify({ deleted: true, slug }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (path.match(/\/api\/apps\/[^/]+\/logs$/) && method === 'GET') {
          return new Response(JSON.stringify({
            slug: path.split('/')[3],
            logs: mockLogs,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Default 404
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
      });
    },
    teardown: () => {
      global.fetch = originalFetch;
    },
  };
}

export type MockScoutClient = ReturnType<typeof createMockScoutClient>;