const { PrismaClient } = require("@prisma/client");
const Parser = require("rss-parser");

// Initialize Prisma client
let prisma;

function initPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

// Simplified capacity check function
async function hasPassedLimit(userId, newItemsCount) {
  // For now, return false (no limit reached)
  // In production, implement the actual capacity check logic
  return false;
}

// This function processes RSS feeds on a schedule
exports.handler = async (event, context) => {
  console.log('Starting RSS feed processing...');
  
  const startTime = Date.now();
  const maxExecutionTime = 9 * 60 * 1000; // 9 minutes to leave buffer

  try {
    const prismaClient = initPrisma();
    const rssSubscriptions = await prismaClient.rssSubscription.findMany({});
    const parser = new Parser();

    if (rssSubscriptions.length === 0) {
      console.log('No RSS subscriptions found');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'No RSS subscriptions to process',
          processed: 0 
        })
      };
    }

    console.log(`Found ${rssSubscriptions.length} RSS subscriptions to process`);

    let processedFeeds = 0;
    let newItemsTotal = 0;
    let errors = 0;

    for (const rssSubscription of rssSubscriptions) {
      // Check if we're approaching the execution time limit
      if (Date.now() - startTime > maxExecutionTime) {
        console.log('Approaching execution time limit, stopping RSS processing');
        break;
      }

      try {
        console.log(`Processing RSS feed: ${rssSubscription.name} (${rssSubscription.url})`);
        
        const feed = await parser.parseURL(rssSubscription.url);

        if (
          rssSubscription.lastBuildDate &&
          new Date(rssSubscription.lastBuildDate) < new Date(feed.lastBuildDate)
        ) {
          console.log(`Processing new RSS feed items for ${rssSubscription.name}`);

          const newItems = feed.items.filter((item) => {
            const itemPubDate = item.pubDate ? new Date(item.pubDate) : null;
            return itemPubDate && itemPubDate > rssSubscription.lastBuildDate;
          });

          if (newItems.length > 0) {
            const hasTooManyLinks = await hasPassedLimit(
              rssSubscription.ownerId,
              newItems.length
            );

            if (hasTooManyLinks) {
              console.log(`User ${rssSubscription.ownerId} has too many links. Skipping new RSS feed items.`);
              continue;
            }

            // Create new links from RSS items
            for (const item of newItems) {
              await prismaClient.link.create({
                data: {
                  name: item.title,
                  url: item.link,
                  type: "link",
                  createdBy: {
                    connect: {
                      id: rssSubscription.ownerId,
                    },
                  },
                  collection: {
                    connect: {
                      id: rssSubscription.collectionId,
                    },
                  },
                },
              });
            }

            newItemsTotal += newItems.length;
            console.log(`Added ${newItems.length} new items from ${rssSubscription.name}`);
          }

          // Update the lastBuildDate in the database
          await prismaClient.rssSubscription.update({
            where: { id: rssSubscription.id },
            data: { lastBuildDate: new Date(feed.lastBuildDate) },
          });
        } else {
          console.log(`No new items found for ${rssSubscription.name}`);
        }

        processedFeeds++;

      } catch (error) {
        console.error(`Error processing RSS feed ${rssSubscription.url}:`, error);
        errors++;
      }
    }

    const result = {
      processedFeeds,
      newItemsTotal,
      errors,
      totalFeeds: rssSubscriptions.length,
      executionTime: Date.now() - startTime
    };

    console.log('RSS processing completed:', result);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Error in RSS processing:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'RSS processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
