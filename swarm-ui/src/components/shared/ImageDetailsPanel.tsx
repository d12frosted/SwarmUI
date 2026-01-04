"use client";

import { Button } from "@/components/ui/button";
import { Copy, Download, Paintbrush } from "lucide-react";
import type { ImageMetadata } from "@/types/api";

interface ImageDetailsPanelProps {
  metadata?: ImageMetadata;
  imageSrc?: string;
  onDownload?: () => void;
  onEdit?: () => void;
  onCopyPrompt?: () => void;
  showActions?: boolean;
  className?: string;
}

export function ImageDetailsPanel({
  metadata,
  onDownload,
  onEdit,
  onCopyPrompt,
  showActions = true,
  className,
}: ImageDetailsPanelProps) {
  if (!metadata) {
    return <p className="text-muted-foreground p-4">No metadata available</p>;
  }

  // Extract params from nested structure or flat structure (SwarmUI format)
  const params = (metadata.sui_image_params || metadata.Sui_image_params || metadata) as Record<string, unknown>;
  const extraData = (metadata.sui_extra_data || metadata.Sui_extra_data || {}) as Record<string, unknown>;

  const prompt = String(params.prompt || metadata.prompt || "");
  const negativePrompt = String(params.negativeprompt || metadata.negativeprompt || "");
  const model = String(params.model || metadata.model || "");
  const seed = params.seed ?? metadata.seed;
  const steps = params.steps ?? metadata.steps;
  const cfg = params.cfgscale ?? metadata.cfgscale;
  const width = params.width ?? metadata.width;
  const height = params.height ?? metadata.height;
  const sampler = params.sampler ?? metadata.sampler;
  const scheduler = params.scheduler ?? metadata.scheduler;
  const date = extraData.date || metadata.date;
  const loras = (params.loras || []) as string[];
  const loraWeights = (params.loraweights || []) as string[];

  return (
    <div className={className}>
      {/* Actions */}
      {showActions && (
        <div className="flex gap-2 p-4 border-b shrink-0">
          {onDownload && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
          {onCopyPrompt && prompt && (
            <Button variant="outline" size="sm" onClick={onCopyPrompt}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Prompt
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Paintbrush className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Prompt */}
        {prompt && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Prompt</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => navigator.clipboard.writeText(prompt)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-sm bg-muted p-2 rounded break-words max-h-32 overflow-y-auto">
              {prompt}
            </p>
          </div>
        )}

        {/* Negative Prompt */}
        {negativePrompt && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Negative Prompt</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => navigator.clipboard.writeText(negativePrompt)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <p className="text-sm bg-muted p-2 rounded break-words max-h-24 overflow-y-auto">
              {negativePrompt}
            </p>
          </div>
        )}

        {/* Key parameters grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {model && (
            <div className="col-span-2 space-y-0.5">
              <span className="text-xs text-muted-foreground">Model</span>
              <p className="font-medium truncate" title={model}>{model}</p>
            </div>
          )}
          {loras.length > 0 && (
            <div className="col-span-2 space-y-0.5">
              <span className="text-xs text-muted-foreground">LoRAs</span>
              <div className="space-y-1">
                {loras.map((lora, i) => (
                  <div key={lora} className="flex items-center justify-between bg-muted px-2 py-1 rounded text-xs">
                    <span className="truncate" title={lora}>{lora}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {loraWeights[i] || "1"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {seed !== undefined && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Seed</span>
              <p className="font-mono">{String(seed)}</p>
            </div>
          )}
          {steps !== undefined && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Steps</span>
              <p>{String(steps)}</p>
            </div>
          )}
          {cfg !== undefined && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">CFG Scale</span>
              <p>{String(cfg)}</p>
            </div>
          )}
          {Boolean(sampler) && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Sampler</span>
              <p>{String(sampler)}</p>
            </div>
          )}
          {Boolean(scheduler) && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Scheduler</span>
              <p>{String(scheduler)}</p>
            </div>
          )}
          {Boolean(width || height) && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Size</span>
              <p>{String(width)}×{String(height)}</p>
            </div>
          )}
          {Boolean(date) && (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Date</span>
              <p>{String(date)}</p>
            </div>
          )}
        </div>

        {/* Raw metadata (collapsible) */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-2">
            Show raw metadata
          </summary>
          <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-words text-xs mt-2">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
