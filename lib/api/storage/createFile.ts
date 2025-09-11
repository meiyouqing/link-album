export default async function createFile({
  filePath,
  data,
  isBase64,
}: {
  filePath: string;
  data: Buffer | string;
  isBase64?: boolean;
}): Promise<boolean> {
  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8888' 
      : 'https://linkalbum.netlify.app';
    const response = await fetch(`${baseUrl}/api/blobs/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filePath,
        data: data instanceof Buffer ? Array.from(data) : data,
        isBase64,
        metadata: {
          uploadedAt: new Date().toISOString()
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
