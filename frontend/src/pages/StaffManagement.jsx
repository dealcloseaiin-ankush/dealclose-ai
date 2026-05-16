import { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';

export default function StaffManagement() {
  // Start with empty real staff list
  const [staffList, setStaffList] = useState([]);

  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', role: 'sales', projects: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editMode) {
      setStaffList(staffList.map(s => s.id === editMode ? { ...formData, id: editMode } : s));
      alert("Staff details updated!");
    } else {
      const newStaff = { ...formData, id: Date.now() };
      setStaffList([...staffList, newStaff]);
      alert("Staff member added! AI will now route relevant chats to them.");
    }
    setFormData({ name: '', phone: '', role: 'sales', projects: '' });
    setEditMode(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to remove this staff member?")) {
      setStaffList(staffList.filter(s => s.id !== id));
    }
  };

  const handleEdit = (staff) => {
    setEditMode(staff.id);
    setFormData({ name: staff.name, phone: staff.phone, role: staff.role, projects: staff.projects });
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">Staff & Routing Management</h1>
        <p className="text-gray-400">Add your team members here. If AI cannot answer a question, it will escalate the chat to the right department.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">{editMode ? 'Edit Staff' : 'Add New Staff'}</h2>
            {editMode && <button onClick={() => {setEditMode(null); setFormData({name:'', phone:'', role:'sales', projects:''})}} className="text-xs text-rose-400 hover:underline">Cancel</button>}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" />
            <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="WhatsApp Number (e.g. +91...)" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" />
            
            <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500">
              <option value="sales">Sales Team</option>
              <option value="support">Customer Support</option>
              <option value="manager">Manager / Owner</option>
            </select>
            
            <label className="block text-xs text-gray-500 mt-2">Department / Assigned Task</label>
            <input type="text" required value={formData.projects} onChange={e => setFormData({...formData, projects: e.target.value})} placeholder="e.g. Lead Qualification, Support" className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" />
            
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2">
              {editMode ? 'Update Staff Details' : 'Add Staff Member'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.length === 0 ? (
               <div className="col-span-2 bg-[#111] border border-gray-800 rounded-2xl p-10 text-center text-gray-500">
                 No staff members added yet. Add your team to start routing leads!
               </div>
            ) : staffList.map(staff => (
              <div key={staff.id} className="bg-[#111] border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">{staff.name}</h3>
                  <p className="text-gray-400 text-sm">{staff.phone}</p>
                  <p className="text-xs text-indigo-400 font-medium mt-1">
                     Responsibility: {staff.projects}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${staff.role === 'sales' ? 'bg-green-500/20 text-green-400' : staff.role === 'support' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {staff.role}
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => handleEdit(staff)} className="text-gray-500 hover:text-white transition-colors"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(staff.id)} className="text-gray-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}