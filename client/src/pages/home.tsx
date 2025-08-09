import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { FileExplorer } from "@/components/FileExplorer";
import { PreviewPanel } from "@/components/PreviewPanel";
import { Settings, Cog } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [currentChatSession, setCurrentChatSession] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isFileExplorerCollapsed, setIsFileExplorerCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-50">
      {/* Header Bar */}
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <i className="fas fa-code text-white text-sm"></i>
            </div>
            <h1 className="text-xl font-semibold">AgentCode</h1>
          </div>
          <div className="text-slate-400 text-sm">AI-Powered Web App Generator</div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>LLM Connected</span>
          </div>
          <Link href="/settings">
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <Cog className="w-4 h-4 text-slate-400" />
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - File Explorer */}
        <FileExplorer 
          projectId={currentProject}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
          isCollapsed={isFileExplorerCollapsed}
          onCollapse={setIsFileExplorerCollapsed}
        />

        {/* Center Panel - Chat Interface */}
        <ChatInterface 
          projectId={currentProject}
          chatSessionId={currentChatSession}
          onProjectCreate={setCurrentProject}
          onChatSessionCreate={setCurrentChatSession}
          isCollapsed={isChatCollapsed}
          onCollapse={setIsChatCollapsed}
          selectedFile={selectedFile}
        />

        {/* Right Panel - Live Preview */}
        <PreviewPanel 
          projectId={currentProject}
          selectedFile={selectedFile}
          isChatCollapsed={isChatCollapsed}
          isFileExplorerCollapsed={isFileExplorerCollapsed}
        />
      </div>
    </div>
  );
}
