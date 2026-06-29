import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Email dan password wajib diisi');
    try {
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" required />
          <button type="submit" disabled={loading} className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm">Belum punya akun? <Link to="/register" className="text-primary-600 hover:underline">Daftar</Link></p>
      </div>
    </div>
  );
};

export default Login;