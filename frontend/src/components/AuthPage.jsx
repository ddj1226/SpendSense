import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; 
import { Mail, Lock, TrendingUp } from 'lucide-react'; 

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    
    
    const payload = isLogin 
      ? { 
          email: formData.email, 
          password: formData.password 
        }
      : { 
          email: formData.email, 
          password: formData.password, 
          first_name: formData.firstName, 
          last_name: formData.lastName    
        };

    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), 
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.detail || 'Authentication failed');

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('user_name', data.first_name);
      localStorage.setItem('bank_connected', data.bank_connected);

      // Force reload to update App state
      window.location.href = '/dashboard'; 
      
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 relative">
      
      {/* Logo Link */}
      <div className="absolute top-6 left-6">
        <Link to="/" className="text-2xl font-bold text-blue-900 flex items-center gap-2 hover:opacity-80 transition">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Spend Sense
        </Link>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-6">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600">First Name</label>
                <input name="firstName" onChange={handleChange} className="w-full p-2 border rounded mt-1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Last Name</label>
                <input name="lastName" onChange={handleChange} className="w-full p-2 border rounded mt-1" required />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input name="email" type="email" onChange={handleChange} className="w-full p-2 pl-10 border rounded mt-1" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input name="password" type="password" onChange={handleChange} className="w-full p-2 pl-10 border rounded mt-1" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold hover:underline">
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;