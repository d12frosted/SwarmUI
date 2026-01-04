"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { useSessionStore } from "@/stores/session";
import { useDownloadsStore, formatSpeed, formatBytes, formatElapsed, estimateTimeRemainingFromBytes, type CivitaiMetadata } from "@/stores/downloads";
import { listModels, deleteModel, triggerRefresh } from "@/lib/api";
import { parseCivitaiUrl, parseHuggingFaceUrl, fetchCivitaiMetadata, fetchImageAsBase64 } from "@/lib/api/endpoints/utils";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCircle2,
  XCircle,
  Search,
  X,
  ExternalLink,
  User,
  Tag,
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

export function ModelManager() {
  const { sessionId } = useSessionStore();
  const { downloads, addDownload, startDownload, cancelDownload, clearCompleted } = useDownloadsStore();

  const [modelType, setModelType] = useState("Stable-Diffusion");
  const [models, setModels] = useState<ModelData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Download state
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [downloadType, setDownloadType] = useState("Stable-Diffusion");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [previewMetadata, setPreviewMetadata] = useState<CivitaiMetadata | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState("");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter active downloads for this component
  const activeDownloads = downloads.filter(
    (d) => d.status === "downloading" || d.status === "pending"
  );
  const completedDownloads = downloads.filter(
    (d) => d.status === "complete" || d.status === "error"
  );

  // Force re-render every second while downloads are active to update elapsed time
  const [, setTick] = useState(0);
  useEffect(() => {
    if (activeDownloads.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeDownloads.length]);

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

  // Refresh models when a download completes
  useEffect(() => {
    const hasCompleted = downloads.some((d) => d.status === "complete");
    if (hasCompleted) {
      loadModels();
    }
  }, [downloads, loadModels]);

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

  const handleUrlCheck = useCallback(async () => {
    if (!sessionId || !downloadUrl.trim()) return;

    const url = downloadUrl.trim();

    // Check for Civitai URL
    const civitaiParsed = parseCivitaiUrl(url);
    if (civitaiParsed) {
      setIsFetchingMetadata(true);
      try {
        // For API download URLs, we only have versionId
        const modelId = civitaiParsed.modelId || "";
        const versionId = civitaiParsed.versionId;

        if (modelId) {
          const metadata = await fetchCivitaiMetadata(modelId, versionId, sessionId);
          if (metadata) {
            setPreviewMetadata(metadata);
            setPendingDownloadUrl(url);
            // Auto-detect type from metadata
            if (metadata.modelType) {
              setDownloadType(metadata.modelType);
            }
            // Suggest name from metadata
            if (!downloadName.trim()) {
              const suggestedName = metadata.title
                .replace(/[<>:"/\\|?*]/g, "")
                .replace(/\s+/g, "_")
                .substring(0, 50);
              setDownloadName(suggestedName);
            }
            setShowPreviewDialog(true);
          } else {
            // Metadata fetch failed, proceed with direct download
            startDirectDownload(url);
          }
        } else if (versionId) {
          // We only have versionId (from API download URL), proceed with direct download
          startDirectDownload(url);
        }
      } catch (error) {
        console.error("Failed to fetch Civitai metadata:", error);
        startDirectDownload(url);
      } finally {
        setIsFetchingMetadata(false);
      }
      return;
    }

    // Check for HuggingFace URL
    const hfParsed = parseHuggingFaceUrl(url);
    if (hfParsed) {
      // Use fixed URL and suggested filename
      if (!downloadName.trim()) {
        setDownloadName(hfParsed.filename);
      }
      startDirectDownload(hfParsed.fixedUrl);
      return;
    }

    // Direct URL - proceed without preview
    startDirectDownload(url);
  }, [sessionId, downloadUrl, downloadName]);

  const startDirectDownload = useCallback((url: string) => {
    if (!sessionId) return;

    const name = downloadName.trim() || `model_${Date.now()}`;
    const id = addDownload({
      url,
      name,
      type: downloadType,
    });
    startDownload(id, sessionId);
    setDownloadUrl("");
    setDownloadName("");
    toast.success(`Started downloading ${name}`);
  }, [sessionId, downloadName, downloadType, addDownload, startDownload]);

  const [isPreparingDownload, setIsPreparingDownload] = useState(false);

  const handleConfirmPreviewDownload = useCallback(async () => {
    if (!sessionId || !previewMetadata) return;

    setIsPreparingDownload(true);

    try {
      // Fetch the preview image as base64 for embedding in model metadata
      let metadataWithImage = { ...previewMetadata };
      if (previewMetadata.previewImage) {
        const base64Image = await fetchImageAsBase64(previewMetadata.previewImage);
        if (base64Image) {
          metadataWithImage.previewImageBase64 = base64Image;
        }
      }

      const name = downloadName.trim() || previewMetadata.title.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "_").substring(0, 50);
      const id = addDownload({
        url: pendingDownloadUrl,
        name,
        type: downloadType,
        metadata: metadataWithImage,
      });
      startDownload(id, sessionId);

      setShowPreviewDialog(false);
      setPreviewMetadata(null);
      setPendingDownloadUrl("");
      setDownloadUrl("");
      setDownloadName("");
      toast.success(`Started downloading ${previewMetadata.title}`);
    } finally {
      setIsPreparingDownload(false);
    }
  }, [sessionId, previewMetadata, downloadName, downloadType, pendingDownloadUrl, addDownload, startDownload]);

  const handleDelete = useCallback(async () => {
    if (!sessionId || !deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteModel(deleteTarget, sessionId, modelType);
      toast.success(`Deleted ${deleteTarget}`);
      setDeleteTarget(null);
      loadModels();
    } catch (error) {
      toast.error("Failed to delete model");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  }, [sessionId, deleteTarget, modelType, loadModels]);

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
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Model URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://civitai.com/models/... or direct download URL"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && downloadUrl.trim()) {
                      handleUrlCheck();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleUrlCheck}
                  disabled={!downloadUrl.trim() || isFetchingMetadata}
                >
                  {isFetchingMetadata ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a Civitai or HuggingFace URL - type and name are auto-detected
              </p>
            </div>

            {/* Advanced options - collapsible */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Advanced options (for direct URLs)
              </summary>
              <div className="grid gap-3 sm:grid-cols-2 mt-3 pl-2 border-l-2 border-muted">
                <div className="space-y-1.5">
                  <Label className="text-xs">Save As</Label>
                  <Input
                    placeholder="model_name (auto-detected)"
                    value={downloadName}
                    onChange={(e) => setDownloadName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={downloadType} onValueChange={setDownloadType}>
                    <SelectTrigger className="h-8 text-sm">
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
            </details>
          </div>

          {/* Active Downloads */}
          {downloads.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <Label>Downloads ({activeDownloads.length} active)</Label>
                {completedDownloads.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCompleted}>
                    Clear completed
                  </Button>
                )}
              </div>
              {downloads.map((download) => (
                <div
                  key={download.id}
                  className="p-3 bg-muted/50 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {download.metadata?.previewImage && (
                        <img
                          src={download.metadata.previewImage}
                          alt=""
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      )}
                      <span className="font-medium truncate">
                        {download.metadata?.title || download.name}
                      </span>
                    </div>
                    <span className="flex items-center gap-2 shrink-0">
                      {download.status === "pending" && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {download.status === "complete" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {download.status === "error" && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      {download.status === "downloading" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => cancelDownload(download.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </span>
                  </div>
                  {download.status === "downloading" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Progress value={download.progress} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {download.progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatSpeed(download.speed)}</span>
                        {download.totalBytes > 0 && (
                          <span>{formatBytes(download.currentBytes)} / {formatBytes(download.totalBytes)}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatElapsed(download.startedAt)} elapsed</span>
                        <span>~{estimateTimeRemainingFromBytes(download.currentBytes, download.totalBytes, download.speed)} left</span>
                      </div>
                    </>
                  )}
                  {download.status === "complete" && (
                    <p className="text-xs text-muted-foreground">
                      Completed in {formatElapsed(download.startedAt)}
                    </p>
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

      {/* Civitai Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Download Model</DialogTitle>
            <DialogDescription>
              Review model details before downloading
            </DialogDescription>
          </DialogHeader>

          {previewMetadata && (
            <div className="space-y-4">
              {/* Preview Image */}
              {previewMetadata.previewImage && (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={previewMetadata.previewImage}
                    alt={previewMetadata.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Model Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{previewMetadata.title}</h3>

                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {previewMetadata.author && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {previewMetadata.author}
                    </span>
                  )}
                  {previewMetadata.baseModel && (
                    <Badge variant="outline">{previewMetadata.baseModel}</Badge>
                  )}
                  {previewMetadata.modelType && (
                    <Badge variant="secondary">{previewMetadata.modelType}</Badge>
                  )}
                </div>

                {/* Trigger Words */}
                {previewMetadata.triggerWords && previewMetadata.triggerWords.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Trigger Words:</p>
                    <div className="flex flex-wrap gap-1">
                      {previewMetadata.triggerWords.map((word, idx) => (
                        <code key={idx} className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          {word}
                        </code>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {previewMetadata.tags && previewMetadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {previewMetadata.tags.slice(0, 8).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <Tag className="h-2.5 w-2.5 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {previewMetadata.tags.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{previewMetadata.tags.length - 8} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Save Name */}
                <div className="space-y-1.5 pt-2">
                  <Label>Save as</Label>
                  <Input
                    value={downloadName}
                    onChange={(e) => setDownloadName(e.target.value)}
                    placeholder={previewMetadata.title}
                  />
                </div>

                {/* Type Selection */}
                <div className="space-y-1.5">
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)} disabled={isPreparingDownload}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPreviewDownload} disabled={isPreparingDownload}>
              {isPreparingDownload ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
