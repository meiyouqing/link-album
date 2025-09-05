import { PrismaClient } from '@prisma/client';
import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

const prisma = new PrismaClient();

const getArchiveHandler = async (req: Request, context: Context): Promise<Response> => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers
    });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const url = new URL(req.url);
    const linkId = url.searchParams.get('linkId');
    const type = url.searchParams.get('type');
    
    if (!linkId || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing linkId or type parameter' }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
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
                userId: true
              }
            }
          }
        }
      }
    });

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Link not found' }),
        {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
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
        return new Response(
          JSON.stringify({ error: 'Invalid type. Must be screenshot, pdf, or html' }),
          {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' }
          }
        );
    }

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: `${type} not available for this link` }),
        {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Retrieving file from Blobs: ${filePath}`);

    // Get the Netlify Blobs store (using same store name as process-link)
    const fileStore = getStore('link-album-files');
    
    // Get file from Netlify Blobs
    const fileData = await fileStore.get(filePath, { type: 'arrayBuffer' });
    
    if (!fileData) {
      return new Response(
        JSON.stringify({ error: 'Archive file not found in storage' }),
        {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get metadata to potentially override content type
    try {
      const metadataResult = await fileStore.getMetadata(filePath);
      if (metadataResult?.metadata?.mimeType) {
        contentType = metadataResult.metadata.mimeType as string;
      }
    } catch (metadataError) {
      console.warn('Could not get metadata for file:', filePath, metadataError);
    }

    // Return file with appropriate content type
    return new Response(fileData, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Disposition': `inline; filename="${linkId}-${type}"`
      }
    });

  } catch (error) {
    console.error('Error getting archive:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
};

export default getArchiveHandler;
