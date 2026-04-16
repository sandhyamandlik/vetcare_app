import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import {
  FileText, Download, Mail, PawPrint, Stethoscope, Clock,
  Search, ArrowLeft, Filter, Calendar
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://vetcare-app-2nqr.onrender.com';
const API = 'https://vetcare-app-2nqr.onrender.com/api';

export default function PrescriptionHistoryPage() {
  const { user, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [sending, setSending] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/prescriptions-history/user`, { headers });
      setHistory(res.data.history);
      setFiltered(res.data.history);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'user') { navigate('/login'); return; }
    fetchHistory();
  }, [user, authLoading, navigate, fetchHistory]);

  useEffect(() => {
    let result = history;
    if (doctorFilter !== 'all') {
      result = result.filter(h => h.doctor?.id === doctorFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(h =>
        h.pet_name.toLowerCase().includes(term) ||
        h.prescriptions.some(p => p.medicine.toLowerCase().includes(term)) ||
        h.doctor?.name?.toLowerCase().includes(term)
      );
    }
    setFiltered(result);
  }, [searchTerm, doctorFilter, history]);

  const uniqueDoctors = [...new Map(history.map(h => [h.doctor?.id, h.doctor]).filter(([id]) => id)).values()];

  const emailPrescription = async (consultationId) => {
    setSending(consultationId);
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
      setSending(null);
    }
  };

  const downloadPrescription = (item) => {
    const doctor = item.doctor || {};
    const date = new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `<html><head><title>Prescription - ${item.pet_name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Manrope:wght@400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Manrope',sans-serif;padding:40px;color:#1E392A;max-width:800px;margin:0 auto;}
        .header{border-bottom:3px solid #81B29A;padding-bottom:20px;margin-bottom:24px;display:flex;justify-content:space-between;}
        .logo{font-family:'Outfit',sans-serif;font-size:28px;font-weight:700;color:#1E392A;} .logo span{color:#E07A5F;}
        .date{color:#718096;font-size:13px;text-align:right;}
        .section{margin-bottom:20px;} .section-title{font-family:'Outfit',sans-serif;font-size:14px;text-transform:uppercase;letter-spacing:2px;color:#81B29A;margin-bottom:8px;font-weight:600;}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .info-item label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#718096;display:block;margin-bottom:2px;} .info-item p{font-size:15px;font-weight:500;}
        .rx{background:#F4F1DE;border-radius:12px;padding:16px;margin-bottom:12px;}
        .rx-name{font-family:'Outfit',sans-serif;font-size:17px;font-weight:600;margin-bottom:4px;}
        .rx-dosage{font-size:14px;color:#4A5568;} .rx-notes{font-size:13px;color:#718096;margin-top:4px;font-style:italic;}
        .footer{margin-top:40px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:12px;color:#718096;text-align:center;}
        .problem{background:#fafaf9;border-left:3px solid #E07A5F;padding:12px 16px;border-radius:0 8px 8px 0;font-size:14px;color:#4A5568;}
        @media print{body{padding:20px;}}
      </style></head><body>
      <div class="header"><div><div class="logo">Vet<span>Care</span></div><p style="font-size:13px;color:#4A5568;margin-top:4px;">Veterinary Consultation Platform</p></div><div class="date"><p><strong>Prescription</strong></p><p>${date}</p></div></div>
      <div class="section"><div class="section-title">Doctor Information</div><div class="info-grid"><div class="info-item"><label>Name</label><p>${doctor.name||'N/A'}</p></div><div class="info-item"><label>Specialization</label><p>${doctor.specialization||'N/A'}</p></div><div class="info-item"><label>Phone</label><p>${doctor.phone||'N/A'}</p></div><div class="info-item"><label>Experience</label><p>${doctor.experience||0} years</p></div></div></div>
      <div class="section"><div class="section-title">Pet Details</div><div class="info-grid"><div class="info-item"><label>Pet Name</label><p>${item.pet_name}</p></div><div class="info-item"><label>Type</label><p>${item.pet_type}</p></div><div class="info-item"><label>Age</label><p>${item.pet_age}</p></div><div class="info-item"><label>Owner</label><p>${user?.name||''}</p></div></div></div>
      <div class="section"><div class="section-title">Problem Description</div><div class="problem">${item.problem}</div></div>
      <div class="section"><div class="section-title">Prescribed Medications</div>${item.prescriptions.map((p,i)=>`<div class="rx"><div class="rx-name">${i+1}. ${p.medicine}</div><div class="rx-dosage">Dosage: ${p.dosage}</div>${p.notes?`<div class="rx-notes">Note: ${p.notes}</div>`:''}</div>`).join('')}</div>
      <div class="footer"><p>This prescription was generated via VetCare Veterinary Consultation Platform.</p><p style="margin-top:4px;">Please follow the prescribed dosage and consult your vet if symptoms persist.</p></div>
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.onload = () => setTimeout(() => win.print(), 500);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (!user) return null;

  const totalPrescriptions = history.reduce((sum, h) => sum + h.prescriptions.length, 0);

  return (
    <div className="min-h-screen bg-[#FDFDFC] pt-20" data-testid="prescription-history-page">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link to="/dashboard" className="text-[#4A5568] hover:text-[#1E392A] transition-colors" data-testid="back-to-dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>
            Prescription History
          </h1>
        </div>
        <p className="text-[#4A5568] mb-6 ml-8">All your prescriptions across consultations in one place.</p>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#81B29A]/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-[#81B29A]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{totalPrescriptions}</p>
              <p className="text-xs text-[#718096]">Total Prescriptions</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#E07A5F]/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-[#E07A5F]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{history.length}</p>
              <p className="text-xs text-[#718096]">Consultations</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#DD6B20]/10 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-[#DD6B20]" />
            </div>
            <div>
              <p className="text-xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{uniqueDoctors.length}</p>
              <p className="text-xs text-[#718096]">Doctors Consulted</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by pet, medicine, or doctor..."
              className="pl-10 rounded-xl border-[#E2E8F0] focus:ring-2 focus:ring-[#81B29A]"
              data-testid="prescription-search-input"
            />
          </div>
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-full sm:w-[220px] rounded-xl border-[#E2E8F0]" data-testid="prescription-doctor-filter">
              <Filter className="h-4 w-4 mr-2 text-[#718096]" />
              <SelectValue placeholder="Filter by doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {uniqueDoctors.map(doc => (
                <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prescription Cards */}
        {loading ? (
          <p className="text-center text-[#718096] py-12">Loading prescriptions...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <PawPrint className="h-12 w-12 text-[#E2E8F0] mx-auto mb-4" />
            <p className="text-[#718096]">{history.length === 0 ? 'No prescriptions yet.' : 'No results match your filters.'}</p>
            {history.length === 0 && (
              <Link to="/dashboard">
                <Button className="mt-4 bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl" data-testid="go-consult-btn">
                  Browse Doctors
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div key={item.consultation_id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden" data-testid={`history-card-${item.consultation_id}`}>
                {/* Card header */}
                <div className="bg-[#F4F1DE] px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <PawPrint className="h-4 w-4 text-[#E07A5F]" />
                    <span className="font-bold text-[#1E392A] text-sm" style={{ fontFamily: 'Outfit' }}>
                      {item.pet_name} ({item.pet_type})
                    </span>
                    <span className="text-xs text-[#718096]">Age: {item.pet_age}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-[#718096]" />
                    <span className="text-xs text-[#718096]">{new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Doctor info */}
                  <div className="flex items-center gap-3 mb-3">
                    <Stethoscope className="h-4 w-4 text-[#81B29A]" />
                    <span className="text-sm font-medium text-[#1E392A]">{item.doctor?.name || 'Unknown'}</span>
                    <Badge className="bg-[#81B29A]/10 text-[#2C4A3B] border-0 rounded-full text-xs">{item.doctor?.specialization}</Badge>
                  </div>

                  {/* Problem */}
                  <p className="text-sm text-[#4A5568] mb-4 bg-[#fafaf9] rounded-xl p-3 border-l-3 border-[#E07A5F]" style={{ borderLeft: '3px solid #E07A5F' }}>
                    {item.problem}
                  </p>

                  {/* Prescriptions table */}
                  <div className="space-y-2 mb-4">
                    {item.prescriptions.map((p, i) => (
                      <div key={p.id} className="flex items-start gap-3 bg-[#81B29A]/5 rounded-xl p-3">
                        <div className="h-6 w-6 rounded-full bg-[#81B29A] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-[#1E392A]">{p.medicine}</p>
                          <p className="text-xs text-[#4A5568]">Dosage: {p.dosage}</p>
                          {p.notes && <p className="text-xs text-[#718096] mt-1 italic">{p.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="mb-4" />

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadPrescription(item)}
                      className="rounded-xl text-xs gap-1 border-[#81B29A] text-[#81B29A] hover:bg-[#81B29A] hover:text-white transition-colors"
                      data-testid={`history-download-${item.consultation_id}`}
                    >
                      <Download className="h-3 w-3" /> Download
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => emailPrescription(item.consultation_id)}
                      disabled={sending === item.consultation_id}
                      className="rounded-xl text-xs gap-1 bg-[#E07A5F] hover:bg-[#D56A4F] text-white"
                      data-testid={`history-email-${item.consultation_id}`}
                    >
                      <Mail className="h-3 w-3" /> {sending === item.consultation_id ? 'Sending...' : 'Email to Me'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
