import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle, XCircle, Trash2, Users, Calendar, AlertCircle, Flag, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const AdminDashboard = () => {
  const [pendingApps, setPendingApps] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ users: 0, events: 0, pending: 0, flags: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // New state for the requested popup mechanism
  const [showPopup, setShowPopup] = useState(false);
  
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const verifyAdminAndFetchData = async () => {
      // 1. Strict perimeter check: Eject unauthenticated users
      if (!auth.currentUser) {
        navigate('/auth');
        return;
      }

      try {
        // 2. Cryptographic Role Verification
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (!userDoc.exists() || userDoc.data().isAdmin !== true) {
          navigate('/'); // Eject standard users back to the feed
          return;
        }

        // 3. Concurrent Data Fetching (Performance Optimisation)
        // By using Promise.all, we fetch all collections simultaneously rather than sequentially.
        const [usersSnap, eventsSnap, reportsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'events')),
          getDocs(collection(db, 'reports'))
        ]);

        // Process Users
        const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const pending = usersData.filter(u => u.applicationStatus === 'pending');
        
        // Process Events & Reports
        const eventsData = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const reportsData = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Update State
        setPendingApps(pending);
        setAllEvents(eventsData);
        setReports(reportsData);
        
        setStats({
          users: usersData.length,
          events: eventsData.length,
          pending: pending.length,
          flags: reportsData.length
        });

        // 4. Trigger the Popup if pending requests exist
        if (pending.length > 0) {
          setShowPopup(true);
        }

      } catch (error) {
        console.error("Dashboard Initialisation Failed:", error);
        showToast(t("Error loading dashboard data.", "தரவை ஏற்றுவதில் பிழை."));
      } finally {
        setLoading(false); // Ensure loading skeleton is dismissed regardless of outcome
      }
    };

    verifyAdminAndFetchData();
  }, [navigate, t]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Core Administrative Actions ---

  const handleApproval = async (userId, isApproved) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        applicationStatus: isApproved ? 'approved' : 'rejected',
        isVerified: isApproved, 
        businessName: isApproved ? pendingApps.find(a => a.id === userId).requestedBusinessName : null
      });
      
      showToast(isApproved ? t("Business Approved!", "வணிகம் அங்கீகரிக்கப்பட்டது!") : t("Application Rejected.", "விண்ணப்பம் நிராகரிக்கப்பட்டது."));
      
      // Optimistic UI update: Remove the item from state without requiring a page refresh
      setPendingApps(prev => prev.filter(app => app.id !== userId));
      setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
      
      if (pendingApps.length - 1 === 0) setShowPopup(false);
    } catch (error) {
      showToast(t("Action failed. Check database connection.", "செயல் தோல்வியடைந்தது."));
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm(t("Are you sure you want to delete this event? This cannot be undone.", "இந்த நிகழ்வை நிச்சயமாக நீக்க விரும்புகிறீர்களா?"))) return;
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

  return (
    <div className="app-container page-content">
      
      {/* Toast Notification System */}
      {toast && (
        <div className="error-toast" style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--shadow-glow)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle color="var(--accent-solid)" />
          <p style={{ fontWeight: 600, margin: 0 }}>{toast}</p>
        </div>
      )}

      {/* The New Alert Popup Modal */}
      {showPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(253, 251, 247, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="profile-section animate-in" style={{ maxWidth: '90%', width: '400px', textAlign: 'center', padding: '2.5rem 2rem', position: 'relative' }}>
            <button onClick={() => setShowPopup(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
              <X size={24} />
            </button>
            <div style={{ background: '#FFF4F1', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Building size={32} color="var(--accent-solid)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t("Action Required", "நடவடிக்கை தேவை")}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {t(`You have ${stats.pending} new business account requests awaiting your approval.`, `உங்கள் ஒப்புதலுக்காக ${stats.pending} புதிய வணிகக் கணக்கு கோரிக்கைகள் உள்ளன.`)}
            </p>
            <button className="btn-primary" onClick={() => setShowPopup(false)}>
              {t("Review Requests", "கோரிக்கைகளை மதிப்பாய்வு செய்")}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <ShieldAlert size={36} color="var(--accent-solid)" />
        <h1 className="event-title" style={{ margin: 0 }}>{t("Admin Portal", "நிர்வாகி போர்டல்")}</h1>
      </div>

      {/* --- STATISTICS GRID --- */}
      <div className="stats-grid">
        <div className="stat-card">
          <Users size={24} color="var(--text-secondary)" />
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">{t("Total Users", "பயனர்கள்")}</div>
        </div>
        <div className="stat-card">
          <Calendar size={24} color="var(--text-secondary)" />
          <div className="stat-value">{stats.events}</div>
          <div className="stat-label">{t("Events", "நிகழ்வுகள்")}</div>
        </div>
        <div className="stat-card" style={{ borderColor: stats.pending > 0 ? 'var(--accent-solid)' : '' }}>
          <AlertCircle size={24} color={stats.pending > 0 ? 'var(--accent-solid)' : 'var(--text-secondary)'} />
          <div className="stat-value" style={{ color: stats.pending > 0 ? 'var(--accent-solid)' : 'var(--text-primary)' }}>{stats.pending}</div>
          <div className="stat-label">{t("Requests", "கோரிக்கைகள்")}</div>
        </div>
        <div className="stat-card" style={{ borderColor: stats.flags > 0 ? '#DC2626' : '' }}>
          <Flag size={24} color={stats.flags > 0 ? '#DC2626' : 'var(--text-secondary)'} />
          <div className="stat-value" style={{ color: stats.flags > 0 ? '#DC2626' : 'var(--text-primary)' }}>{stats.flags}</div>
          <div className="stat-label">{t("Flagged", "புகார்கள்")}</div>
        </div>
      </div>

      {/* --- FLAGGED CONTENT --- */}
      {reports.length > 0 && (
        <div className="profile-section" style={{ border: '1px solid #DC2626', background: '#FFFAFA' }}>
          <h2 style={{ marginBottom: '1rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flag size={20} /> {t("Action Required", "நடவடிக்கை தேவை")}
          </h2>
          {reports.map(rep => (
            <div key={rep.id} className="admin-event-item" style={{ borderLeft: '4px solid #DC2626', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem', background: '#FFFFFF' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem' }}>Event: {rep.eventTitle}</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <strong>Reason:</strong> {rep.reason}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button onClick={() => handleDeleteEvent(rep.eventId)} className="btn-small" style={{ background: '#FEF2F2', color: '#DC2626', flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 600, border: 'none' }}>
                  {t("Delete Event", "நிகழ்வை நீக்கு")}
                </button>
                <button onClick={() => handleDismissReport(rep.id)} className="btn-small" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', flex: 1, padding: '0.75rem', borderRadius: '12px', fontWeight: 600, border: 'none' }}>
                  {t("Dismiss", "நிராகரி")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- BUSINESS REQUESTS --- */}
      <div className="profile-section">
        <h2 style={{ marginBottom: '1rem' }}>{t("Business Requests", "வணிக கோரிக்கைகள்")}</h2>
        {pendingApps.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>{t("No pending applications.", "நிலுவையில் உள்ள விண்ணப்பங்கள் இல்லை.")}</p>
        ) : (
          pendingApps.map(app => (
            <div key={app.id} className="admin-event-item" style={{ background: 'var(--bg-main)' }}>
              <div>
                <strong style={{ fontSize: '1.1rem' }}>{app.requestedBusinessName}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{app.email}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleApproval(app.id, true)} className="btn-small btn-approve" style={{ background: '#E1FDEB', color: '#007F3B', padding: '0.5rem', borderRadius: '50%', border: 'none' }}><CheckCircle size={22} /></button>
                <button onClick={() => handleApproval(app.id, false)} className="btn-small btn-reject" style={{ background: '#FEF2F2', color: '#DC2626', padding: '0.5rem', borderRadius: '50%', border: 'none' }}><XCircle size={22} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- MANAGE ALL EVENTS --- */}
      <div className="profile-section">
        <h2 style={{ marginBottom: '1rem' }}>{t("Manage Events", "நிகழ்வுகளை நிர்வகிக்கவும்")}</h2>
        {allEvents.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>{t("No events on the platform.", "நிகழ்வுகள் எதுவும் இல்லை.")}</p>
        ) : (
          allEvents.map(event => (
            <div key={event.id} className="admin-event-item" style={{ background: 'var(--bg-main)' }}>
              <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '1rem' }}>
                <strong style={{ display: 'block' }}>{event.title}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By {event.organiser}</span>
              </div>
              <button onClick={() => handleDeleteEvent(event.id)} className="btn-small" style={{ background: '#FFF0F0', color: '#E00000', border: 'none', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer' }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;