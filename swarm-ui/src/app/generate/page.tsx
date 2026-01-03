"use client";

import { useSessionStore } from "@/stores/session";
import { useStatusStore } from "@/stores/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function GeneratePage() {
  const { sessionId, userId, version, isLoading, isInitialized } = useSessionStore();
  const { waitingGens, liveGens, loadingModels, supportedFeatures } = useStatusStore();

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to SwarmUI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">SwarmUI</h1>
          <p className="text-muted-foreground">Next.js Frontend - Phase 1 Complete</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {sessionId?.slice(0, 16)}...
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span>{userId || "Anonymous"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Server Version:</span>
                <span>{version || "Unknown"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Server Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waiting:</span>
                <Badge variant={waitingGens > 0 ? "default" : "secondary"}>
                  {waitingGens}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Generating:</span>
                <Badge variant={liveGens > 0 ? "default" : "secondary"}>
                  {liveGens}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loading Models:</span>
                <Badge variant={loadingModels > 0 ? "default" : "secondary"}>
                  {loadingModels}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Supported Features</CardTitle>
          </CardHeader>
          <CardContent>
            {supportedFeatures.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {supportedFeatures.map((feature) => (
                  <Badge key={feature} variant="outline">
                    {feature}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No features loaded yet. Make sure the SwarmUI backend is running on port 7801.
              </p>
            )}
          </CardContent>
        </Card>

        <Separator />

        <div className="text-center text-sm text-muted-foreground">
          <p>Phase 1 Foundation Complete:</p>
          <ul className="mt-2 space-y-1">
            <li>Next.js 14+ with TypeScript</li>
            <li>Tailwind CSS + shadcn/ui</li>
            <li>API client with proxy to backend</li>
            <li>WebSocket client with reconnection</li>
            <li>Zustand stores (session, status, generation)</li>
            <li>Authentication flow</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
