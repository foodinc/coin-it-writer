"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CoinAnalyzerPage() {
  const [socialLinks, setSocialLinks] = useState<string[]>([""]);
  const [result, setResult] = useState<null | string>(null);

  const handleInputChange = (idx: number, value: string) => {
    const updated = [...socialLinks];
    updated[idx] = value;
    setSocialLinks(updated);
  };

  const handleAddField = () => {
    setSocialLinks([...socialLinks, ""]);
  };

  const handleRemoveField = (idx: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== idx));
  };

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: In the future, call backend API for analysis
    setResult("Analysis coming soon! We'll estimate your account's coin value based on your social presence and content links.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col items-center py-10 px-4">
  <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle>Coin Analyzer</CardTitle>
          <p className="text-gray-600 mt-2 text-sm">Import your social pages, channels, and content links. We'll analyze what your account would be worth if it was a coin on our platform.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyze} className="space-y-4">
            {socialLinks.map((link, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  type="url"
                  placeholder="Paste a social or content link (e.g. Twitter, YouTube, Medium)"
                  value={link}
                  onChange={e => handleInputChange(idx, e.target.value)}
                  required
                />
                {socialLinks.length > 1 && (
                  <Button type="button" variant="ghost" onClick={() => handleRemoveField(idx)}>-</Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddField}>+ Add another link</Button>
            <Button type="submit" className="w-full">Analyze</Button>
          </form>
          {result && (
            <div className="mt-6 p-4 bg-purple-50 border rounded text-center text-purple-700">
              {result}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
