import React from 'react';
import { X, MessageSquare, Phone, MoreHorizontal, Bot, User, Calendar, Tag } from 'lucide-react';

export default function ContactDrawer({ contact, isOpen, onClose }) {
  if (!isOpen || !contact) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#111111] border-l border-gray-800 shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 translate-x-0">
        
        {/* Header */}
        <div className="sticky top-0 bg-[#111111] border-b border-gray-800 p-5 flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 p-2 rounded-full">
              <X size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">{contact.name}</h2>
              <p className="text-sm text-gray-400">{contact.phone}</p>
            </div>
          </div>
          <div className="flex gap-2 text-gray-400">
            <button className="p-2 bg-[#1a1a1a] hover:bg-green-600 hover:text-white rounded-full transition-colors" title="WhatsApp"><MessageSquare size={18} /></button>
            <button className="p-2 bg-[#1a1a1a] hover:bg-blue-600 hover:text-white rounded-full transition-colors" title="Call"><Phone size={18} /></button>
            <button className="p-2 bg-[#1a1a1a] hover:bg-gray-800 rounded-full transition-colors"><MoreHorizontal size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Details Section */}
          <div className="bg-[#1a1a1a] p-5 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
              <span className="text-sm text-gray-500 font-semibold">Stage</span>
              <select className="bg-[#0a0a0a] border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-sky-500 capitalize">
                <option value={contact.crmStage}>{contact.crmStage}</option>
                <option value="negotiating">Negotiating</option>
                <option value="converted">Converted</option>
              </select>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
              <span className="text-sm text-gray-500 font-semibold">AI Score</span>
              {contact.aiScore > 0 ? (
                <span className="flex items-center gap-1 text-sm font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md"><Bot size={14}/> {contact.aiScore}/100</span>
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-gray-800/50">
              <span className="text-sm text-gray-500 font-semibold">Deal Value</span>
              <span className="text-sm font-bold text-white">₹{contact.dealValue?.toLocaleString() || 0}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 font-semibold">Assigned To</span>
              <span className="flex items-center gap-1 text-sm text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md"><User size={14}/> {contact.assignedAgent || 'Unassigned'}</span>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2"><Tag size={16}/> Tags</h3>
            <div className="flex flex-wrap gap-2">
              {(contact.tags || ['New Lead', 'Website']).map((tag, i) => (
                <span key={i} className="bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full border border-gray-700">{tag}</span>
              ))}
              <button className="bg-gray-900 text-gray-500 text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-700 hover:text-white transition-colors">+ Add Tag</button>
            </div>
          </div>

          {/* Timeline / Activity History */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2"><Calendar size={16}/> Activity Timeline</h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-800 before:to-transparent">
              
              {/* Sample Timeline Item */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 bg-[#1a1a1a] text-sky-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Bot size={18} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-gray-200 text-sm">AI Agent Responded</div>
                    <time className="font-caveat text-xs font-medium text-gray-500">2 hours ago</time>
                  </div>
                  <div className="text-sm text-gray-400">"Sure, I can help you with the pricing. Our starter plan begins at ₹999/mo."</div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-700 bg-[#1a1a1a] text-green-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <MessageSquare size={18} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 shadow">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-gray-200 text-sm">Customer Replied</div>
                    <time className="font-caveat text-xs font-medium text-gray-500">5 hours ago</time>
                  </div>
                  <div className="text-sm text-gray-400">"What is the price of the pro plan?"</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}