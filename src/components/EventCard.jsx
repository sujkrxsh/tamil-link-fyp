import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calendar, MapPin, Clock, Heart, UserPlus, 
  AlertTriangle, X, Maximize2, CheckCircle, Building, Ticket, Send, Check
} from 'lucide-react';

const EventCard = ({ event }) => {
  const { t } = useLanguage();
  
  // 1. EXTRACT DATA EXACTLY LIKE YOUR OLD CODE
  const eventDate = new Date(event.date);
  const displayDate = eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const displayTime = eventDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  
  // Safely grab company name based on your old code's event.organiser
  const orgName = event.organiser || event.organiserName || event.creatorName;

  // Modal & UI States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isPosterExpanded, setIsPosterExpanded] = useState(false);
  
  // Reporting States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  // Relational Feature States
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [saveDocId, setSaveDocId] = useState(null);
  const [attendeeCount, setAttendeeCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const checkStatus = async () => {
      try {
        // Check RSVPs (Saves)
        const rsvpQ = query(collection(db, 'rsvps'), where('eventId', '==', event.id));
        const rsvpSnap = await getDocs(rsvpQ);
        setAttendeeCount(rsvpSnap.docs.length);

        const userRsvp = rsvpSnap.docs.find(d => d.data().userId === auth.currentUser.uid);
        if (userRsvp) {
          setIsSaved(true);
          setSaveDocId(userRsvp.id);
        }

        // Check Follows
        if (orgName) {
          const followQ = query(collection(db, 'follows'), where('userId', '==', auth.currentUser.uid), where('organiserName', '==', orgName));
          const followSnap = await getDocs(followQ);
          if (!followSnap.empty) { 
            setIsFollowing(true); 
          }
        }
      } catch (error) { console.error("Error fetching event status", error); }
    };
    checkStatus();
  }, [event.id, orgName]);

  // --- ACTIONS ---
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => { setIsModalOpen(false); setIsClosing(false); setIsPosterExpanded(false); setIsReportModalOpen(false); }, 300); 
  };

  const toggleSave = async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return alert(t("Please sign in to save events.", "நிகழ்வுகளை சேமிக்க உள்நுழையவும்."));
    try {
      if (isSaved && saveDocId) {
        await deleteDoc(doc(db, 'rsvps', saveDocId));
        setIsSaved(false); setSaveDocId(null);
        setAttendeeCount(prev => prev - 1);
      } else {
        const docRef = await addDoc(collection(db, 'rsvps'), { userId: auth.currentUser.uid, eventId: event.id, timestamp: new Date() });
        setIsSaved(true); setSaveDocId(docRef.id);
        setAttendeeCount(prev => prev + 1);
      }
    } catch (error) { console.error("Error saving event:", error); }
  };

  const toggleFollow = async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return alert(t("Please sign in to follow.", "பின்தொடர உள்நுழையவும்."));
    if (!orgName) return;
    
    try {
      const followId = `${auth.currentUser.uid}_${orgName.replace(/\s+/g, '')}`;
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followId));
        setIsFollowing(false);
      } else {
        await setDoc(doc(db, 'follows', followId), { userId: auth.currentUser.uid, organiserName: orgName, timestamp: new Date() });
        setIsFollowing(true);
      }
    } catch (error) { console.error("Error following:", error); }
  };

  const handleBuyTickets = (e) => {
    e.stopPropagation();
    if (event.ticketLink) {
      window.open(event.ticketLink, '_blank');
    } else {
      alert(t("Tickets can be purchased at the venue or by contacting the organiser.", "நிகழ்விடத்தில் அல்லது அமைப்பாளரைத் தொடர்புகொள்வதன் மூலம் டிக்கெட்டுகளை வாங்கலாம்."));
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    setIsReporting(true);
    
    try {
      await addDoc(collection(db, 'reports'), {
        eventId: event.id, eventTitle: event.title, reason: reportReason, reporterId: auth.currentUser?.uid || 'anonymous', timestamp: new Date()
      });
      setHasReported(true);
      setTimeout(() => { setIsReportModalOpen(false); setHasReported(false); setReportReason(''); }, 2000);
    } catch (error) {
      alert(t("Failed to submit report.", "அறிக்கையைச் சமர்ப்பிக்க முடியவில்லை."));
    } finally { setIsReporting(false); }
  };

  return (
    <>
      {/* --- COMPACT FEED CARD --- */}
      <div 
        onClick={() => setIsModalOpen(true)}
        style={{ 
          background: 'var(--bg-surface)', borderRadius: '32px', 
          boxShadow: 'var(--shadow-soft)', overflow: 'hidden', 
          cursor: 'pointer', transition: 'transform 0.2s ease', border: '1px solid var(--bg-input)'
        }}
      >
        <div style={{ width: '100%', height: '220px', background: 'var(--bg-input)', position: 'relative' }}>
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={40} color="var(--text-tertiary)" /></div>
          )}
          
          <button 
            onClick={toggleSave}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', border: 'none', width: '44px', height: '44px', borderRadius: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', transition: 'all 0.2s ease', color: isSaved ? '#DC2626' : 'var(--text-primary)' }}
          >
            <Heart size={22} fill={isSaved ? '#DC2626' : 'none'} />
          </button>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {orgName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-solid)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} /> {orgName}
              </span>
              <button 
                onClick={toggleFollow}
                style={{ background: isFollowing ? '#E1FDEB' : 'var(--bg-input)', color: isFollowing ? '#007F3B' : 'var(--text-primary)', border: 'none', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {isFollowing ? <><Check size={14} /> {t("Following", "பின்தொடர்கிறீர்கள்")}</> : <><UserPlus size={14} /> {t("Follow", "பின்தொடர்")}</>}
              </button>
            </div>
          )}
          
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', lineHeight: 1.3, color: 'var(--text-primary)' }}>{event.title}</h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <Calendar size={14} /> {displayDate}
            </span>
            <span style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <Clock size={14} /> {displayTime}
            </span>
            <span style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <MapPin size={14} /> {event.location}
            </span>
          </div>
        </div>
      </div>

      {/* --- EXTENDED PANEL MODAL --- */}
      {isModalOpen && (
        <div className={`modal-backdrop ${isClosing ? 'is-closing' : ''}`} onClick={handleCloseModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ height: '85vh', maxHeight: '800px', background: 'var(--bg-surface)' }}>
            
            <button 
              onClick={handleCloseModal}
              style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <X size={20} color="#181818" />
            </button>

            <div style={{ flex: 1, overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', paddingBottom: '2rem' }}>
              
              {event.imageUrl && (
                <div onClick={() => setIsPosterExpanded(true)} style={{ width: '100%', height: '280px', background: 'var(--bg-input)', position: 'relative', cursor: 'zoom-in' }}>
                  <img src={event.imageUrl} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', padding: '6px', borderRadius: '8px', color: 'white' }}><Maximize2 size={16} /></div>
                </div>
              )}

              <div style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.8rem', lineHeight: 1.2 }}>{event.title}</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}><Calendar size={18} color="var(--accent-solid)" /> <b>{t("Date:", "தேதி:")}</b> {displayDate}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}><Clock size={18} color="var(--accent-solid)" /> <b>{t("Time:", "நேரம்:")}</b> {displayTime}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}><MapPin size={18} color="var(--accent-solid)" /> <b>{t("Location:", "இடம்:")}</b> {event.location}</div>
                  
                  {orgName && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)', fontWeight: 600 }}><Building size={18} color="var(--accent-solid)" /> {orgName}</div>
                      <button onClick={toggleFollow} style={{ background: isFollowing ? '#E1FDEB' : 'var(--bg-input)', color: isFollowing ? '#007F3B' : 'var(--text-primary)', border: 'none', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                        {isFollowing ? t("Following", "பின்தொடர்கிறீர்கள்") : t("Follow", "பின்தொடர்")}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '1.5rem' }}>
                  <Heart size={16} fill="var(--text-secondary)" color="var(--text-secondary)" /> {attendeeCount} {t("saved this event", "நிகழ்வை சேமித்தனர்")}
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>{t("About Event", "நிகழ்வு பற்றி")}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '1rem', whiteSpace: 'pre-wrap' }}>{event.description}</p>
                
                <button onClick={(e) => { e.stopPropagation(); setIsReportModalOpen(true); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', marginTop: '2rem' }}>
                  <AlertTriangle size={14} /> {t("Report Issue", "சிக்கலை புகாரளி")}
                </button>
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 10 }}>
              <button onClick={handleBuyTickets} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1.1rem', boxShadow: 'var(--shadow-glow)' }}>
                <Ticket size={20} /> {t("Buy Tickets", "டிக்கெட் வாங்கு")}
              </button>
              <button onClick={toggleSave} style={{ background: isSaved ? '#FEF2F2' : 'var(--bg-input)', border: 'none', color: isSaved ? '#DC2626' : 'var(--text-primary)', width: '54px', height: '54px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease' }}>
                <Heart size={24} fill={isSaved ? '#DC2626' : 'none'} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- REPORT ISSUE FLOATING BUBBLE --- */}
      {isReportModalOpen && (
        <div onClick={() => setIsReportModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()} className="animate-in" style={{ width: '100%', maxWidth: '350px', background: 'var(--bg-surface)', borderRadius: '28px', padding: '1.5rem', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            {hasReported ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} color="#007F3B" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#007F3B', margin: '0 0 0.5rem 0' }}>{t("Report Submitted", "அறிக்கை சமர்ப்பிக்கப்பட்டது")}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{t("Our team will review this shortly.", "எங்கள் குழு இதை விரைவில் மதிப்பாய்வு செய்யும்.")}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}><AlertTriangle size={20} /> {t("Report Event", "நிகழ்வைப் புகாரளி")}</h3>
                  <button onClick={() => setIsReportModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{t("Please explain why this event violates community guidelines.", "இந்த நிகழ்வு சமூக வழிகாட்டுதல்களை ஏன் மீறுகிறது என்பதை விளக்குங்கள்.")}</p>
                <form onSubmit={submitReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder={t("What is the issue?", "என்ன பிரச்சனை?")} required style={{ width: '100%', height: '100px', padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--bg-input)', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                  <button type="submit" disabled={isReporting || !reportReason.trim()} style={{ background: '#DC2626', color: 'white', border: 'none', padding: '1rem', borderRadius: '100px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', opacity: isReporting || !reportReason.trim() ? 0.6 : 1 }}>
                    {isReporting ? t("Submitting...", "சமர்ப்பிக்கிறது...") : <><Send size={18} /> {t("Submit Report", "அறிக்கையை சமர்ப்பி")}</>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- FULLSCREEN POSTER OVERLAY --- */}
      {isPosterExpanded && event.imageUrl && (
        <div onClick={() => setIsPosterExpanded(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', cursor: 'zoom-out' }}>
          <img src={event.imageUrl} alt="Expanded Poster" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px' }} />
        </div>
      )}
    </>
  );
};

export default EventCard;