// API helper for processing links via Netlify Functions
export const processLink = async (linkId?: number) => {
  try {
    // 修正：使用Netlify Functions路径
    const response = await fetch('/.netlify/functions/process-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ linkId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error processing link:', error);
    throw error;
  }
};

export const processBatch = async () => {
  try {
    // 修正：使用Netlify Functions路径
    const response = await fetch('/.netlify/functions/process-links-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error processing batch:', error);
    throw error;
  }
};

export const processRSS = async () => {
  try {
    // 修正：使用Netlify Functions路径
    const response = await fetch('/.netlify/functions/process-rss', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error processing RSS:', error);
    throw error;
  }
};
