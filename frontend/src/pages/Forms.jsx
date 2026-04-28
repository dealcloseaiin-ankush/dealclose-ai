import { useState, useEffect } from 'react';
import { getForms } from '../services/formService';
import { Link } from 'react-router-dom';

export default function Forms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getForms()
      .then(setForms)
      .catch(err => console.error("Failed to fetch forms", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Forms</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading && <p>Loading forms...</p>}
        {!loading && forms.map(form => (
          <div key={form._id} className="p-4 bg-white rounded shadow">
            <h3 className="font-bold">{form.title}</h3>
            <p className="text-sm text-gray-500">{form.submissions?.length || 0} submissions</p>
            <Link to={`/forms/${form._id}`} className="text-blue-600 hover:underline mt-2 inline-block">View Form</Link>
          </div>
        ))}
        {!loading && forms.length === 0 && <p>No forms created yet.</p>}
      </div>
    </div>
  );
}