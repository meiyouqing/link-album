import { getStore } from '@netlify/blobs';

// Initialize Netlify Blobs store
const fileStore = getStore({
  name: 'link-album-files',
  // For development, provide explicit site ID and token from environment
  ...(process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN ? {
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN
  } : {})
});

export const handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'DELETE') {
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

    // Delete file from Netlify Blobs
    await fileStore.delete(filePath);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true, 
        message: 'File deleted successfully',
        filePath
      })
    };

  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't return error status for file not found - match original behavior
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true, 
        message: 'File deletion completed (may not have existed)',
        filePath: event.queryStringParameters?.filePath
      })
    };
  }
};
