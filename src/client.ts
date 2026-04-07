/**
 * Scout Live API Client
 * 
 * Handles authentication and requests to the Scout Live platform.
 */

const SCOUT_API_URL = process.env.SCOUT_API_URL || 'https://scoutos.live';
const SCOUT_API_KEY = process.env.SCOUT_API_KEY;

export interface App {
  id: string;
  slug: string;
  name?: string;
  userId: string | null;
  createdAt: string;
  lastDeploy: string;
  hasBackend: boolean;
  runtime: 'process' | 'k8s' | 'hybrid';
  status: 'running' | 'stopped' | 'error' | 'building';
}

export interface Adapter {
  id: string;
  type: 'data' | 'cache' | 'blob' | 'queue' | 'agents';
  adapter: string;
  namespace: string;
  shared: boolean;
  config?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface DeployResult {
  version: string;
  slug: string;
  deployedAt: string;
  url: string;
}

class ScoutClient {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || SCOUT_API_URL;
    this.apiKey = apiKey || SCOUT_API_KEY;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('SCOUT_API_KEY is required');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Scout API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  // App Operations
  async listApps(): Promise<{ apps: App[]; count: number }> {
    return this.request<{ apps: App[]; count: number }>('/api/apps');
  }

  async getApp(slug: string): Promise<App> {
    return this.request<App>(`/api/apps/${slug}`);
  }

  async createApp(name: string, slug?: string): Promise<App> {
    return this.request<App>('/api/apps', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
  }

  async deleteApp(slug: string, publishCode: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/api/apps/${slug}?code=${publishCode}`, {
      method: 'DELETE',
    });
  }

  // Deploy Operations
  async deploy(
    slug: string,
    files: Record<string, string>,
    publishCode?: string
  ): Promise<DeployResult> {
    // Build tarball from files
    const formData = new FormData();
    
    // For now, use the build API endpoint
    // In production, this would create a proper tar.gz
    const tarball = this.createTarball(files);
    
    const response = await fetch(`${this.baseUrl}/api/build?subdomain=${slug}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Publish-Code': publishCode || '',
      },
      body: tarball,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deploy failed: ${response.status} - ${error}`);
    }

    return {
      version: 'v1.0.0',
      slug,
      deployedAt: new Date().toISOString(),
      url: `https://${slug}.scoutos.live`,
    };
  }

  private createTarball(files: Record<string, string>): Blob {
    // Create a simple tar archive
    // Note: This is a simplified version - production would use proper tar
    const entries = Object.entries(files).map(([path, content]) => ({
      path,
      content,
    }));
    
    return new Blob([JSON.stringify({ files: entries })], {
      type: 'application/json',
    });
  }

  // Logs Operations
  async getLogs(slug: string, lines?: number): Promise<{ slug: string; logs: LogEntry[] }> {
    const params = lines ? `?tail=${lines}` : '';
    return this.request<{ slug: string; logs: LogEntry[] }>(
      `/api/apps/${slug}/logs${params}`
    );
  }

  // Port Operations
  async getPortAdapter(slug: string, port: string): Promise<Adapter | null> {
    try {
      return await this.request<Adapter>(`/api/apps/${slug}/ports/${port}`);
    } catch {
      return null;
    }
  }

  async setPortAdapter(
    slug: string,
    port: string,
    adapter: string,
    config?: Record<string, unknown>
  ): Promise<Adapter> {
    return this.request<Adapter>(`/api/apps/${slug}/ports/${port}`, {
      method: 'POST',
      body: JSON.stringify({ adapter, ...config }),
    });
  }

  // Adapter Operations
  async listAdapters(): Promise<{ adapters: Record<string, string[]> }> {
    return this.request<{ adapters: Record<string, string[]> }>('/api/adapters');
  }

  // Health Check
  async healthCheck(): Promise<{ ok: boolean; timestamp: string }> {
    return this.request<{ ok: boolean; timestamp: string }>('/api/health');
  }
}

// Export singleton instance
export const scoutClient = new ScoutClient();

// Export class for testing
export { ScoutClient };