const { PrismaClient } = require('@prisma/client');

// Use dynamic import for @netlify/blobs since it's an ES module
let getStore;

async function initBlobs() {
  if (!getStore) {
    const { getStore: importedGetStore } = await import('@netlify/blobs');
    getStore = importedGetStore;
  }
  // When running in Netlify Functions, siteID and token are auto-populated
  return getStore({
    name: 'link-album-files'
  });
}

const prisma = new PrismaClient();

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { linkId, type } = event.queryStringParameters;
    
    if (!linkId || !type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing linkId or type parameter' })
      };
    }

    console.log(`Getting ${type} archive for link ${linkId}`);

    // Get the link from database to verify access and get file path
    const link = await prisma.link.findUnique({
      where: { id: parseInt(linkId) },
      select: {
        id: true,
        image: true,
        pdf: true,
        readable: true,
        collection: {
          select: {
            id: true,
            isPublic: true,
            members: {
              select: {
                userId: true,
                canUpdate: true,
                canCreate: true,
                canDelete: true
              }
            }
          }
        }
      }
    });

    if (!link) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Link not found' })
      };
    }

    // Get file path based on type
    let filePath;
    let contentType;
    
    switch (type) {
      case 'screenshot':
        filePath = link.image;
        contentType = 'image/png';
        break;
      case 'pdf':
        filePath = link.pdf;
        contentType = 'application/pdf';
        break;
      case 'html':
        filePath = link.readable;
        contentType = 'text/html';
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid type. Must be screenshot, pdf, or html' })
        };
    }

    if (!filePath) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `${type} not available for this link` })
      };
    }

    console.log(`Retrieving file from Blobs: ${filePath}`);

    // Get the Netlify Blobs store
    const fileStore = await initBlobs();
    
    // Get file from Netlify Blobs
    const fileData = await fileStore.get(filePath, { type: 'arrayBuffer' });
    
    if (!fileData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Archive file not found in storage' })
      };
    }

    // Get metadata to potentially override content type
    try {
      const metadataResult = await fileStore.getMetadata(filePath);
      if (metadataResult?.metadata?.mimeType) {
        contentType = metadataResult.metadata.mimeType;
      }
    } catch (metadataError) {
      console.warn('Could not get metadata for file:', filePath, metadataError);
      // Determine content type from file extension as fallback
      if (filePath.includes('.pdf')) {
        contentType = 'application/pdf';
      } else if (filePath.includes('.png')) {
        contentType = 'image/png';
      } else if (filePath.includes('.html')) {
        contentType = 'text/html';
      }
    }

    // Return file with appropriate content type
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Disposition': `inline; filename="${linkId}-${type}"`
      },
      body: Buffer.from(fileData).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error getting archive:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  } finally {
    await prisma.$disconnect();
  }
};
