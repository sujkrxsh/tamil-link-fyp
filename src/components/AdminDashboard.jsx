import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle, XCircle, Trash2, Users, Calendar, AlertCircle, Flag, X, Building, Briefcase, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const AdminDashboard = () => {
  // Data States
  const [pendingApps, setPendingApps] = useState([]);
  const [verifiedBusinesses, setVerifiedBusinesses] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ users: 0, events: 0, pending: 0, flags: 0, businesses: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // UI Modal States
  const [showInitialPopup, setShowInitialPopup] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'requests', 'businesses', or 'events'
  
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const verifyAdminAndFetchData = async () => {
      if (!auth.currentUser) return navigate('/auth');

      try {
        // Cryptographic Role Verification
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists() || userDoc.data().isAdmin !== true) {
          return navigate('/'); 
        }

        // Concurrent Data Fetching
        const [usersSnap, eventsSnap, reportsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'events')),
          getDocs(collection(db, 'reports'))
        ]);

        // Process Users
        const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const pending = usersData.filter(u => u.applicationStatus === 'pending');
        const businesses = usersData.filter(u => u.isVerified === true);
        
        // Process Events & Reports
        const eventsData = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const reportsData = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Update State
        setPendingApps(pending);
        setVerifiedBusinesses(businesses);
        setAllEvents(eventsData);
        setReports(reportsData);
        
        setStats({
          users: usersData.length,
          events: eventsData.length,
          pending: pending.length,
          flags: reportsData.length,
          businesses: businesses.length
        });

        // Trigger the Alert Popup if pending requests exist
        if (pending.length > 0) {
          setShowInitialPopup(true);
        }

      } catch (error) {
        console.error("Dashboard Initialisation Failed:", error);
        showToast(t("Error loading dashboard data.", "தரவை ஏற்றுவதில் பிழை."));
      } finally {
        setLoading(false);
      }
    };

    verifyAdminAndFetchData();
  }, [navigate, t]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Administrative Actions ---

  const handleApproval = async (userId, isApproved) => {
    try {
      const appToUpdate = pendingApps.find(a => a.id === userId);
      await updateDoc(doc(db, 'users', userId), {
        applicationStatus: isApproved ? 'approved' : 'rejected',
        isVerified: isApproved, 
        businessName: isApproved ? appToUpdate.requestedBusinessName : null
      });
      
      showToast(isApproved ? t("Business Approved!", "வணிகம் அங்கீகரிக்கப்பட்டது!") : t("Application Rejected.", "விண்ணப்பம் நிராகரிக்கப்பட்டது."));
      
      setPendingApps(prev => prev.filter(app => app.id !== userId));
      if (isApproved) {
        setVerifiedBusinesses(prev => [...prev, { ...appToUpdate, isVerified: true, businessName: appToUpdate.requestedBusinessName }]);
        setStats(prev => ({ ...prev, businesses: prev.businesses + 1 }));
      }
      setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
      
    } catch (error) {
      showToast(t("Action failed.", "செயல் தோல்வியடைந்தது."));
    }
  };

  const handleRevokeBusiness = async (userId) => {
    if (!window.confirm(t("Are you sure you want to revoke this account's verified status?", "இந்தக் கணக்கின் சரிபார்க்கப்பட்ட நிலையை ரத்து செய்ய விரும்புகிறீர்களா?"))) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: false,
        applicationStatus: 'revoked',
        businessName: null
      });
      
      showToast(t("Business access revoked.", "வணிக அணுகல் ரத்து செய்யப்பட்டது."));
      setVerifiedBusinesses(prev => prev.filter(b => b.id !== userId));
      setStats(prev => ({ ...prev, businesses: prev.businesses - 1 }));
    } catch (error) {
      showToast(t("Failed to revoke access.", "அணுகலை ரத்து செய்ய முடியவில்லை."));
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm(t("Are you sure you want to delete this event?", "இந்த நிகழ்வை நிச்சயமாக நீக்க விரும்புகிறீர்களா?"))) return;
    try {
      await deleteDoc(doc(db, 'events', eventId));
      showToast(t("Event deleted successfully.", "நிகழ்வு வெற்றிகரமாக நீக்கப்பட்டது."));
      setAllEvents(prev => prev.filter(e => e.id !== eventId));
      setStats(prev => ({ ...prev, events: prev.events - 1 }));
    } catch (error) {
      showToast(t("Failed to delete event.", "நிகழ்வை நீக்க முடியவில்லை."));
    }
  };

  const handleDismissReport = async (reportId) => {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      showToast(t("Report dismissed.", "புகார் நிராகரிக்கப்பட்டது."));
      setReports(prev => prev.filter(r => r.id !== reportId));
      setStats(prev => ({ ...prev, flags: prev.flags - 1 }));
    } catch (error) {
      showToast(t("Failed to dismiss report.", "புகாரை நிராகரிக்க முடியவில்லை."));
    }
  };

  // --- Render States ---

  if (loading) {
    return (
      <div className="app-container page-content">
        <div className="loading-container animate-in">
          <div className="loading-spinner"></div>
          <p className="loading-text">{t("Authenticating Admin Session...", "நிர்வாகி அமர்வு சரிபார்க்கப்படுகிறது...")}</p>
        </div>
      </div>
    );
  }

  // --- Reusable Modal Wrapper ---
  const Modal = ({ title, children }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(253, 251, 247, 0.8)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
      <div className="profile-section animate-in" style={{ width: '100%', maxWidth: '450px', maxHeight: '80vh', overflowY: 'auto', position: 'relative', padding: '2rem 1.5rem' }}>
        <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--bg-input)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={20} />
        </button>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', paddingRight: '2rem' }}>{title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container page-content">
      
      {/* Toast Notification */}
      {toast && (
        <div className="error-toast" style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--shadow-glow)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle color="var(--accent-solid)" />
          <p style={{ fontWeight: 600, margin: 0 }}>{toast}</p>
        </div>
      )}

      {/* Initial Action Required Popup */}
      {showInitialPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="profile-section animate-in" style={{ maxWidth: '90%', width: '380px', textAlign: 'center', padding: '2.5rem 2rem', position: 'relative' }}>
            <button onClick={() => setShowInitialPopup(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={24} /></button>
            <div style={{ background: '#FFF4F1', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Building size={32} color="var(--accent-solid)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t("Action Required", "நடவடிக்கை தேவை")}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {t(`You have ${stats.pending} new business requests awaiting approval.`, `உங்கள் ஒப்புதலுக்காக ${stats.pending} புதிய வணிகக் கோரிக்கைகள் உள்ளன.`)}
            </p>
            <button className="btn-primary" onClick={() => { setShowInitialPopup(false); setActiveModal('requests'); }}>
              {t("Review Requests", "கோரிக்கைகளை மதிப்பாய்வு செய்")}
            </button>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {activeModal === 'requests' && (
        <Modal title={t("Business Requests", "வணிக கோரிக்கைகள்")}>
          {pendingApps.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>{t("No pending applications.", "விண்ணப்பங்கள் இல்லை.")}</p> : 
            pendingApps.map(app => (
              <div key={app.id} className="admin-event-item" style={{ background: 'var(--bg-main)', margin: 0 }}>
                <div>
                  <strong style={{ fontSize: '1.05rem', display: 'block' }}>{app.requestedBusinessName}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{app.email}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleApproval(app.id, true)} className="btn-small" style={{ background: '#E1FDEB', color: '#007F3B', padding: '0.5rem', borderRadius: '50%', border: 'none' }}><CheckCircle size={20} /></button>
                  <button onClick={() => handleApproval(app.id, false)} className="btn-small" style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.5rem', borderRadius: '50%', border: 'none' }}><XCircle size={20} /></button>
                </div>
              </div>
            ))
          }
        </Modal>
      )}

      {activeModal === 'businesses' && (
        <Modal title={t("Verified Businesses", "சரிபார்க்கப்பட்ட வணிகங்கள்")}>
          {verifiedBusinesses.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>{t("No verified businesses.", "வணிகங்கள் இல்லை.")}</p> : 
            verifiedBusinesses.map(bus => (
              <div key={bus.id} className="admin-event-item" style={{ background: 'var(--bg-main)', margin: 0, flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <strong style={{ fontSize: '1.05rem', display: 'block', color: '#007F3B' }}>✓ {bus.businessName}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{bus.email}</span>
                </div>
                <button onClick={() => handleRevokeBusiness(bus.id)} className="btn-small" style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.6rem 1rem', borderRadius: '12px', border: 'none', width: '100%', fontWeight: 600 }}>
                  {t("Revoke Access", "அணுகலை ரத்து செய்")}
                </button>
              </div>
            ))
          }
        </Modal>
      )}

      {activeModal === 'events' && (
        <Modal title={t("Manage Events", "நிகழ்வுகளை நிர்வகிக்கவும்")}>
          {allEvents.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>{t("No events on platform.", "நிகழ்வுகள் இல்லை.")}</p> : 
            allEvents.map(event => (
              <div key={event.id} className="admin-event-item" style={{ background: 'var(--bg-main)', margin: 0 }}>
                <div style={{ flex: 1, overflow: 'hidden', marginRight: '1rem' }}>
                  <strong style={{ display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{event.title}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By {event.organiser}</span>
                </div>
                <button onClick={() => handleDeleteEvent(event.id)} className="btn-small" style={{ background: '#FFF0F0', color: '#E00000', border: 'none', padding: '0.5rem', borderRadius: '12px' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          }
        </Modal>
      )}

      {/* --- DASHBOARD UI --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <ShieldAlert size={36} color="var(--accent-solid)" />
        <h1 className="event-title" style={{ margin: 0 }}>{t("Admin Portal", "நிர்வாகி போர்டல்")}</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Users size={24} color="var(--text-secondary)" />
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">{t("Users", "பயனர்கள்")}</div>
        </div>
        <div className="stat-card">
          <Briefcase size={24} color="var(--text-secondary)" />
          <div className="stat-value">{stats.businesses}</div>
          <div className="stat-label">{t("Verified", "வணிகங்கள்")}</div>
        </div>
      </div>

      {/* Action Menu Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => setActiveModal('requests')} className="profile-section" style={{ padding: '1.25rem', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: stats.pending > 0 ? '1px solid var(--accent-solid)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '50%' }}><AlertCircle size={20} color={stats.pending > 0 ? "var(--accent-solid)" : "var(--text-primary)"} /></div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{t("Business Requests", "வணிக கோரிக்கைகள்")}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{stats.pending} pending</p>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-tertiary)" />
        </button>

        <button onClick={() => setActiveModal('businesses')} className="profile-section" style={{ padding: '1.25rem', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '50%' }}><Building size={20} color="var(--text-primary)" /></div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{t("Verified Businesses", "சரிபார்க்கப்பட்ட வணிகங்கள்")}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Manage access</p>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-tertiary)" />
        </button>

        <button onClick={() => setActiveModal('events')} className="profile-section" style={{ padding: '1.25rem', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '50%' }}><Calendar size={20} color="var(--text-primary)" /></div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{t("Manage Events", "நிகழ்வுகளை நிர்வகிக்கவும்")}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{stats.events} active</p>
            </div>
          </div>
          <ChevronRight size={20} color="var(--text-tertiary)" />
        </button>
      </div>

      {/* Flagged Content (Always visible due to urgency) */}
      {reports.length > 0 && (
        <div className="profile-section" style={{ border: '1px solid #DC2626', background: '#FFFAFA' }}>
          <h2 style={{ marginBottom: '1rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flag size={20} /> {t("Action Required", "நடவடிக்கை தேவை")}
          </h2>
          {reports.map(rep => (
            <div key={rep.id} className="admin-event-item" style={{ borderLeft: '4px solid #DC2626', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', background: '#FFFFFF', margin: 0, marginBottom: '0.75rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem' }}>Event: {rep.eventTitle}</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <strong>Reason:</strong> {rep.reason}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button onClick={() => handleDeleteEvent(rep.eventId)} className="btn-small" style={{ background: '#FEF2F2', color: '#DC2626', flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 600, border: 'none' }}>
                  {t("Delete", "நீக்கு")}
                </button>
                <button onClick={() => handleDismissReport(rep.id)} className="btn-small" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 600, border: 'none' }}>
                  {t("Dismiss", "நிராகரி")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;