"use client";

import { useState } from "react";
import { useParametersStore } from "@/stores/parameters";
import { MainLayout } from "@/components/layout";
import { ParameterPanel, TextInput, ResolutionSelector, SliderInput, NumberInput, DropdownInput } from "@/components/parameters";
import { ModelSelector } from "@/components/models/ModelSelector";
import { LoraManager } from "@/components/loras";
import { QuickPresetSelector } from "@/components/presets";
import { GenerateButton, ImageResult, BatchHistory } from "@/components/generation";
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

  const handleImageGenerated = (image: GeneratedImage) => {
    // Auto-select the latest image
    setSelectedBatchIndex(undefined);
  };

  const handleBatchImageSelect = (image: GeneratedImage, index: number) => {
    setSelectedBatchIndex(index);
  };

  return (
    <MainLayout>
      {/* Main Content - 3 column layout */}
      <div className="px-3 py-3 h-full overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full">
          {/* Left Panel - Parameters */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            <Card className="h-full flex flex-col">
              <Tabs defaultValue="main" className="h-full flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
                  <TabsList className="h-8">
                    <TabsTrigger value="main" className="text-xs px-3 h-7">Core</TabsTrigger>
                    <TabsTrigger value="all" className="text-xs px-3 h-7">Advanced</TabsTrigger>
                  </TabsList>
                  <QuickPresetSelector />
                </div>
                <TabsContent value="main" className="flex-1 overflow-auto m-0">
                  <div className="flex flex-col p-3 space-y-4">
                      {/* Prompt */}
                      <TextInput
                        id="prompt"
                        label="Prompt"
                        description="Describe what you want to generate"
                        value={String(values.prompt || "")}
                        onChange={(v) => setValue("prompt", v)}
                        placeholder="A beautiful sunset over mountains..."
                        rows={6}
                        showTokenCount
                        tokenCount={promptTokens}
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
                        showTokenCount
                        tokenCount={negativePromptTokens}
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
                          hideSpinButtons
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
                <TabsContent value="all" className="flex-1 m-0 overflow-auto">
                  <ParameterPanel showAdvanced />
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
    </MainLayout>
  );
}
