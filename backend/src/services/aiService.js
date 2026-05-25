const { OpenAI } = require('openai');

// 🚀 SMART AI SWITCHER: Automatically switch between Gemini & OpenAI
const useGemini = !!process.env.GEMINI_API_KEY;

const openai = new OpenAI({
  apiKey: useGemini ? process.env.GEMINI_API_KEY : (process.env.OPENAI_API_KEY || 'sk-dummy-key'),
  baseURL: useGemini ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined
});

// 🌊 WATERFALL MODEL ARRAY: System upar se shuru karega aur jo pehla model active milega, usko use kar lega.
const GEMINI_MODELS = [
  "gemini-2.5-pro"
];

const OPENAI_MODELS = ["gpt-4o"];

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

    const modelsToTry = useGemini ? GEMINI_MODELS : OPENAI_MODELS;
    let lastError;

    // Loop through all models until one succeeds
    for (const model of modelsToTry) {
      try {
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: finalContext },
            { role: "user", content: prompt }
          ],
          model: model,
        });
        console.log(`✅ [AI Service] Successfully responded using model: ${model}`);
        return completion.choices[0].message.content;
      } catch (err) {
        console.log(`⚠️ [AI Service] Model ${model} is not active or failed. Trying next...`);
        lastError = err;
      }
    }
    throw new Error('All AI models failed to respond: ' + lastError.message);
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new Error('Failed to generate AI response');
  }
};

/**
 * Generates a response for the Dashboard Onboarding Setup Assistant.
 * Used to automatically configure user settings via Chat.
 */
exports.generateDashboardAssistantResponse = async (prompt, systemContext) => {
  try {
    const requestPayload = {
      messages: [
        { role: "system", content: systemContext },
        { role: "user", content: prompt }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "update_business_profile",
            description: "Update the user's business profile details.",
            parameters: {
              type: "object",
              properties: {
                businessName: { type: "string", description: "The name of their business/store" },
                businessDescription: { type: "string", description: "What their business does or sells" }
              },
              required: ["businessDescription"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "draft_whatsapp_template",
            description: "Create a draft WhatsApp marketing template based on user's input.",
            parameters: {
              type: "object",
              properties: {
                templateName: { type: "string", description: "Lowercase, no spaces e.g., 'summer_sale'" },
                messageBody: { type: "string", description: "The marketing text of the template." }
              },
              required: ["templateName", "messageBody"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "add_auto_reply_rule",
            description: "Add a new auto-reply rule for the WhatsApp bot.",
            parameters: {
              type: "object",
              properties: {
                triggerWord: { type: "string", description: "The exact word the customer might text (e.g., 'menu')" },
                replyMessage: { type: "string", description: "The automated reply to send." }
              },
              required: ["triggerWord", "replyMessage"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "update_ai_rules",
            description: "Save the personal AI rules and fallback instructions decided by the business owner.",
            parameters: {
              type: "object",
              properties: {
                customRules: { type: "string", description: "Specific instructions like 'Never give discounts', 'Talk in Hinglish', etc." },
                fallbackAction: { type: "string", description: "What to do if the AI doesn't know the answer (e.g., 'notify_owner', 'wait_for_human')" }
              },
              required: ["customRules", "fallbackAction"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "log_business_observation",
            description: "Log an observation or missing knowledge gap the AI noticed to discuss with the owner.",
            parameters: {
              type: "object",
              properties: {
                observationText: { type: "string", description: "What the AI noticed (e.g., 'Customers are asking for return policy, but it is not in the system')" }
              },
              required: ["observationText"]
            }
          }
        }
      ],
      tool_choice: "auto"
    };

    const modelsToTry = useGemini ? GEMINI_MODELS : OPENAI_MODELS;
    let lastError;

    for (const model of modelsToTry) {
      try {
        const completion = await openai.chat.completions.create({ ...requestPayload, model: model });
        console.log(`✅ [AI Dashboard Service] Successfully responded using model: ${model}`);
        return completion.choices[0].message;
      } catch (err) {
        console.log(`⚠️ [AI Dashboard Service] Model ${model} failed. Trying next...`);
        lastError = err;
      }
    }
    throw new Error('All AI models failed in dashboard tool calling: ' + lastError.message);
  } catch (error) {
    console.error('AI Dashboard Tool Service Error:', error);
    throw new Error('Failed to generate AI dashboard response');
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

    const requestPayload = {
      messages: [
        { role: "system", content: finalContext },
        { role: "user", content: prompt }
      ],
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
        }
      ],
      tool_choice: "auto"
    };

    const modelsToTry = useGemini ? GEMINI_MODELS : OPENAI_MODELS;
    let lastError;

    // Loop through all models for tool calling until one succeeds
    for (const model of modelsToTry) {
      try {
        const completion = await openai.chat.completions.create({ ...requestPayload, model: model });
        console.log(`✅ [AI Tool Service] Successfully responded using model: ${model}`);
        return completion.choices[0].message;
      } catch (err) {
        console.log(`⚠️ [AI Tool Service] Model ${model} is not active or failed. Trying next...`);
        lastError = err;
      }
    }
    throw new Error('All AI models failed in tool calling: ' + lastError.message);
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
