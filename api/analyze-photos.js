export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Preflight check
  if (req.method === 'OPTIONS') {
    res.status(200).send('OK');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  try {
    const { image_urls, user_id } = req.body;
    console.log("Full request body from Lovable:", JSON.stringify(req.body, null, 2));
    console.log("Received image_urls:", image_urls);

    if (!image_urls || image_urls.length === 0) {
      return res.status(400).json({ error: 'No images provided.' });
    }

    const prompt = `
You are an AI trained to appraise secondhand items for resale.

Use the attached images to generate a resale listing in this exact format:
Title: [short item title]  
Description: [2–3 sentence product description]  
Category: [Furniture, Decor, Electronics, Apparel, etc.]  
Condition: [New, Like New, Good, Fair, Poor]  
Price: [$XX–$YY]

Respond ONLY using this format. Do not explain your answer. Always return a response, even if you’re unsure. Never leave anything blank.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
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

    console.log("FULL OpenAI API response:", JSON.stringify(result, null, 2));

    const rawText = result?.choices?.[0]?.message?.content || '';

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
