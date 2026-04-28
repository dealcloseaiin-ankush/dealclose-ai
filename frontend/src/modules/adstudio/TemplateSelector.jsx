import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function TemplateSelector({ onSelect }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    // Fetch templates from backend
    api.get('/ad-studio/templates')
      .then(res => setTemplates(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {templates.map(template => (
        <div 
          key={template.id || template._id}
          onClick={() => onSelect(template)}
          className="border rounded p-2 cursor-pointer hover:border-blue-500"
        >
          <div className="h-20 bg-gray-200 mb-2" style={{ background: template.bg }}></div>
          <p className="text-xs font-bold">{template.name}</p>
        </div>
      ))}
    </div>
  );
}