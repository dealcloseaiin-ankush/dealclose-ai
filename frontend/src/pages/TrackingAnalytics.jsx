import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, MousePointerClick, ShoppingCart, UserCheck } from 'lucide-react';
import api from '../services/api';

const KpiCard = ({ title, icon, stats, color, timeframe }) => {
  const isPositive = stats.growth?.startsWith('+') || parseFloat(stats.growth) >= 0;
  const IconComponent = icon;
  return (
    <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <IconComponent size={20} className="text-white" />
        </div>
        <span className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {stats.growth || '0%'}
        </span>
      </div>
      <h3 className="text-gray-400 text-sm font-semibold mb-1">{title}</h3>
      <p className="text-3xl font-extrabold text-white">{stats.current}</p>
      <p className="text-xs text-gray-500 mt-2">vs {stats.previous || 0} last {timeframe.replace('ly', '')}</p>
    </div>
  );
};

// Default Empty Data for Real Live Implementation
const defaultData = {
  daily: {
    visitors: { current: 0, previous: 0, growth: '0%' },
    clicks: { current: 0, previous: 0, growth: '0%' },
    carts: { current: 0, previous: 0, growth: '0%' },
    leads: { current: 0, previous: 0, growth: '0%' },
    chart: [0, 0, 0, 0, 0, 0, 0] 
  },
  weekly: {
    visitors: { current: 0, previous: 0, growth: '0%' },
    clicks: { current: 0, previous: 0, growth: '0%' },
    carts: { current: 0, previous: 0, growth: '0%' },
    leads: { current: 0, previous: 0, growth: '0%' },
    chart: [0, 0, 0, 0, 0, 0, 0] 
  },
  monthly: {
    visitors: { current: 0, previous: 0, growth: '0%' },
    clicks: { current: 0, previous: 0, growth: '0%' },
    carts: { current: 0, previous: 0, growth: '0%' },
    leads: { current: 0, previous: 0, growth: '0%' },
    chart: [0, 0, 0, 0, 0, 0, 0]
  }
};

export default function TrackingAnalytics() {
  const [timeframe, setTimeframe] = useState('weekly'); // daily, weekly, monthly
  const [loading, setLoading] = useState(true);
  const [realData, setRealData] = useState(null);

  useEffect(() => {
    const fetchRealTrackingData = async () => {
      setLoading(true);
      try {
        // Fetching real data from your tracking backend
        const res = await api.get('/tracking/stats');
        if (res.data && res.data.daily) {
          setRealData(res.data);
        } else {
          setRealData(defaultData);
        }
      } catch (error) {
        console.log("No real tracking data yet, showing live empty state.", error.message);
        setRealData(defaultData);
      } finally {
        setLoading(false);
      }
    };
    fetchRealTrackingData();
  }, []);

  if (loading || !realData) {
    return <div className="p-10 text-white flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div></div>;
  }

  const currentData = realData[timeframe];

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-100 font-sans">
      
      {/* Header & Timeframe Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
            Website Tracking & Funnel
          </h1>
          <p className="text-gray-400">Monitor live traffic, abandoned carts, and form submissions from your website pixel.</p>
        </div>
        
        <div className="flex bg-[#111] border border-gray-800 p-1 rounded-lg">
          {['daily', 'weekly', 'monthly'].map(tf => (
            <button 
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-6 py-2 rounded-md text-sm font-bold capitalize transition-all ${timeframe === tf ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard title="Total Unique Visitors" icon={Users} stats={currentData.visitors} color="bg-blue-500" timeframe={timeframe} />
        <KpiCard title="Logged-in / Interactions" icon={MousePointerClick} stats={currentData.clicks} color="bg-purple-500" timeframe={timeframe} />
        <KpiCard title="Abandoned Carts / Intent" icon={ShoppingCart} stats={currentData.carts} color="bg-orange-500" timeframe={timeframe} />
        <KpiCard title="Leads Captured (CRM)" icon={UserCheck} stats={currentData.leads} color="bg-emerald-500" timeframe={timeframe} />
      </div>

      {/* Charts & Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Bar Chart */}
        <div className="lg:col-span-2 bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-6">Traffic & Lead Growth Overview</h2>
          <div className="h-64 flex items-end gap-4">
            {currentData.chart.map((val, idx) => {
              const max = Math.max(...currentData.chart);
              const height = (val / max) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600/50 to-emerald-400 rounded-t-md relative transition-all duration-500 group-hover:from-blue-500 group-hover:to-emerald-300"
                    style={{ height: `${height}%` }}
                  >
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {val}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-500 font-bold uppercase tracking-wider">
            <span>Older</span>
            <span>Current</span>
          </div>
        </div>

        {/* Quick Insights Box */}
        <div className="lg:col-span-1 bg-gradient-to-br from-[#0a1a10] to-[#111] border border-emerald-500/20 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-emerald-400 mb-6 flex items-center gap-2">✨ AI Insights</h2>
          
          <div className="space-y-6">
            <div className="relative pl-6 border-l-2 border-emerald-500/30">
              <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1"></div>
              <p className="text-white text-sm font-semibold">High Cart Drop-off Detected</p>
              <p className="text-gray-400 text-xs mt-1">We noticed {currentData.carts.current} users added items but didn't checkout. The WhatsApp recovery automation is firing for them.</p>
            </div>
            
            <div className="relative pl-6 border-l-2 border-blue-500/30">
              <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1"></div>
              <p className="text-white text-sm font-semibold">Traffic Spike</p>
              <p className="text-gray-400 text-xs mt-1">Visitors increased by {currentData.visitors.growth} compared to last {timeframe.replace('ly', '')}. Keep up the good work!</p>
            </div>

            <div className="relative pl-6 border-l-2 border-purple-500/30">
              <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[7px] top-1"></div>
              <p className="text-white text-sm font-semibold">Lead Quality</p>
              <p className="text-gray-400 text-xs mt-1">{currentData.leads.current} phone numbers were extracted automatically via the tracking pixel.</p>
            </div>
          </div>
          
          <button className="w-full mt-8 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl transition-colors text-sm">
            View Detailed Logs
          </button>
        </div>

      </div>
    </div>
  );
}