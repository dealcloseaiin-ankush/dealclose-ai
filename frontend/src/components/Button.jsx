export default function Button({ children, onClick, className = '', type = 'button', disabled = false }) {
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}