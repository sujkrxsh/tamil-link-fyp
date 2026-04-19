import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, updateDoc, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { 
  Calendar, MapPin, Heart, UserPlus, 
  AlertTriangle, X, Maximize2, CheckCircle, Building, Ticket, Send, Edit3, Trash2
} from 'lucide-react';

const EventCard = ({ event }) => {
  const { t } = useLanguage();
  
  // keep a local copy so we dont have to refresh the whole page after an edit
  const [localEvent, setLocalEvent] = useState(event);
  const [isDeleted, setIsDeleted] = useState(false);

  // firebase data is kind of messy from older versions so check all possible fields lol
  const orgName = localEvent.organiser || localEvent.organiserName || localEvent.creatorName;

  // finally fixed the time bug! the date object actually holds both date and time.
  const eventDate = new Date(localEvent.date);
  const displayDateTime = eventDate.toLocaleDateString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // need this exact weird format input otherwise it crashes
  const formatForInput = (d) => {
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  };

  // check if current user made the event to show edit buttons
  const isCreator = auth.currentUser?.uid === localEvent.creatorId;

  // ui toggles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isPosterExpanded, setIsPosterExpanded] = useState(false);
  
  // edit mode stuff
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: localEvent.title || '',
    date: formatForInput(eventDate),
    location: localEvent.location || '',
    description: localEvent.description || '',
    ticketLink: localEvent.ticketLink || ''
  });
  
  // report bubble stuff
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  // relational stuff (saves and follows)
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [saveDocId, setSaveDocId] = useState(null);
  const [attendeeCount, setAttendeeCount] = useState(0);

  // fetch everything on mount. don't forget the dependency array or it loops forever
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const checkStatus = async () => {
      try {
        const rsvpQ = query(collection(db, 'rsvps'), where('eventId', '==', localEvent.id));
        const rsvpSnap = await getDocs(rsvpQ);
        setAttendeeCount(rsvpSnap.docs.length);

        const userRsvp = rsvpSnap.docs.find(d => d.data().userId === auth.currentUser.uid);
        if (userRsvp) { setIsSaved(true); setSaveDocId(userRsvp.id); }

        if (orgName) {
          const followQ = query(collection(db, 'follows'), where('userId', '==', auth.currentUser.uid), where('organiserName', '==', orgName));
          const followSnap = await getDocs(followQ);
          if (!followSnap.empty) setIsFollowing(true);
        }
      } catch (error) { console.error("Error fetching event status", error); }
    };
    checkStatus();
  }, [localEvent.id, orgName]);

  // wait 300ms before actually closing so the css shrink animation has time to play
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => { setIsModalOpen(false); setIsClosing(false); setIsPosterExpanded(false); setIsReportModalOpen(false); setIsEditing(false); }, 300); 
  };

  const toggleSave = async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return alert(t("Please sign in to save events.", "நிகழ்வுகளை சேமிக்க உள்நுழையவும்."));
    
    try {
      if (isSaved && saveDocId) {
        await deleteDoc(doc(db, 'rsvps', saveDocId));
        setIsSaved(false); setSaveDocId(null); setAttendeeCount(prev => prev - 1);
      } else {
        const docRef = await addDoc(collection(db, 'rsvps'), { userId: auth.currentUser.uid, eventId: localEvent.id, timestamp: new Date() });
        setIsSaved(true); setSaveDocId(docRef.id); setAttendeeCount(prev => prev + 1);
      }
    } catch (error) { console.error("Error saving event:", error); }
  };

  const toggleFollow = async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return alert(t("Please sign in to follow.", "பின்தொடர உள்நுழையவும்."));
    if (!orgName) return;
    
    try {
      // hacky way to make a unique id but it works
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
    if (localEvent.ticketLink) { window.open(localEvent.ticketLink, '_blank'); } 
    else { alert(t("Tickets can be purchased at the venue or by contacting the organiser.", "நிகழ்விடத்தில் டிக்கெட்டுகளை வாங்கலாம்.")); }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    setIsReporting(true);
    try {
      await addDoc(collection(db, 'reports'), { eventId: localEvent.id, eventTitle: localEvent.title, reason: reportReason, reporterId: auth.currentUser?.uid || 'anonymous', timestamp: new Date() });
      setHasReported(true);
      setTimeout(() => { setIsReportModalOpen(false); setHasReported(false); setReportReason(''); }, 2000);
    } catch (error) { alert(t("Failed to submit report.", "அறிக்கையைச் சமர்ப்பிக்க முடியவில்லை.")); } 
    finally { setIsReporting(false); }
  };

  const handleUpdateEvent = async () => {
    setIsSavingEdit(true);
    try {
      const updatedData = { ...editForm, date: editForm.date };
      await updateDoc(doc(db, 'events', localEvent.id), updatedData);
      setLocalEvent(prev => ({ ...prev, ...updatedData }));
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating event", error);
      alert(t("Failed to update event.", "நிகழ்வைப் புதுப்பிக்க முடியவில்லை."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEvent = async () => {
    const confirmDelete = window.confirm(t("Are you sure you want to permanently delete this event?", "இந்த நிகழ்வை நிரந்தரமாக நீக்க விரும்புகிறீர்களா?"));
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'events', localEvent.id));
      setIsDeleted(true); 
    } catch (error) {
      alert(t("Failed to delete event.", "நிகழ்வை நீக்க முடியவில்லை."));
    }
  };

  // just unmount the whole thing immediately if deleted
  if (isDeleted) return null;

  return (
    <>
      {/* main feed card */}
      <div 
        onClick={() => setIsModalOpen(true)}
        style={{ background: 'var(--bg-surface)', borderRadius: '32px', boxShadow: 'var(--shadow-soft)', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease', border: '1px solid var(--bg-input)' }}
      >
        <div style={{ width: '100%', height: '220px', background: 'var(--bg-input)', position: 'relative' }}>
          {localEvent.imageUrl ? (
            <img src={localEvent.imageUrl} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              {!isCreator && (
                <button 
                  onClick={toggleFollow}
                  style={{ background: isFollowing ? '#E1FDEB' : 'var(--bg-input)', color: isFollowing ? '#007F3B' : 'var(--text-primary)', border: 'none', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {isFollowing ? <><CheckCircle size={14} /> {t("Following", "பின்தொடர்கிறீர்கள்")}</> : <><UserPlus size={14} /> {t("Follow", "பின்தொடர்")}</>}
                </button>
              )}
            </div>
          )}
          
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', lineHeight: 1.3, color: 'var(--text-primary)' }}>{localEvent.title}</h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <Calendar size={14} /> {displayDateTime}
            </span>
            <span style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <MapPin size={14} /> {localEvent.location}
            </span>
          </div>
        </div>
      </div>

      {/* the big popup modal */}
      {isModalOpen && (
        <div className={`modal-backdrop ${isClosing ? 'is-closing' : ''}`} onClick={handleCloseModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ height: '85vh', maxHeight: '800px', background: 'var(--bg-surface)' }}>
            
            <button onClick={handleCloseModal} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}><X size={20} color="#181818" /></button>

            <div style={{ flex: 1, overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', paddingBottom: '2rem' }}>
              
              {localEvent.imageUrl && (
                <div onClick={() => setIsPosterExpanded(true)} style={{ width: '100%', height: '280px', background: 'var(--bg-input)', position: 'relative', cursor: 'zoom-in' }}>
                  <img src={localEvent.imageUrl} alt="Poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', padding: '6px', borderRadius: '8px', color: 'white' }}><Maximize2 size={16} /></div>
                </div>
              )}

              <div style={{ padding: '1.5rem' }}>
                
                {/* show edit buttons only if they own the event */}
                {isCreator && !isEditing && (
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => setIsEditing(true)} style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-primary)', border: 'none', padding: '0.75rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      <Edit3 size={18} /> {t("Edit Event", "திருத்து")}
                    </button>
                    <button onClick={handleDeleteEvent} style={{ flex: 1, background: '#FEF2F2', color: '#DC2626', border: 'none', padding: '0.75rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer' }}>
                      <Trash2 size={18} /> {t("Delete", "நீக்கு")}
                    </button>
                  </div>
                )}

                {/* edit form */}
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--accent-solid)' }}>{t("Edit Event", "நிகழ்வைத் திருத்து")}</h3>
                    <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Event Title" style={{ borderRadius: '16px' }} />
                    
                    <input type="datetime-local" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} style={{ borderRadius: '16px' }} />
                    
                    <input type="text" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Location" style={{ borderRadius: '16px' }} />
                    <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Description" style={{ borderRadius: '16px', height: '120px' }} />
                    <input type="url" value={editForm.ticketLink} onChange={e => setEditForm({...editForm, ticketLink: e.target.value})} placeholder="Ticket Link (Optional)" style={{ borderRadius: '16px' }} />
                    
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <button onClick={handleUpdateEvent} disabled={isSavingEdit} className="btn-primary" style={{ flex: 2 }}>{isSavingEdit ? "Saving..." : t("Save Changes", "மாற்றங்களைச் சேமி")}</button>
                      <button onClick={() => { setIsEditing(false); setEditForm({ ...localEvent, date: formatForInput(eventDate) }); }} style={{ flex: 1, background: 'var(--bg-input)', border: 'none', borderRadius: '100px', fontWeight: 600, cursor: 'pointer' }}>{t("Cancel", "ரத்து செய்")}</button>
                    </div>
                  </div>
                ) : (
                  /* normal view */
                  <>
                    <h2 style={{ margin: '0 0 1.25rem 0', fontSize: '1.8rem', lineHeight: 1.2 }}>{localEvent.title}</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        <Calendar size={18} color="var(--accent-solid)" /> 
                        <b>{t("Date & Time:", "தேதி & நேரம்:")}</b> {displayDateTime}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        <MapPin size={18} color="var(--accent-solid)" /> 
                        <b>{t("Location:", "இடம்:")}</b> {localEvent.location}
                      </div>
                      
                      {orgName && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)', fontWeight: 600 }}><Building size={18} color="var(--accent-solid)" /> {orgName}</div>
                          {!isCreator && (
                            <button onClick={toggleFollow} style={{ background: isFollowing ? 'transparent' : 'var(--accent-solid)', color: isFollowing ? 'var(--text-tertiary)' : 'white', border: isFollowing ? '1px solid var(--border-subtle)' : 'none', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                              {isFollowing ? t("Following", "பின்தொடர்கிறீர்கள்") : t("Follow", "பின்தொடர்")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '1.5rem' }}>
                      <Heart size={16} fill="var(--text-secondary)" color="var(--text-secondary)" /> {attendeeCount} {t("saved this event", "நிகழ்வை சேமித்தனர்")}
                    </div>

                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>{t("About Event", "நிகழ்வு பற்றி")}</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '1rem', whiteSpace: 'pre-wrap' }}>{localEvent.description}</p>
                    
                    {!isCreator && (
                      <button onClick={(e) => { e.stopPropagation(); setIsReportModalOpen(true); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', marginTop: '2rem' }}>
                        <AlertTriangle size={14} /> {t("Report Issue", "சிக்கலை புகாரளி")}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* fixed footer. hide it if they are editing so it doesn't cover the save button */}
            {!isEditing && (
              <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 10 }}>
                <button onClick={handleBuyTickets} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '1.1rem', boxShadow: 'var(--shadow-glow)' }}>
                  <Ticket size={20} /> {t("Buy Tickets", "டிக்கெட் வாங்கு")}
                </button>
                <button onClick={toggleSave} style={{ background: isSaved ? '#FEF2F2' : 'var(--bg-input)', border: 'none', color: isSaved ? '#DC2626' : 'var(--text-primary)', width: '54px', height: '54px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease' }}>
                  <Heart size={24} fill={isSaved ? '#DC2626' : 'none'} />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* report popup */}
      {isReportModalOpen && (
        <div onClick={() => setIsReportModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()} className="animate-in" style={{ width: '100%', maxWidth: '350px', background: 'var(--bg-surface)', borderRadius: '28px', padding: '1.5rem', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            {hasReported ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} color="#007F3B" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#007F3B', margin: '0 0 0.5rem 0' }}>{t("Report Submitted", "அறிக்கை சமர்ப்பிக்கப்பட்டது")}</h3>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}><AlertTriangle size={20} /> {t("Report Event", "நிகழ்வைப் புகாரளி")}</h3>
                  <button onClick={() => setIsReportModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={20} /></button>
                </div>
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

      {/* click image to make it big chungus */}
      {isPosterExpanded && localEvent.imageUrl && (
        <div onClick={() => setIsPosterExpanded(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', cursor: 'zoom-out' }}>
          <img src={localEvent.imageUrl} alt="Expanded Poster" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '16px' }} />
        </div>
      )}
    </>
  );
};

export default EventCard;