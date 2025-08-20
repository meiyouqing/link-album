import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface UploadResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

const uploadHandler = async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { 
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const contentType = req.headers.get("content-type");
    let filePath: string;
    let fileData: ArrayBuffer;
    let metadata: Record<string, any> = {};

    if (contentType?.includes("multipart/form-data")) {
      // Handle multipart/form-data for file uploads
      const formData = await req.formData();
      const file = formData.get("file") as File;
      filePath = formData.get("filePath") as string;
      
      if (!file || !filePath) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing file or filePath" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      fileData = await file.arrayBuffer();
      metadata = {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "anonymous"
      };
    } else if (contentType?.includes("application/json")) {
      // Handle JSON payload with base64 data
      const body = await req.json();
      filePath = body.filePath;
      const isBase64 = body.isBase64 || false;
      
      if (!body.data || !filePath) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing data or filePath" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      if (isBase64) {
        // Convert base64 to ArrayBuffer
        const binaryString = atob(body.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileData = bytes.buffer;
      } else {
        // Assume it's already a Buffer/ArrayBuffer
        fileData = body.data;
      }

      metadata = {
        isBase64,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "anonymous",
        ...body.metadata
      };
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Unsupported content type" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Get the Netlify Blobs store
    const fileStore = getStore("link-album-files");
    
    // Store the file in Netlify Blobs
    await fileStore.set(filePath, fileData, { metadata });

    const response: UploadResponse = {
      success: true,
      filePath
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    const response: UploadResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export default uploadHandler;
