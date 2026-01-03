"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/stores/session";
import { useLoraStore } from "@/stores/loras";
import { SelectedLoraItem } from "./SelectedLoraItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, RefreshCw, Trash2, Check } from "lucide-react";

interface LoraManagerProps {
  className?: string;
}

export function LoraManager({ className }: LoraManagerProps) {
  const { sessionId } = useSessionStore();
  const {
    availableLoras,
    selectedLoras,
    isLoading,
    isLoaded,
    loadLoras,
    searchQuery,
    setSearchQuery,
    getFilteredLoras,
    toggleLora,
    isSelected,
    clearAll,
  } = useLoraStore();

  // Load LoRAs on mount
  useEffect(() => {
    if (sessionId && !isLoaded && !isLoading) {
      loadLoras(sessionId);
    }
  }, [sessionId, isLoaded, isLoading, loadLoras]);

  const filteredLoras = getFilteredLoras();

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Selected LoRAs header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">LoRAs</span>
          {selectedLoras.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedLoras.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedLoras.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearAll}
              title="Clear all"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Select LoRAs</DialogTitle>
              </DialogHeader>

              {/* Search and refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search LoRAs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => sessionId && loadLoras(sessionId)}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {/* LoRA list */}
              <div className="flex-1 min-h-0 overflow-y-auto border rounded-md">
                <div className="divide-y">
                  {filteredLoras.map((lora) => {
                    const selected = isSelected(lora.name);
                    const displayName = lora.name.includes("/")
                      ? lora.name.substring(lora.name.lastIndexOf("/") + 1)
                      : lora.name;

                    return (
                      <div
                        key={lora.name}
                        className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selected ? "bg-primary/10" : ""
                        }`}
                        onClick={() => toggleLora(lora)}
                      >
                        {/* Checkbox indicator */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}>
                          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>

                        {/* Preview image */}
                        <div className="w-10 h-10 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                          {lora.preview_image ? (
                            <img
                              src={lora.preview_image}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">LoRA</span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" title={lora.name}>
                            {displayName.replace(/\.safetensors$/i, "")}
                          </p>
                          {lora.trigger_phrase && (
                            <p className="text-xs text-muted-foreground truncate" title={lora.trigger_phrase}>
                              <span className="font-medium">Trigger:</span>{" "}
                              <code className="bg-muted px-1 rounded">{lora.trigger_phrase}</code>
                            </p>
                          )}
                        </div>

                        {/* Default weight hint */}
                        {lora.lora_default_weight && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            w:{lora.lora_default_weight}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty state */}
                  {filteredLoras.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No LoRAs match your search" : "No LoRAs available"}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected count */}
              {selectedLoras.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedLoras.length} LoRA(s) selected
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Selected LoRAs list */}
      {selectedLoras.length > 0 ? (
        <div className="space-y-1">
          {selectedLoras.map((lora) => (
            <SelectedLoraItem key={lora.name} lora={lora} />
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground py-2">
          No LoRAs selected. Click "Add" to browse available LoRAs.
        </div>
      )}
    </div>
  );
}
