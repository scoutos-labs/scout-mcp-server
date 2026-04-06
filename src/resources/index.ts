import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export function registerResources(server: Server): void {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'scout://apps',
          name: 'Apps List',
          description: 'List of all apps for the authenticated user',
          mimeType: 'application/json',
        },
        {
          uri: 'scout://adapters',
          name: 'Available Adapters',
          description: 'List of available port adapters',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === 'scout://apps') {
      // TODO: Implement with Scout SDK
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ apps: [], message: 'Not yet implemented' }, null, 2),
          },
        ],
      };
    }

    if (uri === 'scout://adapters') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              adapters: {
                data: ['mongodb', 'valkey', 'sqlite'],
                cache: ['valkey', 'memory'],
                blob: ['spaces', 's3', 'local'],
                queue: ['kafka', 'redis'],
              },
            }, null, 2),
          },
        ],
      };
    }

    // App-specific resource
    const appMatch = uri.match(/^scout:\/\/app\/([^/]+)$/);
    if (appMatch) {
      const slug = appMatch[1];
      // TODO: Implement with Scout SDK
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ 
              slug, 
              name: 'App Name',
              message: 'Not yet implemented' 
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });
}