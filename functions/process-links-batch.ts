import { PrismaClient } from '@prisma/client';
import type { Context } from '@netlify/functions';

const prisma = new PrismaClient();

const processLinksBatchHandler = async (req: Request, context: Context): Promise<Response> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    console.log('Processing batch links...');

    // Find all pending links
    const pendingLinks = await prisma.link.findMany({
      where: {
        url: { not: null },
        OR: [
          { image: null },
          { pdf: null },
          { readable: null },
        ],
      },
      take: 10, // Process max 10 at a time to avoid timeouts
      orderBy: { id: 'asc' },
      include: {
        collection: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (pendingLinks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending links to process', processed: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${pendingLinks.length} pending links`);

    const results = [];
    for (const link of pendingLinks) {
      try {
        console.log(`Triggering processing for link ${link.id}: ${link.url}`);
        
        // Call the process-link function for each link
        const processResponse = await fetch(`${process.env.URL || 'http://localhost:8888'}/.netlify/functions/process-link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            linkId: link.id,
            force: false
          })
        });

        const result = await processResponse.json();
        results.push({
          linkId: link.id,
          url: link.url,
          success: processResponse.ok,
          result
        });

        console.log(`Processing result for link ${link.id}:`, result);

      } catch (error) {
        console.error(`Error processing link ${link.id}:`, error);
        results.push({
          linkId: link.id,
          url: link.url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch processing completed. ${successCount}/${results.length} links processed successfully.`,
        processed: results.length,
        successful: successCount,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in batch processing:', error);

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
};

export default processLinksBatchHandler;
