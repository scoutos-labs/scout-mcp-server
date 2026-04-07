#!/bin/bash
# Deploy Scout MCP Server to Kubernetes
# 
# Usage: ./deploy.sh [version]
# 
# Prerequisites:
# - DO registry token configured
# - kubectl configured for scout-live cluster
# - scout-live namespace exists

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="${1:-v0.1.0}"
IMAGE="registry.digitalocean.com/scout-live/mcp-server:$VERSION"

echo "Building Scout MCP Server..."
echo "  Version: $VERSION"
echo "  Image: $IMAGE"

# Build TypeScript
echo ""
echo "Compiling TypeScript..."
bun run build

# Build Docker image
echo ""
echo "Building Docker image..."
docker build -t "$IMAGE" .

# Push to registry
echo ""
echo "Pushing to registry..."
docker push "$IMAGE"

# Update deployment image
echo ""
echo "Updating Kubernetes deployment..."
kubectl set image deployment/scout-mcp-server \
  mcp-server="$IMAGE" \
  -n scout-live

# Wait for rollout
echo ""
echo "Waiting for rollout..."
kubectl rollout status deployment/scout-mcp-server -n scout-live --timeout=120s

# Show status
echo ""
echo "Deployment complete!"
echo ""
kubectl get pods -n scout-live -l app=scout-mcp-server
echo ""
echo "MCP Server URL: https://mcp.scoutos.live"
echo "Health check: curl https://mcp.scoutos.live/health"