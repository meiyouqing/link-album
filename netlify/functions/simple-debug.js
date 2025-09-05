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
    console.log('Environment variables available:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    console.log('NETLIFY_DATABASE_URL:', process.env.NETLIFY_DATABASE_URL ? 'SET' : 'NOT SET');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true,
        message: 'Simple debug function working!',
        hasDbUrl: !!process.env.DATABASE_URL,
        hasNetlifyDbUrl: !!process.env.NETLIFY_DATABASE_URL
      })
    };

  } catch (error) {
    console.error('Simple debug error:', error);
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
