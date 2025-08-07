import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, Download, Brain, Search, Table, Cog, CheckCircle, Loader, ChevronUp, ChevronDown } from "lucide-react";

interface ChatInterfaceProps {
  projectId: string | null;
  chatSessionId: string | null;
  onProjectCreate: (projectId: string) => void;
  onChatSessionCreate: (sessionId: string) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  workflow?: {
    step: number;
    stepName: string;
    status: "pending" | "in-progress" | "completed" | "error";
    data?: any;
  };
}

export function ChatInterface({ 
  projectId, 
  chatSessionId, 
  onProjectCreate, 
  onChatSessionCreate 
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch chat session messages
  const { data: chatSession, isLoading } = useQuery({
    queryKey: ["/api/chat", chatSessionId],
    enabled: !!chatSessionId,
  });

  const messages: ChatMessage[] = (chatSession as any)?.messages || [];

  // Start new chat mutation
  const startChatMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/chat/start", { prompt });
      return response.json();
    },
    onSuccess: (data) => {
      onProjectCreate(data.projectId);
      onChatSessionCreate(data.chatSessionId);
      setCurrentWorkflow(data.workflow);
      setIsGenerating(true);
      
      // Start file structure generation
      generateStructureMutation.mutate({
        sessionId: data.chatSessionId,
        analysisResult: data.analysisResult
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/chat", data.chatSessionId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start chat",
        variant: "destructive",
      });
    },
  });

  // Generate file structure mutation
  const generateStructureMutation = useMutation({
    mutationFn: async ({ sessionId, analysisResult }: any) => {
      const response = await apiRequest("POST", `/api/chat/${sessionId}/generate-structure`, {
        analysisResult
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentWorkflow(data.workflow);
      queryClient.invalidateQueries({ queryKey: ["/api/chat", chatSessionId] });
      
      // Start generating files one by one
      if (data.fileStructure?.public?.children) {
        const files = Object.keys(data.fileStructure.public.children);
        generateFilesSequentially(files, 0, data.fileStructure);
      }
    },
    onError: (error: any) => {
      setIsGenerating(false);
      setCurrentWorkflow(null);
      toast({
        title: "Generation Error",
        description: error.message || "Failed to generate file structure",
        variant: "destructive",
      });
    },
  });

  // Generate file content mutation
  const generateContentMutation = useMutation({
    mutationFn: async ({ sessionId, fileName, analysisResult, fileStructure }: any) => {
      const response = await apiRequest("POST", `/api/chat/${sessionId}/generate-content`, {
        fileName,
        analysisResult,
        fileStructure
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      toast({
        title: "File Generated",
        description: `${data.fileName} has been created successfully`,
      });
    },
  });

  // Modify file mutation
  const modifyFileMutation = useMutation({
    mutationFn: async ({ sessionId, fileName, modificationRequest }: any) => {
      const response = await apiRequest("POST", `/api/chat/${sessionId}/modify`, {
        fileName,
        modificationRequest
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", chatSessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      toast({
        title: "File Modified",
        description: `${data.fileName} has been updated successfully`,
      });
    },
  });

  const generateFilesSequentially = async (files: string[], index: number, fileStructure: any) => {
    if (index >= files.length) {
      setIsGenerating(false);
      setCurrentWorkflow(null);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "files"] });
      toast({
        title: "Project Generated",
        description: "Your HTML application has been created successfully!",
      });
      return;
    }

    const fileName = files[index];
    if (chatSessionId) {
      try {
        await generateContentMutation.mutateAsync({
          sessionId: chatSessionId,
          fileName,
          analysisResult: messages[0]?.workflow?.data || {},
          fileStructure
        });
        
        // Generate next file after a short delay
        setTimeout(() => {
          generateFilesSequentially(files, index + 1, fileStructure);
        }, 1000);
      } catch (error) {
        console.error(`Failed to generate ${fileName}:`, error);
        // Continue with next file even if one fails
        setTimeout(() => {
          generateFilesSequentially(files, index + 1, fileStructure);
        }, 1000);
      }
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    if (!chatSessionId) {
      // First chat - start new project
      setIsGenerating(true);
      startChatMutation.mutate(inputValue);
    } else {
      // Subsequent chats - modify existing project
      const fileName = "index.html"; // TODO: Determine which file to modify
      modifyFileMutation.mutate({
        sessionId: chatSessionId,
        fileName,
        modificationRequest: inputValue
      });
    }

    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    onProjectCreate("");
    onChatSessionCreate("");
    setCurrentWorkflow(null);
    setIsGenerating(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getWorkflowIcon = (step: number, status: string) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === "in-progress") return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
    if (step === 1) return <Search className="w-4 h-4 text-emerald-400" />;
    if (step === 2) return <Table className="w-4 h-4 text-blue-400" />;
    return <Cog className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950">
      {/* Chat Header */}
      <div className={`bg-slate-900 border-b border-slate-700 transition-all duration-300 ${isHeaderCollapsed ? 'px-6 py-2' : 'px-6 py-4'}`}>
        <div className="flex items-center justify-between">
          {!isHeaderCollapsed && (
            <div>
              <h2 className="text-lg font-semibold">Agentic Chat Interface</h2>
              <p className="text-sm text-slate-400">Describe your web application and watch it come to life</p>
            </div>
          )}
          {isHeaderCollapsed && (
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Chat</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            {!isHeaderCollapsed && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="bg-slate-800 hover:bg-slate-700 border-slate-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 border-blue-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              className="p-1 hover:bg-slate-800"
            >
              {isHeaderCollapsed ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {!chatSessionId && (
          <div className="flex items-start space-x-3 animate-fade-in">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <Card className="bg-slate-800 border-slate-700 max-w-2xl">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-300 mb-3">
                    Welcome to AgentCode! I'm your AI assistant for building web applications. 
                    Describe the app you want to create, and I'll:
                  </p>
                  <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                    <li>Analyze your requirements and extract features</li>
                    <li>Generate a comprehensive file structure</li>
                    <li>Create HTML files with full functionality</li>
                    <li>Provide a live preview of your application</li>
                  </ul>
                </CardContent>
              </Card>
              <div className="text-xs text-slate-500 mt-2">AI Assistant • Just now</div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.role === "user" ? "justify-end" : ""
            } animate-fade-in`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                {message.workflow ? (
                  getWorkflowIcon(message.workflow.step, message.workflow.status)
                ) : (
                  <Brain className="w-4 h-4 text-white" />
                )}
              </div>
            )}
            
            <div className="flex-1">
              <Card className={`${
                message.role === "user" 
                  ? "bg-blue-600 border-blue-600 max-w-lg ml-auto" 
                  : "bg-slate-800 border-slate-700 max-w-2xl"
              }`}>
                <CardContent className="p-3">
                  {message.workflow && (
                    <div className="flex items-center space-x-2 mb-3">
                      {getWorkflowIcon(message.workflow.step, message.workflow.status)}
                      <span className={`text-sm font-medium ${
                        message.workflow.status === "completed" ? "text-emerald-400" :
                        message.workflow.status === "in-progress" ? "text-blue-400" : "text-amber-400"
                      }`}>
                        Step {message.workflow.step}: {message.workflow.stepName}
                        {message.workflow.status === "completed" ? " Complete" : 
                         message.workflow.status === "in-progress" ? "..." : " Pending"}
                      </span>
                    </div>
                  )}
                  
                  <p className={`text-sm ${
                    message.role === "user" ? "text-white" : "text-slate-300"
                  }`}>
                    {message.content}
                  </p>
                  
                  {message.workflow?.data && (
                    <div className="bg-slate-900 rounded-lg p-3 mt-3">
                      <div className="text-xs font-medium text-slate-300 mb-2">
                        📋 Analysis Results:
                      </div>
                      <div className="bg-slate-950 rounded p-2 text-xs text-slate-300 max-h-32 overflow-y-auto">
                        {message.workflow.data.features && (
                          <div className="mb-2">
                            <div className="font-medium text-slate-200 mb-1">Features:</div>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                              {message.workflow.data.features.map((feature: string, index: number) => (
                                <li key={index}>{feature}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {message.workflow.data.pages && (
                          <div className="mb-2">
                            <div className="font-medium text-slate-200 mb-1">Pages:</div>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                              {message.workflow.data.pages.map((page: string, index: number) => (
                                <li key={index}>{page}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {message.workflow.data.technical_requirements && (
                          <div>
                            <div className="font-medium text-slate-200 mb-1">Technical Requirements:</div>
                            <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                              <li>Responsive: {message.workflow.data.technical_requirements.responsive ? 'Yes' : 'No'}</li>
                              <li>Authentication: {message.workflow.data.technical_requirements.authentication ? 'Yes' : 'No'}</li>
                              <li>Data Storage: {message.workflow.data.technical_requirements.data_persistence}</li>
                              {message.workflow.data.technical_requirements.ui_framework && (
                                <li>UI Framework: {message.workflow.data.technical_requirements.ui_framework}</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="text-xs text-slate-500 mt-2">
                {message.role === "user" ? "You" : "AI Assistant"} • {
                  new Date(message.timestamp).toLocaleTimeString()
                }
              </div>
            </div>

            {message.role === "user" && (
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-user text-slate-300 text-sm"></i>
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Loader className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="flex-1">
              <Card className="bg-slate-800 border-slate-700 max-w-lg">
                <CardContent className="p-3">
                  <div className="text-xs font-medium text-slate-300 mb-2">🚀 Generation Progress</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">Analysis</span>
                      <span className="text-xs bg-emerald-600 px-2 py-1 rounded">Complete</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">File Structure</span>
                      <span className="text-xs bg-emerald-600 px-2 py-1 rounded">Complete</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">Content Generation</span>
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded animate-pulse">Generating...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea
              placeholder="Describe modifications or ask questions about your generated app..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-slate-800 border-slate-600 text-slate-300 placeholder-slate-500 resize-none focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                <span>Shift + Enter for new line</span>
                <span>•</span>
                <span>/help for commands</span>
              </div>
              <div className="text-xs text-slate-500">{inputValue.length} / 1000</div>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || startChatMutation.isPending || modifyFileMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
