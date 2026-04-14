import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calendar, MapPin, Building, ChevronDown, ChevronUp, 
  Heart, ExternalLink, Maximize2, AlertTriangle, UserPlus, Check, X
} from 'lucide-react';

const EventCard = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [rsvpDocId, setRsvpDocId] = useState(null);
  
  // Full-screen image state
  const [showFullImage, setShowFullImage] = useState(false);

  // Custom Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
  
  const { t } = useLanguage();
  const eventDate = new Date(event.date);

  // Initial Data Fetch for RSVPs and Follows
  useEffect(() => {
    if (!auth.currentUser) return;

    const checkStatus = async () => {
      // Check RSVPs (Saved Events)
      const rsvpQ = query(collection(db, 'rsvps'), where('eventId', '==', event.id));
      const rsvpSnap = await getDocs(rsvpQ);
      setAttendeeCount(rsvpSnap.docs.length);

      const userRsvp = rsvpSnap.docs.find(d => d.data().userId === auth.currentUser.uid);
      if (userRsvp) {
        setIsSaved(true);
        setRsvpDocId(userRsvp.id);
      }

      // Check Following Status (My Societies)
      const followQ = query(
        collection(db, 'follows'), 
        where('userId', '==', auth.currentUser.uid),
        where('organiserName', '==', event.organiser)
      );
      const followSnap = await getDocs(followQ);
      if (!followSnap.empty) {
        setIsFollowing(true);
      }
    };
    checkStatus();
  }, [event.id, event.organiser]);

  // --- ACTIONS ---

  const handleSave = async (e) => {
    e.stopPropagation(); 
    if (!auth.currentUser) return alert(t("Please log in to save events.", "நிகழ்வுகளைச் சேமிக்க உள்நுழையவும்."));

    try {
      if (isSaved && rsvpDocId) {
        await deleteDoc(doc(db, 'rsvps', rsvpDocId));
        setIsSaved(false);
        setAttendeeCount(prev => prev - 1);
        setRsvpDocId(null);
      } else {
        const docRef = await addDoc(collection(db, 'rsvps'), {
          eventId: event.id,
          userId: auth.currentUser.uid,
          timestamp: new Date()
        });
        setIsSaved(true);
        setAttendeeCount(prev => prev + 1);
        setRsvpDocId(docRef.id);
      }
    } catch (error) {
      console.error("Error updating save status", error);
    }
  };

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return;

    try {
      const followId = `${auth.currentUser.uid}_${event.organiser.replace(/\s+/g, '')}`;
      
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followId));
        setIsFollowing(false);
      } else {
        await setDoc(doc(db, 'follows', followId), {
          userId: auth.currentUser.uid,
          organiserName: event.organiser,
          timestamp: new Date()
        });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error updating follow status", error);
    }
  };

  // --- CUSTOM REPORT LOGIC ---

  const openReportModal = (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return alert(t("Please log in to report events.", "புகாரளிக்க உள்நுழையவும்."));
    setIsReportModalOpen(true);
    setReportReason('');
    setReportFeedback(null);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return;
    setIsSubmittingReport(true);
    setReportFeedback(null);

    try {
      await addDoc(collection(db, 'reports'), {
        eventId: event.id,
        eventTitle: event.title,
        reporterId: auth.currentUser.uid,
        reason: reportReason,
        timestamp: new Date()
      });
      
      setReportFeedback({ type: 'success', message: t("Report submitted to Admin.", "நிர்வாகியிடம் புகார் சமர்ப்பிக்கப்பட்டது.") });
      
      // Auto-close modal after 2 seconds on success
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportFeedback(null);
      }, 2000);

    } catch (error) {
      setReportFeedback({ type: 'error', message: t("Failed to submit report.", "புகாரைச் சமர்ப்பிக்க முடியவில்லை.") });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <>
      {/* --- CUSTOM REPORT MODAL --- */}
      {isReportModalOpen && (
        <div 
          onClick={() => !isSubmittingReport && setIsReportModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
            className="profile-section animate-in" 
            style={{ width: '100%', maxWidth: '400px', padding: '2rem 1.5rem', position: 'relative' }}
          >
            <button 
              onClick={() => setIsReportModalOpen(false)} 
              disabled={isSubmittingReport}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
            >
              <X size={24} />
            </button>
            
            <div style={{ background: '#FEF2F2', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <AlertTriangle size={28} color="#DC2626" />
            </div>
            
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{t("Report Event", "நிகழ்வைப் புகாரளி")}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              {t("Please provide a reason for reporting this event. This will be reviewed by an admin.", "இந்த நிகழ்வைப் புகாரளிப்பதற்கான காரணத்தை வழங்கவும்.")}
            </p>

            {reportFeedback ? (
              <div style={{ padding: '1rem', background: reportFeedback.type === 'success' ? '#E1FDEB' : '#FEF2F2', color: reportFeedback.type === 'success' ? '#007F3B' : '#DC2626', borderRadius: '12px', fontWeight: 600, textAlign: 'center', marginBottom: '1rem' }}>
                {reportFeedback.message}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <textarea 
                  placeholder={t("Enter your reason here...", "உங்கள் காரணத்தை இங்கே உள்ளிடவும்...")}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  disabled={isSubmittingReport}
                />
                <button 
                  onClick={submitReport} 
                  disabled={isSubmittingReport || !reportReason.trim()}
                  className="btn-primary"
                  style={{ background: '#DC2626', boxShadow: '0 12px 36px -6px rgba(220, 38, 38, 0.25)' }}
                >
                  {isSubmittingReport ? t("Submitting...", "சமர்ப்பிக்கிறது...") : t("Submit Report", "புகாரைச் சமர்ப்பி")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- FULL SCREEN IMAGE OVERLAY --- */}
      {showFullImage && (
        <div 
          onClick={() => setShowFullImage(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.9)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={event.imageUrl} 
            alt="Event Poster Fullscreen" 
            style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: '12px' }} 
          />
        </div>
      )}

      {/* --- MAIN EVENT CARD --- */}
      <div 
        className={`expanding-card ${expanded ? 'is-expanded' : ''}`} 
        onClick={() => setExpanded(!expanded)}
      >
        {/* Poster Image Area */}
        <div className="card-image-wrapper">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="Event Poster" className="card-poster-img" loading="lazy" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', color: 'var(--text-tertiary)' }}>
              <Calendar size={48} opacity={0.5} />
            </div>
          )}
          
          <button 
            onClick={handleSave} 
            style={{
              position: 'absolute', top: '12px', right: '12px',
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
              border: 'none', width: '40px', height: '40px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              color: isSaved ? 'var(--accent-solid)' : 'var(--text-tertiary)',
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Heart size={20} fill={isSaved ? "var(--accent-solid)" : "transparent"} strokeWidth={isSaved ? 0 : 2} />
          </button>

          {expanded && event.imageUrl && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowFullImage(true); }} 
              style={{
                position: 'absolute', top: '12px', left: '12px',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                border: 'none', width: '40px', height: '40px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white'
              }}
            >
              <Maximize2 size={18} />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h2 className="event-title" style={{ fontSize: '1.4rem' }}>{event.title}</h2>
            {expanded ? <ChevronUp size={24} color="var(--text-tertiary)" /> : <ChevronDown size={24} color="var(--text-tertiary)" />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p className="event-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="var(--accent-solid)" />
              {eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="event-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} color="var(--accent-solid)" />
              {event.location}
            </p>
            <p className="event-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} color="var(--accent-solid)" />
              {event.organiser}
            </p>
          </div>

          {/* EXPANDED CONTENT AREA */}
          {expanded && (
            <div className="animate-in" style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '20px', fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {event.description || t("No description provided.", "விளக்கம் வழங்கப்படவில்லை.")}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a 
                  href={event.ticketLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary" 
                  onClick={(e) => e.stopPropagation()}
                  style={{ flex: 1, padding: '1rem' }}
                >
                  {t("Get Tickets", "டிக்கெட் வாங்கு")} <ExternalLink size={18} />
                </a>
              </div>

              {/* Social Proof & Moderator Tools */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: 'var(--border-subtle)' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <Heart size={16} fill="var(--text-secondary)" color="var(--text-secondary)" />
                  {attendeeCount} {t("saved", "சேமிக்கப்பட்டது")}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  
                  <button 
                    onClick={handleFollow}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '0.5rem 0.8rem', borderRadius: '12px',
                      fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                      border: 'none', transition: 'all 0.2s ease',
                      background: isFollowing ? '#E1FDEB' : 'var(--bg-input)',
                      color: isFollowing ? '#007F3B' : 'var(--text-primary)'
                    }}
                  >
                    {isFollowing ? <><Check size={14} /> {t("Following", "பின்தொடர்கிறீர்கள்")}</> : <><UserPlus size={14} /> {t("Follow", "பின்தொடர்")}</>}
                  </button>

                  <button 
                    onClick={openReportModal}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0.5rem', borderRadius: '12px',
                      cursor: 'pointer', border: 'none', transition: 'all 0.2s ease',
                      background: 'var(--bg-input)', color: '#DC2626'
                    }}
                    title="Report Event"
                  >
                    <AlertTriangle size={16} />
                  </button>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default EventCard;