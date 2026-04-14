import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import EventCard from './EventCard';
import { useLanguage } from '../context/LanguageContext';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('All');
  
  // Bring in the language translation function
  const { t } = useLanguage();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching feed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Dynamically extract unique locations from the database for the pill filter
  const uniqueLocations = useMemo(() => {
    const locs = events.map(e => e.location);
    return ['All', ...new Set(locs)];
  }, [events]);

  // Filter the events before rendering them
  const filteredEvents = selectedLocation === 'All' 
    ? events 
    : events.filter(e => e.location === selectedLocation);

  return (
    // Clean outermost div - relying on index.css for mobile breathing room
    <div className="app-container page-content">
      
      {/* Location Filter Pills */}
      {!loading && uniqueLocations.length > 1 && (
        <div className="filter-scroll">
          {uniqueLocations.map(loc => (
            <button 
              key={loc} 
              className={`filter-pill ${selectedLocation === loc ? 'active' : ''}`}
              onClick={() => setSelectedLocation(loc)}
            >
              {loc === 'All' ? t("All Locations", "அனைத்து இடங்களும்") : loc}
            </button>
          ))}
        </div>
      )}

      {/* Conditional Rendering: Loading Spinner -> Empty State -> Feed */}
      {loading ? (
        <div className="loading-container animate-in">
          <div className="loading-spinner"></div>
          <p className="loading-text">{t("Discovering events...", "நிகழ்வுகளைத் தேடுகிறது...")}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="expanding-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <h2 className="event-title">{t("It's quiet here.", "இங்கே அமைதியாக இருக்கிறது.")}</h2>
          <p className="event-meta" style={{ marginTop: '0.5rem' }}>
            {t("No events have been posted yet.", "நிகழ்வுகள் எதுவும் இல்லை.")}
          </p>
        </div>
      ) : (
        filteredEvents.map((event, index) => (
          <EventCard key={event.id} event={event} index={index} />
        ))
      )}
      
    </div>
  );
};

export default Home;