import { getStore } from '@netlify/blobs';

// Initialize Netlify Blobs store
const fileStore = process.env.NODE_ENV === 'development' 
  ? getStore('link-album-files', {
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    })
  : getStore('link-album-files');

export const handler = async (event, context) => {
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
    const { fromPath, toPath } = JSON.parse(event.body);

    if (!fromPath || !toPath) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing fromPath or toPath' })
      };
    }

    // Get the file data and metadata from source
    const fileData = await fileStore.get(fromPath, { type: 'arrayBuffer' });
    
    if (!fileData) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Source file not found' })
      };
    }

    // Get metadata
    let metadata = {};
    try {
      const metadataResult = await fileStore.getMetadata(fromPath);
      if (metadataResult?.metadata) {
        metadata = metadataResult.metadata;
      }
    } catch (metadataError) {
      console.warn('Could not get metadata for source file:', fromPath);
    }

    // Update metadata with move information
    metadata.movedAt = new Date().toISOString();
    metadata.originalPath = fromPath;

    // Copy to new location
    await fileStore.set(toPath, fileData, { metadata });

    // Delete from old location
    await fileStore.delete(fromPath);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true, 
        message: 'File moved successfully',
        fromPath,
        toPath
      })
    };

  } catch (error) {
    console.error('Error moving file:', error);
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
