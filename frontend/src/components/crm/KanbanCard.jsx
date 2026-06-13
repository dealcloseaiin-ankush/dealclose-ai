import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, Phone, Bot, User, CalendarClock } from 'lucide-react';

export default function KanbanCard({ contact, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: contact._id, 
    data: contact 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onClick(contact); }}
      className={`bg-gray-800 p-4 rounded-md mb-3 cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-sky-500 shadow-sm border border-gray-700 relative group ${isDragging ? 'shadow-2xl z-50 ring-2 ring-sky-500' : ''}`}
    >
      {/* Top section: Name & AI/Human tag */}
      <div className="flex justify-between items-start mb-1">
        <h4 className="font-medium text-gray-100 truncate pr-2">{contact.name}</h4>
        <div className="flex items-center gap-1 text-xs shrink-0">
          {contact.aiScore > 0 ? (
            <span className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded flex items-center gap-1" title="AI Score">
              <Bot size={12} /> {contact.aiScore}
            </span>
          ) : (
            <span className="text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1" title="Human Handled">
              <User size={12} />
            </span>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-400 mb-1">{contact.phone}</div>
      
      <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 mb-3">
        <CalendarClock size={12} />
        {contact.createdAt ? new Date(contact.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
        {contact.source && contact.source.toLowerCase().includes('website') && (
          <span className="ml-auto bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">🌐 Website</span>
        )}
      </div>
      
      {/* Bottom section: Value & Quick Actions */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700/50">
        <div className="text-sm font-medium text-gray-300">
          ₹{contact.dealValue?.toLocaleString('en-IN') || 0}
        </div>
        <div className="flex gap-3 text-gray-400">
          <button className="hover:text-sky-400 transition-colors" title="Send WhatsApp">
            <MessageSquare size={16} />
          </button>
          <button className="hover:text-sky-400 transition-colors" title="Make Call">
            <Phone size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}