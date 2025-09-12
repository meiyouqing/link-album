/**
 * Client-side blob operations that call Netlify Functions directly
 * This eliminates the Node.js backend layer entirely for blob operations
 */

type BlobOperationResult = {
  success: boolean;
  data?: any;
  error?: string;
};

// Base URL for Netlify Functions (client-side only)
const NETLIFY_FUNCTIONS_BASE = '/.netlify/functions';

/**
 * Upload a file directly from the frontend to Netlify Blobs
 * This bypasses the Next.js API entirely
 */
export async function uploadFile({
  filePath,
  data,
  isBase64 = false,
  metadata = {}
}: {
  filePath: string;
  data: File | Blob | string | ArrayBuffer;
  isBase64?: boolean;
  metadata?: any;
}): Promise<BlobOperationResult> {
  try {
    let body: string;
    
    if (data instanceof File || data instanceof Blob) {
      // Convert File/Blob to base64
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      body = JSON.stringify({
        filePath,
        data: buffer.toString('base64'),
        isBase64: true,
        metadata
      });
    } else {
      body = JSON.stringify({
        filePath,
        data: data,
        isBase64,
        metadata
      });
    }

    const response = await fetch(`${NETLIFY_FUNCTIONS_BASE}/blob-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });

    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      error: response.ok ? undefined : result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Download a file directly from Netlify Blobs to the frontend
 */
export async function downloadFile(filePath: string): Promise<{
  success: boolean;
  data?: Blob;
  error?: string;
}> {
  try {
    const response = await fetch(`${NETLIFY_FUNCTIONS_BASE}/blob-read?filePath=${encodeURIComponent(filePath)}`);
    
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const blob = await response.blob();
    return { success: true, data: blob };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    };
  }
}

/**
 * Delete a file directly from the frontend
 */
export async function deleteFile(filePath: string): Promise<BlobOperationResult> {
  try {
    const response = await fetch(`${NETLIFY_FUNCTIONS_BASE}/blob-delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filePath })
    });

    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      error: response.ok ? undefined : result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    };
  }
}

/**
 * Move/rename a file directly from the frontend
 */
export async function moveFile(fromPath: string, toPath: string): Promise<BlobOperationResult> {
  try {
    const response = await fetch(`${NETLIFY_FUNCTIONS_BASE}/blob-move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fromPath, toPath })
    });

    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      error: response.ok ? undefined : result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Move failed'
    };
  }
}

/**
 * Example usage in a React component:
 * 
 * const handleFileUpload = async (file: File) => {
 *   const result = await uploadFile({
 *     filePath: `uploads/${file.name}`,
 *     data: file
 *   });
 *   
 *   if (result.success) {
 *     console.log('File uploaded successfully!');
 *   } else {
 *     console.error('Upload failed:', result.error);
 *   }
 * };
 */
