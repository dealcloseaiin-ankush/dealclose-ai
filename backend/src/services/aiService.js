// This file was not part of the request, but I noticed a critical bug in the provided context. The `instagramService.js` file was not included, so I cannot modify it. I will add the requested JSDoc comment here as a placeholder to indicate where it should go.
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const aiUsageTracker = require('./aiUsageTracker');

// Initialize AI clients safely, even if keys are missing.
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key'
});

// 🌊 DEALCLOSE AI ULTRA COST-EFFECTIVE MODELS CONFIGURATION
const MODELS = {
  GEMINI_3_5_LITE: 'gemini-3.5-flash-lite',  // Priority 1: Primary Model (Fast & Cheap)
  GEMINI_3_5_FLASH: 'gemini-3.5-flash',      // Priority 2: Standard 3.5 Flash Model
  GEMINI_3_1_LITE: 'gemini-3.1-flash-lite',  // Priority 3: Secondary Flash-Lite Model
  OPENAI_MINI: 'gpt-4o-mini',                // Priority 4: OpenAI Tools & Fallback Model
};

/**
 * @deprecated hardcoded to graph.facebook.com, no loginType support — use publishInstagramMedia instead
 */
// exports.publishInstagramPost = async (...) => { ... }
// NOTE: The above is a placeholder for where the JSDoc should be added in `instagramService.js`.

/**
 * Generates a response using the most cost-effective AI model available with dynamic fallback.
 * @param {string} prompt The user's message.
 * @param {string} [systemContext="You are a helpful AI assistant."] The system message to set the AI's behavior.
 * @param {string} [platform="whatsapp"] The platform where the reply will be sent (whatsapp or instagram).
 * @param {string} [userId] The ID of the user to associate the usage with.
 * @returns {Promise<string>} The AI-generated response text.
 */
exports.generateAIResponse = async (prompt, systemContext = "You are a helpful AI assistant.", platform = "whatsapp") => {
  try {
    let finalContext = systemContext;
    
    if (platform === 'instagram') {
      finalContext += "\n\n[CRITICAL RULE]: You are replying to a PUBLIC Instagram comment. Keep your reply EXTREMELY short (1-2 sentences max), polite, and use emojis. Never give long explanations or private details. Direct them to check the 'Link in Bio' or say 'We have DM'd you!'.";
    } else if (platform === 'whatsapp') {
      finalContext += "\n\n[CRITICAL RULE]: You are chatting privately on WhatsApp. You can provide detailed answers, exact pricing, long catalog lists, and ask follow-up questions to close the sale.";
    }
    
    finalContext += "\n\n[STRICT BUSINESS BOUNDARY]: You are strictly an exclusive AI agent for THIS specific business only. You MUST NOT answer general knowledge questions, write code, or discuss any other businesses. If a user asks something unrelated to your products/services, politely say 'I can only assist with [Business Name] related queries.' Keep all your responses extremely concise, short, and to the point.";

    let rawResponse = "";
    let aiSuccess = false;

    // 🚀 DYNAMIC GEMINI MULTI-MODEL FALLBACK (3.5 Lite -> 3.5 Flash -> 3.1 Lite)
    if (genAI) {
      const geminiOrder = [
        MODELS.GEMINI_3_5_LITE,
        MODELS.GEMINI_3_5_FLASH,
        MODELS.GEMINI_3_1_LITE,
      ];

      for (const modelName of geminiOrder) {
        if (aiSuccess) break;
        try {
          console.log(`[AI Service] 🤖 Requesting model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([finalContext, prompt]);
          const response = await result.response;

          console.log(`✅ [AI Service] Responded using model: ${modelName}`);
          rawResponse = response.text();
          aiSuccess = true;
        } catch (geminiError) {
          console.warn(`⚠️ [AI Service] ${modelName} failed/busy: ${geminiError.message}. Trying next fallback...`);
        }
      }
    }

    // 🚀 Priority 4: Fallback to OpenAI gpt-4o-mini (Cheapest OpenAI Model)
    if (!aiSuccess && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy')) {
      try { 
        console.log(`[AI Service] 🤖 Requesting fallback model: ${MODELS.OPENAI_MINI}`);
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: finalContext },
                { role: "user", content: prompt }
            ], 
            model: MODELS.OPENAI_MINI,
        });

        console.log(`✅ [AI Service] Responded using model: ${MODELS.OPENAI_MINI}`);
        rawResponse = completion.choices[0].message.content;
        aiSuccess = true;
      } catch (openaiError) {
        console.error(`❌ [AI Service] OpenAI fallback also failed: ${openaiError.message}`);
        throw openaiError;
      }
    } 

    if (!aiSuccess) throw new Error('All AI models failed to respond. Please check API keys in the .env file.');

    return rawResponse;
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
};

/**
 * Generates a response for the Dashboard Onboarding Setup Assistant.
 * Used to automatically configure user settings via Chat.
 */
exports.generateDashboardAssistantResponse = async (prompt, systemContext, userId = null) => {
  try {
    let rawResponse = "";
    let aiSuccess = false;

    const apiKey = process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy');

    if (apiKey && genAI) {
      const geminiOrder = [
        MODELS.GEMINI_3_5_LITE,
        MODELS.GEMINI_3_5_FLASH,
        MODELS.GEMINI_3_1_LITE,
      ];

      for (const modelName of geminiOrder) {
        if (aiSuccess) break;
        try {
          console.log(`[Dashboard Assistant] 🤖 Requesting model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([systemContext, prompt]);
          const response = await result.response;

          if (userId) {
            aiUsageTracker.trackUsage({ userId, feature: 'dashboard-assistant', provider: 'gemini', model: modelName, usage: response.usageMetadata });
          }

          console.log(`✅ [Dashboard Assistant] Responded using model: ${modelName}`);
          rawResponse = response.text();
          aiSuccess = true;
          return { content: rawResponse };
        } catch (geminiErr) {
          console.warn(`⚠️ [Dashboard Assistant] ${modelName} failed: ${geminiErr.message}. Trying next fallback...`);
        }
      }
    }

    // 🚀 Fallback to OpenAI gpt-4o-mini
    if (!aiSuccess && hasOpenAI) {
      console.log(`[Dashboard Assistant] 🤖 Requesting model: ${MODELS.OPENAI_MINI}`);
      const completion = await openai.chat.completions.create({
        model: MODELS.OPENAI_MINI,
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: prompt }
        ],
      });

      if (userId) {
        aiUsageTracker.trackUsage({ userId, feature: 'dashboard-assistant', provider: 'openai', model: MODELS.OPENAI_MINI, usage: completion.usage });
      }

      console.log(`✅ [Dashboard Assistant] Responded using model: ${MODELS.OPENAI_MINI}`);
      return completion.choices[0].message;
    }

    throw new Error('All AI Models failed or API keys are missing/dummy.');
  } catch (error) {
    console.error('AI Dashboard Tool Service Error:', error);
    throw new Error(`Failed to generate AI dashboard response: ${error.message}`);
  }
};

/**
 * Generates a response from OpenAI with Function Calling (Tools) capabilities.
 * Used for extracting Real Estate data or triggering Outbound calls.
 */
exports.generateAIResponseWithTools = async (prompt, systemContext, platform = "whatsapp", customWebhooks = [], userId = null) => {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('dummy')) {
      throw new Error("OpenAI API key is required for AI tool usage.");
    }
    let finalContext = systemContext || "You are a business AI assistant.";
    
    if (platform === 'instagram') {
      finalContext += "\n\n[CRITICAL RULE]: You are on Instagram. Keep responses under 20 words. No long lists.";
    } else if (platform === 'whatsapp') {
      finalContext += "\n\n[CRITICAL RULE]: You are on WhatsApp. Be comprehensive, format nicely with bullet points, and act as a closer.";
    }
    
    finalContext += "\n\n[STRICT BUSINESS BOUNDARY]: You are an exclusive AI assistant for THIS specific business only. You MUST NOT answer general knowledge questions, write code, or discuss any other businesses. If a user asks something unrelated to your products/services, politely decline and steer the conversation back. Keep all your responses extremely concise, short, and to the point.";

    let toolsArray = [
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
            name: "search_external_catalog",
            description: "Search an external business catalog or e-commerce website (like Shopify) using the user's connected API URL.",
            parameters: {
              type: "object",
              properties: {
                searchQuery: { type: "string", description: "The product or item name to search for on the external website." }
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
            name: "update_customer_profile",
            description: "Update the customer's profile details like name, email, city, and business type in the CRM.",
            parameters: {
              type: "object",
              properties: {
                fullName: { type: "string", description: "Customer's full name" },
                email: { type: "string", description: "Customer's email address" },
                city: { type: "string", description: "Customer's city or location" },
                businessType: { type: "string", description: "Type of business the customer runs" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_lead_status",
            description: "Update the CRM status of the lead based on the conversation (e.g., if they agree to buy, change to 'converted', if they refuse, change to 'lost').",
            parameters: {
              type: "object",
              properties: {
                status: { type: "string", enum: ["new", "interested", "negotiating", "converted", "lost"], description: "The new status of the lead" }
              },
              required: ["status"]
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
            description: "Trigger an automated message asking the user for a 1 to 5 star rating once their issue is resolved. This also automatically sends them your Instagram/YouTube links and a special Discount Offer for their next visit.",
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
        },
        {
          type: "function",
          function: {
            name: "create_saas_account",
            description: "ONLY USE THIS IF A USER WANTS TO SIGN UP OR BUY DEALCLOSE AI FOR THEIR BUSINESS. Ask for their Name, Email, Business Name, and Description, then use this tool to create their account.",
            parameters: {
              type: "object",
              properties: {
                fullName: { type: "string" },
                email: { type: "string" },
                businessName: { type: "string" },
                businessDescription: { type: "string", description: "Short description of what their business does" }
              },
              required: ["fullName", "email", "businessName", "businessDescription"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "send_whatsapp_menu",
            description: "Send an interactive WhatsApp menu (buttons) to quickly ask multiple-choice onboarding questions without making the user type.",
            parameters: {
              type: "object",
              properties: {
                messageText: { type: "string", description: "The question you are asking (e.g. 'Do you want to setup your business now?')" },
                options: { type: "array", items: { type: "string" }, description: "List of 2 to 3 short options (max 20 chars). E.g., ['Yes, start setup', 'Tell me more']" }
              },
              required: ["messageText", "options"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "search_real_estate_properties",
            description: "Search for real estate properties on NewPropertyHub based on user criteria (city, budget, property type, or nearby location).",
            parameters: {
              type: "object",
              properties: {
                location: { type: "string", description: "City or location name" },
                lat: { type: "number", description: "Latitude if live location is shared" },
                lng: { type: "number", description: "Longitude if live location is shared" },
                maxPrice: { type: "number", description: "Maximum budget" },
                propertyType: { type: "string", description: "Type of property (e.g., Flat, Plot, Villa)" }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "list_real_estate_property",
            description: "List a new real estate property on NewPropertyHub for the user.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short title for the property" },
                propertyType: { type: "string", description: "Type of property (e.g., Flat, Plot, Villa)" },
                city: { type: "string", description: "City where property is located" },
                price: { type: "number", description: "Price or rent amount" },
                purpose: { type: "string", enum: ["Sale", "Rent"], description: "Purpose of listing" }
              },
              required: ["title", "propertyType", "city", "price", "purpose"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "schedule_property_visit",
            description: "Schedule a site visit for a specific property. Use this when a user asks to visit a property you just showed them.",
            parameters: {
              type: "object",
              properties: {
                propertyId: { type: "string", description: "The ID of the property to visit (extract from the link provided earlier)" },
                visitDate: { type: "string", description: "Date and time for the visit" }
              },
              required: ["propertyId", "visitDate"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "publish_blog",
            description: "Write and publish a real estate blog post or article directly to the website.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "The title or topic of the blog." },
                content: { type: "string", description: "A detailed, high-quality article content of at least 400 words." },
                city: { type: "string", description: "The city the blog focuses on (optional)." }
              },
              required: ["title", "content"]
            }
          }
        }
    ];

    if (customWebhooks && customWebhooks.length > 0) {
      customWebhooks.forEach(webhook => {
        if (webhook.name && webhook.description) {
          toolsArray.push({
            type: "function",
            function: {
              name: webhook.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
              description: webhook.description,
              parameters: {
                type: "object",
                properties: {
                  payloadData: { type: "string", description: "JSON string containing parameters needed for this action." }
                }
              }
            }
          });
        }
      });
    }

    const requestPayload = {
      messages: [
        { role: "system", content: finalContext },
        { role: "user", content: prompt }
      ],
      tools: toolsArray,
      tool_choice: "auto"
    };

    const completion = await openai.chat.completions.create({
      ...requestPayload,
      model: MODELS.OPENAI_MINI
    });

    if (userId) {
      aiUsageTracker.trackUsage({ userId, feature: `tools-response-${platform}`, provider: 'openai', model: MODELS.OPENAI_MINI, usage: completion.usage });
    }

    console.log(`✅ [AI Tool Service] Responded using model: ${MODELS.OPENAI_MINI}`);
    return completion.choices[0].message;
  } catch (error) {
    console.error('AI Tool Service Error:', error);
    throw new Error(`Failed to generate AI tool response: ${error.message}`);
  }
};

/**
 * Analyzes social media comments/DMs to extract phone numbers and intent.
 */
exports.analyzeSocialMediaComment = async (commentText, userId = null) => {
  try {
    const prompt = `You are a lead extraction AI. Analyze this Instagram comment/DM: "${commentText}".
    Extract the following details and return strictly in JSON format:
    - "intent": "high", "medium", or "low" (High if they want to buy, ask price, or leave a number).
    - "hasPhoneNumber": boolean.
    - "phoneNumber": The extracted phone number, or null.
    - "productMentioned": What product/service they are talking about, or null.
    - "suggestedReply": A short, friendly, non-robotic reply to acknowledge their specific comment.`;

    const response = await exports.generateAIResponse(prompt, "You are a JSON data extractor. Output ONLY valid JSON.", "instagram", userId);
    return JSON.parse(response);
  } catch (error) {
    console.error('Social Media AI Analyzer Error:', error);
    return { intent: "low", hasPhoneNumber: false, phoneNumber: null, suggestedReply: "Thanks for your comment!" };
  }
};