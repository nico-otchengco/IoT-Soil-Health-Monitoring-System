import { useNavigate } from 'react-router-dom';
import PROTOTYPE from '../assets/PROTOTYPE.png';

export default function Home() {
  const nav = useNavigate();

  return (
    <div className="home-layout">
      <div className="home-topbar">
        <a href="https://mail.google.com/mail/?view=cm&fs=1&to=developer@gmail.com&su=SmartSoil Support Request&body=Hello, I need help with..."
           target="_blank" rel="noopener noreferrer">
          <button className="home-link-btn">Contact Us</button>
        </a>
      </div>

      <div className="home-hero">
        <div className="home-hero-text">
          <h2 className="home-eyebrow">SmartSoil</h2>
          <h1 className="home-title">
            Grow Smarter, Harvest Better –<br />
            Monitor Your Soil in Real-Time
          </h1>
          <p className="home-subtitle">
            An IoT-driven portable device designed to monitor soil health
            parameters like moisture, temperature, EC, pH and NPK in real-time,
            helping home gardeners and researchers make data-driven decisions.
          </p>

          <div className="home-cta-row">
            <button className="home-cta-btn" onClick={() => nav('/dashboard')}>
              Open Dashboard
            </button>
            <span className="home-cta-note">
              View live readings from your ESP32 SmartSoil node.
            </span>
          </div>
        </div>

        <div className="home-hero-card">
          <div className="home-hero-card-inner">
              <img src={PROTOTYPE} alt="SmartSoil Prototype" />
          </div>
        </div>
      </div>
    </div>
  );
}
