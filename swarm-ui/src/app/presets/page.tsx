"use client";

import { MainLayout } from "@/components/layout";
import { PresetBrowser } from "@/components/presets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PresetsPage() {
  return (
    <MainLayout>
      <div className="p-4 h-full overflow-auto">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Preset Management</CardTitle>
          </CardHeader>
          <CardContent>
            <PresetBrowser />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
