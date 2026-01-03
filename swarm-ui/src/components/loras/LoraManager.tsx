"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/stores/session";
import { useLoraStore } from "@/stores/loras";
import { SelectedLoraItem } from "./SelectedLoraItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
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

              {/* LoRA grid */}
              <ScrollArea className="flex-1 max-h-[400px]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">
                  {filteredLoras.map((lora) => {
                    const selected = isSelected(lora.name);
                    const displayName = lora.name.includes("/")
                      ? lora.name.substring(lora.name.lastIndexOf("/") + 1)
                      : lora.name;

                    return (
                      <Card
                        key={lora.name}
                        className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                          selected ? "ring-2 ring-primary bg-primary/5" : ""
                        }`}
                        onClick={() => toggleLora(lora)}
                      >
                        <CardContent className="p-2">
                          <div className="flex items-start gap-2">
                            {/* Preview image */}
                            {lora.preview_image ? (
                              <img
                                src={lora.preview_image}
                                alt={displayName}
                                className="w-12 h-12 rounded object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                                <span className="text-xs text-muted-foreground">No img</span>
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-sm font-medium truncate">
                                  {displayName.replace(/\.safetensors$/i, "")}
                                </span>
                                {selected && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </div>
                              {lora.trigger_phrase && (
                                <p className="text-xs text-muted-foreground truncate">
                                  Trigger: {lora.trigger_phrase}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Empty state */}
                  {filteredLoras.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      {searchQuery ? "No LoRAs match your search" : "No LoRAs available"}
                    </div>
                  )}
                </div>
              </ScrollArea>

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
