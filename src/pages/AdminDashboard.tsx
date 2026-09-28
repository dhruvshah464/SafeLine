import React, { useState, useEffect } from 'react';
import { Shield, Key, Users, Settings, Activity, Building, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = '/api/admin';

export default function AdminDashboard() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState('usage');
  const [users, setUsers] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [usage, setUsage] = useState<any[]>([]);
  
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.user.role === 'admin') {
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
      } else {
        alert(data.error || 'Access denied');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
  };

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      if (activeTab === 'users') {
        const res = await fetch(`${API_BASE}/users`, { headers });
        setUsers(await res.json());
      } else if (activeTab === 'keys') {
        const res = await fetch(`${API_BASE}/keys`, { headers });
        setKeys(await res.json());
      } else if (activeTab === 'usage') {
        const res = await fetch(`${API_BASE}/usage`, { headers });
        setUsage(await res.json());
      }
    } catch (err) {
      console.error(err);
      if (String(err).includes('401')) {
        handleLogout();
      }
    }
  };

  const handleCreateKey = async () => {
    const name = prompt('Key Name:');
    if (!name) return;
    try {
      await fetch(`${API_BASE}/keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });
      fetchData();
    } catch (err) {
      alert('Failed to create key');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 pt-32">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
            <div className="text-xs text-center text-slate-500 mt-4">
              Demo credentials: admin@acme.com / password
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6 flex gap-8">
        
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-28">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">Enterprise Admin</div>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('usage')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'usage' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Activity className="w-4 h-4" /> Usage & Analytics
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Users className="w-4 h-4" /> User Management
              </button>
              <button 
                onClick={() => setActiveTab('keys')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'keys' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Key className="w-4 h-4" /> API Keys
              </button>
            </nav>
            
            <div className="mt-8 pt-4 border-t border-slate-100">
              <button 
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'usage' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">API Usage</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 rounded-tl-lg">Endpoint</th>
                      <th className="py-3 px-4">Org ID</th>
                      <th className="py-3 px-4">Workspace ID</th>
                      <th className="py-3 px-4 rounded-tr-lg">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usage.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-blue-600">{u.endpoint}</td>
                        <td className="py-3 px-4 font-mono text-xs">{u.orgId}</td>
                        <td className="py-3 px-4 font-mono text-xs">{u.workspaceId}</td>
                        <td className="py-3 px-4">{new Date(u.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {usage.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-500">No usage data found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">User Management</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 rounded-tl-lg">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 rounded-tr-lg">Org ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">{u.name}</td>
                        <td className="py-3 px-4">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{u.orgId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'keys' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">API Keys</h2>
                <button 
                  onClick={handleCreateKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Generate Key
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 rounded-tl-lg">Name</th>
                      <th className="py-3 px-4">Key</th>
                      <th className="py-3 px-4">Workspace</th>
                      <th className="py-3 px-4 rounded-tr-lg">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {keys.map(k => (
                      <tr key={k.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">{k.name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-blue-600">{k.key}</td>
                        <td className="py-3 px-4 font-mono text-xs">{k.workspaceId}</td>
                        <td className="py-3 px-4">{new Date(k.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
