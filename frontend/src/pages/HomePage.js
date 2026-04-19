import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Star, ArrowRight, Heart, Shield, Clock, Phone, Stethoscope, PawPrint } from 'lucide-react';
import axios from 'axios';
import { useState } from 'react';

const BACKEND_URL = 'https://vetcare-app-2nqr.onrender.com';
const API = 'https://vetcare-app-2nqr.onrender.com/api';

const resolveImg = (url) => {
  if (!url) {
    return "https://via.placeholder.com/400x400?text=Doctor";
  }

  if (url.startsWith("http")) return url;

  return `${BACKEND_URL}${url}`;
};

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? 'fill-[#E07A5F] text-[#E07A5F]' : 'text-[#E2E8F0]'}`} />
      ))}
    </div>
  );
}

function DoctorCard({ doctor, index }) {
  return (
    <div
      className={`card-hover bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden animate-fade-in-up delay-${(index % 4) * 100 + 100}`}
      data-testid={`doctor-card-${doctor.id}`}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={resolveImg(doctor.profile_image)}
          alt={doctor.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onError={(e) => {
          e.target.onerror = null;
          e.target.src = "https://via.placeholder.com/400x400?text=Doctor";
        }}
        />
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold text-[#1E392A] mb-1" style={{ fontFamily: 'Outfit' }}>{doctor.name}</h3>
        <Badge className="bg-[#81B29A]/10 text-[#2C4A3B] border-0 rounded-full text-xs font-semibold mb-3">
          {doctor.specialization}
        </Badge>
        <div className="flex items-center gap-4 text-sm text-[#4A5568] mb-3">
          <span>{doctor.experience} yrs exp</span>
          <span className="w-1 h-1 rounded-full bg-[#E2E8F0]" />
          <span>{doctor.cases_solved} cases</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <StarRating rating={Math.round(doctor.avg_rating || 0)} />
            {doctor.review_count > 0 && <span className="text-xs text-[#718096] ml-1">({doctor.review_count})</span>}
          </div>
          <Link to={`/doctor/${doctor.id}`}>
            <Button size="sm" className="bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl text-xs gap-1" data-testid={`view-profile-${doctor.id}`}>
              View Profile <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [doctors, setDoctors] = useState([]);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    axios.get(`${API}/doctors`).then(res => setDoctors(res.data.doctors)).catch(console.error);
  }, []);

  useEffect(() => {
    if (location.state?.scrollTo) {
      setTimeout(() => {
        document.getElementById(location.state.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-[#FDFDFC]">
      {/* Hero Section */}
      <section id="hero" className="relative min-h-[90vh] flex items-center" data-testid="hero-section">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/6235124/pexels-photo-6235124.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
            alt="Veterinary care"
            className="w-full h-full object-cover"
          />
          <div className="hero-overlay absolute inset-0" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-white/80 mb-4 font-medium">Trusted Veterinary Care</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tighter leading-tight mb-6" style={{ fontFamily: 'Outfit' }}>
              Expert Care for Your <span className="text-[#E07A5F]">Beloved Pets</span>
            </h1>
            <p className="text-lg text-white/90 leading-relaxed mb-8 max-w-lg">
              Connect with licensed veterinarians online. Get professional consultations, prescriptions, and care plans from the comfort of your home.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={user ? (user.role === 'doctor' ? '/doctor-dashboard' : '/dashboard') : '/register'}>
                <Button size="lg" className="bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl text-base px-8 gap-2 hover:-translate-y-0.5 transition-transform duration-200" data-testid="hero-consult-btn">
                  <Stethoscope className="h-5 w-5" /> Consult Now
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 rounded-xl text-base px-8" onClick={() => document.getElementById('doctors')?.scrollIntoView({ behavior: 'smooth' })} data-testid="hero-browse-btn">
                Browse Doctors
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-[#E2E8F0]" data-testid="stats-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { num: '50+', label: 'Licensed Vets', icon: Stethoscope },
              { num: '10k+', label: 'Pets Treated', icon: PawPrint },
              { num: '98%', label: 'Satisfaction', icon: Heart },
              { num: '24/7', label: 'Availability', icon: Clock },
            ].map(({ num, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <Icon className="h-6 w-6 text-[#81B29A] mx-auto mb-2" />
                <p className="text-2xl sm:text-3xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{num}</p>
                <p className="text-sm text-[#4A5568]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Section */}
      <section id="doctors" className="section-padding bg-[#FDFDFC]" data-testid="doctors-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-[#81B29A] mb-3 font-semibold">Our Team</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>
              Meet Our Expert Veterinarians
            </h2>
            <p className="text-base text-[#4A5568] mt-3 max-w-xl mx-auto">
              Experienced professionals dedicated to providing the best care for your furry family members.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doc, i) => (
              <DoctorCard key={doc.id} doctor={doc} index={i} />
            ))}
          </div>
          {doctors.length === 0 && (
            <p className="text-center text-[#718096] py-12">Loading doctors...</p>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section-padding bg-[#F4F1DE]" data-testid="about-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#81B29A] mb-3 font-semibold">About VetCare</p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1E392A] tracking-tight mb-6" style={{ fontFamily: 'Outfit' }}>
                Compassionate Care, Powered by Technology
              </h2>
              <p className="text-base text-[#4A5568] leading-relaxed mb-6">
                VetCare brings veterinary expertise to your fingertips. Our platform connects pet owners with certified veterinarians for online consultations, making quality pet healthcare accessible and convenient.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, text: 'Licensed & verified veterinarians' },
                  { icon: Clock, text: 'Quick response times' },
                  { icon: Heart, text: 'Personalized treatment plans' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#81B29A]/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-[#81B29A]" />
                    </div>
                    <span className="text-[#1E392A] font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1644675272883-0c4d582528d8?w=600&h=500&fit=crop"
                alt="Veterinarian with pet"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="section-padding bg-white" data-testid="contact-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-[#81B29A] mb-3 font-semibold">Get in Touch</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1E392A] tracking-tight mb-4" style={{ fontFamily: 'Outfit' }}>
            Need Help? We're Here for You
          </h2>
          <p className="text-base text-[#4A5568] max-w-lg mx-auto mb-8">
            Have questions about our services? Reach out to our team and we'll get back to you promptly.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="tel:+15551234567">
              <Button size="lg" className="btn-phone rounded-xl gap-2 px-8" data-testid="contact-phone-btn">
                <Phone className="h-5 w-5" /> Call Us
              </Button>
            </a>
            <a href="https://wa.me/15551234567" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="btn-whatsapp rounded-xl gap-2 px-8" data-testid="contact-whatsapp-btn">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.553 4.121 1.521 5.854L.057 23.5l5.767-1.512A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.98 0-3.81-.577-5.365-1.566l-.385-.229-3.99 1.046 1.065-3.89-.251-.399A9.774 9.774 0 012.18 12c0-5.422 4.398-9.82 9.82-9.82 5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z"/></svg>
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#1E392A] section-padding" data-testid="cta-section">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4" style={{ fontFamily: 'Outfit' }}>
            Ready to Give Your Pet the Best Care?
          </h2>
          <p className="text-base text-white/70 max-w-lg mx-auto mb-8">
            Join thousands of pet owners who trust VetCare for professional veterinary consultations.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl px-8 gap-2" data-testid="cta-register-btn">
                <PawPrint className="h-5 w-5" /> Sign Up as Pet Owner
              </Button>
            </Link>
            <Link to="/doctor-register">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl px-8 gap-2" data-testid="cta-doctor-register-btn">
                <Stethoscope className="h-5 w-5" /> Join as Veterinarian
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E392A] border-t border-white/10 py-8" data-testid="footer">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-[#E07A5F]" />
              <span className="text-white font-bold" style={{ fontFamily: 'Outfit' }}>VetCare</span>
            </div>
            <p className="text-white/50 text-sm">2025 VetCare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
