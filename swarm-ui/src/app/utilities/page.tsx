"use client";

import { MainLayout } from "@/components/layout";
import { TokenAnalyzer, ModelTools, ModelManager } from "@/components/utilities";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Hash, FolderCog, Package } from "lucide-react";

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

          <Tabs defaultValue="model-manager" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="model-manager" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Model Manager</span>
                <span className="sm:hidden">Models</span>
              </TabsTrigger>
              <TabsTrigger value="tokens" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                <span className="hidden sm:inline">Token Analyzer</span>
                <span className="sm:hidden">Tokens</span>
              </TabsTrigger>
              <TabsTrigger value="tools" className="flex items-center gap-2">
                <FolderCog className="h-4 w-4" />
                <span className="hidden sm:inline">Model Tools</span>
                <span className="sm:hidden">Tools</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="model-manager">
              <ModelManager />
            </TabsContent>

            <TabsContent value="tokens">
              <TokenAnalyzer />
            </TabsContent>

            <TabsContent value="tools">
              <ModelTools />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
