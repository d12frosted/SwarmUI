"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface TextInputProps {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  showTokenCount?: boolean;
  tokenCount?: number;
  maxTokens?: number;
}

export function TextInput({
  id,
  label,
  description,
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 3,
  showTokenCount = false,
  tokenCount,
  maxTokens = 77,
}: TextInputProps) {
  const isOverLimit = tokenCount !== undefined && tokenCount > maxTokens;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {showTokenCount && tokenCount !== undefined && (
          <Badge variant={isOverLimit ? "destructive" : "secondary"} className="text-xs">
            {tokenCount}/{maxTokens} tokens
          </Badge>
        )}
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="resize-none"
      />
    </div>
  );
}
