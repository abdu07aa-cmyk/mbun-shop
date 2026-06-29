import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Password tidak cocok');
    if (password.length < 6) return toast.error('Password minimal 6 karakter');
    try {
      setLoading(true);
      const { signUp } = await import('../services/supabase/auth');
      await signUp(email, password);
      toast.success('Registrasi berhasil! Silakan login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">Daftar Akun</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6)" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" required />
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Konfirmasi Password" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800" required />
          <button type="submit" disabled={loading} className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Loading...' : 'Daftar'}
          </button>
        </form>
        <p className="text-center text-sm">Sudah punya akun? <Link to="/login" className="text-primary-600 hover:underline">Login</Link></p>
      </div>
    </div>
  );
};

export default Register;