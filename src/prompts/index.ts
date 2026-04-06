import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export function registerPrompts(server: Server): void {
  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'deploy-new-app',
          description: 'Create and deploy a new app on Scout Live',
          arguments: [
            {
              name: 'name',
              description: 'App name',
              required: true,
            },
            {
              name: 'type',
              description: 'App type (static, hono, express, etc.)',
              required: false,
            },
          ],
        },
        {
          name: 'debug-errors',
          description: 'Investigate errors in app logs',
          arguments: [
            {
              name: 'slug',
              description: 'App slug',
              required: true,
            },
          ],
        },
      ],
    };
  });

  // Handle prompt requests
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'deploy-new-app': {
        const appName = args?.name || 'my-app';
        const appType = args?.type || 'static';
        return {
          description: `Create and deploy a new ${appType} app named ${appName}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Help me create and deploy a new ${appType} app named "${appName}" on Scout Live.

Steps:
1. Use the app_create tool to create the app
2. Prepare the app files based on the type
3. Use the deploy tool to deploy the app
4. Verify the deployment

Please proceed with creating the app.`,
              },
            },
          ],
        };
      }

      case 'debug-errors': {
        const slug = args?.slug || 'unknown';
        return {
          description: `Debug errors for app ${slug}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Help me debug errors in my app "${slug}".

Steps:
1. Use the logs tool to get recent logs
2. Identify error patterns
3. Suggest fixes for common issues

Please retrieve the logs and analyze any errors.`,
              },
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}