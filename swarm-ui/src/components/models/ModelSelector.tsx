"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/session";
import { useModelsStore } from "@/stores/models";
import { useParametersStore } from "@/stores/parameters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Search, Check, Loader2, ChevronDown } from "lucide-react";
import type { ModelData } from "@/types/api";

interface ModelSelectorProps {
  onModelSelect?: (modelName: string) => void;
}

export function ModelSelector({ onModelSelect }: ModelSelectorProps) {
  const { sessionId, isInitialized } = useSessionStore();
  const { loadedModels, isLoading, isLoaded, loadModels, searchQuery, setSearchQuery, getFilteredModels, getModelByName } = useModelsStore();
  const { values, setValue } = useParametersStore();
  const [open, setOpen] = useState(false);

  const currentModel = values.model as string | undefined;

  // Load models on mount
  useEffect(() => {
    if (isInitialized && sessionId && !isLoaded && !isLoading) {
      loadModels(sessionId);
    }
  }, [isInitialized, sessionId, isLoaded, isLoading, loadModels]);

  const handleSelectModel = (modelName: string) => {
    setValue("model", modelName);
    onModelSelect?.(modelName);
    setOpen(false);
  };

  const filteredModels = getFilteredModels();
  const selectedModelData = currentModel ? getModelByName(currentModel) : null;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Model</Label>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-2 px-3"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2 text-left truncate">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : selectedModelData ? (
                <>
                  <span className="truncate">{selectedModelData.title || selectedModelData.name}</span>
                  {loadedModels.includes(currentModel!) && (
                    <Badge variant="secondary" className="text-xs">Loaded</Badge>
                  )}
                </>
              ) : currentModel ? (
                <span className="truncate">{currentModel}</span>
              ) : (
                <span className="text-muted-foreground">Select a model...</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Model</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Model List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid gap-2 py-2">
              {filteredModels.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {isLoading ? "Loading models..." : "No models found"}
                </p>
              ) : (
                filteredModels.map((model) => (
                  <ModelCard
                    key={model.name}
                    model={model}
                    isSelected={currentModel === model.name}
                    isLoaded={loadedModels.includes(model.name)}
                    onSelect={() => handleSelectModel(model.name)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ModelCardProps {
  model: ModelData;
  isSelected: boolean;
  isLoaded: boolean;
  onSelect: () => void;
}

function ModelCard({ model, isSelected, isLoaded, onSelect }: ModelCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-accent ${
        isSelected ? "border-primary bg-accent" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Preview Image */}
          {model.preview_image && (
            <div className="w-16 h-16 rounded overflow-hidden bg-muted shrink-0">
              <img
                src={model.preview_image}
                alt={model.title || model.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">
                {model.title || model.name}
              </h4>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
            </div>

            {model.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {model.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1.5">
              {isLoaded && (
                <Badge variant="default" className="text-xs">
                  Loaded
                </Badge>
              )}
              {model.class && (
                <Badge variant="outline" className="text-xs">
                  {model.class}
                </Badge>
              )}
              {model.resolution && (
                <Badge variant="secondary" className="text-xs">
                  {model.resolution}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
