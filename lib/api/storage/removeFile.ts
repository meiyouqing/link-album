export default async function removeFile({ filePath }: { filePath: string }) {
  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8888' 
      : 'https://linkalbum.netlify.app';
    await fetch(`${baseUrl}/api/blobs/delete?filePath=${encodeURIComponent(filePath)}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error calling blob delete function:', error);
    // Don't throw - match original behavior
  }
}
