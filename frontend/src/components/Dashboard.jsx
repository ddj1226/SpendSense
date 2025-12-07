import React, { useEffect, useState, useRef } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Search, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react'; 
import { Link } from 'react-router-dom'; 
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

// --- MAIN DASHBOARD COMPONENT ---
const Dashboard = () => {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [bankConnected, setBankConnected] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const hasFetchedToken = useRef(false);

  useEffect(() => {
    const storedName = localStorage.getItem('user_name');
    const storedId = localStorage.getItem('user_id');
    const storedStatus = localStorage.getItem('bank_connected') === 'true';
    
    setUserName(storedName);
    setUserId(storedId);
    setBankConnected(storedStatus);

    if (!storedStatus && !hasFetchedToken.current) {
      hasFetchedToken.current = true;
      generateLinkToken();
    }
  }, []);

  const generateLinkToken = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/plaid/create_link_token', {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Backend error");
      if (data.link_token) setLinkToken(data.link_token);
    } catch (err) {
      console.error("❌ Error generating link token:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6"> {/* Reduced padding for tighter fit */}
      <div className="max-w-[1400px] mx-auto"> {/* Wider container for 3 columns */}
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <Link to="/" className="text-2xl font-bold text-blue-900 flex items-center gap-2 hover:opacity-80 transition">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Spend Sense
          </Link>

          <div className="flex items-center gap-6">
            <span className="text-xl font-bold text-slate-800 hidden md:block">
              Hello, {userName} 👋
            </span>
            <button 
              onClick={() => { localStorage.clear(); window.location.href = '/'; }} 
              className="bg-red-500 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-600 transition shadow-sm text-sm"
            >
              Logout
            </button>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 md:hidden mb-6 text-center">Hello, {userName} 👋</h1>

        {!bankConnected ? (
          linkToken ? (
            <ConnectBankState linkToken={linkToken} userId={userId} />
          ) : (
            <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-slate-100">
               <div className="text-center">
                 {isLoading ? (
                    <>
                      <div className="animate-spin text-4xl mb-4">⏳</div>
                      <p className="text-slate-500">Connecting to Plaid...</p>
                    </>
                 ) : (
                    <p className="text-red-500 font-bold">Failed to load Link Token.</p>
                 )}
               </div>
            </div>
          )
        ) : (
          <DashboardView userId={userId} />
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: PLAID CONNECT BUTTON ---
const ConnectBankState = ({ linkToken, userId }) => {
  const onSuccess = async (public_token) => {
    try {
      const response = await fetch('http://localhost:8000/api/plaid/exchange_public_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: public_token, user_id: userId }),
      });

      if (!response.ok) throw new Error("Failed");
      localStorage.setItem('bank_connected', 'true');
      window.location.reload(); 
    } catch (err) {
      console.error("Error exchanging token:", err);
    }
  };

  const { open, ready, error } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <div className="bg-white p-12 rounded-2xl shadow-sm text-center border border-slate-100 max-w-2xl mx-auto">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">🏦</div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Let's connect your bank</h2>
      {error && <p className="text-red-500 mb-4">Plaid Error: {error.message}</p>}
      <button 
        onClick={() => ready && open()} 
        disabled={!ready}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition shadow-lg disabled:opacity-50"
      >
         {ready ? 'Connect Bank Account' : 'Initializing...'}
      </button>
    </div>
  );
};

// --- SUB-COMPONENT: DATA VIEW ---
const DashboardView = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); 

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/plaid/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    if(userId) fetchData();
  }, [userId]);

  const calculateSpendingBreakdown = () => {
    if (!data || !data.transactions) return [];

    const categories = {};
    data.transactions.forEach(t => {
        if (t.amount > 0 && t.category !== "Transfer Out" && t.category !== "Transfer") {
            const cat = t.category || "Uncategorized";
            if (!categories[cat]) categories[cat] = 0;
            categories[cat] += t.amount;
        }
    });

    return Object.keys(categories)
        .map(key => ({ name: key, value: categories[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  };

  const pieData = calculateSpendingBreakdown();

  const filteredTransactions = data?.transactions.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) return <div className="text-center p-10 animate-pulse">Loading Financial Data...</div>;
  if (!data) return <div className="text-center p-10 text-red-500">Failed to load data.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* ------------------------------------------- */}
      {/* LEFT COLUMN: ACCOUNTS (3 cols) */}
      {/* ------------------------------------------- */}
      <div className="lg:col-span-3 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 px-1">Your Accounts</h2>
        {data.accounts.map((acc, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{acc.type}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${acc.balance < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    Active
                </span>
            </div>
            <p className="text-2xl font-bold text-slate-800">${acc.balance.toFixed(2)}</p>
            <p className="text-sm text-slate-500 mt-1 font-medium">{acc.name}</p>
          </div>
        ))}
        
        {/* Optional: Add Bank Status Card */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-1">
                <ShieldCheck className="w-4 h-4" />
                Bank Connected
            </div>
            <p className="text-xs text-blue-600">Data secure via Plaid.</p>
        </div>
      </div>

      {/* ------------------------------------------- */}
      {/* CENTER COLUMN: PIE CHART + TRANSACTIONS (6 cols) */}
      {/* ------------------------------------------- */}
      <div className="lg:col-span-6 space-y-6">
        
        {/* 1. TOP: Spending Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[320px]">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Spending Breakdown</h2>
            <div className="h-60 w-full">
                {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                            <Legend 
                                layout="vertical" 
                                verticalAlign="middle" 
                                align="right"
                                wrapperStyle={{ fontSize: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                        No spending data yet
                    </div>
                )}
            </div>
        </div>

        {/* 2. BOTTOM: Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]"> 
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-lg font-bold text-slate-800">Transactions</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 md:w-auto"
                    />
                </div>
            </div>
            
            <div className="overflow-y-auto flex-grow">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                        <tr>
                            <th className="p-4 bg-slate-50">Date</th>
                            <th className="p-4 bg-slate-50">Description</th>
                            <th className="p-4 bg-slate-50 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((t, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                                <td className="p-4 text-slate-500 text-sm whitespace-nowrap">{t.date}</td>
                                <td className="p-4">
                                    <div className="font-medium text-slate-800 text-sm truncate max-w-[150px]">{t.name}</div>
                                    <div className="text-xs text-slate-400 truncate max-w-[150px]">{t.category}</div>
                                </td>
                                <td className={`p-4 text-right font-bold text-sm ${t.amount > 0 ? 'text-slate-800' : 'text-green-600'}`}>
                                ${t.amount.toFixed(2)}
                                </td>
                            </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-slate-400">
                                    No transactions found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* ------------------------------------------- */}
      {/* RIGHT COLUMN: AI TOOLS (3 cols) */}
      {/* ------------------------------------------- */}
      <div className="lg:col-span-3 space-y-6">
            
            {/* 1. TOP: Spending Analyzer */}
            <SpendingAnalyzer userId={userId} />

            {/* 2. BOTTOM: Goal Forecaster */}
            <GoalForecaster userId={userId} />
      </div>

    </div>
  );
};

// --- COMPONENT: SPENDING ANALYZER (Fixed Light Mode Colors) ---
const SpendingAnalyzer = ({ userId }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/api/goals/analyze_spending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, target_amount: 0, target_date: "2025-01-01" }),
            });
            const data = await response.json();
            setAnalysis(data.analysis);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
            {/* Consistent Light Styling */}
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24 text-blue-200" />
            </div>

            <div className="flex items-center gap-2 mb-4 relative z-10">
                <ShieldCheck className="text-blue-600 w-6 h-6" />
                <h2 className="text-lg font-bold text-slate-800">Gray Charge Detector</h2>
            </div>

            {!analysis ? (
                <div className="space-y-4 relative z-10">
                    <p className="text-slate-500 text-sm">
                        Scan your last 60 days of history to find hidden subscriptions and spending habits.
                    </p>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 flex gap-2">
                        <ShieldCheck className="w-8 h-8 text-blue-500 shrink-0" />
                        <p>
                            <strong>Privacy Guarantee:</strong> Only transaction patterns are analyzed. 
                            Personal identity is <span className="font-bold text-slate-800">never</span> shared.
                        </p>
                    </div>

                    <button 
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition shadow-sm disabled:opacity-50 text-sm"
                    >
                        {loading ? "Scanning Transactions..." : "Analyze My Spending"}
                    </button>
                </div>
            ) : (
                <div className="animate-fade-in relative z-10">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                        <h3 className="font-bold text-blue-700 text-sm uppercase mb-2">AI Findings</h3>
                        <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700 font-medium">
                            {analysis}
                        </p>
                    </div>
                    <button 
                        onClick={() => setAnalysis(null)}
                        className="text-xs text-slate-400 underline w-full text-center hover:text-slate-800"
                    >
                        Run New Scan
                    </button>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT: GOAL FORECASTER ---
const GoalForecaster = ({ userId }) => {
    const [targetAmount, setTargetAmount] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
  
    const handleForecast = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const response = await fetch('http://localhost:8000/api/goals/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              user_id: userId, 
              target_amount: parseFloat(targetAmount), 
              target_date: targetDate 
          }),
        });
        const data = await response.json();
        setResult(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔮</span>
          <h2 className="text-lg font-bold text-slate-800">Smart Goal Forecaster</h2>
        </div>
  
        {!result ? (
          <form onSubmit={handleForecast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">I want to save</label>
              <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input 
                    type="number" 
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full p-2 pl-6 border rounded-lg bg-slate-50 focus:bg-white transition"
                    placeholder="3000.00"
                    required
                  />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">By Date</label>
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full p-2 border rounded-lg bg-slate-50 focus:bg-white transition"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition shadow-sm text-sm"
            >
              {loading ? "Analyzing Trends..." : "Forecast My Goal"}
            </button>
          </form>
        ) : (
          <div className="animate-fade-in">
              <div className={`p-4 rounded-lg mb-4 text-center ${result.is_on_track ? 'bg-green-50 border border-green-100' : 'bg-orange-50 border border-orange-100'}`}>
                  <p className="text-sm text-slate-500 mb-1">Projected Balance</p>
                  <p className={`text-3xl font-bold ${result.is_on_track ? 'text-green-600' : 'text-orange-600'}`}>
                      ${result.projected_balance.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Net Balance Trend</p>
              </div>

              <div className="h-48 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={result.history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" hide={true} />
                        <YAxis hide={false} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value, name) => [`$${value}`, name === "balance" ? "Actual" : "Trend"]}
                            labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line type="monotone" dataKey="trend" stroke={result.is_on_track ? "#22c55e" : "#f97316"} strokeWidth={3} dot={false} activeDot={false} name="trend" />
                        <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={0} dot={{ r: 2, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 6 }} name="balance" isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mb-4">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Gemini Insight</p>
                  <p className="text-sm text-slate-700 leading-relaxed italic bg-slate-50 p-3 rounded border border-slate-100">
                      "{result.ai_insight}"
                  </p>
              </div>
  
              <button 
                  onClick={() => setResult(null)}
                  className="text-sm text-slate-500 underline w-full text-center hover:text-slate-800"
              >
                  Start Over
              </button>
          </div>
        )}
      </div>
    );
};

export default Dashboard;