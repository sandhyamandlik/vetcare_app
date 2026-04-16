import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import {
  Star, Upload, X, PawPrint, Stethoscope, Clock, FileText,
  Phone, ArrowRight, Send, MessageSquare, Download, Mail, History
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:8000';
const API = 'http://localhost:8000/api';

const resolveImg = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1644675272883-0c4d582528d8?w=400&h=400&fit=crop';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

const PET_TYPES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Fish', 'Hamster', 'Reptile', 'Other'];

function StarRatingInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange(i)} className="star-btn" data-testid={`star-rating-${i}`}>
          <Star className={`h-6 w-6 ${i <= value ? 'fill-[#E07A5F] text-[#E07A5F]' : 'text-[#E2E8F0]'}`} />
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = status === 'accepted' ? 'badge-accepted' : status === 'rejected' ? 'badge-rejected' : 'badge-pending';
  return <span className={`${cls} px-3 py-1 rounded-full text-xs font-semibold inline-block`} data-testid={`status-badge-${status}`}>{status}</span>;
}

export default function UserDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [consultDialog, setConsultDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [petForm, setPetForm] = useState({ pet_name: '', pet_age: '', pet_type: '', problem: '' });
  const [petImage, setPetImage] = useState(null);
  const [petImagePreview, setPetImagePreview] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, comment: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('doctors');
  const [emailSending, setEmailSending] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/doctors`);
      setDoctors(res.data.doctors);
    } catch (err) { console.error(err); }
  }, []);

  const fetchConsultations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/consultations/user`, { headers });
      setConsultations(res.data.consultations);
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'user') { navigate('/login'); return; }
    fetchDoctors();
    fetchConsultations();
  }, [user, authLoading, navigate, fetchDoctors, fetchConsultations]);

  const openConsultDialog = (doctor) => {
    setSelectedDoctor(doctor);
    setPetForm({ pet_name: '', pet_age: '', pet_type: '', problem: '' });
    setPetImage(null);
    setPetImagePreview('');
    setConsultDialog(true);
  };

  const handlePetImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPetImage(file);
      setPetImagePreview(URL.createObjectURL(file));
    }
  };

  const submitConsultation = async (e) => {
    e.preventDefault();
    if (!petForm.pet_type) { toast.error('Please select a pet type'); return; }
    setSubmitting(true);
    try {
      let petImageUrl = '';
      if (petImage) {
        const fd = new FormData();
        fd.append('file', petImage);
        const uploadRes = await axios.post(`${API}/upload`, fd);
        petImageUrl = uploadRes.data.url;
      }
      await axios.post(`${API}/consultations`, {
        doctor_id: selectedDoctor.id,
        ...petForm,
        pet_image: petImageUrl,
      }, { headers });
      toast.success('Consultation request submitted!');
      setConsultDialog(false);
      fetchConsultations();
      setActiveTab('consultations');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const openFeedbackDialog = (consultation) => {
    setSelectedConsultation(consultation);
    setFeedbackForm({ rating: 0, comment: '' });
    setFeedbackDialog(true);
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (feedbackForm.rating === 0) { toast.error('Please select a rating'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/feedback`, {
        doctor_id: selectedConsultation.doctor_id,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment,
      }, { headers });
      toast.success('Feedback submitted! Thank you.');
      setFeedbackDialog(false);
      fetchConsultations();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const emailPrescription = async (consultationId) => {
    setEmailSending(consultationId);
    try {
      const res = await axios.post(`${API}/prescriptions/email`, {
        consultation_id: consultationId,
        recipient_email: user.email,
      }, { headers });
      if (res.data.mocked) {
        toast.success('Prescription sent (demo mode). Configure SMTP for real email delivery.');
      } else {
        toast.success('Prescription emailed to your inbox!');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send email');
    } finally {
      setEmailSending(null);
    }
  };

  if (!user) return null;

  const downloadPrescription = (consultation) => {
    const doctor = consultation.doctor || {};
    const prescriptions = consultation.prescriptions || [];
    const date = new Date(consultation.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const html = `
      <html>
      <head>
        <title>Prescription - ${consultation.pet_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Manrope:wght@400;500&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Manrope', sans-serif; padding: 40px; color: #1E392A; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 3px solid #81B29A; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
          .logo { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 700; color: #1E392A; }
          .logo span { color: #E07A5F; }
          .date { color: #718096; font-size: 13px; text-align: right; }
          .section { margin-bottom: 20px; }
          .section-title { font-family: 'Outfit', sans-serif; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #81B29A; margin-bottom: 8px; font-weight: 600; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #718096; display: block; margin-bottom: 2px; }
          .info-item p { font-size: 15px; font-weight: 500; }
          .rx { background: #F4F1DE; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
          .rx-name { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 600; margin-bottom: 4px; }
          .rx-dosage { font-size: 14px; color: #4A5568; }
          .rx-notes { font-size: 13px; color: #718096; margin-top: 4px; font-style: italic; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #718096; text-align: center; }
          .problem { background: #fafaf9; border-left: 3px solid #E07A5F; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 14px; color: #4A5568; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Vet<span>Care</span></div>
            <p style="font-size:13px;color:#4A5568;margin-top:4px;">Veterinary Consultation Platform</p>
          </div>
          <div class="date">
            <p><strong>Prescription</strong></p>
            <p>${date}</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Doctor Information</div>
          <div class="info-grid">
            <div class="info-item"><label>Name</label><p>${doctor.name || 'N/A'}</p></div>
            <div class="info-item"><label>Specialization</label><p>${doctor.specialization || 'N/A'}</p></div>
            <div class="info-item"><label>Phone</label><p>${doctor.phone || 'N/A'}</p></div>
            <div class="info-item"><label>Experience</label><p>${doctor.experience || 0} years</p></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Pet Details</div>
          <div class="info-grid">
            <div class="info-item"><label>Pet Name</label><p>${consultation.pet_name}</p></div>
            <div class="info-item"><label>Type</label><p>${consultation.pet_type}</p></div>
            <div class="info-item"><label>Age</label><p>${consultation.pet_age}</p></div>
            <div class="info-item"><label>Owner</label><p>${user.name}</p></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Problem Description</div>
          <div class="problem">${consultation.problem}</div>
        </div>

        <div class="section">
          <div class="section-title">Prescribed Medications</div>
          ${prescriptions.map((p, i) => `
            <div class="rx">
              <div class="rx-name">${i + 1}. ${p.medicine}</div>
              <div class="rx-dosage">Dosage: ${p.dosage}</div>
              ${p.notes ? `<div class="rx-notes">Note: ${p.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <p>This prescription was generated via VetCare Veterinary Consultation Platform.</p>
          <p style="margin-top:4px;">Please follow the prescribed dosage and consult your vet if symptoms persist.</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => { printWindow.print(); }, 500);
      };
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFC] pt-20" data-testid="user-dashboard">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>
              Welcome, {user.name}
            </h1>
            <p className="text-[#4A5568] mt-1">Manage your pet consultations</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/prescriptions">
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 border-[#81B29A] text-[#81B29A] hover:bg-[#81B29A] hover:text-white transition-colors" data-testid="prescription-history-link">
                <History className="h-3.5 w-3.5" /> Prescription History
              </Button>
            </Link>
            <PawPrint className="h-5 w-5 text-[#E07A5F]" />
            <span className="text-sm text-[#4A5568] font-medium">Pet Owner</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#F4F1DE] p-1 rounded-xl">
            <TabsTrigger value="doctors" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1E392A] data-[state=active]:shadow-sm px-6" data-testid="tab-browse-doctors">
              <Stethoscope className="h-4 w-4 mr-2" /> Browse Doctors
            </TabsTrigger>
            <TabsTrigger value="consultations" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1E392A] data-[state=active]:shadow-sm px-6" data-testid="tab-my-consultations">
              <FileText className="h-4 w-4 mr-2" /> My Consultations
            </TabsTrigger>
          </TabsList>

          {/* Browse Doctors */}
          <TabsContent value="doctors">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {doctors.map((doc) => (
                <div key={doc.id} className="card-hover bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden" data-testid={`dash-doctor-card-${doc.id}`}>
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={resolveImg(doc.profile_image)} alt={doc.name} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1644675272883-0c4d582528d8?w=400&h=400&fit=crop'; }} />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#1E392A] mb-1" style={{ fontFamily: 'Outfit' }}>{doc.name}</h3>
                    <Badge className="bg-[#81B29A]/10 text-[#2C4A3B] border-0 rounded-full text-xs font-semibold mb-2">{doc.specialization}</Badge>
                    <div className="flex items-center gap-3 text-sm text-[#4A5568] mb-3">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {doc.experience} yrs</span>
                      <span>{doc.cases_solved} cases</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => openConsultDialog(doc)} className="flex-1 bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl text-xs gap-1" data-testid={`consult-btn-${doc.id}`}>
                        <Send className="h-3 w-3" /> Consult
                      </Button>
                      <Link to={`/doctor/${doc.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full rounded-xl text-xs border-[#E2E8F0]" data-testid={`profile-btn-${doc.id}`}>
                          Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {doctors.length === 0 && <p className="text-center text-[#718096] py-12">No doctors available yet.</p>}
          </TabsContent>

          {/* My Consultations */}
          <TabsContent value="consultations">
            <div className="space-y-4">
              {consultations.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-6" data-testid={`consultation-card-${c.id}`}>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Pet Image */}
                    {c.pet_image && (
                      <img src={resolveImg(c.pet_image)} alt={c.pet_name} className="h-20 w-20 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{c.pet_name} ({c.pet_type})</h3>
                          <p className="text-sm text-[#4A5568]">Age: {c.pet_age} | Dr. {c.doctor_name || c.doctor?.name || 'Unknown'}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-sm text-[#4A5568] mb-3">{c.problem}</p>

                      {/* Prescriptions */}
                      {c.prescriptions && c.prescriptions.length > 0 && (
                        <div className="bg-[#F4F1DE] rounded-xl p-4 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-[#1E392A] flex items-center gap-1">
                              <FileText className="h-4 w-4 text-[#81B29A]" /> Prescriptions
                            </h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadPrescription(c)}
                              className="rounded-xl text-xs gap-1 border-[#81B29A] text-[#81B29A] hover:bg-[#81B29A] hover:text-white transition-colors h-7 px-3"
                              data-testid={`download-prescription-${c.id}`}
                            >
                              <Download className="h-3 w-3" /> Download
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => emailPrescription(c.id)}
                              disabled={emailSending === c.id}
                              className="rounded-xl text-xs gap-1 bg-[#E07A5F] hover:bg-[#D56A4F] text-white h-7 px-3"
                              data-testid={`email-prescription-${c.id}`}
                            >
                              <Mail className="h-3 w-3" /> {emailSending === c.id ? 'Sending...' : 'Email to Me'}
                            </Button>
                          </div>
                          {c.prescriptions.map((p) => (
                            <div key={p.id} className="bg-white rounded-lg p-3 mb-2 last:mb-0">
                              <p className="font-semibold text-sm text-[#1E392A]">{p.medicine}</p>
                              <p className="text-xs text-[#4A5568]">Dosage: {p.dosage}</p>
                              {p.notes && <p className="text-xs text-[#718096] mt-1">{p.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Contact + Feedback */}
                      <div className="flex flex-wrap gap-2">
                        {c.doctor?.phone && (
                          <>
                            <a href={`tel:${c.doctor.phone}`}>
                              <Button size="sm" className="btn-phone rounded-xl text-xs gap-1" data-testid={`call-doctor-${c.id}`}>
                                <Phone className="h-3 w-3" /> Call
                              </Button>
                            </a>
                            <a href={`https://wa.me/${c.doctor.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="btn-whatsapp rounded-xl text-xs gap-1" data-testid={`whatsapp-doctor-${c.id}`}>
                                <MessageSquare className="h-3 w-3" /> WhatsApp
                              </Button>
                            </a>
                          </>
                        )}
                        {c.status === 'accepted' && (
                          <Button size="sm" variant="outline" onClick={() => openFeedbackDialog(c)} className="rounded-xl text-xs gap-1 border-[#E2E8F0]" data-testid={`feedback-btn-${c.id}`}>
                            <Star className="h-3 w-3" /> Leave Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {consultations.length === 0 && (
                <div className="text-center py-16">
                  <PawPrint className="h-12 w-12 text-[#E2E8F0] mx-auto mb-4" />
                  <p className="text-[#718096]">No consultations yet. Browse doctors to get started!</p>
                  <Button onClick={() => setActiveTab('doctors')} className="mt-4 bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl" data-testid="go-browse-doctors">
                    Browse Doctors
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Consultation Dialog */}
      <Dialog open={consultDialog} onOpenChange={setConsultDialog}>
        <DialogContent className="max-w-lg rounded-2xl" data-testid="consultation-dialog">
          <DialogHeader>
            <DialogTitle className="text-[#1E392A] text-xl" style={{ fontFamily: 'Outfit' }}>
              Consult with {selectedDoctor?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitConsultation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#1E392A] font-medium">Pet Name</Label>
                <Input value={petForm.pet_name} onChange={e => setPetForm({ ...petForm, pet_name: e.target.value })} placeholder="Buddy" className="rounded-xl border-[#E2E8F0]" required data-testid="pet-name-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1E392A] font-medium">Pet Age</Label>
                <Input value={petForm.pet_age} onChange={e => setPetForm({ ...petForm, pet_age: e.target.value })} placeholder="3 years" className="rounded-xl border-[#E2E8F0]" required data-testid="pet-age-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Pet Type</Label>
              <Select value={petForm.pet_type} onValueChange={val => setPetForm({ ...petForm, pet_type: val })}>
                <SelectTrigger className="rounded-xl border-[#E2E8F0]" data-testid="pet-type-select">
                  <SelectValue placeholder="Select pet type" />
                </SelectTrigger>
                <SelectContent>
                  {PET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Problem Description</Label>
              <Textarea value={petForm.problem} onChange={e => setPetForm({ ...petForm, problem: e.target.value })} placeholder="Describe your pet's symptoms..." className="rounded-xl border-[#E2E8F0] min-h-[100px]" required data-testid="pet-problem-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Pet Image (optional)</Label>
              {petImagePreview ? (
                <div className="relative inline-block">
                  <img src={petImagePreview} alt="Pet" className="h-20 w-20 rounded-xl object-cover" />
                  <button type="button" onClick={() => { setPetImage(null); setPetImagePreview(''); }} className="absolute -top-2 -right-2 bg-[#E53E3E] text-white rounded-full p-1" data-testid="remove-pet-image">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="h-20 w-20 rounded-xl border-2 border-dashed border-[#E2E8F0] flex flex-col items-center justify-center cursor-pointer hover:border-[#81B29A] transition-colors" data-testid="pet-image-upload">
                  <Upload className="h-5 w-5 text-[#718096]" />
                  <span className="text-xs text-[#718096]">Upload</span>
                  <input type="file" accept="image/*" onChange={handlePetImageChange} className="hidden" />
                </label>
              )}
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl" data-testid="submit-consultation-btn">
              {submitting ? 'Submitting...' : 'Submit Consultation'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent className="max-w-md rounded-2xl" data-testid="feedback-dialog">
          <DialogHeader>
            <DialogTitle className="text-[#1E392A] text-xl" style={{ fontFamily: 'Outfit' }}>Leave Feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitFeedback} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Rating</Label>
              <StarRatingInput value={feedbackForm.rating} onChange={r => setFeedbackForm({ ...feedbackForm, rating: r })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Comment (optional)</Label>
              <Textarea value={feedbackForm.comment} onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })} placeholder="Share your experience..." className="rounded-xl border-[#E2E8F0] min-h-[80px]" data-testid="feedback-comment-input" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-[#81B29A] hover:bg-[#6A9A82] text-white rounded-xl" data-testid="submit-feedback-btn">
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
