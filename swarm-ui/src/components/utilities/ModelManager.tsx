"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { useSessionStore } from "@/stores/session";
import { listModels, deleteModel, triggerRefresh } from "@/lib/api";
import { WSClient } from "@/lib/websocket/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Download,
  Trash2,
  Loader2,
  RefreshCw,
  Package,
  HardDrive,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { ModelData } from "@/types/api";

const MODEL_TYPES = [
  { value: "Stable-Diffusion", label: "Checkpoints" },
  { value: "LoRA", label: "LoRAs" },
  { value: "VAE", label: "VAEs" },
  { value: "Embedding", label: "Embeddings" },
  { value: "ControlNet", label: "ControlNets" },
];

interface DownloadProgress {
  url: string;
  name: string;
  progress: number;
  speed: string;
  status: "downloading" | "complete" | "error";
  error?: string;
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function ModelManager() {
  const { sessionId } = useSessionStore();
  const [modelType, setModelType] = useState("Stable-Diffusion");
  const [models, setModels] = useState<ModelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Download state
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [downloadType, setDownloadType] = useState("Stable-Diffusion");
  const [activeDownloads, setActiveDownloads] = useState<DownloadProgress[]>([]);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadModels = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const result = await listModels({ subtype: modelType }, sessionId);
      setModels(result.files || []);
    } catch (error) {
      toast.error("Failed to load models");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, modelType]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleRefresh = useCallback(async () => {
    if (!sessionId) return;

    setIsRefreshing(true);
    try {
      await triggerRefresh(sessionId);
      await loadModels();
      toast.success("Model list refreshed");
    } catch (error) {
      toast.error("Failed to refresh models");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  }, [sessionId, loadModels]);

  const handleDownload = useCallback(async () => {
    if (!sessionId || !downloadUrl.trim()) return;

    const name = downloadName.trim() || `model_${Date.now()}`;
    const downloadId = `${Date.now()}`;

    setActiveDownloads((prev) => [
      ...prev,
      {
        url: downloadUrl,
        name,
        progress: 0,
        speed: "0 B/s",
        status: "downloading",
      },
    ]);

    const client = new WSClient("DoModelDownloadWS", {
      sessionId,
      onMessage: (data) => {
        const msg = data as Record<string, unknown>;

        // Update progress
        if (msg.current_percent !== undefined || msg.overall_percent !== undefined) {
          const progress = ((msg.overall_percent as number) || (msg.current_percent as number) || 0) * 100;
          const speed = formatSpeed((msg.per_second as number) || 0);

          setActiveDownloads((prev) =>
            prev.map((d) =>
              d.url === downloadUrl ? { ...d, progress, speed } : d
            )
          );
        }

        // Check for completion
        if (msg.success || msg.complete) {
          setActiveDownloads((prev) =>
            prev.map((d) =>
              d.url === downloadUrl ? { ...d, status: "complete", progress: 100 } : d
            )
          );
          toast.success(`Downloaded ${name}`);
          loadModels();
        }

        // Check for error
        if (msg.error) {
          setActiveDownloads((prev) =>
            prev.map((d) =>
              d.url === downloadUrl
                ? { ...d, status: "error", error: msg.error as string }
                : d
            )
          );
          toast.error(`Download failed: ${msg.error}`);
        }
      },
      onError: (error) => {
        setActiveDownloads((prev) =>
          prev.map((d) =>
            d.url === downloadUrl
              ? { ...d, status: "error", error: error.message }
              : d
          )
        );
        toast.error(`Download failed: ${error.message}`);
      },
      onStateChange: (state) => {
        if (state === "completed" || state === "disconnected") {
          // Clean up completed downloads after a delay
          setTimeout(() => {
            setActiveDownloads((prev) =>
              prev.filter((d) => d.url !== downloadUrl || d.status === "downloading")
            );
          }, 5000);
        }
      },
    });

    try {
      await client.connect({
        url: downloadUrl,
        type: downloadType,
        name,
      });
      setDownloadUrl("");
      setDownloadName("");
    } catch (error) {
      toast.error("Failed to start download");
      setActiveDownloads((prev) => prev.filter((d) => d.url !== downloadUrl));
    }
  }, [sessionId, downloadUrl, downloadName, downloadType, loadModels]);

  const handleDelete = useCallback(async () => {
    if (!sessionId || !deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteModel(deleteTarget, sessionId);
      toast.success(`Deleted ${deleteTarget}`);
      setDeleteTarget(null);
      loadModels();
    } catch (error) {
      toast.error("Failed to delete model");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  }, [sessionId, deleteTarget, loadModels]);

  const clearCompletedDownloads = () => {
    setActiveDownloads((prev) => prev.filter((d) => d.status === "downloading"));
  };

  return (
    <div className="space-y-4">
      {/* Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Model
          </CardTitle>
          <CardDescription>
            Download models from URLs (Civitai, Hugging Face, direct links)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Model URL</Label>
              <Input
                placeholder="https://civitai.com/api/download/models/... or direct URL"
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Save As (optional)</Label>
              <Input
                placeholder="model_name"
                value={downloadName}
                onChange={(e) => setDownloadName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={downloadType} onValueChange={setDownloadType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            disabled={!downloadUrl.trim() || activeDownloads.some((d) => d.status === "downloading")}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>

          {/* Active Downloads */}
          {activeDownloads.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <Label>Downloads</Label>
                {activeDownloads.some((d) => d.status !== "downloading") && (
                  <Button variant="ghost" size="sm" onClick={clearCompletedDownloads}>
                    Clear completed
                  </Button>
                )}
              </div>
              {activeDownloads.map((download, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted/50 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate flex-1">
                      {download.name}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {download.status === "downloading" && (
                        <>
                          <span className="text-muted-foreground">
                            {download.speed}
                          </span>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      )}
                      {download.status === "complete" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {download.status === "error" && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </span>
                  </div>
                  {download.status === "downloading" && (
                    <Progress value={download.progress} className="h-2" />
                  )}
                  {download.error && (
                    <p className="text-xs text-red-500">{download.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Installed Models
            </span>
            <div className="flex items-center gap-2">
              <Select value={modelType} onValueChange={setModelType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            {models.length} {modelType.toLowerCase()} models installed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No models found
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <Accordion type="single" collapsible className="space-y-2">
                {models.map((model) => (
                  <AccordionItem
                    key={model.name}
                    value={model.name}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        {model.preview_image && (
                          <img
                            src={model.preview_image}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {model.title || model.name}
                          </p>
                          {model.author && (
                            <p className="text-xs text-muted-foreground">
                              by {model.author}
                            </p>
                          )}
                        </div>
                        {model.architecture && (
                          <Badge variant="outline" className="shrink-0">
                            {model.architecture}
                          </Badge>
                        )}
                        {model.loaded && (
                          <Badge variant="secondary" className="shrink-0">
                            Loaded
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-3 pt-2">
                        {model.description && (
                          <div
                            className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(model.description, {
                                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'hr', 'code', 'pre'],
                                ALLOWED_ATTR: ['href', 'target', 'rel'],
                              }),
                            }}
                          />
                        )}
                        <div className="flex flex-wrap gap-2">
                          {model.architecture && (
                            <Badge variant="outline">{model.architecture}</Badge>
                          )}
                          {model.resolution && (
                            <Badge variant="outline">{model.resolution}</Badge>
                          )}
                          {model.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {model.trigger_phrase && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Trigger: </span>
                            <code className="bg-muted px-1 rounded">
                              {model.trigger_phrase}
                            </code>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(model.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
