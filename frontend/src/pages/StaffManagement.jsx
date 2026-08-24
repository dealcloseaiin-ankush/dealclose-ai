import { useState, useEffect } from 'react';
import { Trash2, Edit, UserCheck, Mail, Lock, Phone, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function StaffManagement() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'sales',
    projects: ''
  });

  const fetchStaff = async () => {
    try {
      const res = await api.get('/users/staff');
      if (res.data?.staff) {
        setStaffList(res.data.staff);
      }
    } catch (err) {
      console.error('Failed to fetch staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);

    fetchStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/users/staff', {
        ...formData,
        workspaceId: activeWorkspace
      });

      toast.success(res.data?.message || 'Staff member saved successfully with login access!');
      if (res.data?.staff) {
        setStaffList(res.data.staff);
      } else {
        fetchStaff();
      }

      setFormData({ name: '', email: '', phone: '', password: '', role: 'sales', projects: '' });
      setEditMode(null);
    } catch (err) {
      console.error('Save staff error:', err);
      toast.error(err.response?.data?.message || 'Failed to save staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (staffId) => {
    if (!window.confirm('Are you sure you want to remove this staff member? Their login access will also be revoked.')) return;

    const toastId = toast.loading('Removing staff member...');
    try {
      const res = await api.delete(`/users/staff/${staffId}`);
      toast.success(res.data?.message || 'Staff member removed successfully.', { id: toastId });
      if (res.data?.staff) {
        setStaffList(res.data.staff);
      } else {
        setStaffList(prev => prev.filter(s => s._id !== staffId && s.id !== staffId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove staff.', { id: toastId });
    }
  };

  const handleEdit = (staff) => {
    setEditMode(staff._id || staff.id);
    setFormData({
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '',
      role: staff.role || 'sales',
      projects: staff.projects || ''
    });
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              Staff &amp; Routing Management
            </h1>
            <select 
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400 text-sm">
            Add team members, assign custom roles, and create their login credentials. Staff will only see leads assigned to their department.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Card */}
        <div className="lg:col-span-1 bg-[#111] border border-gray-800 rounded-3xl p-6 shadow-xl h-fit relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="text-indigo-400" size={20} />
              {editMode ? 'Edit Staff Details' : 'Add New Staff Member'}
            </h2>
            {editMode && (
              <button 
                onClick={() => { setEditMode(null); setFormData({ name: '', email: '', phone: '', password: '', role: 'sales', projects: '' }); }} 
                className="text-xs text-rose-400 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-xs font-semibold mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g. Rahul Sharma" 
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-semibold mb-1">Staff Login Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="e.g. rahul@yourbusiness.com" 
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Staff will use this email to log in to DealClose AI.</p>
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-semibold mb-1">Staff Password</label>
              <input 
                type="text" 
                value={formData.password} 
                onChange={e => setFormData({ ...formData, password: e.target.value })} 
                placeholder={editMode ? 'Leave blank to keep unchanged' : 'Default: staff1234'} 
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-gray-400 text-xs font-semibold mb-1">WhatsApp Mobile Number</label>
              <input 
                type="text" 
                required 
                value={formData.phone} 
                onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                placeholder="+91 9876543210" 
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors" 
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-xs font-semibold mb-1">Staff Role</label>
              <select 
                required 
                value={formData.role} 
                onChange={e => setFormData({ ...formData, role: e.target.value })} 
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="sales">Sales Representative (Leads &amp; Calling)</option>
                <option value="support">Customer Support (Chats &amp; Tickets)</option>
                <option value="manager">Branch Manager (Full Branch Access)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 text-xs font-semibold mb-1">Department / Assigned Project</label>
              <input 
                type="text" 
                value={formData.projects} 
                onChange={e => setFormData({ ...formData, projects: e.target.value })} 
                placeholder="e.g. Real Estate Leads, VIP Support" 
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={submitting} 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 text-sm mt-2 disabled:opacity-50"
            >
              {submitting ? 'Saving Credentials...' : (editMode ? 'Update Staff Member' : 'Add Staff & Grant Access')}
            </button>
          </form>
        </div>

        {/* Staff List Cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 text-center text-gray-500 py-12">Loading team members...</div>
            ) : staffList.filter(s => (s.workspaceId || 'main') === activeWorkspace).length === 0 ? (
              <div className="col-span-2 bg-[#111] border border-gray-800 rounded-3xl p-10 text-center text-gray-500">
                No staff members added yet for this workspace. Add your sales &amp; support team to start routing leads!
              </div>
            ) : staffList.filter(s => (s.workspaceId || 'main') === activeWorkspace).map(staff => (
              <div key={staff._id || staff.id || staff.phone} className="bg-[#111] border border-gray-800 hover:border-gray-700 rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">{staff.name}</h3>
                    {staff.email && (
                      <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                        <Mail size={13} className="text-indigo-400" /> {staff.email}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                      <Phone size={13} className="text-emerald-400" /> {staff.phone}
                    </p>
                    {staff.projects && (
                      <p className="text-xs text-indigo-300/80 font-medium mt-2 bg-indigo-500/10 px-2.5 py-1 rounded-lg w-fit">
                        Project: {staff.projects}
                      </p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${staff.role === 'sales' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : staff.role === 'support' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                    {staff.role}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-gray-800/80 pt-3">
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Shield size={13} className="text-gray-400" /> Login Access Enabled
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(staff)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Edit Staff">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(staff._id || staff.id || staff.phone)} className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition-colors" title="Remove Staff">
                      <Trash2 size={16} />
                    </button>
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