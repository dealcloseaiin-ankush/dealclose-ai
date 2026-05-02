import React from 'react';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

export default function FlowBuilder() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">Visual Flow Builder</h1>
        <p className="text-gray-400">Drag and drop to build custom chatbot workflows and AI triggers.</p>
      </div>

      <EmptyState 
        icon="🛠️"
        title="Flow Builder is under construction"
        description="We are building a powerful drag-and-drop canvas for you to create complex chatbot logic visually. Stay tuned!"
        actionButton={<Button variant="ghost">Read Documentation</Button>}
      />
    </div>
  );
}