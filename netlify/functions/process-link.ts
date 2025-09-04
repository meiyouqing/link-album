import { Handler } from "@netlify/functions";
import { prisma } from "../../lib/api/db";
import archiveHandler from "../../lib/api/archiveHandler";
import { Collection, Link, User } from "@prisma/client";

type LinksAndCollectionAndOwner = Link & {
  collection: Collection & {
    owner: User;
  };
};

export const handler: Handler = async (event, context) => {
  // Set timeout for this function (max 10 minutes for Pro plan)
  const timeout = setTimeout(() => {
    throw new Error('Function timeout after 10 minutes');
  }, 10 * 60 * 1000);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    let linkId: number;
    
    // Parse request body
    if (event.body) {
      const { linkId: providedLinkId } = JSON.parse(event.body);
      linkId = providedLinkId;
    } else {
      // If no specific link ID provided, process next pending link
      const pendingLink = await prisma.link.findFirst({
        where: {
          url: { not: null },
          OR: [
            { image: null },
            { pdf: null },
            { readable: null },
            { monolith: null },
          ],
        },
        orderBy: { id: "asc" },
        include: {
          collection: {
            include: {
              owner: true,
            },
          },
        },
      });

      if (!pendingLink) {
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ message: 'No pending links to process' })
        };
      }

      linkId = pendingLink.id;
    }

    // Fetch the link with all necessary relations
    const link = await prisma.link.findUnique({
      where: { id: linkId },
      include: {
        collection: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!link) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Link not found' })
      };
    }

    console.log(`Processing link ${link.url} for user ${link.collection.ownerId}`);

    // Process the link
    await archiveHandler(link as LinksAndCollectionAndOwner);

    console.log(`Successfully processed link ${link.url} for user ${link.collection.ownerId}`);

    clearTimeout(timeout);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: `Link ${linkId} processed successfully`,
        linkId: linkId 
      })
    };

  } catch (error) {
    clearTimeout(timeout);
    
    console.error('Error processing link:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
