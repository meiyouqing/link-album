/**
 * Direct blob operations using Netlify Functions
 * This replaces the old storage functions with direct HTTP calls to Netlify Functions
 */

type BlobOperationResult = {
  success: boolean;
  data?: any;
  error?: string;
};

type ReadFileResult = {
  file: Buffer | string;
  contentType: string;
  status: number;
};

// Helper to get the correct base URL for blob operations
function getBlobBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  } else {
    // Server-side: use environment-specific URL
    return process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8888' 
      : 'https://linkalbum.netlify.app';
  }
}

/**
 * Create a file using Netlify Functions
 */
export async function createFile({
  filePath,
  data,
  isBase64,
  metadata = {}
}: {
  filePath: string;
  data: Buffer | string;
  isBase64?: boolean;
  metadata?: any;
}): Promise<boolean> {
  try {
    const baseUrl = getBlobBaseUrl();
    const response = await fetch(`${baseUrl}/.netlify/functions/blob-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePath,
        data: data instanceof Buffer ? Array.from(data) : data,
        isBase64,
        metadata: {
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error creating file via Netlify Function:', result);
      return false;
    }
    
    return result.success;
  } catch (error) {
    console.error('Error calling blob create function:', error);
    return false;
  }
}

/**
 * Read a file using Netlify Functions
 */
export async function readFile(filePath: string): Promise<ReadFileResult> {
  try {
    const baseUrl = getBlobBaseUrl();
    const response = await fetch(`${baseUrl}/.netlify/functions/blob-read?filePath=${encodeURIComponent(filePath)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          file: "File not found.",
          contentType: "text/plain",
          status: 404,
        };
      }
      return {
        file: "An internal error occurred, please contact the support team.",
        contentType: "text/plain",
        status: 500,
      };
    }

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    
    return {
      file: Buffer.from(buffer),
      contentType,
      status: 200,
    };
  } catch (error) {
    console.error('Error calling blob read function:', error);
    return {
      file: "An internal error occurred, please contact the support team.",
      contentType: "text/plain",
      status: 500,
    };
  }
}

/**
 * Remove a file using Netlify Functions
 */
export async function removeFile({ filePath }: { filePath: string }): Promise<void> {
  try {
    const baseUrl = getBlobBaseUrl();
    await fetch(`${baseUrl}/.netlify/functions/blob-delete?filePath=${encodeURIComponent(filePath)}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error calling blob delete function:', error);
    // Don't throw - match original behavior
  }
}

/**
 * Move a file using Netlify Functions
 */
export async function moveFile(from: string, to: string): Promise<void> {
  try {
    const baseUrl = getBlobBaseUrl();
    await fetch(`${baseUrl}/.netlify/functions/blob-move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromPath: from,
        toPath: to
      })
    });
  } catch (error) {
    console.error('Error calling blob move function:', error);
    // Don't throw - match original behavior
  }
}

/**
 * Create a folder (no-op for Netlify Blobs)
 */
export function createFolder({ filePath }: { filePath: string }): void {
  // Netlify Blobs doesn't require folder creation - this is a no-op
  return;
}

/**
 * Remove a folder (no-op for Netlify Blobs)
 */
export async function removeFolder({ filePath }: { filePath: string }): Promise<void> {
  // For Netlify Blobs, we would need to list and delete files with the folder prefix
  // This is complex and not currently implemented in our blob functions
  // For now, this is a no-op to maintain API compatibility
  console.log(`removeFolder called for ${filePath} but not implemented for Netlify Blobs`);
  return;
}
