"use client";

import { useState, useRef } from "react";
import { useSettingsStore } from "@/stores/settings";
import { useSessionStore } from "@/stores/session";
import { ThemeSelector } from "./ThemeSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Download,
  Upload,
  RotateCcw,
  User,
  Shield,
  Eye,
  Layers,
  Gauge,
} from "lucide-react";

export function SettingsPanel() {
  const {
    showAdvancedParams,
    compactMode,
    autoPreview,
    previewSteps,
    defaultBatchSize,
    historyPageSize,
    showHistoryMetadata,
    setShowAdvancedParams,
    setCompactMode,
    setAutoPreview,
    setPreviewSteps,
    setDefaultBatchSize,
    setHistoryPageSize,
    setShowHistoryMetadata,
    resetToDefaults,
    exportSettings,
    importSettings,
  } = useSettingsStore();

  const { userId, permissions, version } = useSessionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const handleExport = () => {
    const data = exportSettings();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "swarm-ui-settings.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Settings exported successfully");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importSettings(content)) {
        toast.success("Settings imported successfully");
      } else {
        toast.error("Failed to import settings: Invalid format");
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setIsResetDialogOpen(false);
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>User</Label>
            <span className="text-sm font-medium">{userId || "Anonymous"}</span>
          </div>
          <div className="flex items-center justify-between">
            <Label>Server Version</Label>
            <span className="text-sm text-muted-foreground">{version || "Unknown"}</span>
          </div>
          {permissions.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </Label>
              <div className="flex flex-wrap gap-1">
                {permissions.map((perm) => (
                  <Badge key={perm} variant="secondary" className="text-xs">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ThemeSelector />

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Advanced Parameters</Label>
              <p className="text-xs text-muted-foreground">
                Display advanced generation parameters
              </p>
            </div>
            <Switch
              checked={showAdvancedParams}
              onCheckedChange={setShowAdvancedParams}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compact Mode</Label>
              <p className="text-xs text-muted-foreground">
                Use smaller spacing for dense UI
              </p>
            </div>
            <Switch checked={compactMode} onCheckedChange={setCompactMode} />
          </div>
        </CardContent>
      </Card>

      {/* Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Generation
          </CardTitle>
          <CardDescription>Default generation settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Preview</Label>
              <p className="text-xs text-muted-foreground">
                Show preview during generation
              </p>
            </div>
            <Switch checked={autoPreview} onCheckedChange={setAutoPreview} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview Update Interval</Label>
              <span className="text-sm text-muted-foreground">
                Every {previewSteps} steps
              </span>
            </div>
            <Slider
              value={[previewSteps]}
              onValueChange={([v]) => setPreviewSteps(v)}
              min={1}
              max={20}
              step={1}
              disabled={!autoPreview}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Default Batch Size</Label>
              <span className="text-sm text-muted-foreground">
                {defaultBatchSize} images
              </span>
            </div>
            <Slider
              value={[defaultBatchSize]}
              onValueChange={([v]) => setDefaultBatchSize(v)}
              min={1}
              max={16}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            History
          </CardTitle>
          <CardDescription>History browser settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Images per Page</Label>
              <span className="text-sm text-muted-foreground">
                {historyPageSize}
              </span>
            </div>
            <Slider
              value={[historyPageSize]}
              onValueChange={([v]) => setHistoryPageSize(v)}
              min={10}
              max={200}
              step={10}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Metadata</Label>
              <p className="text-xs text-muted-foreground">
                Display generation metadata in history
              </p>
            </div>
            <Switch
              checked={showHistoryMetadata}
              onCheckedChange={setShowHistoryMetadata}
            />
          </div>
        </CardContent>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Import, export, or reset your settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Settings
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          <Separator />

          <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all settings to their default values. This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
