import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="p-4 bg-white shadow-sm border-b flex justify-between items-center">
      <div>
        {/* Can be used for breadcrumbs or page title */}
      </div>
      <div className="font-semibold">
        Welcome, {user?.fullName || 'User'}
      </div>
    </nav>
  );
}