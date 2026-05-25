"use client";

import React, { useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/layouts/AdminLayout";
import { Button } from "@/components/shared/button";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadData, setUploadData] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    try {
      setUploading(true);
      const parsed = JSON.parse(uploadData);

      const res = await fetch("http://localhost:3002/marketplace/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (!res.ok) throw new Error("Failed to upload");

      toast.success("Successfully uploaded item to marketplace!");
      setShowUpload(false);
      setUploadData("");

      // Optionally trigger a reload or context update here
      window.location.reload();
    } catch (err) {
      toast.error("Invalid JSON or upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout isFullWidth>
      <div className="relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10">
          {children}
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-border/50 flex items-center justify-between">
                <h3 className="text-xl font-bold uppercase tracking-widest">
                  Publish Item
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowUpload(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste your Theme or Font configuration JSON here. Must match
                  the MarketplaceItem schema.
                </p>
                <textarea
                  value={uploadData}
                  onChange={(e) => setUploadData(e.target.value)}
                  placeholder='{\n  "name": "My Custom Theme",\n  "type": "THEME",\n  "description": "...",\n  "config": { ... },\n  "author": "MyName",\n  "price": 0\n}'
                  className="w-full h-64 bg-muted border border-border/50 rounded-xl p-4 font-mono text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>
              <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-card">
                <Button
                  variant="ghost"
                  onClick={() => setShowUpload(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!uploadData || uploading}
                  loading={uploading}
                  icon={Upload}
                >
                  Publish to Network
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
