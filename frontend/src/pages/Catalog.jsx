
export default function Catalog() {
  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">Catalog & Listings</h1>
          <p className="text-gray-400">Manage your products, services, or real estate properties here. AI will use this data to answer customers.</p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-600/30">+ Add New Item</button>
      </div>

      <div className="bg-[#111] rounded-2xl border border-gray-800 p-8 text-center text-gray-500">
        <p className="text-4xl mb-4">📦</p>
        <h2 className="text-xl font-bold text-gray-300 mb-2">Your Catalog is Empty</h2>
        <p className="mb-6">Add your products or properties so AI can recommend them to customers.</p>
      </div>
    </div>
  );
}