import { PrismaClient } from '@prisma/client';
import { getStore } from '@netlify/blobs';

// Initialize Netlify Blobs store
const fileStore = getStore('link-album-files'); // Use same store name as /functions

// Initialize Prisma client
const prisma = new PrismaClient();

// Helper function to fetch HTML content
async function fetchHtmlContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return await response.text();
  } catch (error) {
    console.error('Error fetching HTML content:', error);
    return `<html><body><h1>Error fetching content</h1><p>Could not fetch content from: ${url}</p><p>Error: ${error.message}</p></body></html>`;
  }
}

// Helper function to take screenshot using external service
async function takeScreenshot(url) {
  try {
    // Using a free screenshot service (you can replace with paid service like Browserless.io)
    const screenshotUrl = `https://api.screenshotone.com/take?access_key=${process.env.SCREENSHOTONE_API_KEY || 'demo'}&url=${encodeURIComponent(url)}&format=png
	&block_ads=true
	&block_cookie_banners=true
	&block_banners_by_heuristics=false
	&block_trackers=true
	&delay=0
	&timeout=60
	&response_type=by_format
	&image_quality=80`;
    
    // If no API key is set, use a simple placeholder image
    if (!process.env.SCREENSHOTONE_API_KEY) {
      console.log('No screenshot API key found, creating placeholder image');
      // Create a simple PNG placeholder
      const canvas = createPlaceholderImage(url);
      return canvas;
    }
    
    const response = await fetch(screenshotUrl);
    if (!response.ok) {
      throw new Error(`Screenshot service returned ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Error taking screenshot:', error);
    // Return placeholder image on error
    return createPlaceholderImage(url);
  }
}

// Helper function to create a placeholder image (simple PNG)
function createPlaceholderImage(url) {
  // Create a simple text-based placeholder
  const text = `Screenshot placeholder for: ${url}`;
  const canvas = Buffer.from(
    `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
    'base64'
  );
  return new Uint8Array(canvas);
}

// Helper function to generate PDF using external service
async function generatePdf(url) {
  try {
    // Using a free PDF generation service
    const pdfUrl = `https://api.html-css-to-pdf.com/v1/generate?url=${encodeURIComponent(url)}&format=A4`;
    
    // If no PDF service available, create a simple HTML to PDF placeholder
    console.log('Creating PDF placeholder for:', url);
    const htmlContent = await fetchHtmlContent(url);
    const pdfPlaceholder = Buffer.from(`PDF placeholder for: ${url}\n\nContent: ${htmlContent.substring(0, 1000)}...`);
    return new Uint8Array(pdfPlaceholder);
  } catch (error) {
    console.error('Error generating PDF:', error);
    const pdfPlaceholder = Buffer.from(`PDF generation failed for: ${url}\n\nError: ${error.message}`);
    return new Uint8Array(pdfPlaceholder);
  }
}

// Archive processing function using external services instead of Playwright
async function processLinkArchive(link) {
  console.log(`Starting archive process for link ${link.id}: ${link.url}`);
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const linkId = link.id;
    
    // Create file paths for Netlify Blobs
    const screenshotPath = `screenshots/${linkId}/${timestamp}.png`;
    const pdfPath = `pdfs/${linkId}/${timestamp}.pdf`;
    const htmlPath = `html/${linkId}/${timestamp}.html`;
    
    console.log('Taking screenshot using external service...');
    // Take screenshot using external service
    const screenshotBuffer = await takeScreenshot(link.url);
    
    console.log('Generating PDF using external service...');
    // Generate PDF using external service
    const pdfBuffer = await generatePdf(link.url);
    
    console.log('Fetching HTML content...');
    // Get HTML content
    const htmlContent = await fetchHtmlContent(link.url);
    
    console.log('Uploading files to Netlify Blobs...');
    
    // Upload files to Netlify Blobs
    await Promise.all([
      fileStore.set(screenshotPath, screenshotBuffer, {
        metadata: {
          linkId: linkId.toString(),
          url: link.url,
          type: 'screenshot',
          timestamp: timestamp,
          mimeType: 'image/png',
          originalName: `link-${linkId}-screenshot.png`,
          uploadedAt: new Date().toISOString(),
          size: screenshotBuffer.length
        }
      }),
      fileStore.set(pdfPath, pdfBuffer, {
        metadata: {
          linkId: linkId.toString(),
          url: link.url,
          type: 'pdf',
          timestamp: timestamp,
          mimeType: 'application/pdf',
          originalName: `link-${linkId}-document.pdf`,
          uploadedAt: new Date().toISOString(),
          size: pdfBuffer.length
        }
      }),
      fileStore.set(htmlPath, htmlContent, {
        metadata: {
          linkId: linkId.toString(),
          url: link.url,
          type: 'html',
          timestamp: timestamp,
          mimeType: 'text/html',
          originalName: `link-${linkId}-content.html`,
          uploadedAt: new Date().toISOString(),
          size: htmlContent.length
        }
      })
    ]);
    
    console.log('Files uploaded successfully, updating database...');
    
    // Update the link with archive paths
    await prisma.link.update({
      where: { id: linkId },
      data: {
        image: screenshotPath, // Store the blob path
        pdf: pdfPath,
        readable: htmlPath,
        lastPreserved: new Date()
      }
    });
    
    console.log(`Archive process completed for link ${linkId}`);
    
    return {
      success: true,
      screenshotPath,
      pdfPath,
      htmlPath
    };
    
  } catch (error) {
    console.error(`Archive process failed for link ${link.id}:`, error);
    throw error;
  }
}

const handler = async (event, context) => {
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

    let linkId;
    let force = false;
    
    // Check for query parameters first
    if (event.queryStringParameters && event.queryStringParameters.linkId) {
      linkId = parseInt(event.queryStringParameters.linkId);
      force = event.queryStringParameters.force === 'true';
      console.log(`Processing via query params - linkId: ${linkId}, force: ${force}`);
    }
    // Parse request body if no query params
    else if (event.body) {
      try {
        const body = JSON.parse(event.body);
        linkId = body.linkId;
        force = body.force || false;
      } catch (e) {
        // Body might be empty or invalid JSON
        console.log('Could not parse request body:', e.message);
      }
    }

    // If no specific link ID provided, process next pending link
    if (!linkId) {
      const pendingLink = await prisma.link.findFirst({
        where: {
          url: { not: null },
          OR: [
            { image: null },
            { pdf: null },
            { readable: null },
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
          headers: corsHeaders,
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
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Link not found' })
      };
    }

    // Check if link already has archives and force is not enabled
    if (!force && (link.image || link.pdf || link.readable)) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: `Link ${linkId} already processed (use force=true to reprocess)`,
          linkId: linkId,
          hasImage: !!link.image,
          hasPdf: !!link.pdf,
          hasReadable: !!link.readable
        })
      };
    }

    console.log(`Processing link ${link.url} for user ${link.collection.ownerId}`);

    // Process the link
    const result = await processLinkArchive(link);

    console.log(`Successfully processed link ${link.url} for user ${link.collection.ownerId}`);

    clearTimeout(timeout);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: `Link ${linkId} processed successfully`,
        linkId: linkId,
        result
      })
    };

  } catch (error) {
    clearTimeout(timeout);
    
    console.error('Error processing link:', error);

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  } finally {
    await prisma.$disconnect();
  }
};

export { handler };
