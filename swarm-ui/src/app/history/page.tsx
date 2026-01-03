"use client";

import { MainLayout } from "@/components/layout";
import { OutputBrowser } from "@/components/history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <MainLayout>
      <div className="p-4 h-full overflow-auto">
        <Card className="h-full flex flex-col">
          <CardHeader className="shrink-0">
            <CardTitle>Output History</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <OutputBrowser />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
