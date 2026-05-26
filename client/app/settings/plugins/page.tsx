"use client";

import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/button";
import { Heading } from "@/components/shared/heading";
import { Badge } from "@/components/ui/badge";
import {
  Puzzle,
  Upload,
  Power,
  PowerOff,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Shield,
  Activity,
  ChevronRight,
  MoreHorizontal,
  FileJson,
  LayoutGrid,
  Route,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

// Types
interface Plugin {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description?: string;
  author?: string;
  type: string;
  state: "UPLOADED" | "VALIDATED" | "STAGED" | "INSTALLED" | "ENABLED" | "DISABLED" | "FAILED" | "BROKEN";
  status: string;
  installedAt?: string;
  enabledAt?: string;
  updatedAt: string;
  healthStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
  failureCount: number;
  permissions: string[];
  capabilities: {
    routes: number;
    menus: number;
    widgets: number;
    queues: number;
  };
}

interface StagedPackage {
  id: string;
  filename: string;
  manifest?: {
    name: string;
    version: string;
    description?: string;
    author?: string;
  };
  stagedAt: string;
  permissions: string[];
}

export default function PluginsSettingsPage() {
  const [activeTab, setActiveTab] = useState<"installed" | "staged" | "upload">("installed");
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [stagedPackages, setStagedPackages] = useState<StagedPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch plugins
  const fetchPlugins = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/marketplace/plugins");
      if (response.data.success) {
        setPlugins(response.data.data.plugins);
      }
    } catch (error) {
      toast.error("Failed to fetch plugins");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch staged packages
  const fetchStagedPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/marketplace/staged");
      if (response.data.success) {
        setStagedPackages(response.data.data.packages);
      }
    } catch (error) {
      toast.error("Failed to fetch staged packages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enable plugin
  const enablePlugin = async (pluginId: string) => {
    try {
      const response = await api.post(`/marketplace/plugins/${pluginId}/action`, {
        action: "enable",
      });
      if (response.data.success) {
        toast.success("Plugin enabled successfully");
        fetchPlugins();
      } else {
        toast.error(response.data.error?.message || "Failed to enable plugin");
      }
    } catch (error) {
      toast.error("Failed to enable plugin");
    }
  };

  // Disable plugin
  const disablePlugin = async (pluginId: string) => {
    try {
      const response = await api.post(`/marketplace/plugins/${pluginId}/action`, {
        action: "disable",
      });
      if (response.data.success) {
        toast.success("Plugin disabled successfully");
        fetchPlugins();
      } else {
        toast.error(response.data.error?.message || "Failed to disable plugin");
      }
    } catch (error) {
      toast.error("Failed to disable plugin");
    }
  };

  // Uninstall plugin
  const uninstallPlugin = async (pluginId: string, keepData?: boolean) => {
    try {
      const response = await api.post(`/marketplace/plugins/${pluginId}/action`, {
        action: "uninstall",
        keepData,
      });
      if (response.data.success) {
        toast.success("Plugin uninstalled successfully");
        fetchPlugins();
      } else {
        toast.error(response.data.error?.message || "Failed to uninstall plugin");
      }
    } catch (error) {
      toast.error("Failed to uninstall plugin");
    }
  };

  // Retry failed plugin
  const retryPlugin = async (pluginId: string) => {
    try {
      const response = await api.post(`/marketplace/plugins/${pluginId}/action`, {
        action: "retry",
      });
      if (response.data.success) {
        toast.success("Plugin retry successful");
        fetchPlugins();
      } else {
        toast.error(response.data.error?.message || "Failed to retry plugin");
      }
    } catch (error) {
      toast.error("Failed to retry plugin");
    }
  };

  // Install staged package
  const installStaged = async (packageId: string) => {
    try {
      const response = await api.post("/marketplace/install", {
        stagedPackageId: packageId,
        autoEnable: true,
      });
      if (response.data.success) {
        toast.success(`Plugin ${response.data.data.name} installed successfully`);
        fetchStagedPackages();
        fetchPlugins();
        setActiveTab("installed");
      } else {
        toast.error(response.data.error?.message || "Failed to install package");
      }
    } catch (error) {
      toast.error("Failed to install package");
    }
  };

  // Delete staged package
  const deleteStaged = async (packageId: string) => {
    try {
      const response = await api.delete(`/marketplace/uploads/${packageId}`);
      if (response.data.success) {
        toast.success("Package deleted successfully");
        fetchStagedPackages();
      } else {
        toast.error(response.data.error?.message || "Failed to delete package");
      }
    } catch (error) {
      toast.error("Failed to delete package");
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size exceeds 50MB limit");
        return;
      }
      if (!file.name.endsWith(".zip") && !file.name.endsWith(".tar.gz")) {
        toast.error("Only .zip and .tar.gz files are supported");
        return;
      }
      setUploadFile(file);
    }
  };

  // Upload package
  const uploadPackage = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("package", uploadFile);
    formData.append("autoStage", "true");

    try {
      const response = await api.post("/marketplace/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.success) {
        toast.success("Package uploaded and staged successfully");
        setUploadFile(null);
        fetchStagedPackages();
        setActiveTab("staged");
      } else {
        toast.error(response.data.error?.message || "Failed to upload package");
      }
    } catch (error) {
      toast.error("Failed to upload package");
    } finally {
      setIsUploading(false);
    }
  };

  // Load data on mount
  React.useEffect(() => {
    fetchPlugins();
    fetchStagedPackages();
  }, [fetchPlugins, fetchStagedPackages]);

  // Status badge helper
  const getStatusBadge = (state: string, healthStatus?: string) => {
    const configs: Record<string, { variant: string; icon: React.ElementType; label: string }> = {
      ENABLED: { variant: "success", icon: CheckCircle2, label: "Enabled" },
      DISABLED: { variant: "secondary", icon: PowerOff, label: "Disabled" },
      INSTALLED: { variant: "default", icon: Package, label: "Installed" },
      STAGED: { variant: "warning", icon: Clock, label: "Staged" },
      FAILED: { variant: "destructive", icon: XCircle, label: "Failed" },
      BROKEN: { variant: "destructive", icon: AlertTriangle, label: "Broken" },
    };

    const config = configs[state] || { variant: "default", icon: Package, label: state };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      <Heading
        title="Plugins"
        description="Manage your plugin ecosystem. Upload, install, enable, and monitor plugins."
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("installed")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors relative",
            activeTab === "installed"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Installed
          {plugins.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">({plugins.length})</span>
          )}
          {activeTab === "installed" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("staged")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors relative",
            activeTab === "staged"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Staged
          {stagedPackages.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">({stagedPackages.length})</span>
          )}
          {activeTab === "staged" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors relative",
            activeTab === "upload"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Upload
          {activeTab === "upload" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
      </div>

      {/* Installed Plugins Tab */}
      {activeTab === "installed" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading plugins...</div>
          ) : plugins.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Puzzle className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">No plugins installed yet</p>
              <Button variant="outline" onClick={() => setActiveTab("upload")} icon={Upload}>
                Upload your first plugin
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="p-5 rounded-xl border border-border bg-card hover:border-accent/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground">{plugin.displayName}</h3>
                        {getStatusBadge(plugin.state, plugin.healthStatus)}
                        {plugin.failureCount > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {plugin.failureCount} failures
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {plugin.description || "No description provided"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>v{plugin.version}</span>
                        <span>•</span>
                        <span>{plugin.type}</span>
                        <span>•</span>
                        <span>By {plugin.author || "Unknown"}</span>
                        {plugin.installedAt && (
                          <>
                            <span>•</span>
                            <span>Installed {new Date(plugin.installedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      {/* Capabilities */}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Route className="h-3.5 w-3.5" />
                          <span>{plugin.capabilities.routes} routes</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <span>{plugin.capabilities.menus} menus</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Layers className="h-3.5 w-3.5" />
                          <span>{plugin.capabilities.widgets} widgets</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {plugin.state === "ENABLED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={PowerOff}
                          onClick={() => disablePlugin(plugin.id)}
                        >
                          Disable
                        </Button>
                      ) : plugin.state === "DISABLED" || plugin.state === "INSTALLED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Power}
                          onClick={() => enablePlugin(plugin.id)}
                        >
                          Enable
                        </Button>
                      ) : plugin.state === "FAILED" || plugin.state === "BROKEN" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={RefreshCw}
                          onClick={() => retryPlugin(plugin.id)}
                        >
                          Retry
                        </Button>
                      ) : null}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedPlugin(plugin); setShowDetailsDialog(true); }}>
                            <Activity className="h-4 w-4 mr-2" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedPlugin(plugin); setShowDetailsDialog(true); }}>
                            <Shield className="h-4 w-4 mr-2" />
                            Permissions ({plugin.permissions.length})
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => uninstallPlugin(plugin.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Uninstall
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Staged Packages Tab */}
      {activeTab === "staged" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading staged packages...</div>
          ) : stagedPackages.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">No staged packages</p>
              <Button variant="outline" onClick={() => setActiveTab("upload")} icon={Upload}>
                Upload a package
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {stagedPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-5 rounded-xl border border-border bg-card hover:border-accent/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {pkg.manifest?.name || pkg.filename}
                        </h3>
                        {getStatusBadge("STAGED")}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {pkg.manifest?.description || "Ready to install"}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {pkg.manifest?.version && <span>v{pkg.manifest.version}</span>}
                        <span>•</span>
                        <span>By {pkg.manifest?.author || "Unknown"}</span>
                        <span>•</span>
                        <span>Staged {new Date(pkg.stagedAt).toLocaleDateString()}</span>
                      </div>
                      {pkg.permissions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1.5">
                            Permissions requested:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.permissions.map((perm, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => installStaged(pkg.id)}
                      >
                        Install
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteStaged(pkg.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div className="max-w-xl">
          <div className="p-8 rounded-xl border border-border bg-card space-y-6">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto">
                <Upload className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Upload Plugin Package</h3>
              <p className="text-sm text-muted-foreground">
                Upload a .zip or .tar.gz file containing your plugin.
                The package will be validated and staged before installation.
              </p>
            </div>

            <div className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  uploadFile
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/30"
                )}
              >
                <input
                  type="file"
                  accept=".zip,.tar.gz"
                  onChange={handleFileChange}
                  className="hidden"
                  id="plugin-upload"
                />
                <label htmlFor="plugin-upload" className="cursor-pointer block">
                  {uploadFile ? (
                    <div className="space-y-2">
                      <FileJson className="h-8 w-8 text-accent mx-auto" />
                      <p className="font-medium text-foreground">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Click to select file or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supported: .zip, .tar.gz (max 50MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <Button
                className="w-full"
                disabled={!uploadFile || isUploading}
                onClick={uploadPackage}
                icon={isUploading ? RefreshCw : Upload}
              >
                {isUploading ? "Uploading..." : "Upload and Stage"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plugin Details</DialogTitle>
            <DialogDescription>
              {selectedPlugin?.displayName} v{selectedPlugin?.version}
            </DialogDescription>
          </DialogHeader>
          {selectedPlugin && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedPlugin.state)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Health</p>
                  <p className="mt-1 text-sm capitalize">{selectedPlugin.healthStatus}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="mt-1 text-sm">{selectedPlugin.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Author</p>
                  <p className="mt-1 text-sm">{selectedPlugin.author || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Installed</p>
                  <p className="mt-1 text-sm">
                    {selectedPlugin.installedAt
                      ? new Date(selectedPlugin.installedAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enabled</p>
                  <p className="mt-1 text-sm">
                    {selectedPlugin.enabledAt
                      ? new Date(selectedPlugin.enabledAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Capabilities</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-semibold">{selectedPlugin.capabilities.routes}</p>
                    <p className="text-xs text-muted-foreground">Routes</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-semibold">{selectedPlugin.capabilities.menus}</p>
                    <p className="text-xs text-muted-foreground">Menus</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-semibold">{selectedPlugin.capabilities.widgets}</p>
                    <p className="text-xs text-muted-foreground">Widgets</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-2xl font-semibold">{selectedPlugin.capabilities.queues}</p>
                    <p className="text-xs text-muted-foreground">Queues</p>
                  </div>
                </div>
              </div>

              {selectedPlugin.permissions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPlugin.permissions.map((perm, idx) => (
                      <Badge key={idx} variant="outline">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlugin.failureCount > 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="font-medium">{selectedPlugin.failureCount} failure(s) detected</p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
