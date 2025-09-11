type ReturnContentTypes =
  | "text/plain"
  | "text/html"
  | "image/jpeg"
  | "image/png"
  | "application/pdf"
  | "application/json";

export default async function readFile(filePath: string) {
  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8888' 
      : '';
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
