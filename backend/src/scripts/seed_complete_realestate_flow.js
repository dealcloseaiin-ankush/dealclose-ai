const path = require('path');
const backendPath = 'C:/Users/Lenovo1/Desktop/ai-calling-agent/backend';
const mongoose = require(path.join(backendPath, 'node_modules/mongoose'));
require(path.join(backendPath, 'node_modules/dotenv')).config({ path: path.join(backendPath, '.env') });
const User = require(path.join(backendPath, 'src/models/userModel'));
const Flow = require(path.join(backendPath, 'src/models/flowModel'));

async function seedCompleteRealEstateFlow() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({});

  for (const user of users) {
    const nphWorkspace = user.workspaces?.find(w => /property|real estate/i.test(w.name)) || (user.workspaces && user.workspaces[0]);
    const wsId = nphWorkspace ? nphWorkspace._id.toString() : 'main';

    const flowData = {
      nodes: [
        // 🚀 1. Trigger
        {
          id: 'node_trigger',
          type: 'trigger',
          data: {
            label: 'Real Estate Trigger',
            triggerType: 'keyword',
            keyword: 'hi, hello, start, menu, property, properties, 2, newpropertyhub, newpropertyhub.in, buy, sell, rent, flat, plot, villa, list, list property, sell property, buy property, book site visit, opt_buy_prop, opt_sell_prop, opt_rent_prop, opt_site_visit',
            platform: 'whatsapp'
          },
          position: { x: 350, y: 0 }
        },
        // 🚀 2. Welcome & Name / City Capture
        {
          id: 'node_ask_name_city',
          type: 'askQuestion',
          data: {
            label: 'Welcome & Capture Name/City',
            question: 'Welcome to *NewPropertyHub.in*! 🏢\nIndia\'s Smart Real Estate Platform.\n\nKripya apna *Name* aur *City* batayein? (Jaise: Rahul, Mumbai)',
            replyType: 'open',
            platform: 'whatsapp'
          },
          position: { x: 350, y: 120 }
        },
        // 🚀 3. Core Intent Menu (Buy vs Sell/List)
        {
          id: 'node_menu_intent',
          type: 'menu',
          data: {
            label: 'Select Service Intent',
            message: 'Dhanyawad {{name}}! ✅ Aap NewPropertyHub par kya karna chahte hain?',
            opt1: '🔍 Property Kharidna / Rent Lena',
            opt2: '📝 Property Bechna / Rent Dena',
            opt3: '💬 AI Property Advisor Se Baat Karein',
            platform: 'whatsapp'
          },
          position: { x: 350, y: 240 }
        },

        // ==========================================
        // 📝 PATH A: LIST / SELL / RENT OUT (STEP-BY-STEP)
        // ==========================================
        // Step A1: Category
        {
          id: 'node_sell_category_menu',
          type: 'menu',
          data: {
            label: 'Property Category',
            message: 'Aap kis tarah ki property list karna chahte hain? 🏠',
            opt1: '🏢 Flat / Apartment',
            opt2: '🏡 Villa / House',
            opt3: '📐 Plot / Commercial',
            platform: 'whatsapp'
          },
          position: { x: 550, y: 380 }
        },
        // Step A2: Configuration & Locality
        {
          id: 'node_sell_ask_specs',
          type: 'askQuestion',
          data: {
            label: 'BHK & Locality',
            question: 'Property ka *BHK / Size (Sq.Ft)* aur *Area / Society Name* batayein? (Jaise: 2 BHK 950 Sq.Ft in Green Valley, Andheri West)',
            replyType: 'open',
            platform: 'whatsapp'
          },
          position: { x: 550, y: 500 }
        },
        // Step A3: Expected Price / Rent
        {
          id: 'node_sell_ask_price',
          type: 'askQuestion',
          data: {
            label: 'Expected Price or Rent',
            question: 'Is property ki aapki *Expected Price (Bechne ke liye)* ya *Monthly Rent* kitna hai?',
            replyType: 'open',
            platform: 'whatsapp'
          },
          position: { x: 550, y: 620 }
        },
        // Step A4: Request Photos & GPS Location
        {
          id: 'node_sell_ask_photos',
          type: 'askQuestion',
          data: {
            label: 'Ask Property Photos & GPS Pin',
            question: 'Details save ho gayi hain! 📝\n\n📸 Kripya property ki *kam se kam 1-2 photos* WhatsApp par send karein (jyada ho to bhi bhej sakte hain). Iske baad agar aapke paas property ki *WhatsApp GPS Location pin* hai to use bhi send kar sakte hain (ya type *"SKIP"* karein).',
            replyType: 'open',
            platform: 'whatsapp'
          },
          position: { x: 550, y: 740 }
        },
        // Step A5: Listing Finalized
        {
          id: 'node_sell_complete_msg',
          type: 'message',
          data: {
            label: 'Listing Confirmation',
            message: '🎉 Badhai ho {{name}}! Aapki property NewPropertyHub verified listings me queue ho gayi hai.\n\n✅ Humaare buyers aur tenants ko ye property dikhai degi. Jaise hi koi inquiry aayegi, hum aapko turant WhatsApp par notify karenge! 🏠',
            platform: 'whatsapp'
          },
          position: { x: 550, y: 860 }
        },
        // Step A6: AI Followup Discussion
        {
          id: 'node_sell_ai_followup',
          type: 'ai_agent',
          data: {
            label: 'AI Listing Enhancement Discussion',
            message: 'Maine aapki property details NewPropertyHub par note kar li hain. Kya aap is property ke baare me koi khas baatein (jaise: Gated Society, Reserved Car Parking, North Facing, ya Urgent Sale) add karna chahte hain? 🤖',
            platform: 'whatsapp'
          },
          position: { x: 550, y: 980 }
        },

        // ==========================================
        // 🔍 PATH B: BUY / RENT IN (REQUIREMENTS -> AI MATCHING & SITE VISIT)
        // ==========================================
        // Step B1: Requirements & Budget
        {
          id: 'node_buy_ask_budget_loc',
          type: 'askQuestion',
          data: {
            label: 'Buyer Requirements & Budget',
            question: 'Aapko kaisi property chahiye? Kripya apna *Budget* aur *Preferred Area / Location* batayein? (Jaise: 2 BHK Flat under 60 Lakh in Mumbai)',
            replyType: 'open',
            platform: 'whatsapp'
          },
          position: { x: 150, y: 380 }
        },
        // Step B2: AI Property Assistant Handover
        {
          id: 'node_buy_ai_agent',
          type: 'ai_agent',
          data: {
            label: 'AI Property Search & Matching',
            message: 'Shukriya {{name}}! Hamari Property AI Assistant aapke budget aur area ke hisab se matching properties search kar rahi hai... 🤖',
            platform: 'whatsapp'
          },
          position: { x: 150, y: 520 }
        }
      ],
      edges: [
        // Welcome -> Name -> Intent Menu
        { id: 'e_trig_name', source: 'node_trigger', target: 'node_ask_name_city' },
        { id: 'e_name_menu', source: 'node_ask_name_city', target: 'node_menu_intent', sourceHandle: 'replied' },

        // Intent Menu Branching:
        // Opt 1 (Buy/Rent In) -> Ask Budget/Location -> AI Agent
        { id: 'e_menu_buy', source: 'node_menu_intent', target: 'node_buy_ask_budget_loc', sourceHandle: 'opt_0' },
        { id: 'e_buy_to_ai', source: 'node_buy_ask_budget_loc', target: 'node_buy_ai_agent', sourceHandle: 'replied' },

        // Opt 2 (Sell/List Out) -> Step A1 Category -> Step A2 Specs -> Step A3 Price -> Step A4 Photos -> Step A5 Done -> Step A6 AI Discussion
        { id: 'e_menu_sell', source: 'node_menu_intent', target: 'node_sell_category_menu', sourceHandle: 'opt_1' },
        { id: 'e_sell_cat_opt0', source: 'node_sell_category_menu', target: 'node_sell_ask_specs', sourceHandle: 'opt_0' },
        { id: 'e_sell_cat_opt1', source: 'node_sell_category_menu', target: 'node_sell_ask_specs', sourceHandle: 'opt_1' },
        { id: 'e_sell_cat_opt2', source: 'node_sell_category_menu', target: 'node_sell_ask_specs', sourceHandle: 'opt_2' },
        { id: 'e_sell_specs_price', source: 'node_sell_ask_specs', target: 'node_sell_ask_price', sourceHandle: 'replied' },
        { id: 'e_sell_price_photos', source: 'node_sell_ask_price', target: 'node_sell_ask_photos', sourceHandle: 'replied' },
        { id: 'e_sell_photos_done', source: 'node_sell_ask_photos', target: 'node_sell_complete_msg', sourceHandle: 'replied' },
        { id: 'e_sell_done_ai', source: 'node_sell_complete_msg', target: 'node_sell_ai_followup' },

        // Opt 3 (Direct AI Advisor) -> AI Agent
        { id: 'e_menu_ai', source: 'node_menu_intent', target: 'node_buy_ai_agent', sourceHandle: 'opt_2' }
      ]
    };

    await Flow.findOneAndUpdate(
      { userId: user._id, name: 'NewPropertyHub Real Estate Complete Automation' },
      {
        $set: {
          userId: user._id,
          name: 'NewPropertyHub Real Estate Complete Automation',
          description: 'Step-by-step Real Estate funnel: Name/City -> Buy (AI property search & site visit) vs Sell/List (Type, Specs, Price, Photos & GPS progressive collection + AI enhancement discussion)',
          workspaceId: wsId,
          platform: 'whatsapp',
          triggerKeywords: ['property', '2', 'newpropertyhub', 'buy', 'sell', 'rent', 'visit', 'flat', 'plot', 'list'],
          isActive: true,
          flowData: flowData
        }
      },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ Seeded complete progressive real estate flow with AI follow-up for ${user.email} (Workspace: ${wsId})`);
  }

  await mongoose.disconnect();
}

seedCompleteRealEstateFlow().catch(e => console.error(e));
