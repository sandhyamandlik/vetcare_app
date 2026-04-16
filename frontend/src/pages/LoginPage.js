import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PawPrint, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate(user.role === 'doctor' ? '/doctor-dashboard' : '/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.user.role === 'doctor') navigate('/doctor-dashboard');
      else navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map(e => e.msg || JSON.stringify(e)).join(' '));
      else setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center px-6 pt-20" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <PawPrint className="h-8 w-8 text-[#E07A5F]" />
            <span className="text-2xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>VetCare</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Welcome Back</h1>
          <p className="text-[#4A5568] mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-[#E53E3E] text-sm p-3 rounded-xl border border-red-200" data-testid="login-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1E392A] font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3"
                required
                data-testid="login-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1E392A] font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3 pr-10"
                  required
                  data-testid="login-password-input"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" data-testid="login-toggle-password">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl py-3 text-base font-semibold"
              data-testid="login-submit-btn"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-[#4A5568] text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#E07A5F] font-semibold hover:underline" data-testid="login-to-register">Sign up as Pet Owner</Link>
          </p>
          <p className="text-[#4A5568] text-sm">
            Are you a veterinarian?{' '}
            <Link to="/doctor-register" className="text-[#81B29A] font-semibold hover:underline" data-testid="login-to-doctor-register">Register as Doctor</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
