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
    return `${baseInstruction}\n${scrapedContext}\nYou are a performance marketing expert. Focus on ad effectiveness.\nReturn JSON: ${schema.replace('}', `,\n  "adHook": "<hook strength analysis>",\n  "adCta": "<CTA effectiveness>",\n  "adPlusSides": ["<ad strength 1>", "<strength 2>"],\n  "adMinusSides": ["<ad weakness 1>", "<weakness 2>"]\n}`)}\n\nScoring: Hook(25pts) Visual(20pts) Copy(20pts) CTA(20pts) Audience signal(15pts)`;
  }
  
  if (platform === 'youtube') {
    return `${baseInstruction}\nYou are a YouTube CTR optimization expert. Analyze this thumbnail.\nReturn JSON: ${schema}\n\nScoring: CTR potential(30pts) Visual contrast(20pts) Text clarity(20pts) Emotional hook(20pts) Branding(10pts)`;
  }
  
  return `${baseInstruction}\n${scrapedContext}\nYou are an Instagram growth expert.\nReturn JSON: ${schema}\n\nScoring: Visual quality(25pts) Caption(20pts) Hashtags(15pts) Engagement hook(25pts) Timing signals(15pts)\nBe specific, actionable, honest. Return ONLY JSON.`;
};