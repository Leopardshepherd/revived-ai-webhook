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
You are a resale appraisal AI. Use the attached images and respond in exactly this format:

Title: [short title]
Description: [2-sentence product description]
Category: [general category like Furniture, Decor, Apparel]
Condition: [New, Like New, Good, Fair, Poor]
Price: [$XX–$XX]

ONLY respond using the format above. Do not explain. Do not add commentary.
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

    console.log("GPT-4 Response:\n", rawText);

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
