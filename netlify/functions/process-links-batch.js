const { prisma } = require("../../lib/api/db");
const archiveHandler = require("../../lib/api/archiveHandler").default;

// This function runs on a schedule to process pending links
exports.handler = async (event, context) => {
  console.log('Starting scheduled link processing...');
  
  const archiveTakeCount = Number(process.env.ARCHIVE_TAKE_COUNT || "") || 5;
  const startTime = Date.now();
  const maxExecutionTime = 9 * 60 * 1000; // 9 minutes to leave buffer for cleanup

  try {
    // Find pending links that need processing
    const pendingLinks = await prisma.link.findMany({
      where: {
        url: { not: null },
        OR: [
          { image: null },
          { pdf: null },
          { readable: null },
          { monolith: null },
        ],
      },
      take: archiveTakeCount,
      orderBy: { id: "asc" },
      include: {
        collection: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (pendingLinks.length === 0) {
      console.log('No pending links found to process');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No pending links to process',
          processed: 0 
        })
      };
    }

    console.log(`Found ${pendingLinks.length} pending links to process`);

    let processed = 0;
    let errors = 0;

    for (const link of pendingLinks) {
      // Check if we're approaching the execution time limit
      if (Date.now() - startTime > maxExecutionTime) {
        console.log('Approaching execution time limit, stopping processing');
        break;
      }

      try {
        console.log(`Processing link ${link.url} for user ${link.collection.ownerId}`);
        
        await archiveHandler(link);
        
        console.log(`Successfully processed link ${link.url}`);
        processed++;
        
      } catch (error) {
        console.error(`Error processing link ${link.url}:`, error);
        errors++;
      }
    }

    const result = {
      processed,
      errors,
      totalFound: pendingLinks.length,
      executionTime: Date.now() - startTime
    };

    console.log('Batch processing completed:', result);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error in scheduled processing:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Batch processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
