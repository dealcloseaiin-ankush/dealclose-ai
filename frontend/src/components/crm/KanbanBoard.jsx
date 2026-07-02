import React, { useState } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLUMNS = [
  { id: 'new', title: 'New Lead', color: 'border-blue-500' },
  { id: 'hot', title: 'Hot Lead 🔥', color: 'border-orange-600' },
  { id: 'warm', title: 'Warm Lead ⚡', color: 'border-purple-500' },
  { id: 'cold', title: 'Cold Follow-up', color: 'border-cyan-600' },
  { id: 'existing', title: 'Existing Client', color: 'border-indigo-500' },
  { id: 'vip', title: 'VIP Deal ⭐', color: 'border-amber-500' },
  { id: 'converted', title: 'Converted 🎉', color: 'border-green-500' },
  { id: 'lost', title: 'Lost Case ❌', color: 'border-red-500' }
];

// 🆕 NEW: Har column ab khud ek droppable target hai — chahe khaali ho ya bhari,
// drop hamesha kaam karega. Pehle sirf cards droppable the, isliye khaali
// column mein lead drop hi nahi hoti thi.
function KanbanColumn({ col, items, onContactClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[320px] w-[320px] bg-gray-900 rounded-lg flex flex-col max-h-full border-t-4 border-t-solid transition-colors ${isOver ? 'ring-2 ring-sky-500 bg-gray-800/80' : 'border-gray-800'}`}
      style={{ borderTopColor: col.color.includes('-') ? undefined : col.color }}
    >
      <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center rounded-t-md">
        <h3 className="font-semibold text-gray-200 capitalize text-sm">{col.title}</h3>
        <span className="text-xs font-medium bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">
          {items.length}
        </span>
      </div>

      <div className="p-3 flex-1 overflow-y-auto min-h-[200px] bg-gray-950/40">
        <SortableContext id={col.id} items={items.map(c => c._id || c.id)} strategy={verticalListSortingStrategy}>
          {items.map(contact => (
            <KanbanCard key={contact._id || contact.id} contact={contact} onClick={onContactClick} />
          ))}
          {items.length === 0 && (
            <div className="text-center text-xs text-gray-600 py-8 border border-dashed border-gray-800 rounded-lg">
              Drop a lead here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

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
    // Column par direct drop ho (khaali column) -> over.id column id hi hoga
    const toStage = over.data.current?.sortable?.containerId || over.id;

    if (!fromStage || !toStage || fromStage === toStage) return;

    setColumns((prev) => {
      const fromItems = [...(prev[fromStage] || [])];
      const toItems = [...(prev[toStage] || [])];

      const itemIndex = fromItems.findIndex(item => item._id === contactId || item.id === contactId);
      if (itemIndex === -1) return prev;

      const [movedItem] = fromItems.splice(itemIndex, 1);
      movedItem.status = toStage.toLowerCase();
      movedItem.crmStage = toStage.toLowerCase();
      toItems.unshift(movedItem);

      return { ...prev, [fromStage]: fromItems, [toStage]: toItems };
    });

    try {
      await api.put(`/crm/contacts/${contactId}/stage`, { newStage: toStage.toLowerCase() });
      toast.success(`Pipeline moved to ${toStage.toUpperCase()} successfully!`);
    } catch (err) {
      console.error("CRM Drag Drop Error:", err);
      toast.error('Sync failed. Rolling back current card state.');
      window.location.reload();
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 h-[calc(100vh-140px)] items-start">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            items={columns[col.id] || []}
            onContactClick={onContactClick}
          />
        ))}
      </div>
    </DndContext>
  );
}