"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "@/stores/session";
import { useParametersStore } from "@/stores/parameters";
import { SliderInput } from "./SliderInput";
import { NumberInput } from "./NumberInput";
import { TextInput } from "./TextInput";
import { DropdownInput } from "./DropdownInput";
import { CheckboxInput } from "./CheckboxInput";
import { ImageInput } from "./ImageInput";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Search, RotateCcw } from "lucide-react";
import type { T2IParamType } from "@/types/api";

interface ParameterPanelProps {
  showAdvanced?: boolean;
  filterGroup?: string;
}

// Core parameters that should always be visible at the top
const CORE_PARAMS = ["prompt", "negativeprompt", "model", "images", "steps", "cfgscale", "seed", "width", "height", "aspectratio", "sampler", "scheduler"];

// Parameters handled by dedicated components in Main tab (always skip these in ParameterPanel)
const MAIN_TAB_PARAMS = ["prompt", "negativeprompt", "model", "width", "height", "aspectratio", "images", "steps", "cfgscale", "seed", "sampler", "scheduler"];

export function ParameterPanel({ showAdvanced = false, filterGroup }: ParameterPanelProps) {
  const { sessionId, isInitialized } = useSessionStore();
  const { paramTypes, values, isLoading, isLoaded, loadParams, setValue, resetToDefaults } = useParametersStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Load parameters on mount
  useEffect(() => {
    if (isInitialized && sessionId && !isLoaded && !isLoading) {
      loadParams(sessionId);
    }
  }, [isInitialized, sessionId, isLoaded, isLoading, loadParams]);

  // Group parameters
  const { coreParams, advancedParams, groupedParams } = useMemo(() => {
    const core: T2IParamType[] = [];
    const advanced: T2IParamType[] = [];
    const grouped: Record<string, T2IParamType[]> = {};

    for (const param of paramTypes) {
      // Skip invisible params
      if (param.visible === false) continue;

      // Skip params handled by Main tab when showing Advanced panel
      if (showAdvanced && MAIN_TAB_PARAMS.includes(param.id)) continue;

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!param.name.toLowerCase().includes(query) && !param.id.toLowerCase().includes(query)) {
          continue;
        }
      }

      // Filter by group
      if (filterGroup && param.group !== filterGroup) continue;

      // Categorize
      if (CORE_PARAMS.includes(param.id)) {
        core.push(param);
      } else if (param.advanced) {
        advanced.push(param);
      } else if (param.group) {
        if (!grouped[param.group]) grouped[param.group] = [];
        grouped[param.group].push(param);
      } else {
        advanced.push(param);
      }
    }

    // Sort core params by their position in CORE_PARAMS
    core.sort((a, b) => CORE_PARAMS.indexOf(a.id) - CORE_PARAMS.indexOf(b.id));

    return { coreParams: core, advancedParams: advanced, groupedParams: grouped };
  }, [paramTypes, searchQuery, filterGroup, showAdvanced]);

  const renderParameter = (param: T2IParamType) => {
    const value = values[param.id] ?? param.default;

    switch (param.type) {
      case "text":
        return (
          <TextInput
            key={param.id}
            id={param.id}
            label={param.name}
            description={param.description}
            value={String(value || "")}
            onChange={(v) => setValue(param.id, v)}
            rows={param.id.includes("prompt") ? 4 : 2}
            showTokenCount={param.id === "prompt"}
          />
        );

      case "integer":
      case "decimal":
        // Use slider if we have a reasonable range
        const hasRange = param.min !== undefined && param.max !== undefined;
        const rangeSize = hasRange ? (param.max! - param.min!) : Infinity;

        if (hasRange && rangeSize <= 1000 && param.id !== "seed") {
          return (
            <SliderInput
              key={param.id}
              id={param.id}
              label={param.name}
              description={param.description}
              value={Number(value) || param.min || 0}
              onChange={(v) => setValue(param.id, v)}
              min={param.min!}
              max={param.max!}
              step={param.step || (param.type === "decimal" ? 0.1 : 1)}
            />
          );
        }

        return (
          <NumberInput
            key={param.id}
            id={param.id}
            label={param.name}
            description={param.description}
            value={Number(value) || 0}
            onChange={(v) => setValue(param.id, v)}
            min={param.min}
            max={param.max}
            step={param.step || (param.type === "decimal" ? 0.1 : 1)}
            showRandomize={param.id === "seed"}
            showReset={true}
            defaultValue={param.default as number}
          />
        );

      case "boolean":
        return (
          <CheckboxInput
            key={param.id}
            id={param.id}
            label={param.name}
            description={param.description}
            checked={Boolean(value)}
            onChange={(v) => setValue(param.id, v)}
          />
        );

      case "dropdown":
        if (!param.values || param.values.length === 0) return null;
        return (
          <DropdownInput
            key={param.id}
            id={param.id}
            label={param.name}
            description={param.description}
            value={String(value || param.values[0])}
            onChange={(v) => setValue(param.id, v)}
            options={param.values}
          />
        );

      case "image":
        return (
          <ImageInput
            key={param.id}
            id={param.id}
            label={param.name}
            description={param.description}
            value={String(value || "")}
            onChange={(v) => setValue(param.id, v)}
          />
        );

      case "model":
        // Model selector is handled separately
        return null;

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Search and Reset */}
      <div className="flex items-center gap-2 p-3 border-b sticky top-0 bg-background z-10">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parameters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={resetToDefaults}
          title="Reset all to defaults"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Parameters */}
      <div className="p-3 space-y-4">
          {/* Core Parameters */}
          {coreParams.map(renderParameter)}

          {/* Grouped Parameters */}
          {Object.entries(groupedParams).map(([group, params]) => (
            <Collapsible key={group} defaultOpen={false}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors">
                {group}
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {params.map(renderParameter)}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* Advanced Parameters */}
          {advancedParams.length > 0 && (
            <>
              <Separator />
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors">
                  Advanced ({advancedParams.length})
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {advancedParams.map(renderParameter)}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
      </div>
    </div>
  );
}
