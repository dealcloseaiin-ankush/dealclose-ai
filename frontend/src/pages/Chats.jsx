import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';

export default function Chats() {
  const [allMessages, setAllMessages] = useState([]);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      try {
        // const { data } = await api.get('/chats');
        // setAllMessages(data);
        
        // Using mock data for now
        const mockData = [
          { _id: 1, customerPhone: '+919876543210', direction: 'incoming', messageText: 'Hello, I want to buy your premium plan.', sentBy: 'customer', timestamp: new Date().toISOString() },
          { _id: 2, customerPhone: '+919876543210', direction: 'outgoing', messageText: 'Sure! Let me check that for you.', sentBy: 'ai', timestamp: new Date().toISOString() },
          { _id: 3, customerPhone: '+911234567890', direction: 'incoming', messageText: 'What is the price?', sentBy: 'customer', timestamp: new Date().toISOString() },
        ];
        setAllMessages(mockData);
        if (mockData.length > 0) {
          setActiveCustomer(mockData[0].customerPhone);
        }

      } catch (error) {
        console.error("Failed to fetch chats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const customerList = useMemo(() => {
    const customers = new Set(allMessages.map(m => m.customerPhone));
    return Array.from(customers);
  }, [allMessages]);

  const activeChatMessages = useMemo(() => {
    return allMessages.filter(m => m.customerPhone === activeCustomer);
  }, [allMessages, activeCustomer]);

  const sendReply = async () => {
    if (!replyText.trim() || !activeCustomer) return;

    const newMessage = {
      _id: Date.now(),
      customerPhone: activeCustomer,
      direction: 'outgoing',
      messageText: replyText,
      sentBy: 'staff',
      timestamp: new Date().toISOString()
    };

    // Optimistic UI update
    setAllMessages(prev => [...prev, newMessage]);
    setReplyText("");

    try {
      // Real API call to backend chatController
      await api.post('/chats/send', { customerPhone: activeCustomer, messageText: replyText });
    } catch (error) {
        console.error("Failed to send message", error);
        // Optional: handle error, e.g., remove the optimistic message
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] p-6 bg-gray-50">
      {/* Sidebar for Customers */}
      <div className="w-1/3 bg-white border-r rounded-l-lg p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Active Chats</h2>
        {loading ? <p>Loading chats...</p> : (
          customerList.map(phone => (
            <div 
              key={phone}
              onClick={() => setActiveCustomer(phone)}
              className={`p-3 cursor-pointer rounded font-medium mb-2 ${activeCustomer === phone ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'}`}
            >
              {phone}
            </div>
          ))
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-r-lg shadow">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeChatMessages.map(msg => (
            <div key={msg._id} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 max-w-sm rounded-lg ${msg.direction === 'outgoing' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                <p>{msg.messageText}</p>
                <span className="text-xs opacity-75 mt-1 block capitalize">Sent by: {msg.sentBy}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-gray-50 border-t flex gap-2">
          <input 
            type="text" 
            value={replyText} 
            onChange={e => setReplyText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && sendReply()}
            placeholder="Type a manual reply..." 
            className="flex-1 p-2 border rounded" 
            disabled={!activeCustomer}
          />
          <button onClick={sendReply} disabled={!activeCustomer} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400">Send</button>
        </div>
      </div>
    </div>
  );
}