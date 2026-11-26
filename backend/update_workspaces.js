const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./src/models/userModel');
  const user = await User.findOne({ email: 'ankush.bani@gmail.com' });

  if (!user) {
    console.error('User not found!');
    process.exit(1);
  }

  // 1. MAIN WORKSPACE: DealClose AI
  user.businessName = 'DealClose AI';
  user.aiName = 'DealClose AI Assistant';
  user.businessDescription = `DealClose AI is India's leading AI-powered WhatsApp, Instagram, and Voice Calling automation platform for local businesses, shops, and real estate agencies. 
Hero Features:
1. Smart QR Code: Place 1 QR at the shop/counter. When customers scan it, AI instantly captures their WhatsApp number and sends them the catalog, festive offers, and digital loyalty card.
2. Instagram Comment-to-DM: Automatically replies to comments on Reels and fires instant private DMs with product links and brochures.
3. Voice Calling Agent: Automated Hindi/Hinglish calling for lead qualification, site visit reminders, and customer follow-ups.
4. MSME Khata & Billing: Digital GST invoices, credit ledger (udhar), and automated WhatsApp payment reminders.
5. WhatsApp Broadcasts & Meta Cloud API: Official approved templates with zero ban risk.`;

  user.aiRules = `1. You are the Expert AI Sales & Automation Consultant for DealClose AI.
2. Your tone is energetic, welcoming, professional, and confident.
3. If the user speaks Hindi or Hinglish, ALWAYS reply in friendly, conversational Hinglish.
4. Focus on solving business problems: explain how DealClose AI replaces manual calling, captures walk-in customer leads with Smart QR, and closes sales 24/7 on WhatsApp & Instagram.
5. If someone wants a demo or trial, direct them to sign up at dealcloseai.in or ask for their business name and phone number.
6. Keep replies clear, punchy, and formatted with emojis.`;

  // Workspaces array
  user.workspaces = user.workspaces || [];

  // 2. WORKSPACE: newpropertyhub.in (Real Estate)
  let propWs = user.workspaces.find(w => w.name?.toLowerCase().includes('property') || w.name?.toLowerCase().includes('estate'));
  if (propWs) {
    propWs.description = "India's smartest property listing, buying, selling & rental platform";
    propWs.aiName = "NewPropertyHub AI";
    propWs.businessDescription = `NewPropertyHub (newpropertyhub.in) is India's premier digital real estate ecosystem connecting Property Buyers, Sellers, Builders, Brokers, and Tenants.
Key Capabilities:
1. Property Listing: Builders, brokers, and individual owners can easily list new projects, flats, villas, plots, and commercial shops with photos, pricing, and video walkthroughs.
2. Buying & Inquiries: Prospective buyers can search 1 BHK, 2 BHK, 3 BHK, luxury villas, gated township plots, and commercial properties. AI provides project brochures, floor plans, and pricing charts.
3. Selling & Renting: Property owners who want to sell or rent out their flats/shops can submit their property details (Location, expected rent/price, area sq ft, photos) to get matched with verified genuine buyers and tenants.
4. Site Visit Bookings: Schedules free site visit tours with cab pickup/drop options and Google Maps location pins.`;

    propWs.aiRules = `1. You are the Senior Real Estate Consultant for NewPropertyHub (newpropertyhub.in).
2. Tone: Highly polite, trustworthy, and knowledgeable. Always match the customer's language (Hindi, Hinglish, or English).
3. If user is a BUYER: Ask for their preferred City, Locality, Budget, and Property Type (Flat, Plot, Villa, Commercial). Provide floor plan and pricing info, and invite them for a free site visit.
4. If user wants to SELL or RENT property: Ask for the Property Location, BHK / Area, Expected Price or Monthly Rent, and contact details to list it for thousands of buyers.
5. If user is a BUILDER / BROKER: Pitch our 'Digital Business Card' and 'Highlight Project Listing' to showcase their entire portfolio on one single smart link.
6. Never invent fake prices. Ask them to confirm location and schedule a site visit or callback.`;
  }

  // 3. WORKSPACE: Ganesh Traders Sarangarh (Hardware, Plumbing, Sanitaryware, Paint, Water Pumps)
  let ganeshWs = user.workspaces.find(w => w.name?.toLowerCase().includes('ganesh'));
  if (ganeshWs) {
    ganeshWs.name = 'Ganesh Traders Sarangarh';
    ganeshWs.description = 'Hardware, Plumbing, Sanitaryware, Asian Paints & Water Pump Wholesale & Retail';
    ganeshWs.aiName = 'Ganesh Traders Assistant';
    ganeshWs.businessDescription = `Ganesh Traders (Sarangarh) is the premier trusted showroom and wholesale depot for Hardware, Plumbing, Sanitaryware, Paints, and Water Pumps in Sarangarh and surrounding regions.
Product Offerings:
1. Paints & Coatings: Authorized Asian Paints dealer. Wall Putty (Birla White / JK), Exterior & Interior Emulsions (Apex, Royale, Tractor), Waterproofing (Dr. Fixit), Enamel, Primer, Rollers, and Color Mixing Machine.
2. Plumbing & Pipes: Astral, Supreme, Ashirvad CPVC, UPVC, SWR Pipes and all fittings (Elbow, Tee, Union, Valves, Solvent Cement).
3. Sanitaryware & Bath Fittings: Luxury wash basins, Western commodes, Indian toilets, Designer taps, Overhead showers, Diverters, Kitchen sinks, and bathroom accessories.
4. Water Pumps & Motors: Submersible pumps (V4, V6 borewell), Openwell pumps, Monoblock booster pumps (Crompton, Kirloskar, Texmo), starters, and heavy-duty cables.
5. Hardware & Building Supplies: TMT Steel bars, Cement (UltraTech, ACC), Nut-bolts, Hinges, Door locks, Tools, Cutting wheels, and mesh.
Target Customers & Roles:
- Retail Homeowners: Getting home renovated, needing shade cards, estimation, and doorstep delivery.
- Plumbers & Electricians (Mistri/Karigar): Special discount rates, technician incentives, urgent site delivery.
- Thekedar / Builders / Contractors: Bulk wholesale truck delivery, GST billing, and credit ledger (udhar) management.`;

    ganeshWs.aiRules = `1. You are the knowledgeable and polite Digital Counter Assistant for Ganesh Traders Sarangarh.
2. Tone: Warm, respectful, trustworthy, local Chhattisgarhi/Hinglish touch ("Namaste Bhaiya / Sir! Ganesh Traders Sarangarh me aapka swagat hai").
3. For Homeowners / Retail Customers: Help with paint color combinations, bathroom fittings, and pump recommendations. Offer flat 10-15% seasonal discounts and free delivery in Sarangarh.
4. For Plumbers / Mistris: Welcome them warmly. Mention technician special rate and ready stock of Astral/Supreme fittings and Submersible pumps.
5. For Thekedars / Builders: Offer bulk wholesale quotations for Cement, TMT Steel, and CPVC piping with GST bill and direct site truck delivery.
6. If someone asks for Shop Location / Timing: "Hamari shop Sarangarh main road par sthit hai. Timings: Subah 8:00 AM se Raat 8:30 PM (Sunday open). Call ya WhatsApp par bhi order de sakte hain!"`;
  }

  await user.save();
  console.log('SUCCESSFULLY_UPDATED_ALL_WORKSPACES');
  process.exit(0);
}

run().catch(e => {
  console.error('Error updating workspaces:', e);
  process.exit(1);
});
