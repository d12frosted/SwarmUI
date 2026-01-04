"use client";

import { useState, useCallback } from "react";
import { useSessionStore } from "@/stores/session";
import { countTokens, tokenizeInDetail } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hash, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface TokenInfo {
  text: string;
  id: number;
}

export function TokenAnalyzer() {
  const { sessionId } = useSessionStore();
  const [text, setText] = useState("");
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!sessionId || !text.trim()) return;

    setIsLoading(true);
    try {
      const [countResult, detailResult] = await Promise.all([
        countTokens(sessionId, text),
        tokenizeInDetail(text, sessionId),
      ]);

      setTokenCount(countResult.count);
      setTokens(detailResult.tokens || []);
    } catch (error) {
      toast.error("Failed to analyze tokens");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, text]);

  const handleCopyTokens = useCallback(() => {
    const tokenText = tokens.map((t) => `${t.text} (${t.id})`).join(", ");
    navigator.clipboard.writeText(tokenText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Tokens copied to clipboard");
  }, [tokens]);

  const getTokenColor = (index: number) => {
    const colors = [
      "bg-blue-500/20 text-blue-700 dark:text-blue-300",
      "bg-green-500/20 text-green-700 dark:text-green-300",
      "bg-purple-500/20 text-purple-700 dark:text-purple-300",
      "bg-orange-500/20 text-orange-700 dark:text-orange-300",
      "bg-pink-500/20 text-pink-700 dark:text-pink-300",
      "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5" />
          CLIP Token Analyzer
        </CardTitle>
        <CardDescription>
          Analyze how your prompts are tokenized by CLIP. Useful for understanding
          prompt limits and optimization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter your prompt text to analyze..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="font-mono text-sm"
        />

        <div className="flex items-center gap-2">
          <Button onClick={handleAnalyze} disabled={isLoading || !text.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Tokens"
            )}
          </Button>

          {tokenCount !== null && (
            <Badge variant="secondary" className="text-base px-3 py-1">
              {tokenCount} tokens
            </Badge>
          )}
        </div>

        {tokens.length > 0 && (
          <Tabs defaultValue="visual" className="mt-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="visual">Visual</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
              <Button variant="ghost" size="sm" onClick={handleCopyTokens}>
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                Copy
              </Button>
            </div>

            <TabsContent value="visual" className="mt-2">
              <div className="flex flex-wrap gap-1 p-3 bg-muted/50 rounded-lg min-h-[100px]">
                {tokens.map((token, index) => (
                  <span
                    key={index}
                    className={`px-1.5 py-0.5 rounded text-sm font-mono ${getTokenColor(index)}`}
                    title={`Token ID: ${token.id}`}
                  >
                    {token.text === " " ? "␣" : token.text}
                  </span>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="mt-2">
              <div className="max-h-[300px] overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">#</th>
                      <th className="text-left p-2 font-medium">Token</th>
                      <th className="text-left p-2 font-medium">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2 text-muted-foreground">{index + 1}</td>
                        <td className="p-2 font-mono">
                          {token.text === " " ? "␣ (space)" : token.text}
                        </td>
                        <td className="p-2 text-muted-foreground">{token.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {tokenCount !== null && tokenCount > 75 && (
          <p className="text-sm text-orange-500">
            Warning: CLIP has a 77 token limit. Your prompt may be truncated.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
