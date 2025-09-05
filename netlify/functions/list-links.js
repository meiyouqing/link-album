const { PrismaClient } = require("@prisma/client");

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

    const prisma = new PrismaClient();

    // Get first few links to see what's available
    const links = await prisma.link.findMany({
      take: 5,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        url: true,
        name: true,
        collectionId: true
      }
    });

    await prisma.$disconnect();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        links,
        message: 'Available links in database'
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message
      })
    };
  }
};
