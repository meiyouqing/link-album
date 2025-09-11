export default async function moveFile(from: string, to: string) {
  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8888' 
      : '';
    await fetch(`${baseUrl}/api/blobs/move`, {
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
