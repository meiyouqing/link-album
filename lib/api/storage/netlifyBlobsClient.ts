import { getStore } from "@netlify/blobs";

// Storage configuration
const USE_NETLIFY_BLOBS = process.env.USE_NETLIFY_BLOBS === "true";
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;

interface NetlifyBlobsClient {
  createFile: ({
    filePath,
    data,
    isBase64,
  }: {
    filePath: string;
    data: Buffer | string;
    isBase64?: boolean;
  }) => Promise<boolean>;
  
  readFile: (filePath: string) => Promise<{
    file: Buffer | string;
    contentType: string;
    status: number;
  }>;
  
  removeFile: ({ filePath }: { filePath: string }) => Promise<void>;
  
  moveFile: (from: string, to: string) => Promise<void>;
  
  createFolder: ({ filePath }: { filePath: string }) => void;
  
  removeFolder: ({ filePath }: { filePath: string }) => Promise<void>;
}

class NetlifyBlobsStorageClient implements NetlifyBlobsClient {
  private getFileStore() {
    return getStore("link-album-files");
  }

  async createFile({
    filePath,
    data,
    isBase64,
  }: {
    filePath: string;
    data: Buffer | string;
    isBase64?: boolean;
  }): Promise<boolean> {
    try {
      const fileStore = this.getFileStore();
      
      let fileData: ArrayBuffer;
      let metadata: Record<string, any> = {
        uploadedAt: new Date().toISOString(),
        isBase64: isBase64 || false,
      };

      if (isBase64 && typeof data === "string") {
        // Convert base64 to ArrayBuffer
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileData = bytes.buffer;
      } else if (data instanceof Buffer) {
        fileData = new Uint8Array(data).buffer;
      } else {
        // Assume it's a string, convert to ArrayBuffer
        const encoder = new TextEncoder();
        fileData = encoder.encode(data as string).buffer;
      }

      // Determine content type from file extension
      if (filePath.endsWith(".pdf")) {
        metadata.mimeType = "application/pdf";
      } else if (filePath.endsWith(".png")) {
        metadata.mimeType = "image/png";
      } else if (filePath.endsWith("_readability.json")) {
        metadata.mimeType = "application/json";
      } else if (filePath.endsWith(".html")) {
        metadata.mimeType = "text/html";
      } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        metadata.mimeType = "image/jpeg";
      }

      await fileStore.set(filePath, fileData, { metadata });
      return true;
    } catch (error) {
      console.error("Error creating file:", error);
      return false;
    }
  }

  async readFile(filePath: string): Promise<{
    file: Buffer | string;
    contentType: string;
    status: number;
  }> {
    try {
      const fileStore = this.getFileStore();
      
      const blob = await fileStore.get(filePath, { type: "arrayBuffer" });
      
      if (!blob) {
        return {
          file: "File not found.",
          contentType: "text/plain",
          status: 404,
        };
      }

      // Get metadata to determine content type
      const metadataResult = await fileStore.getMetadata(filePath);
      let contentType = "application/octet-stream";

      if (metadataResult?.metadata?.mimeType) {
        contentType = metadataResult.metadata.mimeType as string;
      } else {
        // Determine content type from file extension
        if (filePath.endsWith(".pdf")) {
          contentType = "application/pdf";
        } else if (filePath.endsWith(".png")) {
          contentType = "image/png";
        } else if (filePath.endsWith("_readability.json")) {
          contentType = "application/json";
        } else if (filePath.endsWith(".html")) {
          contentType = "text/html";
        } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
          contentType = "image/jpeg";
        }
      }

      return {
        file: Buffer.from(blob),
        contentType,
        status: 200,
      };
    } catch (error) {
      console.error("Error reading file:", error);
      return {
        file: "An internal error occurred, please contact the support team.",
        contentType: "text/plain",
        status: 500,
      };
    }
  }

  async removeFile({ filePath }: { filePath: string }): Promise<void> {
    try {
      const fileStore = this.getFileStore();
      await fileStore.delete(filePath);
    } catch (error) {
      console.error("Error removing file:", error);
      // Don't throw - match behavior of original implementation
    }
  }

  async moveFile(from: string, to: string): Promise<void> {
    try {
      const fileStore = this.getFileStore();
      
      // Get the file data and metadata
      const fileData = await fileStore.get(from, { type: "arrayBuffer" });
      const metadataResult = await fileStore.getMetadata(from);
      
      if (fileData) {
        // Set the file at the new location
        await fileStore.set(to, fileData, { 
          metadata: metadataResult?.metadata || {} 
        });
        
        // Delete the file from the old location
        await fileStore.delete(from);
      }
    } catch (error) {
      console.error("Error moving file:", error);
      // Don't throw - match behavior of original implementation
    }
  }

  createFolder({ filePath }: { filePath: string }): void {
    // Netlify Blobs doesn't require folder creation
    // This is a no-op to maintain API compatibility
  }

  async removeFolder({ filePath }: { filePath: string }): Promise<void> {
    try {
      const fileStore = this.getFileStore();
      
      // List all files with the prefix and delete them
      // Note: Netlify Blobs doesn't have a native "list" operation
      // This is a limitation - we would need to maintain an index
      // For now, this is a no-op
      console.warn("removeFolder is not fully implemented for Netlify Blobs");
    } catch (error) {
      console.error("Error removing folder:", error);
    }
  }
}

// Export a singleton instance
export const netlifyBlobsClient = new NetlifyBlobsStorageClient();

// Helper function to check if Netlify Blobs should be used
export const shouldUseNetlifyBlobs = (): boolean => {
  return USE_NETLIFY_BLOBS && !!NETLIFY_SITE_ID;
};

export default netlifyBlobsClient;
