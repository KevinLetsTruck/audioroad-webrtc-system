import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
  const shows = [
    {
      title: 'Trucking Business & Beyond',
      host: 'Kevin Rutherford',
      time: 'Monday 2-5 PM EST',
      description: 'Business strategies, industry insights, and success stories for trucking professionals.'
    },
    {
      title: 'Destination Health',
      host: 'Kevin Rutherford',
      time: 'Tuesday 2-5 PM EST',
      description: 'Health, wellness, and medical guidance for drivers and their families.'
    },
    {
      title: 'The Crude Report',
      host: 'Kevin Rutherford',
      time: 'Wednesday 2-5 PM EST',
      description: 'Energy market analysis, oil industry news, and economic insights.'
    },
    {
      title: 'Red Eye Radio',
      host: 'Kevin Rutherford',
      time: 'Thursday 2-5 PM EST',
      description: 'Late night talk covering current events, politics, and social issues.'
    },
    {
      title: 'AudioRoad Live',
      host: 'Kevin Rutherford',
      time: 'Friday 2-5 PM EST',
      description: 'Interactive live show with audience participation and special guests.'
    }
  ];

  return (
    <div className="home-page">
      <div className="header">
        <div className="logo">🎙️ AudioRoad Network</div>
        <div className="subtitle">Professional WebRTC Studio System</div>
      </div>
      
      <div className="main-content">
        <div className="shows-grid">
          {shows.map((show, index) => (
            <div key={index} className="show-card">
              <div className="show-title">{show.title}</div>
              <div className="show-host">Host: {show.host}</div>
              <div className="show-time">{show.time}</div>
              <div className="show-description">{show.description}</div>
            </div>
          ))}
        </div>
        
        <div className="access-panel">
          <div className="access-title">Studio Access</div>
          <div className="access-buttons">
            <Link to="/screener" className="access-btn screener">
              📞 Screener Dashboard
            </Link>
            <Link to="/host" className="access-btn">
              🎙️ Host Dashboard
            </Link>
          </div>
        </div>
      </div>
      
      <div className="status-bar">
        <span className="status-indicator"></span>
        WebRTC Studio System Online | Server Status: Connected
      </div>
    </div>
  );
};

export default HomePage;