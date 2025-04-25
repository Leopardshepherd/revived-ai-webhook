export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const { image_urls, user_id } = req.body;

    if (!image_urls || image_urls.length === 0) {
      return res.status(400).json({ error: 'No images provided.' });
    }

    const prompt = `
You are an AI trained to appraise secondhand items for resale.

You are given a few product images. Based ONLY on the images, generate this listing info:

Title: (1 short product name)
Description: (2–3 sentence item description)
Category: (Furniture, Decor, Apparel, Electronics, etc.)
Condition: (New, Like New, Good, Fair, Poor)
Price: (a suggested price range in USD)

Always make your best guess. Even if uncertain, return a complete response. Never leave anything blank. Do NOT explain your thinking. Only return data in this format:

Title: ...
Description: ...
Category: ...
Condition: ...
Price: ...
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const result = await response.json();

    const rawText = result?.choices?.[0]?.message?.content || '';
    console.log("GPT-4 RAW OUTPUT:\n", rawText);

    const parseLine = (label) => {
      const match = rawText.match(new RegExp(`${label}:\\s*(.*)`, 'i'));
      return match ? match[1].trim() : '';
    };

    const data = {
      title: parseLine('Title'),
      description: parseLine('Description'),
      category: parseLine('Category'),
      condition: parseLine('Condition'),
      price: parseLine('Price')
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('AI error:', err);
    return res.status(500).json({ error: 'AI failed to return usable data.' });
  }
}
