"use client";

import { create } from "zustand";
import { getUserData } from "@/lib/api";

interface AutocompleteEntry {
  name: string;
  low: string;
  count?: number;
  alts?: string[];
}

interface AutocompleteState {
  // Raw completions from server
  rawCompletions: string[];

  // Processed entries for fast lookup
  entries: AutocompleteEntry[];

  // Index by first character for faster search
  indexedEntries: Record<string, AutocompleteEntry[]>;

  // Loading state
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  loadCompletions: (sessionId: string) => Promise<void>;
  search: (query: string, limit?: number) => AutocompleteEntry[];
}

/**
 * Parse a completion string into an entry
 * Format: "name" or "name:count" or "name:count:alt1,alt2"
 */
function parseCompletion(raw: string): AutocompleteEntry {
  const parts = raw.split(":");
  const name = parts[0];
  const count = parts[1] ? parseInt(parts[1], 10) : undefined;
  const alts = parts[2] ? parts[2].split(",").map(a => a.toLowerCase()) : [];

  return {
    name,
    low: name.toLowerCase(),
    count,
    alts,
  };
}

export const useAutocompleteStore = create<AutocompleteState>()((set, get) => ({
  rawCompletions: [],
  entries: [],
  indexedEntries: {},
  isLoaded: false,
  isLoading: false,

  loadCompletions: async (sessionId: string) => {
    if (get().isLoading || get().isLoaded) return;

    set({ isLoading: true });

    try {
      const data = await getUserData(sessionId);
      const raw = data.autocompletions || [];

      // Parse all completions
      const entries = raw.map(parseCompletion);

      // Index by first character
      const indexed: Record<string, AutocompleteEntry[]> = {};
      for (const entry of entries) {
        const char = entry.low[0];
        if (!indexed[char]) {
          indexed[char] = [];
        }
        indexed[char].push(entry);
      }

      set({
        rawCompletions: raw,
        entries,
        indexedEntries: indexed,
        isLoaded: true,
      });
    } catch (error) {
      console.error("Failed to load autocompletions:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  search: (query: string, limit = 50) => {
    if (!query || query.length < 2) return [];

    const { entries, indexedEntries } = get();
    const queryLow = query.toLowerCase();

    // Get subset by first character if available
    const searchSet = indexedEntries[queryLow[0]] || entries;

    const startsWith: AutocompleteEntry[] = [];
    const startsWithAlt: AutocompleteEntry[] = [];
    const contains: AutocompleteEntry[] = [];

    for (const entry of searchSet) {
      const matchesName = entry.low.includes(queryLow);
      const matchesAlt = entry.alts?.some(alt => alt.includes(queryLow));

      if (!matchesName && !matchesAlt) continue;

      if (entry.low.startsWith(queryLow)) {
        startsWith.push(entry);
      } else if (entry.alts?.some(alt => alt.startsWith(queryLow))) {
        startsWithAlt.push(entry);
      } else {
        contains.push(entry);
      }
    }

    // Sort each bucket by count (descending) then alphabetically
    const sortFn = (a: AutocompleteEntry, b: AutocompleteEntry) => {
      if (a.count !== undefined && b.count !== undefined) {
        return b.count - a.count;
      }
      return a.low.localeCompare(b.low);
    };

    startsWith.sort(sortFn);
    startsWithAlt.sort(sortFn);
    contains.sort(sortFn);

    return [...startsWith, ...startsWithAlt, ...contains].slice(0, limit);
  },
}));
