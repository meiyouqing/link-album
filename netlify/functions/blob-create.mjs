import { getStore, connectLambda } from '@netlify/blobs';

export const handler = async (event, context) => {
  // Initialize Lambda compatibility mode
  connectLambda(event);
  
  // Get store after connecting Lambda
  const fileStore = getStore('link-album-files');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { filePath, data, isBase64, metadata = {} } = JSON.parse(event.body);

    if (!filePath || !data) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing filePath or data' })
      };
    }

    let fileData;
    const enhancedMetadata = {
      ...metadata,
      uploadedAt: new Date().toISOString(),
      isBase64: isBase64 || false,
    };

    // Convert data to appropriate format
    if (isBase64 && typeof data === 'string') {
      fileData = Buffer.from(data, 'base64');
      enhancedMetadata.size = fileData.length;
    } else if (typeof data === 'string') {
      fileData = Buffer.from(data, 'utf-8');
      enhancedMetadata.size = fileData.length;
    } else {
      // Assume it's already a buffer-like object
      fileData = Buffer.from(data);
      enhancedMetadata.size = fileData.length;
    }

    // Determine content type from file extension
    let mimeType = 'application/octet-stream';
    if (filePath.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (filePath.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (filePath.endsWith('.html')) {
      mimeType = 'text/html';
    } else if (filePath.endsWith('_readability.json')) {
      mimeType = 'application/json';
    }

    enhancedMetadata.mimeType = mimeType;

    // Store the file
    await fileStore.set(filePath, fileData, { metadata: enhancedMetadata });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true, 
        message: 'File created successfully',
        filePath,
        size: enhancedMetadata.size
      })
    };

  } catch (error) {
    console.error('Error creating file:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
