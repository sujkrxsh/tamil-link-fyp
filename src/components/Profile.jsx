import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { User, Building, AlertCircle, Mail, Heart, ArrowRight, Globe, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [myTickets, setMyTickets] = useState([]);
  const [myFollows, setMyFollows] = useState([]); 
  const [toast, setToast] = useState(null);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!auth.currentUser) return;
      
      // 1. Fetch User Profile
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserData(docSnap.data());

      try {
        // 2. Fetch "Saved Events" (RSVPs) using client-side filtering
        const rsvpSnap = await getDocs(collection(db, 'rsvps'));
        const userRsvps = rsvpSnap.docs.filter(d => d.data().userId === auth.currentUser.uid);
        
        const ticketsData = [];
        for (const rsvpDoc of userRsvps) {
          const eventRef = doc(db, 'events', rsvpDoc.data().eventId);
          const eventSnap = await getDoc(eventRef);
          if (eventSnap.exists()) {
            ticketsData.push({ id: eventSnap.id, ...eventSnap.data() });
          }
        }
        setMyTickets(ticketsData);

        // 3. Fetch "Following" (My Societies)
        const followSnap = await getDocs(collection(db, 'follows'));
        const userFollows = followSnap.docs.filter(d => d.data().userId === auth.currentUser.uid);
        setMyFollows(userFollows.map(d => ({ id: d.id, ...d.data() })));
        
      } catch (err) {
        console.error("Error fetching relational data", err);
      }
    };
    
    fetchProfileData();
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (businessName.trim().length < 3) return showToast(t("Name must be at least 3 characters.", "பெயர் குறைந்தது 3 எழுத்துகள் இருக்க வேண்டும்."));
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        applicationStatus: 'pending',
        requestedBusinessName: businessName
      });
      showToast(t("Request sent to Admin!", "நிர்வாகிக்கு கோரிக்கை அனுப்பப்பட்டது!"));
      setUserData(prev => ({...prev, applicationStatus: 'pending', requestedBusinessName: businessName}));
      setShowBusinessForm(false);
    } catch (error) {
      showToast(t("Failed to submit request.", "கோரிக்கையைச் சமர்ப்பிக்க முடியவில்லை."));
    }
  };

  return (
    // Clean outermost div - relying on index.css for mobile breathing room
    <div className="app-container page-content">
      
      {/* Floating Error/Success Toast */}
      {toast && (
        <div className="error-toast" style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--shadow-glow)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle color="var(--accent-solid)" />
          <p style={{ fontWeight: 600, margin: 0 }}>{toast}</p>
        </div>
      )}

      {/* --- USER HEADER --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'var(--accent-gradient)', padding: '1rem', borderRadius: '50%', color: 'white', boxShadow: 'var(--shadow-soft)' }}>
          <User size={32} />
        </div>
        <div>
          <h1 className="event-title" style={{ margin: 0 }}>{t("Account", "கணக்கு")}</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
            <Mail size={14} /> {auth.currentUser?.email}
          </p>
        </div>
      </div>

      {/* --- LANGUAGE TOGGLE --- */}
      <div className="profile-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Globe size={22} color="var(--accent-solid)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t("Language", "மொழி")}</h2>
        </div>
        <button onClick={toggleLanguage} className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.25rem', fontSize: '0.9rem', margin: 0 }}>
          {language === 'EN' ? 'தமிழ்' : 'English'}
        </button>
      </div>

      {/* --- FOLLOWING / MY SOCIETIES --- */}
      <div className="profile-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Users size={22} color="var(--accent-solid)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t("My Societies", "எனது அமைப்புகள்")}</h2>
        </div>
        
        {myFollows.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            {t("You aren't following anyone yet. Find organizers on the feed!", "நீங்கள் இன்னும் யாரையும் பின்தொடரவில்லை.")}
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {myFollows.map(follow => (
              <span key={follow.id} style={{ background: 'var(--bg-input)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-pill)', fontSize: '0.9rem', fontWeight: 600 }}>
                {follow.organiserName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* --- SAVED EVENTS PANEL --- */}
      <div className="profile-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Heart size={22} fill="var(--accent-solid)" color="var(--accent-solid)" />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t("Saved Events", "சேமிக்கப்பட்ட நிகழ்வுகள்")}</h2>
        </div>
        
        {myTickets.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            {t("You haven't saved any events yet.", "நீங்கள் எந்த நிகழ்வுகளையும் சேமிக்கவில்லை.")}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            {myTickets.map(ticket => {
              const ticketDate = new Date(ticket.date);
              return (
                <div key={ticket.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-input)', border: 'var(--border-subtle)' }}>
                  <div style={{ background: 'rgba(255, 81, 47, 0.1)', color: 'var(--accent-solid)', padding: '0.5rem', borderRadius: '12px', textAlign: 'center', minWidth: '60px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{ticketDate.toLocaleDateString([], { month: 'short' }).toUpperCase()}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{ticketDate.getDate()}</div>
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {ticket.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {ticket.location}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* --- COMPACT BUSINESS PANEL --- */}
      <div className="profile-section" style={{ background: userData?.isVerified ? '#FDFBF7' : 'var(--bg-surface)', border: userData?.isVerified ? '1px solid #E1FDEB' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Building size={22} color={userData?.isVerified ? '#007F3B' : 'var(--accent-solid)'} />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{t("Business Status", "வணிக நிலை")}</h2>
        </div>

        {userData?.isVerified ? (
          <p style={{ color: '#007F3B', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.5rem', padding: '0.75rem', background: '#E1FDEB', borderRadius: '12px', display: 'inline-block' }}>
            ✓ {t(`Verified as ${userData.businessName}`, `${userData.businessName} என சரிபார்க்கப்பட்டது`)}
          </p>
        ) : userData?.applicationStatus === 'pending' ? (
          <div style={{ padding: '1.25rem', background: 'var(--bg-input)', borderRadius: '16px', marginTop: '1rem' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>
              ⏳ {t("Application is under review.", "கோரிக்கை மதிப்பாய்வில் உள்ளது.")}
            </p>
          </div>
        ) : (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              {t("Want to host events? Request a verified business account.", "நிகழ்வுகளை நடத்த வேண்டுமா? வணிகக் கணக்கைக் கோரவும்.")}
            </p>
            
            {!showBusinessForm ? (
              <button onClick={() => setShowBusinessForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--bg-input)', color: 'var(--text-primary)', boxShadow: 'none' }}>
                {t("Apply Now", "இப்போது விண்ணப்பிக்கவும்")} <ArrowRight size={18} />
              </button>
            ) : (
              <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <input type="text" placeholder={t("Organisation Name", "அமைப்பின் பெயர்")} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                <button type="submit" className="btn-primary">{t("Submit", "சமர்ப்பி")}</button>
              </form>
            )}
            
            {userData?.applicationStatus === 'rejected' && (
               <p style={{ color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem', padding: '0.75rem', background: '#FEF2F2', borderRadius: '8px' }}>
                 {t("Your previous application was rejected.", "உங்கள் முந்தைய விண்ணப்பம் நிராகரிக்கப்பட்டது.")}
               </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default Profile;