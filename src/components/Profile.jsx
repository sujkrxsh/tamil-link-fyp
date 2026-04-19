import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, getDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { 
  LogOut, Building, Trash2, Bookmark, ChevronDown, ChevronUp, 
  Shield, CheckCircle, Clock, Send, User, X, BarChart3, Heart
} from 'lucide-react';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [mySocieties, setMySocieties] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);
  
  // UI State
  const [expandedSection, setExpandedSection] = useState(null); 
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Business Application & Metrics State
  const [businessName, setBusinessName] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [businessMetrics, setBusinessMetrics] = useState({ followers: 0, totalSaves: 0, eventsHosted: 0 });
  
  // We only need 't' and 'toggleLanguage' now. 
  const { t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return navigate('/auth');

    const fetchProfileData = async () => {
      try {
        const [userSnap, followsSnap, rsvpsSnap] = await Promise.all([
          getDoc(doc(db, 'users', auth.currentUser.uid)),
          getDocs(query(collection(db, 'follows'), where('userId', '==', auth.currentUser.uid))),
          getDocs(query(collection(db, 'rsvps'), where('userId', '==', auth.currentUser.uid)))
        ]);

        let parsedUser = { email: auth.currentUser.email };
        if (userSnap.exists()) {
          parsedUser = { id: userSnap.id, ...userSnap.data() };
          setUserData(parsedUser);
        } else {
          setUserData(parsedUser);
        }

        setMySocieties(followsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        if (!rsvpsSnap.empty) {
          const eventPromises = rsvpsSnap.docs.map(async (rsvpDoc) => {
            const eventData = await getDoc(doc(db, 'events', rsvpDoc.data().eventId));
            if (eventData.exists()) return { rsvpId: rsvpDoc.id, eventId: eventData.id, ...eventData.data() };
            return null;
          });
          const resolvedEvents = (await Promise.all(eventPromises)).filter(e => e !== null);
          setSavedEvents(resolvedEvents);
        }

        if (parsedUser.isVerified && parsedUser.businessName) {
          const followersSnap = await getDocs(query(collection(db, 'follows'), where('organiserName', '==', parsedUser.businessName)));
          const myEventsSnap = await getDocs(query(collection(db, 'events'), where('creatorId', '==', auth.currentUser.uid)));
          let totalSavesCount = 0;
          const rsvpPromises = myEventsSnap.docs.map(ev => getDocs(query(collection(db, 'rsvps'), where('eventId', '==', ev.id))));
          const allRsvps = await Promise.all(rsvpPromises);
          allRsvps.forEach(snap => { totalSavesCount += snap.size; });

          setBusinessMetrics({ followers: followersSnap.size, eventsHosted: myEventsSnap.size, totalSaves: totalSavesCount });
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handleSignOut = () => {
    auth.signOut();
    navigate('/auth');
  };

  const toggleSection = (section) => setExpandedSection(expandedSection === section ? null : section);

  const handleRemoveSociety = async (followId, e) => {
    e.stopPropagation();
    try { await deleteDoc(doc(db, 'follows', followId)); setMySocieties(prev => prev.filter(s => s.id !== followId)); } catch (error) {}
  };

  const handleRemoveSavedEvent = async (rsvpId, e) => {
    e.stopPropagation();
    try { await deleteDoc(doc(db, 'rsvps', rsvpId)); setSavedEvents(prev => prev.filter(ev => ev.rsvpId !== rsvpId)); } catch (error) {}
  };

  const handleApplyBusiness = async (e) => {
    e.preventDefault();
    if (!businessName.trim() || !userData?.id) return;
    setIsApplying(true);
    try {
      await updateDoc(doc(db, 'users', userData.id), { businessStatus: 'pending', businessName: businessName });
      setUserData(prev => ({ ...prev, businessStatus: 'pending', businessName }));
    } catch (error) {} finally { setIsApplying(false); }
  };

  if (isLoading) return <div className="app-container page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><p>{t("Loading Profile...", "சுயவிவரம் ஏற்றப்படுகிறது...")}</p></div>;

  return (
    <div className="app-container page-content">
      
      {/* --- HEADER (BULLETPROOF LANGUAGE TOGGLE) --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="event-title" style={{ fontSize: '1.8rem', margin: 0 }}>{t("Profile", "சுயவிவரம்")}</h1>
        <button 
          onClick={toggleLanguage}
          style={{ 
            background: 'var(--bg-input)', 
            color: 'var(--accent-solid)', 
            border: 'none', 
            width: '44px', 
            height: '44px', 
            borderRadius: '100px', 
            fontWeight: 700, 
            fontSize: '1.1rem',
            cursor: 'pointer', 
            transition: 'all 0.2s ease', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          {/* This elegantly uses your existing translation hook to swap the text! */}
          {t('அ', 'EN')}
        </button>
      </div>

      {/* --- ACCOUNT INFO CARD --- */}
      <div style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', border: '1px solid var(--bg-input)' }}>
        <div style={{ background: 'var(--accent-gradient)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <User size={30} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{t("Account", "கணக்கு")}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>{userData?.email}</p>
        </div>
      </div>

      {/* --- BUSINESS PORTAL BUTTON --- */}
      <button onClick={() => setIsBusinessModalOpen(true)} style={{ width: '100%', padding: '1.25rem', borderRadius: '20px', border: 'none', background: userData?.isVerified ? '#E1FDEB' : 'var(--bg-input)', color: userData?.isVerified ? '#007F3B' : 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={22} color={userData?.isVerified ? '#007F3B' : 'var(--accent-solid)'} />
          {userData?.isVerified ? t("Verified Business Portal", "வணிக தளம்") : t("Apply for Business Account", "வணிக கணக்கிற்கு விண்ணப்பிக்கவும்")}
        </div>
        {userData?.isVerified && <BarChart3 size={20} />}
      </button>

      {/* --- EXPANDING LISTS --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className={`expanding-card ${expandedSection === 'events' ? 'is-expanded' : ''}`} onClick={() => toggleSection('events')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 81, 47, 0.1)', padding: '8px', borderRadius: '12px' }}><Bookmark size={20} color="var(--accent-solid)" /></div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t("Saved Events", "சேமிக்கப்பட்ட நிகழ்வுகள்")} ({savedEvents.length})</h3>
            </div>
            {expandedSection === 'events' ? <ChevronUp size={20} color="var(--text-tertiary)" /> : <ChevronDown size={20} color="var(--text-tertiary)" />}
          </div>
          {expandedSection === 'events' && (
            <div className="animate-in" style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {savedEvents.length === 0 ? <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>{t("No saved events.", "நிகழ்வுகள் எதுவும் சேமிக்கப்படவில்லை.")}</p> : 
                savedEvents.map(ev => (
                  <div key={ev.rsvpId} style={{ background: 'var(--bg-input)', borderRadius: '16px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0' }}>{ev.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(ev.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => handleRemoveSavedEvent(ev.rsvpId, e)} style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', padding: '0.5rem', borderRadius: '10px' }}><Trash2 size={16} /></button>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <div className={`expanding-card ${expandedSection === 'societies' ? 'is-expanded' : ''}`} onClick={() => toggleSection('societies')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 81, 47, 0.1)', padding: '8px', borderRadius: '12px' }}><Building size={20} color="var(--accent-solid)" /></div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t("My Societies", "என் சமூகங்கள்")} ({mySocieties.length})</h3>
            </div>
            {expandedSection === 'societies' ? <ChevronUp size={20} color="var(--text-tertiary)" /> : <ChevronDown size={20} color="var(--text-tertiary)" />}
          </div>
          {expandedSection === 'societies' && (
            <div className="animate-in" style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {mySocieties.length === 0 ? <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>{t("Not following any societies.", "எந்த சமூகங்களையும் பின்தொடரவில்லை.")}</p> : 
                mySocieties.map(soc => (
                  <div key={soc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: '12px' }}>
                    <span style={{ fontWeight: 500 }}>{soc.organiserName}</span>
                    <button onClick={(e) => handleRemoveSociety(soc.id, e)} style={{ background: 'transparent', color: '#DC2626', border: 'none' }}>{t("Remove", "நீக்கு")}</button>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* --- SIGN OUT PANEL BUTTON --- */}
      <button 
        onClick={() => setIsSignOutModalOpen(true)}
        style={{ width: '100%', padding: '1.25rem', borderRadius: '20px', border: 'none', background: '#FEF2F2', color: '#DC2626', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', marginTop: '2rem' }}
      >
        <LogOut size={20} /> {t("Sign Out", "வெளியேறு")}
      </button>

      {/* --- SIGN OUT CONFIRMATION MODAL --- */}
      {isSignOutModalOpen && (
        <div onClick={() => setIsSignOutModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div onClick={(e) => e.stopPropagation()} className="animate-in" style={{ width: '100%', maxWidth: '320px', padding: '2.5rem 1.5rem', background: 'var(--bg-main)', borderRadius: '32px', textAlign: 'center', boxShadow: 'var(--shadow-soft)' }}>
            <LogOut size={48} color="#DC2626" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{t("Sign Out?", "வெளியேற வேண்டுமா?")}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              {t("Are you sure you want to log out of your account?", "உங்கள் கணக்கிலிருந்து வெளியேற விரும்புகிறீர்களா?")}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={handleSignOut} className="btn-primary" style={{ background: '#DC2626', boxShadow: 'none' }}>
                {t("Yes, Sign Out", "ஆம், வெளியேறு")}
              </button>
              <button onClick={() => setIsSignOutModalOpen(false)} style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: 'none', padding: '1.1rem', borderRadius: '100px', fontWeight: 600, cursor: 'pointer' }}>
                {t("Cancel", "ரத்து செய்")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BUSINESS PORTAL MODAL --- */}
      {isBusinessModalOpen && (
        <div onClick={() => setIsBusinessModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div onClick={(e) => e.stopPropagation()} className="animate-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem 1.5rem', position: 'relative', background: 'var(--bg-main)', borderRadius: '32px', boxShadow: 'var(--shadow-soft)' }}>
            <button onClick={() => setIsBusinessModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={24} /></button>
            
            {userData?.isVerified ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                  <CheckCircle size={32} color="#007F3B" />
                  <div><h2 style={{ fontSize: '1.4rem', margin: 0 }}>{userData.businessName}</h2><p style={{ color: '#007F3B', fontWeight: 600, margin: 0 }}>{t("Verified Account", "சரிபார்க்கப்பட்ட கணக்கு")}</p></div>
                </div>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t("Community Engagement", "சமூக ஈடுபாடு")}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '16px', textAlign: 'center' }}><Building size={24} color="var(--accent-solid)" style={{ marginBottom: '8px' }} /><h4 style={{ fontSize: '1.5rem', margin: '0 0 4px 0' }}>{businessMetrics.followers}</h4><p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{t("Followers", "பின்தொடர்பவர்கள்")}</p></div>
                  <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '16px', textAlign: 'center' }}><Heart size={24} color="var(--accent-solid)" style={{ marginBottom: '8px' }} /><h4 style={{ fontSize: '1.5rem', margin: '0 0 4px 0' }}>{businessMetrics.totalSaves}</h4><p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{t("Event Saves", "சேமிக்கப்பட்ட நிகழ்வுகள்")}</p></div>
                </div>
              </div>
            ) : userData?.businessStatus === 'pending' ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}><Clock size={48} color="#B45309" style={{ marginBottom: '1rem' }} /><h2 style={{ fontSize: '1.4rem' }}>{t("Application Pending", "விண்ணப்பம் நிலுவையில் உள்ளது")}</h2><p style={{ color: 'var(--text-secondary)' }}>{t("Waiting for admin review.", "நிர்வாகி மதிப்பாய்வுக்காக காத்திருக்கிறது.")}</p></div>
            ) : (
              <div>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{t("Business Account", "வணிக கணக்கு")}</h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{t("Apply for a verified business account.", "சரிபார்க்கப்பட்ட வணிக கணக்கிற்கு விண்ணப்பிக்கவும்.")}</p>
                <form onSubmit={handleApplyBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input type="text" placeholder={t("Society Name", "சமூகத்தின் பெயர்")} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required style={{ borderRadius: '20px' }} />
                  <button type="submit" className="btn-primary" disabled={isApplying}>{isApplying ? t("Submitting...", "சமர்ப்பிக்கிறது...") : t("Submit Application", "சமர்ப்பிக்கவும்")}</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;