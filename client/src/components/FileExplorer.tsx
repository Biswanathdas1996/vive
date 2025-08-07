import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Folder, 
  FolderPlus, 
  RefreshCw, 
  FileCode, 
  Clock, 
  CheckCircle,
  Loader,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface FileExplorerProps {
  projectId: string | null;
  selectedFile: string | null;
  onFileSelect: (fileName: string) => void;
  isCollapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

interface GeneratedFile {
  id: string;
  fileName: string;
  filePath: string;
  status: string;
  createdAt: string;
}

export function FileExplorer({ projectId, selectedFile, onFileSelect, isCollapsed, onCollapse }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["public"]));

  // Fetch project files
  const { data: filesData, isLoading, refetch } = useQuery({
    queryKey: ["/api/projects", projectId, "files"],
    enabled: !!projectId,
  });

  const files: GeneratedFile[] = (filesData as any)?.files || [];
  const fileList: string[] = (filesData as any)?.fileList || [];

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.html')) {
      return <FileCode className="w-3 h-3 text-emerald-400" />;
    }
    if (fileName.endsWith('.css')) {
      return <FileCode className="w-3 h-3 text-blue-400" />;
    }
    if (fileName.endsWith('.js')) {
      return <FileCode className="w-3 h-3 text-yellow-400" />;
    }
    return <FileCode className="w-3 h-3 text-slate-400" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generated':
        return <div className="w-2 h-2 bg-emerald-500 rounded-full" />;
      case 'generating':
        return <Loader className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-slate-500 rounded-full" />;
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-80'} bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300`}>
      {/* File Explorer Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && <h2 className="text-sm font-medium text-slate-300">Project Explorer</h2>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCollapse(!isCollapsed)}
            className="p-1 hover:bg-slate-800"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            )}
          </Button>
        </div>
        {!isCollapsed && (
          <div className="flex items-center space-x-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-slate-800 hover:bg-slate-700 border-slate-600 text-sm"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="p-2 hover:bg-slate-800 border-slate-600"
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        )}
      </div>

      {/* File Tree */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <div className="space-y-0.5">
            {projectId ? (
              <>
                {/* Current Project Section */}
                <div className="text-xs font-medium text-slate-400 px-2 py-0.5">CURRENT PROJECT</div>
              
              {/* Public Folder */}
              <div className="ml-1">
                <div 
                  className="flex items-center space-x-1.5 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer group"
                  onClick={() => toggleFolder("public")}
                >
                  <Folder className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-slate-300 font-mono">public/</span>
                  <div className={`ml-auto transition-transform ${
                    expandedFolders.has("public") ? "rotate-90" : ""
                  }`}>
                    <i className="fas fa-chevron-right text-slate-500 text-xs"></i>
                  </div>
                </div>
                
                {/* Files in public folder */}
                {expandedFolders.has("public") && (
                  <div className="ml-3 space-y-0.5">
                    {isLoading ? (
                      <div className="flex items-center space-x-1.5 px-2 py-0.5 text-slate-400">
                        <Loader className="w-3 h-3 animate-spin" />
                        <span className="text-xs">Loading files...</span>
                      </div>
                    ) : files.length > 0 ? (
                      files.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center space-x-1.5 px-2 py-0.5 hover:bg-slate-800 rounded cursor-pointer group ${
                            selectedFile === file.fileName ? "bg-slate-800" : ""
                          }`}
                          onClick={() => onFileSelect(file.fileName)}
                        >
                          {getFileIcon(file.fileName)}
                          <span className="text-xs text-slate-300 font-mono flex-1">
                            {file.fileName}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100">
                            {getStatusIcon(file.status)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 px-2 py-0.5 italic">
                        No files generated yet
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generation History */}
              <div className="mt-2">
                <div className="text-xs font-medium text-slate-400 px-2 py-0.5">GENERATION HISTORY</div>
                <div className="ml-1 space-y-0.5">
                  <div className="flex items-center space-x-1.5 px-2 py-1 hover:bg-slate-800 rounded cursor-pointer">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span className="text-xs text-slate-400">Current Session</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 px-2 py-2 text-center italic">
              Start a chat to create your first project
            </div>
          )}
        </div>
      </div>
      )}

      {/* Status Panel */}
      {!isCollapsed && projectId && (
        <div className="border-t border-slate-700 p-2">
          <div className="text-xs font-medium text-slate-400 mb-1">GENERATION STATUS</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Analysis</span>
              <CheckCircle className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">File Structure</span>
              <CheckCircle className="w-3 h-3 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Content Generation</span>
              {files.some(f => f.status === 'generating') ? (
                <Loader className="w-3 h-3 text-blue-500 animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3 text-emerald-500" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
