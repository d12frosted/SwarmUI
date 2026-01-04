"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>Theme</Label>
        <div className="flex gap-2">
          {themes.map((t) => (
            <Button key={t.id} variant="outline" size="sm" disabled className="flex-1">
              <t.icon className="h-4 w-4 mr-2" />
              {t.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Theme</Label>
      <div className="flex gap-2">
        {themes.map((t) => {
          const isActive = theme === t.id;
          return (
            <Button
              key={t.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme(t.id)}
              className="flex-1"
            >
              <t.icon className="h-4 w-4 mr-2" />
              {t.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
