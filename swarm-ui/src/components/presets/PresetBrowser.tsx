"use client";

import { useEffect, useState, useMemo } from "react";
import { useSessionStore } from "@/stores/session";
import { usePresetStore } from "@/stores/presets";
import { PresetCard } from "./PresetCard";
import { ActivePresets } from "./ActivePresets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, RefreshCw, FolderOpen } from "lucide-react";
import type { Preset } from "@/lib/api";
import { useParametersStore } from "@/stores/parameters";

interface PresetBrowserProps {
  className?: string;
}

export function PresetBrowser({ className }: PresetBrowserProps) {
  const { sessionId } = useSessionStore();
  const {
    allPresets,
    activePresets,
    isLoading,
    loadPresets,
    togglePreset,
    applyPreset,
    savePreset,
    deletePreset: deletePresetAction,
    duplicatePreset: duplicatePresetAction,
    isPresetActive,
  } = usePresetStore();
  const { values, paramTypes } = useParametersStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolder, setCurrentFolder] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorDescription, setEditorDescription] = useState("");
  const [editorParams, setEditorParams] = useState<Record<string, boolean>>({});
  const [editorError, setEditorError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load presets on mount
  useEffect(() => {
    if (sessionId) {
      loadPresets(sessionId);
    }
  }, [sessionId, loadPresets]);

  // Get folders and files in current folder
  const { folders, presets } = useMemo(() => {
    const prefix = currentFolder ? `${currentFolder}/` : "";
    const folderSet = new Set<string>();
    const fileList: Preset[] = [];

    for (const preset of allPresets) {
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = preset.title.toLowerCase().includes(query);
        const matchesDesc = preset.description?.toLowerCase().includes(query);
        const matchesParams = Object.entries(preset.param_map).some(
          ([k, v]) => k.toLowerCase().includes(query) || v.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesDesc && !matchesParams) continue;
      }

      if (!preset.title.startsWith(prefix)) continue;

      const subPart = preset.title.substring(prefix.length);
      const slashIndex = subPart.indexOf("/");

      if (slashIndex !== -1) {
        // It's in a subfolder
        const folder = subPart.substring(0, slashIndex);
        folderSet.add(folder);
      } else {
        // It's a file in this folder
        fileList.push(preset);
      }
    }

    return {
      folders: Array.from(folderSet).sort(),
      presets: fileList,
    };
  }, [allPresets, currentFolder, searchQuery]);

  const handleOpenEditor = (preset?: Preset) => {
    setEditingPreset(preset || null);
    setEditorTitle(preset?.title || currentFolder);
    setEditorDescription(preset?.description || "");
    setEditorError("");

    // Initialize param toggles
    const toggles: Record<string, boolean> = {};
    for (const param of paramTypes) {
      toggles[param.id] = preset ? param.id in preset.param_map : false;
    }
    setEditorParams(toggles);

    setEditorOpen(true);
  };

  const handleSavePreset = async () => {
    if (!sessionId) return;

    const title = editorTitle.trim();
    if (!title || title.endsWith("/")) {
      setEditorError("Please enter a valid preset name");
      return;
    }

    // Build param map from enabled params
    const paramMap: Record<string, string> = {};
    for (const [id, enabled] of Object.entries(editorParams)) {
      if (enabled) {
        const value = values[id];
        if (value !== undefined && value !== null && value !== "") {
          paramMap[id] = String(value);
        }
      }
    }

    if (Object.keys(paramMap).length === 0) {
      setEditorError("Please enable at least one parameter");
      return;
    }

    setIsSaving(true);
    const result = await savePreset(
      sessionId,
      title,
      editorDescription,
      paramMap,
      undefined,
      !!editingPreset,
      editingPreset?.title
    );
    setIsSaving(false);

    if (result.success) {
      setEditorOpen(false);
    } else {
      setEditorError(result.error || "Failed to save preset");
    }
  };

  const handleDelete = async (preset: Preset) => {
    if (!sessionId) return;
    await deletePresetAction(sessionId, preset.title);
  };

  const handleDuplicate = async (preset: Preset) => {
    if (!sessionId) return;
    await duplicatePresetAction(sessionId, preset.title);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Active presets bar */}
      <ActivePresets className="px-3 py-2 border-b" />

      {/* Search and actions */}
      <div className="flex items-center gap-2 p-3 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => sessionId && loadPresets(sessionId)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-9"
          onClick={() => handleOpenEditor()}
        >
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Breadcrumb */}
      {currentFolder && (
        <div className="flex items-center gap-1 px-3 py-2 text-sm border-b">
          <button
            className="text-primary hover:underline"
            onClick={() => setCurrentFolder("")}
          >
            Presets
          </button>
          {currentFolder.split("/").map((part, i, arr) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <button
                className="text-primary hover:underline"
                onClick={() => setCurrentFolder(arr.slice(0, i + 1).join("/"))}
              >
                {part}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Folders */}
          {folders.map((folder) => (
            <Button
              key={folder}
              variant="ghost"
              className="w-full justify-start h-auto py-2"
              onClick={() =>
                setCurrentFolder(currentFolder ? `${currentFolder}/${folder}` : folder)
              }
            >
              <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
              {folder}
            </Button>
          ))}

          {/* Presets */}
          {presets.map((preset) => (
            <PresetCard
              key={preset.title}
              preset={preset}
              isActive={isPresetActive(preset.title)}
              onToggle={() => togglePreset(preset)}
              onApply={() => applyPreset(preset)}
              onEdit={() => handleOpenEditor(preset)}
              onDuplicate={() => handleDuplicate(preset)}
              onDelete={() => handleDelete(preset)}
            />
          ))}

          {/* Empty state */}
          {folders.length === 0 && presets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No presets match your search" : "No presets in this folder"}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Preset Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingPreset ? "Edit Preset" : "Create New Preset"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-title">Name</Label>
              <Input
                id="preset-title"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="my-preset or folder/my-preset"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset-desc">Description</Label>
              <Textarea
                id="preset-desc"
                value={editorDescription}
                onChange={(e) => setEditorDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Parameters to include</Label>
              <p className="text-xs text-muted-foreground">
                Check the parameters you want to save in this preset (uses current values)
              </p>
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-2">
                  {paramTypes
                    .filter((p) => p.visible !== false)
                    .map((param) => (
                      <div key={param.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`preset-param-${param.id}`}
                          checked={editorParams[param.id] || false}
                          onCheckedChange={(checked) =>
                            setEditorParams((prev) => ({
                              ...prev,
                              [param.id]: !!checked,
                            }))
                          }
                        />
                        <Label
                          htmlFor={`preset-param-${param.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <span className="font-medium">{param.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            = {String(values[param.id] ?? param.default ?? "")}
                          </span>
                        </Label>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {editorError && (
              <p className="text-sm text-destructive">{editorError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
