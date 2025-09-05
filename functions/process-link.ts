import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright';
import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

interface ProcessResult {
  success: boolean;
  screenshotPath?: string;
  pdfPath?: string;
  htmlPath?: string;
  error?: string;
  linkId?: number;
}

const prisma = new PrismaClient();

async function processLinkArchive(link: any): Promise<ProcessResult> {
  console.log(`Starting archive process for link ${link.id}: ${link.url}`);
  
  let browser;
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Go to the URL
    console.log(`Navigating to: ${link.url}`);
    await page.goto(link.url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(2000);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const linkId = link.id;
    
    // Create file paths for Netlify Blobs
    const screenshotPath = `screenshots/${linkId}/${timestamp}.png`;
    const pdfPath = `pdfs/${linkId}/${timestamp}.pdf`;
    const htmlPath = `html/${linkId}/${timestamp}.html`;
    
    console.log('Taking screenshot...');
    // Take screenshot
    const screenshotBuffer = await page.screenshot({ 
      fullPage: true,
      type: 'png'
    });
    
    console.log('Generating PDF...');
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
    });
    
    console.log('Extracting HTML content...');
    // Get HTML content
    const htmlContent = await page.content();
    
    await browser.close();
    browser = null;
    
    console.log('Uploading files to Netlify Blobs...');
    
    // Get the Netlify Blobs store (using same store name as in /functions)
    const fileStore = getStore('link-album-files');
    
    // Upload files to Netlify Blobs (casting to any for compatibility)
    await Promise.all([
      fileStore.set(screenshotPath, screenshotBuffer as any, {
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
      fileStore.set(pdfPath, pdfBuffer as any, {
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
      htmlPath,
      linkId
    };
    
  } catch (error) {
    console.error(`Archive process failed for link ${link.id}:`, error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    throw error;
  }
}

const processLinkHandler = async (req: Request, context: Context): Promise<Response> => {
  // Set timeout for this function
  const timeout = setTimeout(() => {
    throw new Error('Function timeout after 10 minutes');
  }, 10 * 60 * 1000);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('', {
        status: 200,
        headers: corsHeaders
      });
    }

    // Only allow POST and GET requests
    if (!['POST', 'GET'].includes(req.method)) {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const url = new URL(req.url);
    let linkId: number | undefined;
    let force = false;
    
    // Check for query parameters
    if (url.searchParams.has('linkId')) {
      linkId = parseInt(url.searchParams.get('linkId')!);
      force = url.searchParams.get('force') === 'true';
      console.log(`Processing via query params - linkId: ${linkId}, force: ${force}`);
    }
    // Parse request body for POST requests
    else if (req.method === 'POST' && req.body) {
      try {
        const body = await req.json();
        linkId = body.linkId;
        force = body.force || false;
      } catch (e) {
        // Body might be empty or invalid
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
        return new Response(
          JSON.stringify({ message: 'No pending links to process' }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
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
      return new Response(
        JSON.stringify({ error: 'Link not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if link already has archives and force is not enabled
    if (!force && (link.image || link.pdf || link.readable)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Link ${linkId} already processed (use force=true to reprocess)`,
          linkId: linkId,
          hasImage: !!link.image,
          hasPdf: !!link.pdf,
          hasReadable: !!link.readable
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing link ${link.url} for user ${link.collection.ownerId}`);

    // Process the link
    const result = await processLinkArchive(link);

    console.log(`Successfully processed link ${link.url} for user ${link.collection.ownerId}`);

    clearTimeout(timeout);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Link ${linkId} processed successfully`,
        linkId: linkId,
        result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    clearTimeout(timeout);
    
    console.error('Error processing link:', error);

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

export default processLinkHandler;
