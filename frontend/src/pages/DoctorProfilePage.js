import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Star, Clock, Phone, MessageSquare, ArrowLeft, Stethoscope, Award, Briefcase } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://vetcare-app-2nqr.onrender.com';
const API = 'https://vetcare-app-2nqr.onrender.com/api';

const resolveImg = (url) => {
  if (!url || url === "null") {
    return "https://via.placeholder.com/400x400?text=Doctor";
  }

  if (url.startsWith("http")) return url;

  return `${BACKEND_URL}${url}`;
};

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-5 w-5 ${i <= rating ? 'fill-[#E07A5F] text-[#E07A5F]' : 'text-[#E2E8F0]'}`} />
      ))}
    </div>
  );
}

export default function DoctorProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/doctors/${id}`)
      .then(res => setDoctor(res.data.doctor))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFDFC] pt-20 flex items-center justify-center">
        <div className="text-[#718096]">Loading...</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-[#FDFDFC] pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#718096] mb-4">Doctor not found</p>
          <Link to="/"><Button variant="outline" className="rounded-xl">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFC] pt-20" data-testid="doctor-profile-page">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-[#4A5568] hover:text-[#1E392A] mb-6 transition-colors" data-testid="back-to-home">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden mb-8">
          <div className="h-48 bg-gradient-to-r from-[#81B29A] to-[#1E392A] relative">
            <div className="absolute -bottom-16 left-8">
              <img
                src={resolveImg(doctor.profile_image)}
                alt={doctor.name}
                className="h-32 w-32 rounded-2xl object-cover border-4 border-white shadow-lg"
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1644675272883-0c4d582528d8?w=400&h=400&fit=crop'; }}
              />
            </div>
          </div>
          <div className="pt-20 pb-8 px-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>{doctor.name}</h1>
                <Badge className="bg-[#81B29A]/10 text-[#2C4A3B] border-0 rounded-full text-sm font-semibold mt-2">
                  {doctor.specialization}
                </Badge>
                <div className="flex items-center gap-2 mt-3">
                  <StarRating rating={Math.round(doctor.avg_rating || 0)} />
                  <span className="text-sm text-[#718096]">
                    {doctor.avg_rating > 0 ? `${doctor.avg_rating}/5` : 'No ratings yet'}
                    {doctor.review_count > 0 && ` (${doctor.review_count} reviews)`}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {doctor.phone && (
                  <>
                    <a href={`tel:${doctor.phone}`}>
                      <Button className="btn-phone rounded-xl gap-2" data-testid="profile-call-btn">
                        <Phone className="h-4 w-4" /> Call
                      </Button>
                    </a>
                    <a href={`https://wa.me/${doctor.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <Button className="btn-whatsapp rounded-xl gap-2" data-testid="profile-whatsapp-btn">
                        <MessageSquare className="h-4 w-4" /> WhatsApp
                      </Button>
                    </a>
                  </>
                )}
                {user && user.role === 'user' && (
                  <Link to="/dashboard">
                    <Button className="bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl gap-2" data-testid="profile-consult-btn">
                      <Stethoscope className="h-4 w-4" /> Consult Now
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-3 gap-6">
              <div className="text-center bg-[#F4F1DE] rounded-2xl p-5">
                <Briefcase className="h-6 w-6 text-[#81B29A] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{doctor.experience}</p>
                <p className="text-xs text-[#718096] uppercase tracking-wider">Years Exp</p>
              </div>
              <div className="text-center bg-[#F4F1DE] rounded-2xl p-5">
                <Award className="h-6 w-6 text-[#E07A5F] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{doctor.cases_solved}</p>
                <p className="text-xs text-[#718096] uppercase tracking-wider">Cases Solved</p>
              </div>
              <div className="text-center bg-[#F4F1DE] rounded-2xl p-5">
                <Star className="h-6 w-6 text-[#DD6B20] mx-auto mb-2" />
                <p className="text-2xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{doctor.avg_rating || 'N/A'}</p>
                <p className="text-xs text-[#718096] uppercase tracking-wider">Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8" data-testid="doctor-reviews">
          <h2 className="text-xl font-bold text-[#1E392A] mb-6" style={{ fontFamily: 'Outfit' }}>
            Patient Reviews ({doctor.feedback?.length || 0})
          </h2>
          {doctor.feedback && doctor.feedback.length > 0 ? (
            <div className="space-y-4">
              {doctor.feedback.map((f) => (
                <div key={f.id} className="border-b border-[#E2E8F0] pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#81B29A]/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-[#81B29A]">{f.user_name?.charAt(0) || 'U'}</span>
                      </div>
                      <span className="font-medium text-[#1E392A] text-sm">{f.user_name || 'Anonymous'}</span>
                    </div>
                    <StarRating rating={f.rating} />
                  </div>
                  {f.comment && <p className="text-sm text-[#4A5568] ml-11">{f.comment}</p>}
                  <p className="text-xs text-[#718096] ml-11 mt-1">{new Date(f.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#718096] text-center py-8">No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
