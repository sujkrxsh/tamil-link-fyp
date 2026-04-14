// src/components/EventFeed.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const EventFeed = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'events'));
        const eventsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <div className="loading-spinner">Loading Events...</div>;

  return (
    <div className="event-feed-container">
      <header className="feed-header">
        <h1>Tamil Events UK</h1>
      </header>
      
      <main className="event-list">
        {events.length === 0 ? (
          <p>No upcoming events found.</p>
        ) : (
          events.map(event => (
            <article key={event.id} className="event-card">
              <div className="event-details">
                <h2>{event.title}</h2>
                <p className="event-meta">📅 {event.date} | 📍 {event.location}</p>
                
                {/* Safety & Trust Requirement */}
                <p className="event-organiser">
                  By {event.organiser} 
                  <span className="verified-badge" title="Verified Organiser"> ✔️ Verified</span>
                </p>
              </div>

              {/* Functional Requirement: Direct Ticket Link */}
              <a 
                href={event.ticketLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="get-tickets-btn"
              >
                GET TICKETS
              </a>
            </article>
          ))
        )}
      </main>
    </div>
  );
};

export default EventFeed;