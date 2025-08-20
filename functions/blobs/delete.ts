import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

interface DeleteResponse {
  success: boolean;
  error?: string;
}

const deleteHandler = async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== "DELETE") {
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
    
    // Delete the file from Netlify Blobs
    await fileStore.delete(filePath);

    const response: DeleteResponse = {
      success: true
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Delete error:", error);
    
    const response: DeleteResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export default deleteHandler;
