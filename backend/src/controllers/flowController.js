const Flow = require('../models/flowModel');

const buildFlowSaveQuery = ({ userId, name, workspaceId, platform }) => {
  const isMainWorkspace = !workspaceId || workspaceId === 'main';
  const query = { userId, name, platform: platform || 'whatsapp' };

  if (!isMainWorkspace) {
    query.workspaceId = workspaceId;
  }

  return query;
};

// 🚀 INDUSTRY-SPECIFIC STARTER FLOWS & REUSABLE AUTOMATION BLUEPRINTS
const INDUSTRY_STARTER_FLOWS = {
  real_estate: [
    {
      name: 'Property Inquiry & Site Visit Auto-Booker',
      trigger: 'PROPERTY / 2BHK / 3BHK / VILLA',
      description: 'Incoming property inquiry -> Captures Budget & Preferred Location -> Auto-Sends Project Brochure PDF -> Schedules Sunday Site Visit & Assigns Sales Rep',
      flowData: {
        nodes: [
          { id: '1', type: 'trigger', data: { label: 'Customer asks about Property / Villa' }, position: { x: 250, y: 0 } },
          { id: '2', type: 'askQuestion', data: { question: 'Namaste! Kya aap 2 BHK, 3 BHK ya Luxury Villa dekh rahe hain?', replyType: 'open' }, position: { x: 250, y: 100 } },
          { id: '3', type: 'sendMessage', data: { message: 'Great! Ye raha hamara project brochure aur floor plans 📄', mediaUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c' }, position: { x: 250, y: 220 } },
          { id: '4', type: 'menu', data: { question: 'Kya aap Sunday 11:00 AM par Site Visit confirm karna chahte hain?', opt1: 'Haan Confirm Karein', opt2: 'Call Back Request', opt3: 'Price Sheet Bhejo' }, position: { x: 250, y: 340 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' },
          { id: 'e3-4', source: '3', target: '4' }
        ]
      }
    }
  ],
  retail_fashion: [
    {
      name: 'Festive Catalog & Discount Auto-Closer',
      trigger: 'PRICE / DISCOUNT / SIZE / BUY',
      description: 'Customer asks price -> Sends Instant 20% OFF Coupon -> Shares Catalog Link -> Collects Delivery Address',
      flowData: {
        nodes: [
          { id: '1', type: 'trigger', data: { label: 'Customer asks for Price / Collection' }, position: { x: 250, y: 0 } },
          { id: '2', type: 'sendMessage', data: { message: 'Namaste! Aapke liye flat 20% OFF festive coupon code *FESTIVE20* apply ho chuka hai 🛍️' }, position: { x: 250, y: 100 } },
          { id: '3', type: 'askQuestion', data: { question: 'Aap kaunsa size dekh rahe hain (M / L / XL)?', replyType: 'open' }, position: { x: 250, y: 220 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    }
  ],
  gym_fitness: [
    {
      name: 'Free VIP Trial Pass & Fitness Consultation',
      trigger: 'GYM / MEMBERSHIP / FEES / DIET',
      description: 'Captures fitness goal -> Sends 3-Day Free VIP Pass QR -> Books slot with Head Trainer',
      flowData: {
        nodes: [
          { id: '1', type: 'trigger', data: { label: 'Fitness Inquiry' }, position: { x: 250, y: 0 } },
          { id: '2', type: 'menu', data: { question: 'Aapka main fitness goal kya hai?', opt1: 'Weight Loss', opt2: 'Muscle Gain', opt3: 'General Fitness' }, position: { x: 250, y: 100 } },
          { id: '3', type: 'sendMessage', data: { message: 'Awesome! Aapka 3-Day Free VIP Workout Pass ready hai. Timings: 6 AM to 10 PM 💪' }, position: { x: 250, y: 220 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    }
  ],
  restaurant_cafe: [
    {
      name: 'Table Reservation & Digital Menu Dispatch',
      trigger: 'MENU / TABLE / BOOK / ORDER',
      description: 'Customer says Menu/Book -> Sends Digital Food Menu -> Confirms Table for Guests -> Sends Location Pin',
      flowData: {
        nodes: [
          { id: '1', type: 'trigger', data: { label: 'Dining or Menu inquiry' }, position: { x: 250, y: 0 } },
          { id: '2', type: 'sendMessage', data: { message: 'Namaste! Ye raha hamara chef special digital menu 🍕' }, position: { x: 250, y: 100 } },
          { id: '3', type: 'askQuestion', data: { question: 'Kitne guests ke liye table reserve karni hai?', replyType: 'open' }, position: { x: 250, y: 220 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' }
        ]
      }
    }
  ],
  hardware_sanitary: [
    {
      name: 'Paints & Building Material Bulk Estimate Bot',
      trigger: 'PAINT / CEMENT / PIPE / RATE / QUOTE',
      description: 'Captures Material Requirement -> Auto Calculates Estimate -> Dispatches Wholesale Rate Card',
      flowData: {
        nodes: [
          { id: '1', type: 'trigger', data: { label: 'Hardware or Material inquiry' }, position: { x: 250, y: 0 } },
          { id: '2', type: 'menu', data: { question: 'Aapko kis material ki requirement hai?', opt1: 'Asian Paints / Texture', opt2: 'Cement & TMT Steel', opt3: 'Pipes & Sanitary Fittings' }, position: { x: 250, y: 100 } },
          { id: '3', type: 'sendMessage', data: { message: 'Great! Hamare wholesale discount rates aapke quantity ke hisab se ready hain. Hamara staff estimate bhej raha hai 🔧' }, position: { x: 250, y: 220 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    }
  ],
  electricals_electronics: [
    {
      name: 'Home Appliance & 0% EMI Finder',
      trigger: 'AC / TV / FRIDGE / WIRING / EMI',
      description: 'Customer asks appliance -> Checks 0% EMI availability -> Sends product specs & store warranty',
      flowData: {
        nodes: [
          { id: '1', type: 'trigger', data: { label: 'Electronics inquiry' }, position: { x: 250, y: 0 } },
          { id: '2', type: 'menu', data: { question: 'Aap kaunsa appliance dekh rahe hain?', opt1: 'Inverter AC / Split AC', opt2: 'Smart TV & Soundbar', opt3: 'Home Wiring & Switchboards' }, position: { x: 250, y: 100 } },
          { id: '3', type: 'sendMessage', data: { message: 'Aaj hi buy karein 0% Down Payment par! Free home delivery & same-day installation available ⚡' }, position: { x: 250, y: 220 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    }
  ],
  mobile_laptops: [
    {
      name: 'Mobile Screen Repair & Gadget Quote Bot',
      trigger: 'SCREEN / REPAIR / IPHONE / BATTERY / GADGET',
      description: 'Customer enters phone model -> Gives instant repair estimate -> Books technician doorstep slot',
      flowData: {
        nodes: [
          { id: '1', type: 'trigger', data: { label: 'Phone repair or gadget inquiry' }, position: { x: 250, y: 0 } },
          { id: '2', type: 'askQuestion', data: { question: 'Aapke phone ka brand aur model kya hai? (e.g. iPhone 13 / OnePlus 11)', replyType: 'open' }, position: { x: 250, y: 100 } },
          { id: '3', type: 'sendMessage', data: { message: 'Original screen replacement par 6 Months Warranty + Free Temper Glass offer chal raha hai 📱' }, position: { x: 250, y: 220 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' }
        ]
      }
    }
  ],
  furniture_interior: [
    {
      name: 'Custom Sofa & Modular Interior Visualizer',
      trigger: 'SOFA / BED / MODULAR KITCHEN / INTERIOR',
      description: 'Customer shares room size -> Sends Lookbook Catalog -> Books Free Designer Site Visit',
      flowData: {
        nodes: [
          { id: '1', type: 'trigger', data: { label: 'Furniture inquiry' }, position: { x: 250, y: 0 } },
          { id: '2', type: 'menu', data: { question: 'Aapko kiske designs dekhne hain?', opt1: 'Custom Luxury Sofa', opt2: 'King Size Beds & Wardrobes', opt3: 'Modular Kitchen 3D Design' }, position: { x: 250, y: 100 } },
          { id: '3', type: 'sendMessage', data: { message: 'Namaste! Ye raha hamara 2026 Interior Lookbook PDF. Free 3D design consultation book ho chuka hai 🛋️' }, position: { x: 250, y: 220 } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    }
  ]
};

exports.getIndustryStarterFlows = async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    if (category !== 'all' && INDUSTRY_STARTER_FLOWS[category]) {
      return res.json({ success: true, flows: INDUSTRY_STARTER_FLOWS[category] });
    }
    res.json({ success: true, flows: INDUSTRY_STARTER_FLOWS });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const buildFlowListQuery = ({ userId, workspaceId, platform }) => {
  const query = { $and: [{ userId }] };

  if (platform === 'whatsapp') {
    query.$and.push({ $or: [{ platform: 'whatsapp' }, { platform: { $exists: false } }] });
  } else if (platform) {
    query.$and.push({ platform });
  }

  if (workspaceId && workspaceId !== 'main') {
    query.$and.push({ workspaceId });
  } else if (workspaceId === 'main') {
    query.$and.push({
      $or: [{ workspaceId: 'main' }, { workspaceId: { $in: [null, ''] } }, { workspaceId: { $exists: false } }]
    });
  }

  return query;
};

// @desc    Save or Update a Flow
// @route   POST /api/whatsapp/flows
async function saveFlow(req, res) {
  try {
    console.log("\n➡️ [DEBUG] POST /api/whatsapp/flows called!");
    console.log("➡️ [DEBUG] Request Body:", JSON.stringify(req.body).substring(0, 150) + "...");
    
    let { name, flowData, workspaceId, platform } = req.body; // 🚀 NEW: Get platform from request
    const userId = req.user?._id || req.user?.id;

    console.log(`➡️ [DEBUG] User ID from Auth: ${userId}`);

    if (!userId) {
      console.log("❌ [DEBUG] Unauthorized: User ID is missing.");
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login again.' });
    }

    if (!flowData) {
      console.log("❌ [DEBUG] Error: Flow data is missing.");
      return res.status(400).json({ success: false, message: 'Flow data is required' });
    }

    // Auto-generate name if it's missing or empty
    if (!name || name.trim() === '') {
      name = `Flow-${Math.floor(Math.random() * 10000)}`;
    }

    // Safe check to prevent MongoDB CastError for "main" string
    const isMainWorkspace = !workspaceId || workspaceId === 'main';
    const query = buildFlowSaveQuery({ userId, name, workspaceId, platform });

    // 🚀 STRICT BYPASS: Use findOneAndUpdate to force save workspaceId and flowData even if Model is outdated
    const updatePayload = { flowData, platform: platform || 'whatsapp' };
    if (!isMainWorkspace) updatePayload.workspaceId = workspaceId;

    console.log("➡️ [DEBUG] MongoDB Query:", query);

    let flow = await Flow.findOneAndUpdate(
      query,
      { $set: updatePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true, strict: false }
    );

    console.log("✅ [DEBUG] Flow saved successfully in MongoDB. Flow ID:", flow._id);

    res.status(200).json({ success: true, message: 'Flow saved successfully', flow });
  } catch (error) {
    console.error('❌ [DEBUG] Save Flow Error details:', error);
    res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
  }
}

// @desc    Get all Flows for User
// @route   GET /api/whatsapp/flows
async function getFlows(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId, platform, flowId } = req.query;

    // 🚀 FIX: Handle single flow fetch for the 'Load' button correctly.
    if (flowId) {
      const flow = await Flow.findOne({ _id: flowId, userId }).lean();
      return res.json({ success: true, data: flow ? [flow] : [] });
    }

    // 🚀 NEW DEBUG LOG: Fetch all flows for the user to see the total count before filtering.
    const allUserFlows = await Flow.find({ userId }).select('name platform workspaceId').lean();
    console.log(`[Flow Master Debug] User ${userId} has a total of ${allUserFlows.length} flows in the database.`);
    console.log('[Flow Master Debug] All Flows List:', allUserFlows.map(f => ({ 
      name: f.name, 
      platform: f.platform || 'whatsapp (old)', 
      workspace: f.workspaceId || 'main' 
    })));

    const query = buildFlowListQuery({ userId, workspaceId, platform });

    // 🚀 PERFORMANCE FIX: Exclude the heavy 'flowData' field when just listing flows.
    // This reduces the payload size from MBs to KBs, making the 'My Flows' modal load instantly.
    const flows = await Flow.find(query)
      .select({ flowData: 0 }) // Exclude flowData
      .sort({ createdAt: -1 })
      .lean();

    // 🚀 DEBUG LOG: Aapke liye special debug log
    console.log(`[Flow Debug] Found ${flows.length} flows for query:`, JSON.stringify(query));

    res.status(200).json({ success: true, data: flows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// @desc    Delete a Flow
// @route   DELETE /api/whatsapp/flows/:flowId
async function deleteFlow(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { flowId } = req.params;

    const deletedFlow = await Flow.findOneAndDelete({ _id: flowId, userId });

    if (!deletedFlow) {
      return res.status(404).json({ success: false, message: 'Flow not found or you do not have permission to delete it.' });
    }

    res.status(200).json({ success: true, message: 'Flow deleted successfully.' });
  } catch (error) {
    console.error('❌ [DEBUG] Delete Flow Error:', error);
    res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
  }
}

// @desc    Rename a Flow
// @route   PATCH /api/whatsapp/flows/:flowId/rename
async function renameFlow(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { flowId } = req.params;
    const { newName } = req.body;

    if (!newName || newName.trim() === '') {
      return res.status(400).json({ success: false, message: 'New name is required.' });
    }

    const updatedFlow = await Flow.findOneAndUpdate({ _id: flowId, userId }, { $set: { name: newName } }, { new: true });
    if (!updatedFlow) return res.status(404).json({ success: false, message: 'Flow not found.' });
    res.status(200).json({ success: true, message: 'Flow renamed successfully.', flow: updatedFlow });
  } catch (error) {
    console.error('❌ [DEBUG] Rename Flow Error:', error);
    res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
  }
}

// @desc    Re-assign a Flow to a different workspace
// @route   PATCH /api/whatsapp/flows/:flowId/reassign
async function reassignFlow(req, res) {
  try {
    const userId = req.user?._id || req.user?.id;
    const { flowId } = req.params;
    const { newWorkspaceId } = req.body;

    if (!newWorkspaceId) {
      return res.status(400).json({ success: false, message: 'New workspace ID is required.' });
    }

    const updatedFlow = await Flow.findOneAndUpdate({ _id: flowId, userId }, { $set: { workspaceId: newWorkspaceId } }, { new: true });
    if (!updatedFlow) return res.status(404).json({ success: false, message: 'Flow not found.' });
    res.status(200).json({ success: true, message: 'Flow re-assigned successfully.', flow: updatedFlow });
  } catch (error) {
    console.error('❌ [DEBUG] Re-assign Flow Error:', error);
    res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
  }
}

module.exports = {
  saveFlow,
  getFlows,
  deleteFlow,
  renameFlow,
  reassignFlow,
  buildFlowSaveQuery,
  buildFlowListQuery
};
