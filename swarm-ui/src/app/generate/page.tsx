"use client";

import { useState } from "react";
import { useSessionStore } from "@/stores/session";
import { useStatusStore } from "@/stores/status";
import { useParametersStore } from "@/stores/parameters";
import { ParameterPanel, TextInput, ResolutionSelector, SliderInput, NumberInput, DropdownInput } from "@/components/parameters";
import { ModelSelector } from "@/components/models/ModelSelector";
import { GenerateButton, ImageResult, BatchHistory } from "@/components/generation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { GeneratedImage } from "@/types/api";

export default function GeneratePage() {
  const { isLoading, isInitialized } = useSessionStore();
  const { waitingGens, liveGens, loadingModels } = useStatusStore();
  const { values, setValue, paramTypes } = useParametersStore();

  // Get dropdown options from param types
  const samplerOptions = paramTypes.find(p => p.id === "sampler")?.values || [];
  const schedulerOptions = paramTypes.find(p => p.id === "scheduler")?.values || [];
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
        <div className="flex items-center justify-between h-12 px-4">
          <h1 className="text-lg font-bold">SwarmUI</h1>
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

      {/* Main Content - 3 column layout */}
      <div className="px-3 py-3 h-[calc(100vh-3rem)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full">
          {/* Left Panel - Parameters */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            <Card className="h-full flex flex-col">
              <Tabs defaultValue="main" className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
                  <TabsList className="h-8">
                    <TabsTrigger value="main" className="text-xs px-3 h-7">Main</TabsTrigger>
                    <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="main" className="flex-1 overflow-auto m-0">
                  <div className="flex flex-col p-3 space-y-3">
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

                      {/* Steps */}
                      <SliderInput
                        id="steps"
                        label="Steps"
                        description="Number of denoising steps"
                        value={Number(values.steps) || 20}
                        onChange={(v) => setValue("steps", v)}
                        min={1}
                        max={150}
                        step={1}
                      />

                      {/* CFG Scale */}
                      <SliderInput
                        id="cfgscale"
                        label="CFG Scale"
                        description="How closely to follow the prompt"
                        value={Number(values.cfgscale) || 7}
                        onChange={(v) => setValue("cfgscale", v)}
                        min={1}
                        max={30}
                        step={0.5}
                      />

                      {/* Sampler & Scheduler - 2 column */}
                      <div className="grid grid-cols-2 gap-2">
                        {samplerOptions.length > 0 && (
                          <DropdownInput
                            id="sampler"
                            label="Sampler"
                            value={String(values.sampler || samplerOptions[0])}
                            onChange={(v) => setValue("sampler", v)}
                            options={samplerOptions}
                          />
                        )}
                        {schedulerOptions.length > 0 && (
                          <DropdownInput
                            id="scheduler"
                            label="Scheduler"
                            value={String(values.scheduler || schedulerOptions[0])}
                            onChange={(v) => setValue("scheduler", v)}
                            options={schedulerOptions}
                          />
                        )}
                      </div>

                      {/* Seed & Images - 2 column */}
                      <div className="grid grid-cols-2 gap-2">
                        <NumberInput
                          id="seed"
                          label="Seed"
                          value={Number(values.seed) ?? -1}
                          onChange={(v) => setValue("seed", v)}
                          min={-1}
                          max={2147483647}
                          showRandomize
                          showReset
                          defaultValue={-1}
                        />
                        <NumberInput
                          id="images"
                          label="Images"
                          value={Number(values.images) || 1}
                          onChange={(v) => setValue("images", v)}
                          min={1}
                          max={100}
                          showReset
                          defaultValue={1}
                        />
                      </div>

                      {/* Generate Button */}
                      <div className="pt-1">
                        <GenerateButton onImageGenerated={handleImageGenerated} />
                      </div>
                  </div>
                </TabsContent>
                <TabsContent value="all" className="flex-1 overflow-hidden m-0">
                  <ParameterPanel />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Center Panel - Image Result */}
          <div className="lg:col-span-6 h-full overflow-hidden">
            <Card className="h-full flex flex-col">
              <div className="px-3 py-2 border-b shrink-0">
                <span className="text-sm font-medium">Result</span>
              </div>
              <CardContent className="flex-1 p-3 overflow-hidden">
                <ImageResult className="h-full" />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - History */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            <Card className="h-full flex flex-col">
              <div className="px-3 py-2 border-b shrink-0">
                <span className="text-sm font-medium">History</span>
              </div>
              <CardContent className="flex-1 p-3 overflow-auto">
                <BatchHistory
                  onImageSelect={handleBatchImageSelect}
                  selectedIndex={selectedBatchIndex}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
