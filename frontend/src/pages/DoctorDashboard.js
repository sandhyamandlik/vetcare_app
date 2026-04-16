import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Phone, User, Edit3, Check, XCircle, Pill, Camera, Image, Calendar
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = 'https://vetcare-app-2nqr.onrender.com';
const API = 'https://vetcare-app-2nqr.onrender.com/api';

const resolveImg = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1644675272883-0c4d582528d8?w=400&h=400&fit=crop';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
};

const SPECIALIZATIONS = [
  'Small Animal Surgery', 'Feline Medicine', 'Canine Medicine', 'Veterinary Dermatology',
  'Exotic Animal Care', 'Veterinary Dentistry', 'Emergency & Critical Care',
  'Internal Medicine', 'Veterinary Ophthalmology', 'Behavioral Medicine',
];

function StatusBadge({ status }) {
  const cls = status === 'accepted' ? 'badge-accepted' : status === 'rejected' ? 'badge-rejected' : 'badge-pending';
  return <span className={`${cls} px-3 py-1 rounded-full text-xs font-semibold inline-block`}>{status}</span>;
}

export default function DoctorDashboard() {
  const { user, token, setUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');
  const [prescriptionDialog, setPrescriptionDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [prescForm, setPrescForm] = useState({ medicine: '', dosage: '', notes: '', follow_up_date: '', follow_up_note: '' });
  const [editForm, setEditForm] = useState({});
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [petImageDialog, setPetImageDialog] = useState(false);
  const [viewingPetImage, setViewingPetImage] = useState({ url: '', petName: '' });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchConsultations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/consultations/doctor`, { headers });
      setConsultations(res.data.consultations);
    } catch (err) { console.error(err); }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'doctor') { navigate('/login'); return; }
    fetchConsultations();
  }, [user, authLoading, navigate, fetchConsultations]);

  const updateStatus = async (consultId, status) => {
    try {
      await axios.put(`${API}/consultations/${consultId}/status`, { status }, { headers });
      toast.success(`Consultation ${status}`);
      fetchConsultations();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    }
  };

  const openPrescriptionDialog = (consultation) => {
    setSelectedConsultation(consultation);
    setPrescForm({ medicine: '', dosage: '', notes: '', follow_up_date: '', follow_up_note: '' });
    setPrescriptionDialog(true);
  };

  const submitPrescription = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        consultation_id: selectedConsultation.id,
        medicine: prescForm.medicine,
        dosage: prescForm.dosage,
        notes: prescForm.notes,
      };
      if (prescForm.follow_up_date) {
        payload.follow_up_date = prescForm.follow_up_date;
        payload.follow_up_note = prescForm.follow_up_note || '';
      }
      const res = await axios.post(`${API}/prescriptions`, payload, { headers });
      if (res.data.reminder) {
        toast.success('Prescription added with follow-up reminder!');
      } else {
        toast.success('Prescription added');
      }
      setPrescriptionDialog(false);
      fetchConsultations();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = () => {
    setEditForm({
      name: user.name || '',
      specialization: user.specialization || '',
      experience: user.experience || 0,
      cases_solved: user.cases_solved || 0,
      phone: user.phone || '',
    });
    setEditImage(null);
    setEditImagePreview('');
    setEditDialog(true);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImage(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const submitEditProfile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let profileImageUrl = undefined;
      if (editImage) {
        const fd = new FormData();
        fd.append('file', editImage);
        const uploadRes = await axios.post(`${API}/upload`, fd);
        profileImageUrl = uploadRes.data.url;
      }
      const updateData = {
        name: editForm.name,
        specialization: editForm.specialization,
        experience: parseInt(editForm.experience) || 0,
        cases_solved: parseInt(editForm.cases_solved) || 0,
        phone: editForm.phone,
      };
      if (profileImageUrl) updateData.profile_image = profileImageUrl;
      const res = await axios.put(`${API}/doctors/update-profile`, updateData, { headers });
      setUser(res.data.doctor);
      toast.success('Profile updated successfully');
      setEditDialog(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const pending = consultations.filter(c => c.status === 'pending');
  const active = consultations.filter(c => c.status === 'accepted');
  const rejected = consultations.filter(c => c.status === 'rejected');

  return (
    <div className="min-h-screen bg-[#FDFDFC] pt-20" data-testid="doctor-dashboard">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1E392A] tracking-tight" style={{ fontFamily: 'Outfit' }}>
              {user.name}'s Dashboard
            </h1>
            <p className="text-[#4A5568] mt-1">{user.specialization}</p>
          </div>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-[#81B29A]" />
            <span className="text-sm text-[#4A5568] font-medium">Veterinarian</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending', value: pending.length, color: '#DD6B20', icon: Clock },
            { label: 'Active', value: active.length, color: '#38A169', icon: Check },
            { label: 'Rejected', value: rejected.length, color: '#E53E3E', icon: XCircle },
            { label: 'Cases Solved', value: user.cases_solved, color: '#81B29A', icon: Star },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{value}</p>
                  <p className="text-xs text-[#718096]">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#F4F1DE] p-1 rounded-xl">
            <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1E392A] data-[state=active]:shadow-sm px-6" data-testid="tab-requests">
              <FileText className="h-4 w-4 mr-2" /> Requests {pending.length > 0 && <Badge className="ml-2 bg-[#DD6B20] text-white text-xs rounded-full">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#1E392A] data-[state=active]:shadow-sm px-6" data-testid="tab-profile">
              <User className="h-4 w-4 mr-2" /> My Profile
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <div className="space-y-4">
              {consultations.length === 0 && (
                <div className="text-center py-16">
                  <PawPrint className="h-12 w-12 text-[#E2E8F0] mx-auto mb-4" />
                  <p className="text-[#718096]">No consultation requests yet.</p>
                </div>
              )}
              {consultations.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-6" data-testid={`request-card-${c.id}`}>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {c.pet_image ? (
                      <div className="flex-shrink-0 group relative cursor-pointer" onClick={() => { setViewingPetImage({ url: resolveImg(c.pet_image), petName: c.pet_name }); setPetImageDialog(true); }} data-testid={`view-pet-image-thumb-${c.id}`}>
                        <img src={resolveImg(c.pet_image)} alt={c.pet_name} className="h-20 w-20 rounded-xl object-cover border border-[#E2E8F0] transition-opacity group-hover:opacity-75" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-[#1E392A]/70 rounded-lg px-2 py-1">
                            <Image className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-[#F4F1DE] flex items-center justify-center flex-shrink-0">
                        <PawPrint className="h-8 w-8 text-[#E2E8F0]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>
                            {c.pet_name} ({c.pet_type}) - <span className="font-normal text-[#4A5568]">Owner: {c.user_name}</span>
                          </h3>
                          <p className="text-sm text-[#718096]">Age: {c.pet_age} | {new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-sm text-[#4A5568] mb-3 bg-[#F4F1DE] rounded-xl p-3">{c.problem}</p>

                      {/* Prescriptions */}
                      {c.prescriptions && c.prescriptions.length > 0 && (
                        <div className="mb-3 space-y-2">
                          <h4 className="text-sm font-semibold text-[#1E392A] flex items-center gap-1">
                            <Pill className="h-4 w-4 text-[#81B29A]" /> Prescriptions
                          </h4>
                          {c.prescriptions.map((p) => (
                            <div key={p.id} className="bg-[#81B29A]/5 rounded-lg p-3 text-sm">
                              <span className="font-semibold text-[#1E392A]">{p.medicine}</span> - {p.dosage}
                              {p.notes && <p className="text-xs text-[#718096] mt-1">{p.notes}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {c.pet_image && (
                          <Button size="sm" variant="outline" onClick={() => { setViewingPetImage({ url: resolveImg(c.pet_image), petName: c.pet_name }); setPetImageDialog(true); }} className="rounded-xl text-xs gap-1 border-[#81B29A] text-[#81B29A] hover:bg-[#81B29A]/5" data-testid={`view-pet-image-btn-${c.id}`}>
                            <Image className="h-3 w-3" /> View Pet Image
                          </Button>
                        )}
                        {c.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => updateStatus(c.id, 'accepted')} className="bg-[#38A169] hover:bg-[#2F855A] text-white rounded-xl text-xs gap-1" data-testid={`accept-btn-${c.id}`}>
                              <Check className="h-3 w-3" /> Accept
                            </Button>
                            <Button size="sm" onClick={() => updateStatus(c.id, 'rejected')} variant="outline" className="border-[#E53E3E] text-[#E53E3E] hover:bg-[#E53E3E]/5 rounded-xl text-xs gap-1" data-testid={`reject-btn-${c.id}`}>
                              <XCircle className="h-3 w-3" /> Reject
                            </Button>
                          </>
                        )}
                        {c.status === 'accepted' && (
                          <Button size="sm" onClick={() => openPrescriptionDialog(c)} className="bg-[#81B29A] hover:bg-[#6A9A82] text-white rounded-xl text-xs gap-1" data-testid={`prescription-btn-${c.id}`}>
                            <Pill className="h-3 w-3" /> Add Prescription
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <img src={resolveImg(user.profile_image)} alt={user.name} className="h-32 w-32 rounded-2xl object-cover border-2 border-[#81B29A]" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1644675272883-0c4d582528d8?w=400&h=400&fit=crop'; }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1E392A]" style={{ fontFamily: 'Outfit' }}>{user.name}</h2>
                      <Badge className="bg-[#81B29A]/10 text-[#2C4A3B] border-0 rounded-full text-sm font-semibold mt-1">{user.specialization}</Badge>
                    </div>
                    <Button onClick={openEditDialog} variant="outline" className="rounded-xl border-[#E2E8F0] gap-2" data-testid="edit-profile-btn">
                      <Edit3 className="h-4 w-4" /> Edit Profile
                    </Button>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-[#718096] uppercase tracking-wider mb-1">Experience</p>
                      <p className="text-lg font-bold text-[#1E392A]">{user.experience} years</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#718096] uppercase tracking-wider mb-1">Cases Solved</p>
                      <p className="text-lg font-bold text-[#1E392A]">{user.cases_solved}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#718096] uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm text-[#4A5568]">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#718096] uppercase tracking-wider mb-1">Phone</p>
                      <p className="text-sm text-[#4A5568]">{user.phone || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Prescription Dialog */}
      <Dialog open={prescriptionDialog} onOpenChange={setPrescriptionDialog}>
        <DialogContent className="max-w-md rounded-2xl" data-testid="prescription-dialog">
          <DialogHeader>
            <DialogTitle className="text-[#1E392A] text-xl" style={{ fontFamily: 'Outfit' }}>
              Add Prescription for {selectedConsultation?.pet_name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitPrescription} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Medicine</Label>
              <Input value={prescForm.medicine} onChange={e => setPrescForm({ ...prescForm, medicine: e.target.value })} placeholder="Medicine name" className="rounded-xl border-[#E2E8F0]" required data-testid="prescription-medicine-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Dosage</Label>
              <Input value={prescForm.dosage} onChange={e => setPrescForm({ ...prescForm, dosage: e.target.value })} placeholder="e.g., 2 tablets twice daily" className="rounded-xl border-[#E2E8F0]" required data-testid="prescription-dosage-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Notes (optional)</Label>
              <Textarea value={prescForm.notes} onChange={e => setPrescForm({ ...prescForm, notes: e.target.value })} placeholder="Additional instructions..." className="rounded-xl border-[#E2E8F0] min-h-[80px]" data-testid="prescription-notes-input" />
            </div>

            {/* Follow-up Reminder Section */}
            <div className="border border-dashed border-[#81B29A] rounded-xl p-4 bg-[#81B29A]/5">
              <h4 className="text-sm font-semibold text-[#1E392A] mb-3 flex items-center gap-1.5" style={{ fontFamily: 'Outfit' }}>
                <Calendar className="h-4 w-4 text-[#81B29A]" /> Schedule Follow-up Reminder
              </h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[#1E392A] text-xs font-medium">Follow-up Date</Label>
                  <Input
                    type="date"
                    value={prescForm.follow_up_date}
                    onChange={e => setPrescForm({ ...prescForm, follow_up_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="rounded-xl border-[#E2E8F0] text-sm"
                    data-testid="prescription-followup-date"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[#1E392A] text-xs font-medium">Reminder Note (optional)</Label>
                  <Input
                    value={prescForm.follow_up_note}
                    onChange={e => setPrescForm({ ...prescForm, follow_up_note: e.target.value })}
                    placeholder="e.g., Check wound healing progress"
                    className="rounded-xl border-[#E2E8F0] text-sm"
                    data-testid="prescription-followup-note"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#718096] mt-2">Leave blank to skip. The pet owner will see a notification bell reminder.</p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-[#81B29A] hover:bg-[#6A9A82] text-white rounded-xl" data-testid="submit-prescription-btn">
              {submitting ? 'Adding...' : prescForm.follow_up_date ? 'Add Prescription & Reminder' : 'Add Prescription'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg rounded-2xl" data-testid="edit-profile-dialog">
          <DialogHeader>
            <DialogTitle className="text-[#1E392A] text-xl" style={{ fontFamily: 'Outfit' }}>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEditProfile} className="space-y-4">
            {/* Image Upload */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={editImagePreview || resolveImg(user.profile_image)}
                  alt="Profile"
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-[#81B29A]"
                />
                <label className="absolute -bottom-2 -right-2 bg-[#81B29A] text-white rounded-full p-1.5 cursor-pointer hover:bg-[#6A9A82] transition-colors" data-testid="edit-profile-image-upload">
                  <Camera className="h-3 w-3" />
                  <input type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="rounded-xl border-[#E2E8F0]" required data-testid="edit-name-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Specialization</Label>
              <Select value={editForm.specialization} onValueChange={val => setEditForm({ ...editForm, specialization: val })}>
                <SelectTrigger className="rounded-xl border-[#E2E8F0]" data-testid="edit-specialization-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#1E392A] font-medium">Experience (yrs)</Label>
                <Input type="number" min="0" value={editForm.experience} onChange={e => setEditForm({ ...editForm, experience: e.target.value })} className="rounded-xl border-[#E2E8F0]" required data-testid="edit-experience-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1E392A] font-medium">Cases Solved</Label>
                <Input type="number" min="0" value={editForm.cases_solved} onChange={e => setEditForm({ ...editForm, cases_solved: e.target.value })} className="rounded-xl border-[#E2E8F0]" required data-testid="edit-cases-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#1E392A] font-medium">Phone</Label>
              <Input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="rounded-xl border-[#E2E8F0]" data-testid="edit-phone-input" />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-[#E07A5F] hover:bg-[#D56A4F] text-white rounded-xl" data-testid="submit-edit-profile-btn">
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pet Image Preview Dialog */}
      <Dialog open={petImageDialog} onOpenChange={setPetImageDialog}>
        <DialogContent className="max-w-2xl rounded-2xl p-2" data-testid="pet-image-dialog">
          <DialogHeader className="px-4 pt-3">
            <DialogTitle className="text-[#1E392A] text-lg flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
              <PawPrint className="h-5 w-5 text-[#E07A5F]" /> {viewingPetImage.petName}'s Photo
            </DialogTitle>
          </DialogHeader>
          <div className="px-2 pb-2">
            <img
              src={viewingPetImage.url}
              alt={viewingPetImage.petName}
              className="w-full max-h-[70vh] object-contain rounded-xl"
              data-testid="pet-image-full-view"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
