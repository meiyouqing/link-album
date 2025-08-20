import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface ReadResponse {
  success: boolean;
  file?: ArrayBuffer;
  contentType?: string;
  error?: string;
  status?: number;
}

const readHandler = async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { 
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get("filePath");

    if (!filePath) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing filePath parameter" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Get the Netlify Blobs store
    const fileStore = getStore("link-album-files");
    
    // Get the file from Netlify Blobs
    const blob = await fileStore.get(filePath, { type: "arrayBuffer" });
    
    if (!blob) {
      return new Response("File not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" }
      });
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

    return new Response(blob, {
      status: 200,
      headers: { "Content-Type": contentType }
    });

  } catch (error) {
    console.error("Read error:", error);
    
    return new Response("Internal server error", {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
};

export default readHandler;
