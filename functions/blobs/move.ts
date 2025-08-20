import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface MoveResponse {
  success: boolean;
  error?: string;
}

const moveHandler = async (req: Request, context: Context): Promise<Response> => {
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
    const body = await req.json();
    const { fromPath, toPath } = body;

    if (!fromPath || !toPath) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing fromPath or toPath" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Get the Netlify Blobs store
    const fileStore = getStore("link-album-files");
    
    // Get the file data and metadata
    const fileData = await fileStore.get(fromPath, { type: "arrayBuffer" });
    const metadataResult = await fileStore.getMetadata(fromPath);
    
    if (!fileData) {
      return new Response(
        JSON.stringify({ success: false, error: "Source file not found" }),
        { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Set the file at the new location
    await fileStore.set(toPath, fileData, { 
      metadata: metadataResult?.metadata || {} 
    });
    
    // Delete the file from the old location
    await fileStore.delete(fromPath);

    const response: MoveResponse = {
      success: true
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Move error:", error);
    
    const response: MoveResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export default moveHandler;
