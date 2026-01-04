"use client";

import { useState, useCallback } from "react";
import { useSessionStore } from "@/stores/session";
import { triggerRefresh, getModelHash, listModels } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Hash, Loader2, FolderSync, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ModelTools() {
  const { sessionId } = useSessionStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);

  // Hash tool state
  const [selectedModel, setSelectedModel] = useState("");
  const [modelHash, setModelHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!sessionId) return;

    setIsRefreshing(true);
    setRefreshComplete(false);
    try {
      await triggerRefresh(sessionId);
      setRefreshComplete(true);
      toast.success("Model list refreshed successfully");
      setTimeout(() => setRefreshComplete(false), 3000);
    } catch (error) {
      toast.error("Failed to refresh model list");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [sessionId]);

  const handleLoadModels = useCallback(async () => {
    if (!sessionId) return;

    setIsLoadingModels(true);
    try {
      const result = await listModels({ subtype: "Stable-Diffusion" }, sessionId);
      setModels(result.files.map((f) => f.name));
    } catch (error) {
      toast.error("Failed to load models");
      console.error(error);
    } finally {
      setIsLoadingModels(false);
    }
  }, [sessionId]);

  const handleGetHash = useCallback(async () => {
    if (!sessionId || !selectedModel) return;

    setIsHashing(true);
    setModelHash(null);
    try {
      const result = await getModelHash(selectedModel, sessionId);
      setModelHash(result.hash);
      toast.success("Model hash retrieved");
    } catch (error) {
      toast.error("Failed to get model hash");
      console.error(error);
    } finally {
      setIsHashing(false);
    }
  }, [sessionId, selectedModel]);

  const copyHash = useCallback(() => {
    if (modelHash) {
      navigator.clipboard.writeText(modelHash);
      toast.success("Hash copied to clipboard");
    }
  }, [modelHash]);

  return (
    <div className="space-y-4">
      {/* Refresh Models */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderSync className="h-5 w-5" />
            Refresh Models
          </CardTitle>
          <CardDescription>
            Scan the models directory for new or removed models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : refreshComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Refreshed
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Model List
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Model Hash */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Model Hash
          </CardTitle>
          <CardDescription>
            Get the SHA256 hash of a model file for verification or Civitai lookup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                onOpenChange={(open) => {
                  if (open && models.length === 0) {
                    handleLoadModels();
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingModels ? (
                    <div className="p-2 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Loading models...
                    </div>
                  ) : models.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">
                      No models found
                    </div>
                  ) : (
                    models.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGetHash} disabled={isHashing || !selectedModel}>
              {isHashing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Get Hash"
              )}
            </Button>
          </div>

          {modelHash && (
            <div className="space-y-2">
              <Label>SHA256 Hash</Label>
              <div className="flex gap-2">
                <Input
                  value={modelHash}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={copyHash}>
                  <Hash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
