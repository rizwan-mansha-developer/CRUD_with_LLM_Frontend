"use client";

import { DialogFooter } from "@/components/ui/dialog";
import { ChatPersistence } from "@/lib/persistence";
import { Save } from "lucide-react"; // Import Save icon

import type React from "react";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  PlusIcon,
  SendIcon,
  MessageSquareIcon,
  TrashIcon,
  CopyIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  SearchIcon,
  ArchiveIcon,
  DownloadIcon,
  SettingsIcon,
  MoreVerticalIcon,
  EditIcon,
  StarIcon,
  WrenchIcon,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  error?: boolean;
}

interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  category?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  tags?: string[];
}

type ThreadFilter = "all" | "favorites" | "archived" | "recent";
type ThreadSort = "updated" | "created" | "title" | "messages";

export default function ChatApp() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMultiline, setIsMultiline] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("all");
  const [threadSort, setThreadSort] = useState<ThreadSort>("updated");
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(
    new Set()
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    available: 0,
    percentage: 0,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const filteredAndSortedThreads = useMemo(() => {
    const filtered = threads.filter((thread) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = thread.title.toLowerCase().includes(query);
        const matchesContent = thread.messages.some((msg) =>
          msg.content.toLowerCase().includes(query)
        );
        const matchesTags = thread.tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesContent && !matchesTags) return false;
      }

      // Category filter
      switch (threadFilter) {
        case "favorites":
          return thread.isFavorite;
        case "archived":
          return thread.isArchived;
        case "recent":
          return (
            !thread.isArchived &&
            Date.now() - thread.updatedAt.getTime() < 7 * 24 * 60 * 60 * 1000
          ); // 7 days
        default:
          return !thread.isArchived;
      }
    });

    // Sort threads
    filtered.sort((a, b) => {
      switch (threadSort) {
        case "created":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "messages":
          return b.messages.length - a.messages.length;
        default: // updated
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });

    return filtered;
  }, [threads, searchQuery, threadFilter, threadSort]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [activeThread?.messages, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(
        inputRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [inputMessage]);

  const createNewThread = useCallback(() => {
    const newThread: Thread = {
      id: Date.now().toString(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      category: "general",
      isArchived: false,
      isFavorite: false,
      tags: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setError(null);
  }, []);

  const updateThread = useCallback(
    (threadId: string, updates: Partial<Thread>) => {
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId
            ? { ...thread, ...updates, updatedAt: new Date() }
            : thread
        )
      );
    },
    []
  );

  const toggleThreadFavorite = useCallback(
    (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        updateThread(threadId, { isFavorite: !thread.isFavorite });
        toast({
          title: thread.isFavorite
            ? "Removed from favorites"
            : "Added to favorites",
          description: thread.title,
        });
      }
    },
    [threads, updateThread, toast]
  );

  const archiveThread = useCallback(
    (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        updateThread(threadId, { isArchived: !thread.isArchived });
        if (activeThreadId === threadId && !thread.isArchived) {
          setActiveThreadId(null);
        }
        toast({
          title: thread.isArchived ? "Thread unarchived" : "Thread archived",
          description: thread.title,
        });
      }
    },
    [threads, updateThread, activeThreadId, toast]
  );

  const exportThread = useCallback(
    (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (thread) {
        const exportData = {
          title: thread.title,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          messages: thread.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          })),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat-${thread.title
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Thread exported",
          description: "Chat history downloaded as JSON file",
        });
      }
    },
    [threads, toast]
  );

  const bulkDeleteThreads = useCallback(() => {
    const threadsToDelete = Array.from(selectedThreads);
    setThreads((prev) => prev.filter((t) => !selectedThreads.has(t.id)));
    if (activeThreadId && selectedThreads.has(activeThreadId)) {
      setActiveThreadId(null);
    }
    setSelectedThreads(new Set());
    setIsSelectionMode(false);
    toast({
      title: "Threads deleted",
      description: `${threadsToDelete.length} conversations removed`,
    });
  }, [selectedThreads, activeThreadId, toast]);

  const bulkArchiveThreads = useCallback(() => {
    const threadsToArchive = Array.from(selectedThreads);
    setThreads((prev) =>
      prev.map((thread) =>
        selectedThreads.has(thread.id)
          ? { ...thread, isArchived: true, updatedAt: new Date() }
          : thread
      )
    );
    setSelectedThreads(new Set());
    setIsSelectionMode(false);
    toast({
      title: "Threads archived",
      description: `${threadsToArchive.length} conversations archived`,
    });
  }, [selectedThreads, toast]);

  const startEditingThread = useCallback(
    (threadId: string, currentTitle: string) => {
      setEditingThreadId(threadId);
      setEditingTitle(currentTitle);
    },
    []
  );

  const saveThreadTitle = useCallback(() => {
    if (editingThreadId && editingTitle.trim()) {
      updateThread(editingThreadId, { title: editingTitle.trim() });
      toast({
        title: "Thread renamed",
        description: "Conversation title updated",
      });
    }
    setEditingThreadId(null);
    setEditingTitle("");
  }, [editingThreadId, editingTitle, updateThread, toast]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    let currentThreadId = activeThreadId;

    // Create new thread if none exists
    if (!currentThreadId) {
      const newThread: Thread = {
        id: Date.now().toString(),
        title:
          inputMessage.slice(0, 50) + (inputMessage.length > 50 ? "..." : ""),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        category: "general",
        isArchived: false,
        isFavorite: false,
        tags: [],
      };
      setThreads((prev) => [newThread, ...prev]);
      currentThreadId = newThread.id;
      setActiveThreadId(currentThreadId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date(),
    };

    // Add user message to thread
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === currentThreadId
          ? {
              ...thread,
              messages: [...thread.messages, userMessage],
              updatedAt: new Date(),
              title:
                thread.title === "New Conversation"
                  ? inputMessage.slice(0, 50) +
                    (inputMessage.length > 50 ? "..." : "")
                  : thread.title,
            }
          : thread
      )
    );

    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300);

      const currentThread = threads.find((t) => t.id === currentThreadId);
      const conversationHistory = currentThread?.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) || [];

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || ""}/chat/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: 1,
            message: currentInput,
            conversation_history: conversationHistory,
          }),
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details || `Server error: ${response.status}`
        );
      }

      const data = await response.json();

      // Update thread with conversation history from backend
      const updatedMessages = data.conversation_history
        ?.filter((msg: any) => msg.role !== 'system')
        ?.map((msg: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(),
        })) || [];

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === currentThreadId
            ? {
                ...thread,
                messages: updatedMessages,
                updatedAt: new Date(),
              }
            : thread
        )
      );

      toast({
        title: "Message sent",
        description: "Response received successfully",
      });
    } catch (error) {
      console.error("Error sending message:", error);

      let errorMessage = "Sorry, I encountered an error. Please try again.";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out. Please try again.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: errorMessage,
        role: "assistant",
        timestamp: new Date(),
        error: true,
      };

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === currentThreadId
            ? {
                ...thread,
                messages: [...thread.messages, errorResponse],
                updatedAt: new Date(),
              }
            : thread
        )
      );

      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        setIsMultiline(true);
        return; // Allow new line
      } else {
        e.preventDefault();
        sendMessage();
      }
    }
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const deleteThread = useCallback(
    (threadId: string) => {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
      }
      toast({
        title: "Thread deleted",
        description: "Conversation has been removed",
      });
    },
    [activeThreadId, toast]
  );

  const retryMessage = () => {
    if (activeThread && activeThread.messages.length > 0) {
      const lastUserMessage = [...activeThread.messages]
        .reverse()
        .find((m) => m.role === "user");
      if (lastUserMessage) {
        setInputMessage(lastUserMessage.content);
        // Remove the last assistant message if it was an error
        const lastMessage =
          activeThread.messages[activeThread.messages.length - 1];
        if (lastMessage.role === "assistant" && lastMessage.error) {
          setThreads((prev) =>
            prev.map((thread) =>
              thread.id === activeThreadId
                ? { ...thread, messages: thread.messages.slice(0, -1) }
                : thread
            )
          );
        }
      }
    }
  };

  const exportAllData = useCallback(() => {
    ChatPersistence.exportAllData(threads, {});
    toast({
      title: "Data exported",
      description: "All chat data exported as backup file",
    });
  }, [threads, toast]);

  const importData = useCallback(
    async (file: File) => {
      try {
        const result = await ChatPersistence.importData(file);
        if (result) {
          setThreads((prev) => [...result.threads, ...prev]);
          toast({
            title: "Data imported",
            description: `Imported ${result.threads.length} conversations`,
          });
        } else {
          throw new Error("Invalid file format");
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Could not import the selected file",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const createBackup = useCallback(() => {
    ChatPersistence.createBackup(threads, {});
    toast({
      title: "Backup created",
      description: "Local backup saved successfully",
    });
  }, [threads, toast]);

  const restoreBackup = useCallback(() => {
    const backup = ChatPersistence.restoreFromBackup();
    if (backup) {
      setThreads(backup.threads);
      toast({
        title: "Backup restored",
        description: `Restored ${backup.threads.length} conversations`,
      });
    } else {
      toast({
        title: "No backup found",
        description: "No local backup available to restore",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Auto-save with debouncing
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const saveTimer = setTimeout(() => {
      ChatPersistence.saveThreads(threads);
      setLastSaved(new Date());
      setStorageInfo(ChatPersistence.getStorageInfo());
    }, 2000); // Save 2 seconds after last change

    return () => clearTimeout(saveTimer);
  }, [threads, autoSaveEnabled]);

  // Load threads on mount
  useEffect(() => {
    const loadedThreads = ChatPersistence.loadThreads();
    if (loadedThreads.length > 0) {
      setThreads(loadedThreads);
      setStorageInfo(ChatPersistence.getStorageInfo());
    }
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Thread Management Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <Button
              onClick={createNewThread}
              className="flex-1 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground mr-2"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Chat
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 bg-transparent"
                >
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                >
                  {isSelectionMode ? "Exit Selection" : "Select Multiple"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setThreadFilter("all")}>
                  Show All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setThreadFilter("favorites")}>
                  Show Favorites
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setThreadFilter("archived")}>
                  Show Archived
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={threadFilter}
                onValueChange={(value: ThreadFilter) => setThreadFilter(value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="favorites">Favorites</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={threadSort}
                onValueChange={(value: ThreadSort) => setThreadSort(value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="messages">Messages</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {isSelectionMode && selectedThreads.size > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={bulkArchiveThreads}
                className="flex-1 h-8 text-xs bg-transparent"
              >
                <ArchiveIcon className="w-3 h-3 mr-1" />
                Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={bulkDeleteThreads}
                className="flex-1 h-8 text-xs bg-transparent"
              >
                <TrashIcon className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          )}

          {/* Enhanced persistence with auto-save and import functionality */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {lastSaved
                  ? `Saved ${lastSaved.toLocaleTimeString()}`
                  : "Not saved"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className={
                    autoSaveEnabled ? "text-primary" : "text-muted-foreground"
                  }
                >
                  {autoSaveEnabled ? "Auto-save ON" : "Auto-save OFF"}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={exportAllData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={createBackup}>
                    <Save className="h-4 w-4 mr-2" />
                    Create Backup
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() =>
                      document.getElementById("import-file")?.click()
                    }
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={restoreBackup}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore Backup
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importData(file);
              }}
            />

            {storageInfo.percentage > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Storage</span>
                  <span>{storageInfo.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-1">
                  <div
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{
                      width: `${Math.min(storageInfo.percentage, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Thread List */}
        <ScrollArea className="flex-1 p-2">
          {filteredAndSortedThreads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquareIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery
                  ? "No matching conversations"
                  : "No conversations yet"}
              </p>
            </div>
          ) : (
            filteredAndSortedThreads.map((thread) => (
              <Card
                key={thread.id}
                className={cn(
                  "p-3 mb-2 cursor-pointer transition-all duration-200 hover:bg-sidebar-accent/10 group",
                  activeThreadId === thread.id &&
                    "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                  thread.isArchived && "opacity-60"
                )}
                onClick={() => !isSelectionMode && setActiveThreadId(thread.id)}
              >
                <div className="flex items-start gap-2">
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <Checkbox
                      checked={selectedThreads.has(thread.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedThreads);
                        if (checked) {
                          newSelected.add(thread.id);
                        } else {
                          newSelected.delete(thread.id);
                        }
                        setSelectedThreads(newSelected);
                      }}
                      className="mt-1"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquareIcon className="w-4 h-4 flex-shrink-0" />
                      {thread.isFavorite && (
                        <StarIcon className="w-3 h-3 text-yellow-500 fill-current" />
                      )}
                      {thread.isArchived && (
                        <ArchiveIcon className="w-3 h-3 text-muted-foreground" />
                      )}

                      {editingThreadId === thread.id ? (
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={saveThreadTitle}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveThreadTitle();
                            if (e.key === "Escape") {
                              setEditingThreadId(null);
                              setEditingTitle("");
                            }
                          }}
                          className="h-6 text-sm font-medium"
                          autoFocus
                        />
                      ) : (
                        <h3 className="font-medium text-sm truncate">
                          {thread.title}
                        </h3>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{thread.messages.length} messages</span>
                      <span>•</span>
                      <span>{thread.updatedAt.toLocaleDateString()}</span>
                    </div>

                    {/* Tags */}
                    {thread.tags && thread.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {thread.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs px-1 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {thread.tags.length > 2 && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1 py-0"
                          >
                            +{thread.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Thread Actions */}
                  {!isSelectionMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVerticalIcon className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            startEditingThread(thread.id, thread.title)
                          }
                        >
                          <EditIcon className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleThreadFavorite(thread.id)}
                        >
                          <StarIcon className="w-4 h-4 mr-2" />
                          {thread.isFavorite
                            ? "Remove from Favorites"
                            : "Add to Favorites"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => archiveThread(thread.id)}
                        >
                          <ArchiveIcon className="w-4 h-4 mr-2" />
                          {thread.isArchived ? "Unarchive" : "Archive"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => exportThread(thread.id)}
                        >
                          <DownloadIcon className="w-4 h-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteThread(thread.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <TrashIcon className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Card>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeThread ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-semibold text-lg text-card-foreground">
                        {activeThread.title}
                      </h1>
                      {activeThread.isFavorite && (
                        <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      {activeThread.isArchived && (
                        <ArchiveIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activeThread.messages.length} messages • Updated{" "}
                      {activeThread.updatedAt.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {error && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryMessage}
                    className="text-destructive border-destructive hover:bg-destructive/10 bg-transparent"
                  >
                    <RefreshCwIcon className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="m-4 border-destructive/50 text-destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {activeThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 group",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback
                          className={cn(
                            "text-xs",
                            message.error
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-primary text-primary-foreground"
                          )}
                        >
                          AI
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-4 py-3 text-sm relative",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : message.error
                          ? "bg-destructive/10 text-destructive border border-destructive/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <div className="whitespace-pre-wrap text-pretty leading-relaxed">
                        {message.content}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1">
                        <p className="text-xs opacity-70">
                          {message?.timestamp?.toLocaleTimeString()}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyMessage(message.content)}
                        >
                          <CopyIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {message.role === "user" && (
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          U
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-current rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 bg-current rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <span className="ml-2 text-xs">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message... (Shift+Enter for new line)"
                    className="min-h-[44px] max-h-[120px] resize-none bg-input pr-12"
                    disabled={isLoading}
                    rows={1}
                  />
                  {inputMessage && (
                    <div className="absolute right-2 bottom-2 text-xs text-muted-foreground">
                      {inputMessage.length}
                    </div>
                  )}
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-4"
                >
                  {isLoading ? (
                    <RefreshCwIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <SendIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {isMultiline && (
                <p className="text-xs text-muted-foreground mt-1 max-w-4xl mx-auto">
                  Press Enter to send, Shift+Enter for new line
                </p>
              )}
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <MessageSquareIcon className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  Welcome to Chat
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Start a new conversation. Ask questions, get help with tasks,
                  or just have a friendly chat.
                </p>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={createNewThread}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Start New Chat
                </Button>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="secondary" className="text-xs">
                    Advanced Thread Management
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    FastAPI Backend
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
