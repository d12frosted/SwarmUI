"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutocompleteStore } from "@/stores/autocomplete";
import { useSessionStore } from "@/stores/session";

// Syntax prefixes available in SwarmUI
const SYNTAX_PREFIXES: { name: string; description: string; selfStanding?: boolean }[] = [
  { name: "random", description: "Select from random words, e.g., <random:cat,dog,bird>" },
  { name: "random[2-4]", description: "Select multiple random options" },
  { name: "alternate", description: "Alternate between words each step" },
  { name: "fromto[0.5]", description: "Change prompt at a given timestep" },
  { name: "wildcard", description: "Random line from a wildcard file" },
  { name: "repeat[3]", description: "Repeat a value several times" },
  { name: "preset", description: "Apply a preset" },
  { name: "embed", description: "Use a CLIP TI Embedding" },
  { name: "lora", description: "Apply a LoRA model" },
  { name: "region", description: "Apply prompt to a sub-region" },
  { name: "segment", description: "Auto-segment and inpaint an area" },
  { name: "break", description: "Split prompt into multiple conditionings", selfStanding: true },
  { name: "base", description: "Only use for base pass", selfStanding: true },
  { name: "refiner", description: "Only use for refiner pass", selfStanding: true },
  { name: "trigger", description: "Insert model/LoRA trigger phrases", selfStanding: true },
  { name: "comment", description: "Add a discarded comment" },
];

interface AutocompleteSuggestion {
  text: string;
  display: string;
  description?: string;
  count?: number;
  isSyntax?: boolean;
}

interface PromptInputProps {
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
  enableAutocomplete?: boolean;
}

export function PromptInput({
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
  enableAutocomplete = true,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [insertPosition, setInsertPosition] = useState<{ start: number; end: number } | null>(null);

  const { sessionId } = useSessionStore();
  const { isLoaded, loadCompletions, search } = useAutocompleteStore();

  // Load completions on mount
  useEffect(() => {
    if (sessionId && !isLoaded && enableAutocomplete) {
      loadCompletions(sessionId);
    }
  }, [sessionId, isLoaded, loadCompletions, enableAutocomplete]);

  // Find the last word before cursor for autocomplete
  const findLastWord = useCallback((text: string, cursorPos: number): { word: string; start: number } => {
    const before = text.substring(0, cursorPos);
    let start = before.length;

    // Find word boundary (space, comma, newline)
    for (let i = before.length - 1; i >= 0; i--) {
      const char = before[i];
      if (char === " " || char === "," || char === "\n" || char === "(") {
        start = i + 1;
        break;
      }
      if (i === 0) {
        start = 0;
      }
    }

    return { word: before.substring(start), start };
  }, []);

  // Check for syntax prefix mode (typing inside <>)
  const findSyntaxContext = useCallback((text: string, cursorPos: number): { prefix: string; start: number } | null => {
    const before = text.substring(0, cursorPos);
    const lastBrace = before.lastIndexOf("<");
    const lastClose = before.lastIndexOf(">");

    if (lastBrace === -1 || lastClose > lastBrace) {
      return null;
    }

    const content = before.substring(lastBrace + 1);
    return { prefix: content, start: lastBrace };
  }, []);

  // Update suggestions based on input
  const updateSuggestions = useCallback(() => {
    if (!textareaRef.current || !enableAutocomplete) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const cursorPos = textareaRef.current.selectionStart;

    // Check for syntax context first (typing <...)
    const syntaxContext = findSyntaxContext(value, cursorPos);
    if (syntaxContext) {
      const query = syntaxContext.prefix.toLowerCase();
      const colonIndex = query.indexOf(":");

      if (colonIndex === -1) {
        // Still typing prefix name
        const matches = SYNTAX_PREFIXES
          .filter(p => p.name.toLowerCase().startsWith(query))
          .map(p => ({
            text: p.selfStanding ? `<${p.name}>` : `<${p.name}:`,
            display: p.name,
            description: p.description,
            isSyntax: true,
          }));

        if (matches.length > 0) {
          setSuggestions(matches);
          setInsertPosition({ start: syntaxContext.start, end: cursorPos });
          setSelectedIndex(0);
          setIsOpen(true);
          return;
        }
      }
      // Inside a prefix (e.g., <lora:xxx) - could add specific completers here
    }

    // Regular tag autocomplete
    const { word, start } = findLastWord(value, cursorPos);

    if (word.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const results = search(word);
    if (results.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const mapped = results.map(r => ({
      text: r.name,
      display: r.name,
      count: r.count,
    }));

    setSuggestions(mapped);
    setInsertPosition({ start, end: cursorPos });
    setSelectedIndex(0);
    setIsOpen(true);
  }, [value, enableAutocomplete, findLastWord, findSyntaxContext, search]);

  // Debounced update
  useEffect(() => {
    const timer = setTimeout(updateSuggestions, 50);
    return () => clearTimeout(timer);
  }, [value, updateSuggestions]);

  // Apply selected suggestion
  const applySuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    if (!insertPosition) return;

    const before = value.substring(0, insertPosition.start);
    const after = value.substring(insertPosition.end);
    let newText = suggestion.text;

    // Add space after if not ending with special char
    if (!newText.endsWith(":") && !newText.endsWith(">") && after && !after.startsWith(" ") && !after.startsWith(",")) {
      newText += " ";
    }

    const newValue = before + newText + after;
    const newCursorPos = before.length + newText.length;

    onChange(newValue);
    setIsOpen(false);
    setSuggestions([]);

    // Restore focus and cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [insertPosition, value, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case "Tab":
      case "Enter":
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          applySuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [isOpen, suggestions, selectedIndex, applySuggestion]);

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
          <Badge variant="secondary" className="text-xs">
            {tokenCount} tokens
          </Badge>
        )}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverAnchor asChild>
          <Textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay close to allow click on suggestions
              setTimeout(() => setIsOpen(false), 150);
            }}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className="resize-none"
          />
        </PopoverAnchor>

        <PopoverContent
          className="w-80 p-0 max-h-64 overflow-auto"
          align="start"
          side="bottom"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="divide-y">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.text}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2",
                  index === selectedIndex && "bg-muted"
                )}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(suggestion);
                }}
              >
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "font-medium",
                    suggestion.isSyntax && "text-blue-600 dark:text-blue-400"
                  )}>
                    {suggestion.display}
                  </span>
                  {suggestion.description && (
                    <span className="text-muted-foreground text-xs ml-2">
                      - {suggestion.description}
                    </span>
                  )}
                </div>
                {suggestion.count !== undefined && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {suggestion.count.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
