import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { User, LogOut, Building, Trash2, CalendarHeart } from 'lucide-react';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [mySocieties, setMySocieties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/auth');
      return;
    }

    const fetchProfileData = async () => {
      try {
        // 1. Fetch User Data (If you store profile info in 'users' collection)
        // const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        // if (userDoc.exists()) setUserData(userDoc.data());
        
        setUserData({ email: auth.currentUser.email }); // Fallback if no user doc

        // 2. Fetch Followed Societies
        const followsQ = query(collection(db, 'follows'), where('userId', '==', auth.currentUser.uid));
        const followsSnap = await getDocs(followsQ);
        
        const societiesList = followsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setMySocieties(societiesList);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  // --- ACTIONS ---

  const handleSignOut = () => {
    auth.signOut();
    navigate('/auth');
  };

  const handleRemoveSociety = async (followId, organiserName) => {
    // Optional: Add a small confirmation to prevent accidental clicks
    const confirmRemove = window.confirm(t(`Are you sure you want to unfollow ${organiserName}?`, `நீங்கள் நிச்சயமாக ${organiserName} ஐ பின்தொடர்வதை நீக்க விரும்புகிறீர்களா?`));
    if (!confirmRemove) return;

    try {
      // Delete from Firebase
      await deleteDoc(doc(db, 'follows', followId));
      
      // Update local state instantly to remove the card from the UI
      setMySocieties(prev => prev.filter(society => society.id !== followId));
    } catch (error) {
      console.error("Error removing society:", error);
      alert(t("Failed to remove society. Please try again.", "சமூகத்தை அகற்றுவதில் பிழை."));
    }
  };

  if (isLoading) {
    return <div className="app-container page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><p>Loading Profile...</p></div>;
  }

  return (
    <div className="app-container page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="event-title">{t("My Profile", "என் சுயவிவரம்")}</h1>
        <button 
          onClick={handleSignOut}
          style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
        >
          <LogOut size={20} /> {t("Sign Out", "வெளியேறு")}
        </button>
      </div>

      {/* User Info Card */}
      <div className="profile-section" style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'var(--accent-gradient)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <User size={30} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{t("Welcome back", "மீண்டும் வருக")}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{userData?.email}</p>
        </div>
      </div>

      {/* My Societies Section */}
      <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Building size={22} color="var(--accent-solid)" /> 
        {t("My Societies", "என் சமூகங்கள்")}
      </h2>
      
      {mySocieties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-input)', borderRadius: '24px', color: 'var(--text-tertiary)' }}>
          <CalendarHeart size={48} opacity={0.5} style={{ marginBottom: '1rem' }} />
          <p>{t("You haven't followed any societies yet.", "நீங்கள் இன்னும் எந்த சமூகங்களையும் பின்தொடரவில்லை.")}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mySocieties.map((society) => (
            <div 
              key={society.id} 
              className="expanding-card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', cursor: 'default' }}
            >
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{society.organiserName}</span>
              
              <button 
                onClick={() => handleRemoveSociety(society.id, society.organiserName)}
                style={{ 
                  background: '#FEF2F2', 
                  color: '#DC2626', 
                  border: 'none', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Trash2 size={16} />
                {t("Remove", "நீக்கு")}
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Profile;