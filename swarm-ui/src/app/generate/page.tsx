"use client";

import { useState } from "react";
import { useSessionStore } from "@/stores/session";
import { useStatusStore } from "@/stores/status";
import { useParametersStore } from "@/stores/parameters";
import { ParameterPanel, TextInput, ResolutionSelector } from "@/components/parameters";
import { ModelSelector } from "@/components/models/ModelSelector";
import { GenerateButton, ImageResult, BatchHistory } from "@/components/generation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { GeneratedImage } from "@/types/api";

export default function GeneratePage() {
  const { isLoading, isInitialized } = useSessionStore();
  const { waitingGens, liveGens, loadingModels } = useStatusStore();
  const { values, setValue } = useParametersStore();
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number | undefined>();

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

  const handleImageGenerated = (image: GeneratedImage) => {
    // Auto-select the latest image
    setSelectedBatchIndex(undefined);
  };

  const handleBatchImageSelect = (image: GeneratedImage, index: number) => {
    setSelectedBatchIndex(index);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="text-xl font-bold">SwarmUI</h1>
          <div className="flex items-center gap-2">
            {loadingModels > 0 && (
              <Badge variant="secondary">Loading model...</Badge>
            )}
            {liveGens > 0 && (
              <Badge variant="default">{liveGens} generating</Badge>
            )}
            {waitingGens > 0 && (
              <Badge variant="outline">{waitingGens} queued</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Fixed viewport height with independent scrolling columns */}
      <div className="px-4 py-4 h-[calc(100vh-3.5rem)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full items-start">
          {/* Left Panel - Parameters (fixed height, internal scroll) */}
          <div className="lg:col-span-3 h-full max-h-full overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-4 shrink-0">
                <CardTitle className="text-base">Parameters</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <Tabs defaultValue="main" className="h-full flex flex-col">
                  <TabsList className="mx-4 mb-2 shrink-0">
                    <TabsTrigger value="main">Main</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>
                  <TabsContent value="main" className="flex-1 overflow-auto m-0">
                    <div className="flex flex-col px-4 pb-4 space-y-4">
                      {/* Prompt */}
                      <TextInput
                        id="prompt"
                        label="Prompt"
                        description="Describe what you want to generate"
                        value={String(values.prompt || "")}
                        onChange={(v) => setValue("prompt", v)}
                        placeholder="A beautiful sunset over mountains..."
                        rows={6}
                      />

                      {/* Negative Prompt */}
                      <TextInput
                        id="negativeprompt"
                        label="Negative Prompt"
                        description="Describe what you want to avoid"
                        value={String(values.negativeprompt || "")}
                        onChange={(v) => setValue("negativeprompt", v)}
                        placeholder="blurry, low quality..."
                        rows={3}
                      />

                      {/* Model Selector */}
                      <ModelSelector />

                      {/* Resolution Selector */}
                      <ResolutionSelector
                        width={Number(values.width) || 512}
                        height={Number(values.height) || 512}
                        onWidthChange={(w) => setValue("width", w)}
                        onHeightChange={(h) => setValue("height", h)}
                      />

                      {/* Generate Button */}
                      <div className="pt-2">
                        <GenerateButton onImageGenerated={handleImageGenerated} />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="all" className="flex-1 overflow-hidden m-0">
                    <ParameterPanel />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Center Panel - Image Result (fills remaining height) */}
          <div className="lg:col-span-6 h-full max-h-full flex flex-col gap-4 overflow-hidden">
            <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
              <CardHeader className="py-3 px-4 shrink-0">
                <CardTitle className="text-base">Result</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 pt-0 overflow-hidden min-h-0">
                <ImageResult className="h-full" />
              </CardContent>
            </Card>

            {/* Batch History */}
            <Card className="shrink-0">
              <CardContent className="p-4">
                <BatchHistory
                  onImageSelect={handleBatchImageSelect}
                  selectedIndex={selectedBatchIndex}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Advanced (fixed height, internal scroll) */}
          <div className="lg:col-span-3 h-full max-h-full overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-4 shrink-0">
                <CardTitle className="text-base">Advanced</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-auto">
                <ParameterPanel showAdvanced />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
