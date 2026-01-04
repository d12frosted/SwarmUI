"use client";

import { MainLayout } from "@/components/layout";
import { TokenAnalyzer, ModelTools } from "@/components/utilities";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Hash, FolderCog } from "lucide-react";

export default function UtilitiesPage() {
  return (
    <MainLayout>
      <div className="p-4 h-full overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Utilities
              </CardTitle>
            </CardHeader>
          </Card>

          <Tabs defaultValue="tokens" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tokens" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Token Analyzer
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <FolderCog className="h-4 w-4" />
                Model Tools
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tokens">
              <TokenAnalyzer />
            </TabsContent>

            <TabsContent value="models">
              <ModelTools />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
