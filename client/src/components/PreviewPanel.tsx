import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ExternalLink, 
  RefreshCw, 
  Monitor, 
  Tablet, 
  Smartphone,
  CheckCircle,
  FileCode,
  Eye
} from "lucide-react";

interface PreviewPanelProps {
  projectId: string | null;
  selectedFile: string | null;
  isChatCollapsed: boolean;
  isFileExplorerCollapsed: boolean;
}

interface GeneratedFile {
  id: string;
  fileName: string;
  filePath: string;
  content: string;
  url: string;
}

type DeviceType = "desktop" | "tablet" | "mobile";

export function PreviewPanel({ projectId, selectedFile, isChatCollapsed, isFileExplorerCollapsed }: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState("index.html");
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview");

  // Calculate dynamic width based on collapse states
  const getPreviewWidth = () => {
    if (isChatCollapsed && isFileExplorerCollapsed) {
      return "flex-1"; // Take full space when both are collapsed
    } else if (isChatCollapsed || isFileExplorerCollapsed) {
      return "flex-1"; // Take remaining space when one is collapsed
    } else {
      return "w-1/2"; // Default width when both are expanded
    }
  };

  // Fetch project files
  const { data: filesData, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "files"],
    enabled: !!projectId,
  });

  // Fetch specific file content if selected
  const { data: fileData } = useQuery({
    queryKey: ["/api/files", selectedFile],
    enabled: !!selectedFile,
  });

  const files: GeneratedFile[] = (filesData as any)?.files || [];
  const currentFile = files.find(f => f.fileName === (selectedFile || activeTab));

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      setActiveTab(files[0].fileName);
    }
  }, [files, selectedFile]);

  useEffect(() => {
    if (selectedFile) {
      setActiveTab(selectedFile);
    }
  }, [selectedFile]);

  const getDeviceClass = () => {
    switch (deviceType) {
      case "tablet":
        return "max-w-2xl mx-auto";
      case "mobile":
        return "max-w-sm mx-auto";
      default:
        return "w-full";
    }
  };

  const getDeviceSize = () => {
    switch (deviceType) {
      case "tablet":
        return "768 × 1024";
      case "mobile":
        return "375 × 667";
      default:
        return "1440 × 900";
    }
  };

  const DeviceButton = ({ device, icon: Icon }: { device: DeviceType; icon: any }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setDeviceType(device)}
      className={`p-1.5 ${
        deviceType === device 
          ? "bg-blue-600 text-white border-blue-600" 
          : "hover:bg-slate-800 text-slate-400 border-slate-600"
      }`}
    >
      <Icon className="w-3 h-3" />
    </Button>
  );

  if (!projectId) {
    return (
      <div className={`${getPreviewWidth()} bg-slate-900 border-l border-slate-700 flex flex-col transition-all duration-300`}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No Project Selected</h3>
            <p className="text-sm text-slate-500">
              Start a chat to generate your first web application
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${getPreviewWidth()} bg-slate-900 border-l border-slate-700 flex flex-col transition-all duration-300`}>
      {/* Preview Header */}
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Live Preview</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="p-1.5 hover:bg-slate-800 text-slate-400 border-slate-600"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="p-1.5 hover:bg-slate-800 text-slate-400 border-slate-600"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Preview Navigation Tabs */}
        {files.length > 0 && (
          <div className="flex space-x-1 mb-3">
            {files.slice(0, 3).filter(file => file.fileName !== 'processing.html' && file.fileName !== 'index.html').map((file) => (
              <Button
                key={file.id}
                variant="outline"
                size="sm"
                onClick={() => setActiveTab(file.fileName)}
                className={`px-3 py-1.5 text-xs font-medium ${
                  activeTab === file.fileName
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600"
                }`}
              >
                {file.fileName}
              </Button>
            ))}
            {files.filter(file => file.fileName !== 'processing.html' && file.fileName !== 'index.html').length > 3 && (
              <Button
                variant="outline"
                size="sm"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-600 text-xs"
              >
                +{files.filter(file => file.fileName !== 'processing.html' && file.fileName !== 'index.html').length - 3} more
              </Button>
            )}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode("preview")}
            className={`px-3 py-1.5 text-xs ${
              previewMode === "preview"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600"
            }`}
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode("code")}
            className={`px-3 py-1.5 text-xs ${
              previewMode === "code"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600"
            }`}
          >
            <FileCode className="w-3 h-3 mr-1" />
            Code
          </Button>
        </div>
      </div>

      {previewMode === "preview" && (
        <>
          {/* Device Preview Options */}
          <div className="border-b border-slate-700 px-4 py-2 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <DeviceButton device="desktop" icon={Monitor} />
              <DeviceButton device="tablet" icon={Tablet} />
              <DeviceButton device="mobile" icon={Smartphone} />
            </div>
            <div className="text-xs text-slate-500">{getDeviceSize()}</div>
            <div className="flex-1"></div>
            <div className="text-xs text-slate-500">100%</div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 p-4 bg-slate-850 overflow-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Loading preview...</p>
                </div>
              </div>
            ) : currentFile ? (
              <div className={`h-full ${getDeviceClass()}`}>
                <div className="h-full bg-white rounded-lg shadow-2xl overflow-hidden">
                  <iframe
                    src={currentFile.url}
                    className="w-full h-full border-0"
                    title={`Preview of ${currentFile.fileName}`}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileCode className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-400 mb-2">No Files Generated</h3>
                  <p className="text-sm text-slate-500">
                    Files will appear here once generation is complete
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {previewMode === "code" && (
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-4">
            {currentFile ? (
              <Card className="h-full bg-slate-950 border-slate-700">
                <CardContent className="p-4 h-full">
                  <div className="text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                    <FileCode className="w-4 h-4" />
                    <span>{currentFile.fileName}</span>
                  </div>
                  <div className="bg-slate-900 rounded p-4 h-full overflow-auto font-mono text-xs text-slate-300">
                    <pre>{(fileData as any)?.content || currentFile.content}</pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <FileCode className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-400 mb-2">Select a File</h3>
                  <p className="text-sm text-slate-500">
                    Choose a file from the explorer to view its code
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Footer */}
      <div className="border-t border-slate-700 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
        <div>
          {currentFile ? `Generated: ${new Date((currentFile as any).createdAt || Date.now()).toLocaleTimeString()}` : "No file selected"}
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          <span>Live & Responsive</span>
        </div>
      </div>
    </div>
  );
}
