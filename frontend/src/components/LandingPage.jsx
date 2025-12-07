import React from 'react';
import { TrendingUp, Target, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50">
      {/* --- Navigation --- */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full">
        <div className="text-2xl font-bold text-blue-900 flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Spend Sense
        </div>
        <div className="flex gap-4">
          <Link 
            to="/login"
            className="text-slate-600 font-semibold hover:text-blue-600 transition px-4 py-2"
          >
            Login
          </Link>
          <Link 
            to="/signup"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <main className="flex-grow flex items-center justify-center px-6 py-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Copy */}
          <div className="space-y-8 animate-fade-in-up">
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight">
              Master your money with a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400">savvy AI friend.</span>
            </h1>
            
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
              Stop guessing where your money goes. <strong>Spend Sense</strong> connects to your bank to find hidden subscriptions, visualize your habits, and forecast exactly when you'll hit your goals.
            </p>
            
            {/* Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition">
                <Target className="w-6 h-6 text-blue-500 shrink-0" />
                <div>
                    <h3 className="font-bold text-slate-800">Smart Forecasting</h3>
                    <p className="text-xs text-slate-500">See the future of your balance.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition">
                <Sparkles className="w-6 h-6 text-purple-500 shrink-0" />
                <div>
                    <h3 className="font-bold text-slate-800">AI Coach</h3>
                    <p className="text-xs text-slate-500">Casual, personalized advice.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition">
                <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                <div>
                    <h3 className="font-bold text-slate-800">Gray Charges</h3>
                    <p className="text-xs text-slate-500">Detect hidden subscriptions.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link 
                to="/signup"
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 group"
              >
                Start Saving Today
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="mt-4 text-xs text-slate-400">
                🔒 Bank-level security via Plaid. We never store your credentials.
              </p>
            </div>
          </div>

          {/* Right Side: Visual Mockup */}
          <div className="relative hidden md:block">
            {/* Abstract Background Blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-100 rounded-full blur-3xl opacity-50 -z-10"></div>
            
            <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 rotate-2 hover:rotate-0 transition-transform duration-500">
                {/* Mock Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Net Worth</p>
                        <p className="text-3xl font-bold text-slate-900">$12,450.00</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                </div>

                {/* Mock Cards */}
                <div className="space-y-4">
                    {/* Feature: AI Insight */}
                    <div className="bg-slate-900 text-white p-4 rounded-xl flex items-start gap-4 shadow-lg transform translate-x-4">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <Sparkles className="w-5 h-5 text-yellow-300" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-yellow-300 mb-1">AI Insight</p>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                "You're crushing it! 🚀 At this rate, you'll hit your Japan Trip goal 2 weeks early. Maybe treat yourself to sushi tonight?"
                            </p>
                        </div>
                    </div>

                    {/* Feature: Subscription Detected */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm transform -translate-x-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center">📺</div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm">Streaming Service</p>
                                <p className="text-xs text-slate-400">Recurring • Gray Charge?</p>
                            </div>
                        </div>
                        <span className="font-bold text-slate-800">-$14.99</span>
                    </div>

                    {/* Feature: Trend Line */}
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm h-32 flex items-end justify-between px-6 pb-2">
                        <div className="w-2 h-10 bg-blue-100 rounded-t"></div>
                        <div className="w-2 h-16 bg-blue-200 rounded-t"></div>
                        <div className="w-2 h-12 bg-blue-100 rounded-t"></div>
                        <div className="w-2 h-20 bg-blue-300 rounded-t"></div>
                        <div className="w-2 h-24 bg-blue-500 rounded-t relative">
                             {/* Floating badge */}
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm whitespace-nowrap">
                                On Track!
                             </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default LandingPage;