import { getStore } from '@netlify/blobs';

// Initialize Netlify Blobs store
const fileStore = getStore({
  name: 'link-album-files',
  // Only provide siteID and token in development/local environment
  // In production, Netlify automatically provides these values
  ...(process.env.NODE_ENV === 'development' && process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN ? {
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN
  } : {})
});

export const handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { filePath } = event.queryStringParameters || {};

    if (!filePath) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing filePath parameter' })
      };
    }

    // Get file from Netlify Blobs
    const fileData = await fileStore.get(filePath, { type: 'arrayBuffer' });
    
    if (!fileData) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'File not found' })
      };
    }

    // Get metadata to determine content type
    let contentType = 'application/octet-stream';
    try {
      const metadataResult = await fileStore.getMetadata(filePath);
      if (metadataResult?.metadata?.mimeType) {
        contentType = metadataResult.metadata.mimeType;
      } else {
        // Fallback to file extension
        if (filePath.endsWith('.pdf')) {
          contentType = 'application/pdf';
        } else if (filePath.endsWith('.png')) {
          contentType = 'image/png';
        } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
          contentType = 'image/jpeg';
        } else if (filePath.endsWith('.html')) {
          contentType = 'text/html';
        } else if (filePath.endsWith('_readability.json')) {
          contentType = 'application/json';
        }
      }
    } catch (metadataError) {
      console.warn('Could not get metadata for file:', filePath, metadataError);
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
      },
      body: Buffer.from(fileData).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error reading file:', error);
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
