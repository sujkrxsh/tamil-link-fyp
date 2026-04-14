// src/components/RSVPWidget.jsx
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

const RSVPWidget = ({ eventId }) => {
  const [attendees, setAttendees] = useState([]);
  const [hasRSVPd, setHasRSVPd] = useState(false);
  const [rsvpDocId, setRsvpDocId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRSVPs = async () => {
      if (!auth.currentUser) return;
      
      const q = query(collection(db, 'rsvps'), where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      
      const attendeeList = [];
      let userRsvpId = null;
      let userRSVPStatus = false;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        attendeeList.push(data.userId); // In a full app, you'd fetch the user's name/avatar here
        
        if (data.userId === auth.currentUser.uid) {
          userRSVPStatus = true;
          userRsvpId = doc.id;
        }
      });

      setAttendees(attendeeList);
      setHasRSVPd(userRSVPStatus);
      setRsvpDocId(userRsvpId);
      setLoading(false);
    };

    fetchRSVPs();
  }, [eventId]);

  const toggleRSVP = async () => {
    if (!auth.currentUser) return alert("Please log in to RSVP.");

    try {
      if (hasRSVPd) {
        // Remove RSVP
        await deleteDoc(doc(db, 'rsvps', rsvpDocId));
        setHasRSVPd(false);
        setAttendees(prev => prev.filter(id => id !== auth.currentUser.uid));
      } else {
        // Add RSVP
        const docRef = await addDoc(collection(db, 'rsvps'), {
          eventId: eventId,
          userId: auth.currentUser.uid,
          timestamp: new Date()
        });
        setHasRSVPd(true);
        setRsvpDocId(docRef.id);
        setAttendees(prev => [...prev, auth.currentUser.uid]);
      }
    } catch (error) {
      console.error("Error toggling RSVP: ", error);
    }
  };

  if (loading) return <div className="rsvp-loading">Loading attendees...</div>;

  return (
    <div className="rsvp-container">
      <div className="attendee-count">
        👥 {attendees.length} {attendees.length === 1 ? 'person' : 'people'} attending
      </div>
      <button 
        onClick={toggleRSVP} 
        className={`rsvp-btn ${hasRSVPd ? 'going' : 'not-going'}`}
      >
        {hasRSVPd ? '✓ I am going' : '+ RSVP'}
      </button>
    </div>
  );
};

export default RSVPWidget;