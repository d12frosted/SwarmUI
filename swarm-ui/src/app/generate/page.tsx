"use client";

import { useState } from "react";
import { useParametersStore } from "@/stores/parameters";
import { MainLayout } from "@/components/layout";
import { ParameterPanel, PromptInput, ResolutionSelector, SliderInput, NumberInput, DropdownInput } from "@/components/parameters";
import { ModelSelector } from "@/components/models/ModelSelector";
import { LoraManager } from "@/components/loras";
import { QuickPresetSelector } from "@/components/presets";
import { GenerateButton, ImageResult, BatchHistory, BatchSizeSelector } from "@/components/generation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTokenCount } from "@/hooks";
import type { GeneratedImage } from "@/types/api";

export default function GeneratePage() {
  const { values, setValue, paramTypes } = useParametersStore();

  // Get dropdown options from param types
  const samplerOptions = paramTypes.find(p => p.id === "sampler")?.values || [];
  const schedulerOptions = paramTypes.find(p => p.id === "scheduler")?.values || [];
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number | undefined>();

  // Token counting for prompts
  const promptTokens = useTokenCount(String(values.prompt || ""));
  const negativePromptTokens = useTokenCount(String(values.negativeprompt || ""));

  const handleImageGenerated = () => {
    // Auto-select the latest image (undefined = latest)
    setSelectedBatchIndex(undefined);
  };

  const handleBatchImageSelect = (_image: GeneratedImage, index: number) => {
    setSelectedBatchIndex(index);
  };

  const handleIndexChange = (index: number) => {
    setSelectedBatchIndex(index);
  };

  return (
    <MainLayout>
      {/* Main Content - 3 column layout */}
      <div className="px-3 py-3 h-full overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[1fr] gap-3 h-full">
          {/* Left Panel - Parameters */}
          <div className="lg:col-span-3 h-full overflow-hidden isolate">
            <Card className="h-full flex flex-col py-0">
              <Tabs defaultValue="main" className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 min-h-[48px]">
                  <TabsList className="h-8">
                    <TabsTrigger value="main" className="text-xs px-3 h-7">Core</TabsTrigger>
                    <TabsTrigger value="all" className="text-xs px-3 h-7">Advanced</TabsTrigger>
                  </TabsList>
                  <QuickPresetSelector />
                </div>
                <TabsContent value="main" className="flex-1 overflow-auto m-0">
                  <div className="flex flex-col p-3 space-y-4">
                      {/* Prompt */}
                      <PromptInput
                        id="prompt"
                        label="Prompt"
                        description="Describe what you want to generate. Type < for syntax helpers."
                        value={String(values.prompt || "")}
                        onChange={(v) => setValue("prompt", v)}
                        placeholder="A beautiful sunset over mountains..."
                        rows={6}
                        showTokenCount
                        tokenCount={promptTokens}
                        enableAutocomplete
                      />

                      {/* Negative Prompt */}
                      <PromptInput
                        id="negativeprompt"
                        label="Negative Prompt"
                        description="Describe what you want to avoid"
                        value={String(values.negativeprompt || "")}
                        onChange={(v) => setValue("negativeprompt", v)}
                        placeholder="blurry, low quality..."
                        rows={3}
                        showTokenCount
                        tokenCount={negativePromptTokens}
                        enableAutocomplete
                      />

                      {/* Model Selector */}
                      <ModelSelector />

                      {/* LoRA Manager */}
                      <LoraManager />

                      {/* Resolution Selector */}
                      <ResolutionSelector
                        width={Number(values.width) || 512}
                        height={Number(values.height) || 512}
                        onWidthChange={(w) => setValue("width", w)}
                        onHeightChange={(h) => setValue("height", h)}
                      />

                      {/* Steps & CFG Scale - 2 column */}
                      <div className="grid grid-cols-2 gap-2">
                        <SliderInput
                          id="steps"
                          label="Steps"
                          value={Number(values.steps) || 20}
                          onChange={(v) => setValue("steps", v)}
                          min={1}
                          max={150}
                          step={1}
                        />
                        <SliderInput
                          id="cfgscale"
                          label="CFG"
                          value={Number(values.cfgscale) || 7}
                          onChange={(v) => setValue("cfgscale", v)}
                          min={1}
                          max={30}
                          step={0.5}
                        />
                      </div>

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

                      {/* Seed */}
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
                        hideSpinButtons
                      />

                      {/* Batch Size */}
                      <BatchSizeSelector
                        value={Number(values.images) || 1}
                        onChange={(v) => setValue("images", v)}
                      />

                      {/* Generate Button */}
                      <div className="pt-1">
                        <GenerateButton onImageGenerated={handleImageGenerated} />
                      </div>
                  </div>
                </TabsContent>
                <TabsContent value="all" className="flex-1 m-0 overflow-auto">
                  <ParameterPanel showAdvanced />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Center Panel - Image Result */}
          <div className="lg:col-span-6 h-full overflow-hidden isolate">
            <Card className="h-full flex flex-col py-0">
              <div className="flex items-center px-3 py-2 border-b shrink-0 min-h-[48px]">
                <span className="text-sm font-medium">Preview</span>
              </div>
              <CardContent className="flex-1 p-3 min-h-0 overflow-hidden">
                <ImageResult
                  className="h-full"
                  selectedIndex={selectedBatchIndex}
                  onIndexChange={handleIndexChange}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - History */}
          <div className="lg:col-span-3 h-full overflow-hidden isolate">
            <Card className="h-full flex flex-col overflow-hidden py-0">
              <div className="flex items-center px-3 py-2 border-b shrink-0 min-h-[48px]">
                <span className="text-sm font-medium">History</span>
              </div>
              <CardContent className="flex-1 p-3 min-h-0 overflow-hidden">
                <BatchHistory
                  onImageSelect={handleBatchImageSelect}
                  selectedIndex={selectedBatchIndex}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
