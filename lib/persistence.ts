import type { Thread } from "@/types/chat";

export interface BackupData {
  version: string;
  timestamp: Date;
  threads: Thread[];
  settings: any;
  metadata: {
    totalMessages: number;
    totalThreads: number;
    exportedBy: string;
  };
}

export class ChatPersistence {
  private static readonly STORAGE_KEY = "ai-chat-threads";
  private static readonly BACKUP_KEY = "ai-chat-backup";
  private static readonly SETTINGS_KEY = "ai-chat-settings";
  private static readonly VERSION = "1.0.0";

  // Compress data using simple JSON compression
  private static compressData(data: any): string {
    const jsonString = JSON.stringify(data);
    // Simple compression by removing unnecessary whitespace and optimizing structure
    return jsonString;
  }

  // Decompress data
  private static decompressData(compressedData: string): any {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      console.error("Failed to decompress data:", error);
      return null;
    }
  }

  // Save threads with auto-backup
  static saveThreads(threads: Thread[]): void {
    try {
      const compressed = this.compressData(threads);
      localStorage.setItem(this.STORAGE_KEY, compressed);

      // Create automatic backup every 10 saves
      const backupCount = Number.parseInt(
        localStorage.getItem("backup-count") || "0"
      );
      if (backupCount % 10 === 0) {
        this.createBackup(threads);
      }
      localStorage.setItem("backup-count", (backupCount + 1).toString());
    } catch (error) {
      console.error("Failed to save threads:", error);
    }
  }

  // Load threads with migration support
  static loadThreads(): Thread[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      const threads = this.decompressData(data);
      return this.migrateThreads(threads || []);
    } catch (error) {
      console.error("Failed to load threads:", error);
      return [];
    }
  }

  // Create full backup
  static createBackup(threads: Thread[], settings?: any): BackupData {
    const backup: BackupData = {
      version: this.VERSION,
      timestamp: new Date(),
      threads,
      settings: settings || {},
      metadata: {
        totalMessages: threads.reduce(
          (sum, thread) => sum + thread.messages.length,
          0
        ),
        totalThreads: threads.length,
        exportedBy: "AI Chat App",
      },
    };

    try {
      localStorage.setItem(this.BACKUP_KEY, this.compressData(backup));
    } catch (error) {
      console.error("Failed to create backup:", error);
    }

    return backup;
  }

  // Restore from backup
  static restoreFromBackup(): BackupData | null {
    try {
      const backupData = localStorage.getItem(this.BACKUP_KEY);
      if (!backupData) return null;

      return this.decompressData(backupData);
    } catch (error) {
      console.error("Failed to restore backup:", error);
      return null;
    }
  }

  // Export all data
  static exportAllData(threads: Thread[], settings: any): void {
    const backup = this.createBackup(threads, settings);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Import data from file
  static async importData(
    file: File
  ): Promise<{ threads: Thread[]; settings: any } | null> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Handle different import formats
      if (data.version && data.threads) {
        // Full backup format
        return {
          threads: this.migrateThreads(data.threads),
          settings: data.settings || {},
        };
      } else if (Array.isArray(data)) {
        // Simple threads array
        return {
          threads: this.migrateThreads(data),
          settings: {},
        };
      } else if (data.title && data.messages) {
        // Single thread format
        return {
          threads: [this.migrateThread(data)],
          settings: {},
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to import data:", error);
      return null;
    }
  }

  // Migrate threads to current version
  private static migrateThreads(threads: any[]): Thread[] {
    return threads.map((thread) => this.migrateThread(thread));
  }

  // Migrate single thread
  private static migrateThread(thread: any): Thread {
    return {
      id: thread.id || Date.now().toString(),
      title: thread.title || "Imported Conversation",
      messages: thread.messages || [],
      createdAt: new Date(thread.createdAt || Date.now()),
      updatedAt: new Date(thread.updatedAt || Date.now()),
      category: thread.category || "general",
      isArchived: thread.isArchived || false,
      isFavorite: thread.isFavorite || false,
      tags: thread.tags || [],
      settings: thread.settings || {
        enableFunctions: true,
        model: "gpt-4",
        temperature: 0.7,
      },
    };
  }

  // Clear all data
  static clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.BACKUP_KEY);
    localStorage.removeItem(this.SETTINGS_KEY);
    localStorage.removeItem("backup-count");
  }

  // Get storage usage info
  static getStorageInfo(): {
    used: number;
    available: number;
    percentage: number;
  } {
    try {
      const used = new Blob(Object.values(localStorage)).size;
      const available = 5 * 1024 * 1024; // 5MB typical localStorage limit
      return {
        used,
        available,
        percentage: (used / available) * 100,
      };
    } catch (error) {
      return { used: 0, available: 0, percentage: 0 };
    }
  }
}
