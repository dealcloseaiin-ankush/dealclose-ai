import React, { useState } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Default Stages from Blueprint
const COLUMNS = [
  { id: 'new', title: 'New Lead', color: 'border-blue-500' },
  { id: 'contacted', title: 'Contacted', color: 'border-yellow-500' },
  { id: 'interested', title: 'Interested', color: 'border-purple-500' },
  { id: 'negotiating', title: 'Negotiating', color: 'border-orange-500' },
  { id: 'converted', title: 'Converted', color: 'border-green-500' },
  { id: 'lost', title: 'Lost', color: 'border-red-500' }
];

export default function KanbanBoard({ initialData, onContactClick }) {
  const [columns, setColumns] = useState(initialData || {});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const contactId = active.id;
    const fromStage = active.data.current?.sortable?.containerId;
    // Dropping area can either be a container (stage) or another card
    const toStage = over.data.current?.sortable?.containerId || over.id; 

    if (!fromStage || !toStage || fromStage === toStage) return;

    // Optimistic Update: Instantly move the card on the UI
    setColumns((prev) => {
      const fromItems = [...(prev[fromStage] || [])];
      const toItems = [...(prev[toStage] || [])];
      
      const itemIndex = fromItems.findIndex(item => item._id === contactId);
      if (itemIndex === -1) return prev;
      
      const [movedItem] = fromItems.splice(itemIndex, 1);
      movedItem.crmStage = toStage;
      toItems.unshift(movedItem); // Add to top of new column

      return { ...prev, [fromStage]: fromItems, [toStage]: toItems };
    });

    // Send update to Backend
    try {
      await api.put(`/api/crm/contacts/${contactId}/stage`, { newStage: toStage });
      toast.success(`Moved to ${toStage}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to move stage');
      // Ideally, we should rollback the state here on failure.
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-140px)] items-start">
        {COLUMNS.map((col) => (
          <div 
            key={col.id} 
            className={`min-w-[320px] w-[320px] bg-gray-900 rounded-lg flex flex-col max-h-full border-t-4 ${col.color}`}
          >
            {/* Column Header */}
            <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center rounded-t-md">
              <h3 className="font-semibold text-gray-200 capitalize">{col.title}</h3>
              <span className="text-xs font-medium bg-gray-800 text-gray-400 px-2 py-1 rounded-full border border-gray-700">
                {(columns[col.id] || []).length}
              </span>
            </div>
            
            {/* Droppable Area */}
            <div className="p-3 flex-1 overflow-y-auto min-h-[150px]">
              <SortableContext id={col.id} items={(columns[col.id] || []).map(c => c._id)} strategy={verticalListSortingStrategy}>
                {(columns[col.id] || []).map(contact => (
                  <KanbanCard key={contact._id} contact={contact} onClick={onContactClick} />
                ))}
              </SortableContext>
            </div>
          </div>
        ))}
      </div>
    </DndContext>
  );
}