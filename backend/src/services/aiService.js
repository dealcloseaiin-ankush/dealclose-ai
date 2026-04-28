const openai = require('../config/openai');

/**
 * Generates a response from OpenAI's chat model.
 * @param {string} prompt The user's message.
 * @param {string} [systemContext="You are a helpful AI assistant."] The system message to set the AI's behavior.
 * @param {string} [platform="whatsapp"] The platform where the reply will be sent (whatsapp or instagram).
 * @returns {Promise<string>} The AI-generated response text.
 */
exports.generateAIResponse = async (prompt, systemContext = "You are a helpful AI assistant.", platform = "whatsapp") => {
  try {
    let finalContext = systemContext;
    
    // Platform-Aware Prompt Injection (AI Magic)
    if (platform === 'instagram') {
      finalContext += "\n\n[CRITICAL RULE]: You are replying to a PUBLIC Instagram comment. Keep your reply EXTREMELY short (1-2 sentences max), polite, and use emojis. Never give long explanations or private details. Direct them to check the 'Link in Bio' or say 'We have DM'd you!'.";
    } else if (platform === 'whatsapp') {
      finalContext += "\n\n[CRITICAL RULE]: You are chatting privately on WhatsApp. You can provide detailed answers, exact pricing, long catalog lists, and ask follow-up questions to close the sale.";
    }

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: finalContext },
        { role: "user", content: prompt }
      ],
      model: "gpt-3.5-turbo",
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error('Failed to generate AI response');
  }
};

/**
 * Generates a response from OpenAI with Function Calling (Tools) capabilities.
 * Used for extracting Real Estate data or triggering Outbound calls.
 * @param {string} prompt The user's message.
 * @param {string} systemContext The system message.
 * @param {string} [platform="whatsapp"] The platform.
 */
exports.generateAIResponseWithTools = async (prompt, systemContext, platform = "whatsapp") => {
  try {
    let finalContext = systemContext || "You are a business AI assistant.";
    
    // Platform-Aware Prompt Injection
    if (platform === 'instagram') {
      finalContext += "\n\n[CRITICAL RULE]: You are on Instagram. Keep responses under 20 words. No long lists.";
    } else if (platform === 'whatsapp') {
      finalContext += "\n\n[CRITICAL RULE]: You are on WhatsApp. Be comprehensive, format nicely with bullet points, and act as a closer.";
    }

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: finalContext },
        { role: "user", content: prompt }
      ],
      model: "gpt-4-turbo", // gpt-4 is much better at function calling
      tools: [
        {
          type: "function",
          function: {
            name: "search_catalog",
            description: "Search the business catalog for products or properties requested by the customer. Returns item details, prices, and links.",
            parameters: {
              type: "object",
              properties: {
                searchQuery: { type: "string", description: "The product or property name to search for (e.g., 'red t-shirt', '2BHK flat')" }
              },
              required: ["searchQuery"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "extract_lead_requirements",
            description: "Extract customer requirements (products they want to buy, or real estate property details) to save as a lead in CRM.",
            parameters: {
              type: "object",
              properties: {
                category: { type: "string", description: "Category of item (e.g., Real Estate, Electronics, Clothing, Service)" },
                itemName: { type: "string", description: "Specific product name or property type (e.g., 2BHK, iPhone 15, Red T-Shirt)" },
                budget: { type: "string", description: "Budget or Price mentioned by customer" },
                amenities: { type: "array", items: { type: "string" }, description: "List of amenities if provided" },
              },
              required: ["category", "itemName"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "trigger_outbound_call",
            description: "Trigger a phone call to the user if they request a call, want to talk to a human/AI agent via voice, or explicitly ask to call.",
            parameters: {
              type: "object",
              properties: {
                reason: { type: "string", description: "Reason why the user wants a call" }
              },
              required: ["reason"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "check_order_status",
            description: "Check the status of a customer's order or dispatch delivery if they ask 'Where is my order?' or 'Is my item shipped?'.",
            parameters: {
              type: "object",
              properties: {
                orderId: { type: "string", description: "The order ID or tracking number if provided by the user (optional)" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "escalate_to_staff",
            description: "Escalate the conversation to a human staff member or owner if the user is angry, requests a human, or asks an unknown question.",
            parameters: {
              type: "object",
              properties: {
                customerQuestion: { type: "string", description: "The exact question the customer asked" },
                requiredDepartment: { type: "string", enum: ["sales", "support", "owner"], description: "Which department should handle this?" }
              },
              required: ["customerQuestion"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "assign_smart_group",
            description: "Analyze the user's behavior and assign them to a smart marketing group for future bulk templates.",
            parameters: {
              type: "object",
              properties: {
                segmentName: { type: "string", description: "Name of the group (e.g., 'High Intent Electronics', 'Window Shopper', 'Ready to Buy')" },
                reason: { type: "string", description: "Why the user was placed in this group" }
              },
              required: ["segmentName"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "request_star_review",
            description: "Trigger an automated message asking the user for a 1 to 5 star rating once their issue is resolved or order is complete.",
            parameters: {
              type: "object",
              properties: {},
            }
          }
        },
        {
          type: "function",
          function: {
            name: "post_lead_to_connected_platform",
            description: "If a user is interested in a product/property, use this to automatically post their details to the business's connected platforms like newpropertyhub.in or vyaparindia.online.",
            parameters: {
              type: "object",
              properties: {
                platformName: { type: "string", description: "Name of the platform" },
                leadDetails: { type: "string", description: "JSON string of lead details" }
              },
              required: ["platformName", "leadDetails"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "manage_business_catalog",
            description: "ONLY USE THIS IF THE OWNER IS CHATTING. Add, update, or remove a product in the business catalog based on the owner's command.",
            parameters: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["add", "update", "remove"] },
                itemName: { type: "string" },
                price: { type: "number" },
                brand: { type: "string" }
              },
              required: ["action", "itemName"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "mark_lead_as_lost_and_share",
            description: "If the customer clearly refuses to buy, cancels the order, or is no longer interested, use this to mark the lead as lost so it can be shared with other local sellers in the network.",
            parameters: {
              type: "object",
              properties: {
                reason: { type: "string", description: "Reason for cancellation" },
                customerPinCode: { type: "string", description: "The local pin code of the customer if mentioned in chat" },
                productCategory: { type: "string", description: "The product they were trying to buy (e.g. 'Smartphone', 'T-Shirt')" }
              },
              required: ["reason", "productCategory"]
            }
          }
        }
      ],
      tool_choice: "auto"
    });
    return completion.choices[0].message;
  } catch (error) {
    console.error('AI Tool Service Error:', error);
    throw new Error('Failed to generate AI tool response');
  }
};

/**
 * Analyzes social media comments/DMs to extract phone numbers and intent.
 * This prevents generic replies and captures high-value leads automatically.
 */
exports.analyzeSocialMediaComment = async (commentText) => {
  try {
    const prompt = `You are a lead extraction AI. Analyze this Instagram comment/DM: "${commentText}".
    Extract the following details and return strictly in JSON format:
    - "intent": "high", "medium", or "low" (High if they want to buy, ask price, or leave a number).
    - "hasPhoneNumber": boolean.
    - "phoneNumber": The extracted phone number (with country code if possible), or null.
    - "productMentioned": What product/service they are talking about, or null.
    - "suggestedReply": A short, friendly, non-robotic reply to acknowledge their specific comment.`;

    const response = await exports.generateAIResponse(prompt, "You are a JSON data extractor. Output ONLY valid JSON.");
    return JSON.parse(response);
  } catch (error) {
    console.error('Social Media AI Analyzer Error:', error);
    return { intent: "low", hasPhoneNumber: false, phoneNumber: null, suggestedReply: "Thanks for your comment!" };
  }
};
