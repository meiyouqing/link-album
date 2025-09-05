import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { linkId } = req.body;

    if (!linkId) {
      return res.status(400).json({ error: 'linkId is required' });
    }

    // Call the Netlify Function
    const functionUrl = process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXTAUTH_URL}/.netlify/functions/process-link`
      : 'http://localhost:8888/.netlify/functions/process-link';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ linkId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error triggering link processing:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
