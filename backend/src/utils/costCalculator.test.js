const { calculateCosts } = require('./costCalculator');

describe('Cost Calculator Utility', () => {

  it('should correctly calculate internal and user costs for a Gemini model', () => {
    const params = {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      promptTokens: 10000, // 10k input tokens
      completionTokens: 20000, // 20k output tokens
    };

    // Manual Calculation for Verification:
    // gemini-1.5-flash prices: { input: $0.075, output: $0.30 } per 1M tokens
    // Base Input Cost = (10000 / 1,000,000) * 0.075 = 0.00075
    // Base Output Cost = (20000 / 1,000,000) * 0.30 = 0.006
    // Total Base Cost = 0.00075 + 0.006 = 0.00675
    // Internal Cost (x1.5) = 0.00675 * 1.5 = 0.010125
    // User Cost (x8) = 0.010125 * 8 = 0.081

    const { internalCost, userCost } = calculateCosts(params);

    expect(internalCost).toBeCloseTo(0.010125);
    expect(userCost).toBeCloseTo(0.081);
  });

  it('should correctly calculate costs for an OpenAI model', () => {
    const params = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptTokens: 5000,
      completionTokens: 1000,
    };

    // Manual Calculation:
    // gpt-4o-mini prices: { input: $0.15, output: $0.60 } per 1M tokens
    // Base Cost = ((5000/1M) * 0.15) + ((1000/1M) * 0.60) = 0.00075 + 0.0006 = 0.00135
    // Internal Cost = 0.00135 * 1.5 = 0.002025
    // User Cost = 0.002025 * 8 = 0.0162

    const { internalCost, userCost } = calculateCosts(params);

    expect(internalCost).toBeCloseTo(0.002025);
    expect(userCost).toBeCloseTo(0.0162);
  });

  it('should return zero cost for an unknown model', () => {
    const params = {
      provider: 'gemini',
      model: 'unknown-model-123',
      promptTokens: 1000,
      completionTokens: 1000,
    };

    const { internalCost, userCost } = calculateCosts(params);

    expect(internalCost).toBe(0);
    expect(userCost).toBe(0);
  });

});