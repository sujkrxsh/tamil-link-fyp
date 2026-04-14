import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Calendar, MapPin, BadgeCheck, Ticket, Heart, ChevronDown, Flag, UserPlus, UserCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext'; // Feature 4

const EventCard = ({ event, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [favouriteId, setFavouriteId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState(null);
  
  const { t } = useLanguage(); // Import translator

  useEffect(() => {
    const checkInteractions = async () => {
      if (!auth.currentUser) return;
      
      // Check Favourite
      const favQ = query(collection(db, 'rsvps'), where('eventId', '==', event.id), where('userId', '==', auth.currentUser.uid));
      const favSnap = await getDocs(favQ);
      if (!favSnap.empty) {
        setIsFavourited(true);
        setFavouriteId(favSnap.docs[0].id);
      }

      // Check Follow (Feature 5)
      const followQ = query(collection(db, 'follows'), where('organiserName', '==', event.organiser), where('userId', '==', auth.currentUser.uid));
      const followSnap = await getDocs(followQ);
      if (!followSnap.empty) {
        setIsFollowing(true);
        setFollowId(followSnap.docs[0].id);
      }
    };
    checkInteractions();
  }, [event.id, event.organiser]);

  const handleFavourite = async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return alert(t("Log in to save events!", "நிகழ்வுகளைச் சேமிக்க உள்நுழையவும்!"));
    try {
      if (isFavourited) {
        await deleteDoc(doc(db, 'rsvps', favouriteId));
        setIsFavourited(false);
      } else {
        const newDoc = await addDoc(collection(db, 'rsvps'), { eventId: event.id, userId: auth.currentUser.uid });
        setIsFavourited(true); setFavouriteId(newDoc.id);
      }
    } catch (err) {}
  };

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followId));
        setIsFollowing(false);
      } else {
        const newDoc = await addDoc(collection(db, 'follows'), { organiserName: event.organiser, userId: auth.currentUser.uid });
        setIsFollowing(true); setFollowId(newDoc.id);
      }
    } catch (err) {}
  };

  // Feature 3: Report System
  const handleReport = async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    const reason = prompt(t("Why are you reporting this event?", "இந்த நிகழ்வை ஏன் புகாரளிக்கிறீர்கள்?"));
    if (reason) {
      await addDoc(collection(db, 'reports'), {
        eventId: event.id,
        eventTitle: event.title,
        reporterId: auth.currentUser.uid,
        reason: reason,
        status: 'pending',
        createdAt: new Date()
      });
      alert(t("Report submitted for Admin review.", "நிர்வாகியின் மதிப்பாய்வுக்கு புகார் சமர்ப்பிக்கப்பட்டது."));
    }
  };

  return (
    <article className={`expanding-card animate-in ${isExpanded ? 'is-expanded' : ''}`} style={{ animationDelay: `${index * 0.08}s` }} onClick={() => setIsExpanded(!isExpanded)}>
      
      {event.imageUrl && (
        <div className="card-image-wrapper">
          <img src={event.imageUrl} alt="Poster" className="card-poster-img" />
          <button className={`fav-btn ${isFavourited ? 'active' : ''}`} onClick={handleFavourite}><Heart size={20} color="var(--text-secondary)" /></button>
        </div>
      )}

      <div>
        <div className="event-organiser" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="verified-badge"><BadgeCheck size={14} /> {t("Verified", "சரிபார்க்கப்பட்டது")}</span>
            {event.organiser}
          </div>
          {/* Follow Button */}
          <button className={`btn-follow ${isFollowing ? 'following' : ''}`} onClick={handleFollow}>
            {isFollowing ? <><UserCheck size={12} style={{display:'inline'}}/> {t("Following", "பின்தொடர்கிறீர்கள்")}</> : <><UserPlus size={12} style={{display:'inline'}}/> {t("Follow", "பின்தொடர")}</>}
          </button>
        </div>
        
        <h2 className="event-title" style={{ fontSize: isExpanded ? '2rem' : '1.5rem', marginTop: '0.5rem' }}>{event.title}</h2>
        
        <div className="event-meta" style={{ marginTop: '0.5rem', flexDirection: isExpanded ? 'column' : 'row', gap: isExpanded ? '0.75rem' : '1.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isExpanded ? 'var(--text-primary)' : '' }}>
            <Calendar size={16} color="var(--accent-solid)" /> {new Date(event.date).toLocaleDateString()}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isExpanded ? 'var(--text-primary)' : '' }}>
            <MapPin size={16} color="var(--accent-solid)" /> {event.location}
          </span>
        </div>
      </div>

      <div className="card-expandable-body">
        <div className="card-inner-content">
          <div style={{ height: '1px', background: 'var(--border-subtle)' }}></div>
          <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{event.description}</p>
          <a href={event.ticketLink} target="_blank" rel="noopener noreferrer" className="btn-tickets" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <Ticket size={20} /> {t("Get Tickets", "டிக்கெட் பெற")}
          </a>
          
          {/* Report Button */}
          <button className="btn-report" onClick={handleReport}>
            <Flag size={16} /> {t("Report Event", "நிகழ்வைப் புகாரளி")}
          </button>
        </div>
      </div>
      {!isExpanded && <div style={{ textAlign: 'center', marginTop: '-0.5rem', color: 'var(--text-tertiary)' }}><ChevronDown size={20} /></div>}
    </article>
  );
};

export default EventCard;