type ReturnContentTypes =
  | "text/plain"
  | "text/html"
  | "image/jpeg"
  | "image/png"
  | "application/pdf"
  | "application/json";

// Helper function to directly call blob operations when in Netlify Function environment
async function readFileFromBlob(filePath: string) {
  try {
    // Dynamic import for ES modules
    const { getStore } = await import('@netlify/blobs');
    const fileStore = getStore({
      name: 'link-album-files',
      // For development, provide explicit site ID and token from environment
      ...(process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN ? {
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_BLOBS_TOKEN
      } : {})
    });

    // Get file from Netlify Blobs
    const fileData = await fileStore.get(filePath, { type: 'arrayBuffer' });
    
    if (!fileData) {
      return {
        file: "File not found.",
        contentType: "text/plain" as ReturnContentTypes,
        status: 404,
      };
    }

    // Get metadata to determine content type
    let contentType = 'application/octet-stream';
    try {
      const metadataResult = await fileStore.getMetadata(filePath);
      const mimeType = (metadataResult?.metadata as any)?.mimeType;
      if (mimeType && typeof mimeType === 'string') {
        contentType = mimeType;
      }
    } catch (metadataError) {
      console.log('Could not get metadata for content type, using file extension');
      
      // Fallback to file extension
      if (filePath.endsWith('.pdf')) contentType = 'application/pdf';
      else if (filePath.endsWith('.png')) contentType = 'image/png';
      else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (filePath.endsWith('.html')) contentType = 'text/html';
      else if (filePath.endsWith('.json')) contentType = 'application/json';
      else if (filePath.endsWith('.txt')) contentType = 'text/plain';
    }
    
    return {
      file: Buffer.from(fileData),
      contentType: contentType as ReturnContentTypes,
      status: 200,
    };
  } catch (error) {
    console.error('Error reading from blob directly:', error);
    return {
      file: "An internal error occurred, please contact the support team.",
      contentType: "text/plain" as ReturnContentTypes,
      status: 500,
    };
  }
}

export default async function readFile(filePath: string) {
  // Use direct blob access when running in Netlify Functions environment
  const isNetlifyFunction = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY === 'true';
  
  if (isNetlifyFunction) {
    return await readFileFromBlob(filePath);
  }

  // Fallback to HTTP request for other environments
  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8888' 
      : 'https://linkalbum.netlify.app';
    const response = await fetch(`${baseUrl}/api/blobs/read?filePath=${encodeURIComponent(filePath)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          file: "File not found.",
          contentType: "text/plain" as ReturnContentTypes,
          status: 404,
        };
      }
      return {
        file: "An internal error occurred, please contact the support team.",
        contentType: "text/plain" as ReturnContentTypes,
        status: 500,
      };
    }

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    
    return {
      file: Buffer.from(buffer),
      contentType: contentType as ReturnContentTypes,
      status: 200,
    };
  } catch (error) {
    console.error('Error calling blob read function:', error);
    return {
      file: "An internal error occurred, please contact the support team.",
      contentType: "text/plain" as ReturnContentTypes,
      status: 500,
    };
  }
}
