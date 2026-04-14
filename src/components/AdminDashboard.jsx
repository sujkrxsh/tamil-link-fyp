import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CheckCircle, XCircle, Trash2, Users, Calendar, AlertCircle, Flag } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const AdminDashboard = () => {
  const [pendingApps, setPendingApps] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ users: 0, events: 0, pending: 0, flags: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const verifyAdminAndFetchData = async () => {
      if (!auth.currentUser) return navigate('/auth');

      // STRICT ADMIN CHECK
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!userDoc.exists() || !userDoc.data().isAdmin) {
        return navigate('/'); 
      }

      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const pending = usersData.filter(u => u.applicationStatus === 'pending');
        
        const eventsSnap = await getDocs(collection(db, 'events'));
        const eventsData = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const reportsSnap = await getDocs(collection(db, 'reports'));
        const reportsData = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setPendingApps(pending);
        setAllEvents(eventsData);
        setReports(reportsData);
        
        setStats({
          users: usersData.length,
          events: eventsData.length,
          pending: pending.length,
          flags: reportsData.length
        });
      } catch (error) {
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

  const handleApproval = async (userId, isApproved) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        applicationStatus: isApproved ? 'approved' : 'rejected',
        isVerified: isApproved, 
        businessName: isApproved ? pendingApps.find(a => a.id === userId).requestedBusinessName : null
      });
      showToast(isApproved ? t("Business Approved!", "வணிகம் அங்கீகரிக்கப்பட்டது!") : t("Application Rejected.", "விண்ணப்பம் நிராகரிக்கப்பட்டது."));
      setPendingApps(prev => prev.filter(app => app.id !== userId));
      setStats(prev => ({ ...prev, pending: prev.pending - 1 }));
    } catch (error) {
      showToast(t("Action failed.", "செயல் தோல்வியடைந்தது."));
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

  if (loading) return <div className="app-container page-content"><p style={{textAlign: 'center'}}>{t("Verifying credentials...", "நற்சான்றிதழ்கள் சரிபார்க்கப்படுகின்றன...")}</p></div>;

  return (
    <div className="app-container page-content">
      {toast && (
        <div className="error-toast" style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--shadow-glow)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle color="var(--accent-solid)" />
          <p style={{ fontWeight: 600, margin: 0 }}>{toast}</p>
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
            <div key={rep.id} className="admin-event-item" style={{ borderLeft: '4px solid #DC2626', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem' }}>Event: {rep.eventTitle}</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <strong>Reason:</strong> {rep.reason}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button onClick={() => handleDeleteEvent(rep.eventId)} className="btn-small" style={{ background: '#FEF2F2', color: '#DC2626', flex: 1 }}>{t("Delete Event", "நிகழ்வை நீக்கு")}</button>
                <button onClick={() => handleDismissReport(rep.id)} className="btn-small" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', flex: 1 }}>{t("Dismiss", "நிராகரி")}</button>
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
            <div key={app.id} className="admin-event-item">
              <div>
                <strong style={{ fontSize: '1.1rem' }}>{app.requestedBusinessName}</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{app.email}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleApproval(app.id, true)} className="btn-small btn-approve"><CheckCircle size={18} /></button>
                <button onClick={() => handleApproval(app.id, false)} className="btn-small btn-reject" style={{background: 'transparent', border: '1px solid var(--text-tertiary)'}}><XCircle size={18} /></button>
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
            <div key={event.id} className="admin-event-item">
              <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '1rem' }}>
                <strong style={{ display: 'block' }}>{event.title}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By {event.organiser}</span>
              </div>
              <button onClick={() => handleDeleteEvent(event.id)} className="btn-small" style={{ background: '#FFF0F0', color: '#E00000', border: 'none' }}>
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