exports.buildPrompt = (platform, scanType, scrapedData) => {
  const baseInstruction = `Analyze this ${platform} ${scanType} and return ONLY a JSON object. No explanation, no markdown, just JSON.`;
  
  const scrapedContext = scrapedData ? `
Additional data from the post:
Caption: "${scrapedData.caption || 'Not available'}"
Hashtags: ${scrapedData.hashtags?.join(', ') || 'None'}
Likes: ${scrapedData.likes || 'Unknown'}
Views: ${scrapedData.views || 'Unknown'}
` : '';

  const schema = `{
  "viralScore": <0-100>,
  "viralLabel": "<Poor|Average|Good|Viral>",
  "scoreBreakdown": {
    "visualQuality": <0-100>,
    "caption": <0-100>,
    "hashtags": <0-100>,
    "engagementHook": <0-100>,
    "timingSignals": <0-100>
  },
  "strengths": ["<specific strength>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<specific weakness>", "<weakness 2>"],
  "suggestions": ["<actionable tip 1>", "<tip 2>", "<tip 3>", "<tip 4>"],
  "captionRewrite": "<improved caption with better hook, CTA, and hashtags>",
  "improvedHashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "bestTimeToPost": "<e.g. Tuesday and Thursday 7-9 PM>",
  "overallSummary": "<2-3 honest sentences about this content>"
}`;

  if (scanType === 'ad') {
    // 🐛 FIX: Purane code me schema.replace('}', ...) sirf PEHLA '}' replace karta tha,
    // jo scoreBreakdown ke andar wala closing brace hota hai — isse JSON structure
    // AI ke liye tuta hua (malformed) example ban jata tha aur galat/incomplete results aate the.
    // Fix: last '}' hatao (slice se), naye ad-specific fields jodo, fir wapas '}' lagao.
    const adSchema = schema.slice(0, -1) + `,
  "adHook": "<hook strength analysis>",
  "adCta": "<CTA effectiveness>",
  "adPlusSides": ["<ad strength 1>", "<strength 2>"],
  "adMinusSides": ["<ad weakness 1>", "<weakness 2>"]
}`;

    return `${baseInstruction}
${scrapedContext}
You are a performance marketing expert. Focus on ad effectiveness.
Return JSON: ${adSchema}

Scoring: Hook(25pts) Visual(20pts) Copy(20pts) CTA(20pts) Audience signal(15pts)
Be specific, actionable, and honest. Return ONLY valid JSON, no markdown, no extra text.`;
  }
  
  if (platform === 'youtube') {
    return `${baseInstruction}
You are a YouTube CTR optimization expert. Analyze this thumbnail.
Return JSON: ${schema}

Scoring: CTR potential(30pts) Visual contrast(20pts) Text clarity(20pts) Emotional hook(20pts) Branding(10pts)
Be specific, actionable, and honest. Return ONLY valid JSON, no markdown, no extra text.`;
  }
  
  return `${baseInstruction}
${scrapedContext}
You are an Instagram growth expert.
Return JSON: ${schema}

Scoring: Visual quality(25pts) Caption(20pts) Hashtags(15pts) Engagement hook(25pts) Timing signals(15pts)
Be specific, actionable, honest. Return ONLY JSON.`;
};