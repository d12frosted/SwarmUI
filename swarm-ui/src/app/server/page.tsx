"use client";

import { MainLayout } from "@/components/layout";
import { ResourceMonitor, ServerStatus } from "@/components/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Activity, Gauge } from "lucide-react";

export default function ServerAdminPage() {
  return (
    <MainLayout>
      <div className="p-4 h-full overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Server Administration
              </CardTitle>
            </CardHeader>
          </Card>

          <Tabs defaultValue="status" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="status" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status
              </TabsTrigger>
              <TabsTrigger value="resources" className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Resources
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <ServerStatus />
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <ResourceMonitor />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
