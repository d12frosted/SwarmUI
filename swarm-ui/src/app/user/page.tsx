"use client";

import { MainLayout } from "@/components/layout";
import { SettingsPanel } from "@/components/settings";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function UserSettingsPage() {
  return (
    <MainLayout>
      <div className="p-4 h-full overflow-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
          </Card>
          <SettingsPanel />
        </div>
      </div>
    </MainLayout>
  );
}
