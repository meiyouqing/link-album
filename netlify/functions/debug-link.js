exports.handler = async (event, context) => {
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

    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('Context:', JSON.stringify(context, null, 2));

    // Test Prisma import
    const { PrismaClient } = require("@prisma/client");
    console.log('Prisma import successful');

    // Configure Prisma with all required options for Netlify Functions
    const prisma = new PrismaClient();
    console.log('Prisma client created with config');

    // Test simple query
    const linkCount = await prisma.link.count();
    console.log('Link count:', linkCount);

    // Disconnect after use
    await prisma.$disconnect();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        linkCount,
        message: 'Debug function working with Prisma!'
      })
    };

  } catch (error) {
    console.error('Debug error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      })
    };
  }
};
