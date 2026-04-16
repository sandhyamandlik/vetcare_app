import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { PawPrint, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      alert('Registration successful! Please login to continue.');
      navigate('/login');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map(e => e.msg || JSON.stringify(e)).join(' '));
      else setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center px-6 pt-20" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <PawPrint className="h-8 w-8 text-[#E07A5F]" />
            <span className="text-2xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>VetCare</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Create Your Account</h1>
          <p className="text-[#4A5568] mt-2">Sign up as a pet owner</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-[#E53E3E] text-sm p-3 rounded-xl border border-red-200" data-testid="register-error">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#1E392A] font-medium">Full Name</Label>
              <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3" required data-testid="register-name-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1E392A] font-medium">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3" required data-testid="register-email-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1E392A] font-medium">Password</Label>
              <div className="relative">
                <Input id="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3 pr-10" required data-testid="register-password-input" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" data-testid="register-toggle-password">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl py-3 text-base font-semibold" data-testid="register-submit-btn">
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-[#4A5568] text-sm">
            Already have an account? <Link to="/login" className="text-[#E07A5F] font-semibold hover:underline" data-testid="register-to-login">Sign in</Link>
          </p>
          <p className="text-[#4A5568] text-sm">
            Are you a veterinarian? <Link to="/doctor-register" className="text-[#81B29A] font-semibold hover:underline" data-testid="register-to-doctor">Register as Doctor</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

