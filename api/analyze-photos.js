// api/analyze-photos.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const { image_urls, user_id } = req.body;

    if (!image_urls || image_urls.length === 0) {
      return res.status(400).json({ error: 'No images provided.' });
    }

    const prompt = `You are an AI trained in vintage and resale item valuation.

Based ONLY on the attached images, please return all of the following:
1. A short and catchy product title
2. A 2–3 sentence product description
3. A general category (Furniture, Electronics, Decor, Apparel, etc.)
4. A condition rating (New, Like New, Good, Fair, Poor)
5. A recommended resale price range in USD

Respond with exactly this format:

Title: ...
Description: ...
Category: ...
Condition: ...
Price: ...
`

The user uploaded ${image_urls.length} images. Use all available visual context.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...image_urls.map(url => ({
                type: 'image_url',
                image_url: { url }
              }))
            ]
          }
        ],
        max_tokens: 500
      })
    });

    const json = await openaiResponse.json();
    const text = json.choices?.[0]?.message?.content || '';

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const data = {
      title: lines[0]?.replace(/^1\\./, '').trim(),
      description: lines[1]?.replace(/^2\\./, '').trim(),
      category: lines[2]?.replace(/^3\\./, '').trim(),
      condition: lines[3]?.replace(/^4\\./, '').trim(),
      price: lines[4]?.replace(/^5\\./, '').trim()
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to analyze images.' });
  }
}
