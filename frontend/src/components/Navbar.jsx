import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user } = useAuth();

  return (
    // 🚀 FIXED: bg-white ko badal kar transparent/dark kiya aur shadow/border ko sahi kiya taaki patti saaf ho jaye
    <nav className="p-4 bg-[#050505] border-b border-gray-800 flex justify-between items-center z-10">
      <div>
        {/* Left side blank rakha hai jisse sidebar ke sath wrap space seamless dikhe */}
      </div>
      
      {/* 🚀 FIXED: Text color ko white kiya taaki dark background par perfectly visible ho */}
      <div className="font-semibold text-gray-300">
        Welcome, {user?.fullName || 'User'}
      </div>
    </nav>
  );
}