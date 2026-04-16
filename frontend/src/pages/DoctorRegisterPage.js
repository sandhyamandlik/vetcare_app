import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PawPrint, Eye, EyeOff, Upload, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:8000';
const API = 'http://localhost:8000/api';

const SPECIALIZATIONS = [
  'Small Animal Surgery',
  'Feline Medicine',
  'Canine Medicine',
  'Veterinary Dermatology',
  'Exotic Animal Care',
  'Veterinary Dentistry',
  'Emergency & Critical Care',
  'Internal Medicine',
  'Veterinary Ophthalmology',
  'Behavioral Medicine',
];

export default function DoctorRegisterPage() {
  const { doctorRegister, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', specialization: '', experience: '', cases_solved: '', phone: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate(user.role === 'doctor' ? '/doctor-dashboard' : '/dashboard');
    return null;
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!form.specialization) { setError('Please select a specialization'); return; }
    setLoading(true);
    try {
      let profileImageUrl = '';
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await axios.post(`${API}/upload`, formData);
        profileImageUrl = uploadRes.data.url;
      }
      await doctorRegister({
        ...form,
        experience: parseInt(form.experience) || 0,
        cases_solved: parseInt(form.cases_solved) || 0,
        profile_image: profileImageUrl,
      });
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
    <div className="min-h-screen bg-[#FDFDFC] flex items-center justify-center px-6 pt-20 pb-12" data-testid="doctor-register-page">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <PawPrint className="h-8 w-8 text-[#E07A5F]" />
            <span className="text-2xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>VetCare</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Join as Veterinarian</h1>
          <p className="text-[#4A5568] mt-2">Register your professional profile</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-[#E53E3E] text-sm p-3 rounded-xl border border-red-200" data-testid="doctor-register-error">{error}</div>
            )}

            {/* Profile Image Upload */}
            <div className="flex flex-col items-center mb-2">
              <Label className="text-[#1E392A] font-medium mb-3">Profile Photo</Label>
              <div className="relative">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-2xl object-cover border-2 border-[#81B29A]" />
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); }} className="absolute -top-2 -right-2 bg-[#E53E3E] text-white rounded-full p-1" data-testid="doctor-register-remove-image">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="h-24 w-24 rounded-2xl border-2 border-dashed border-[#E2E8F0] flex flex-col items-center justify-center cursor-pointer hover:border-[#81B29A] transition-colors" data-testid="doctor-register-image-upload">
                    <Upload className="h-6 w-6 text-[#718096]" />
                    <span className="text-xs text-[#718096] mt-1">Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="text-[#1E392A] font-medium">Full Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Smith" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3" required data-testid="doctor-register-name-input" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-[#1E392A] font-medium">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="doctor@example.com" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3" required data-testid="doctor-register-email-input" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-[#1E392A] font-medium">Password</Label>
                <div className="relative">
                  <Input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3 pr-10" required data-testid="doctor-register-password-input" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096]" data-testid="doctor-register-toggle-password">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-[#1E392A] font-medium">Specialization</Label>
                <Select value={form.specialization} onValueChange={val => setForm({ ...form, specialization: val })}>
                  <SelectTrigger className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3" data-testid="doctor-register-specialization-select">
                    <SelectValue placeholder="Select specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map(s => (
                      <SelectItem key={s} value={s} data-testid={`spec-option-${s.replace(/\s+/g, '-').toLowerCase()}`}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#1E392A] font-medium">Experience (yrs)</Label>
                <Input type="number" min="0" value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="5" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3" required data-testid="doctor-register-experience-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1E392A] font-medium">Cases Solved</Label>
                <Input type="number" min="0" value={form.cases_solved} onChange={e => setForm({ ...form, cases_solved: e.target.value })} placeholder="100" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3" required data-testid="doctor-register-cases-input" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-[#1E392A] font-medium">Phone Number</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1555123456" className="rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A] p-3" data-testid="doctor-register-phone-input" />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#81B29A] hover:bg-[#6A9A82] text-white rounded-xl py-3 text-base font-semibold" data-testid="doctor-register-submit-btn">
              {loading ? 'Creating profile...' : 'Register as Doctor'}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-[#4A5568] text-sm">
            Already registered? <Link to="/login" className="text-[#E07A5F] font-semibold hover:underline" data-testid="doctor-register-to-login">Sign in</Link>
          </p>
          <p className="text-[#4A5568] text-sm">
            Pet owner? <Link to="/register" className="text-[#81B29A] font-semibold hover:underline" data-testid="doctor-register-to-user">Sign up here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

