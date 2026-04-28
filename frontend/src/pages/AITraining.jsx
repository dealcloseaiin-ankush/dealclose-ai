import { useState } from 'react';

export default function AITraining() {
  // Mock data for MVP. Later fetch from user.trainingData
  const [queries, setQueries] = useState([
    { id: 1, phone: '+919876543210', question: 'Do you offer cash on delivery for bulk orders?', status: 'unanswered' },
    { id: 2, phone: '+918765432109', question: 'What is the warranty period for the smartwatch?', status: 'unanswered' }
  ]);

  const handleProvideAnswer = (id, e) => {
    e.preventDefault();
    const answer = e.target.answer.value;
    if (!answer) return;
    
    // Remove from list (In real app, send to backend to update AI Master Prompt/Knowledge Base)
    setQueries(queries.filter(q => q.id !== id));
    alert("AI has learned this answer! It will now reply automatically to similar questions.");
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">AI Training Center</h1>
        <p className="text-gray-400">Teach your AI how to answer questions it couldn't handle automatically.</p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {queries.length === 0 ? (
          <div className="bg-[#111] p-10 rounded-2xl border border-gray-800 text-center text-gray-500">
            <p className="text-4xl mb-4">🧠</p>
            <p>Your AI knows everything right now! No unanswered questions.</p>
          </div>
        ) : (
          queries.map((q) => (
            <div key={q.id} className="bg-[#111] p-6 rounded-2xl border border-rose-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm text-gray-400">Customer {q.phone} asked:</p>
                <span className="bg-rose-500/10 text-rose-400 text-xs px-3 py-1 rounded-full font-bold">Needs Answer</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-6">"{q.question}"</h3>
              
              <form onSubmit={(e) => handleProvideAnswer(q.id, e)} className="flex gap-4">
                <input type="text" name="answer" placeholder="Type the correct answer for the AI..." className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none" required />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-bold transition-colors">Teach AI & Reply</button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}