import { useState } from 'react';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState([
    { id: 1, name: 'Rahul Sharma', phone: '+919876543210', role: 'sales' },
    { id: 2, name: 'Priya Verma', phone: '+918765432109', role: 'support' }
  ]);

  const handleAddStaff = (e) => {
    e.preventDefault();
    const newStaff = {
      id: Date.now(),
      name: e.target.name.value,
      phone: e.target.phone.value,
      role: e.target.role.value
    };
    setStaffList([...staffList, newStaff]);
    e.target.reset();
    alert("Staff member added! AI will now route relevant chats to them.");
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 mb-2">Staff & Routing Management</h1>
        <p className="text-gray-400">Add your team members here. If AI cannot answer a question, it will escalate the chat to the right department.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl h-fit">
          <h2 className="text-xl font-bold mb-6 text-white">Add New Staff</h2>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <input type="text" name="name" placeholder="Full Name" required className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" />
            <input type="text" name="phone" placeholder="WhatsApp Number (e.g. +91...)" required className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500" />
            <select name="role" required className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500">
              <option value="sales">Sales Team</option>
              <option value="support">Customer Support</option>
              <option value="manager">Manager / Owner</option>
            </select>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2">Add Staff Member</button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map(staff => (
              <div key={staff.id} className="bg-[#111] border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">{staff.name}</h3>
                  <p className="text-gray-400 text-sm">{staff.phone}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${staff.role === 'sales' ? 'bg-green-500/20 text-green-400' : staff.role === 'support' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                  {staff.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}