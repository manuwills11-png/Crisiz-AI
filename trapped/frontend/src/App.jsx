import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Routes, Route, useNavigate } from "react-router-dom";
import { ref, push } from "firebase/database";
import { db } from "./firebase";
import EmergencyContacts from "./EmergencyContacts";
import Resources from "./Resources";
import "./App.css";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState(null);
  const navigate = useNavigate();

  // 🔥 Get Current Location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );

          const data = await response.json();
          setLocation(data.display_name);
        } catch (error) {
          console.log("Reverse geocode error:", error);
        }
      },
      () => {
        alert("Unable to retrieve your location");
      }
    );
  };

  // 🔥 SEND ALERT FUNCTION
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!location) {
      alert("Please enter a location");
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${location}&format=json`
      );

      const data = await response.json();

      if (data.length === 0) {
        alert("Location not found");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      const alertsRef = ref(db, "alerts");

      push(alertsRef, {
        lat: lat,
        lng: lng,
        location: location,
        status: "Pending",
        timestamp: Date.now(),
      });

      alert("Alert submitted successfully!");
      setLocation("");

    } catch (error) {
      console.log("Location fetch error:", error);
      alert("Error finding location");
    }
  };

  // 🌦 FETCH WEATHER
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=Chennai&units=metric&appid=b245413e70c2d3d6aa014080735f7402`
        );
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.log("Weather fetch error:", error);
      }
    };

    fetchWeather();
  }, []);

  return (
    <div className="app-container">

      {/* NAVBAR */}
      <nav className="navbar">
        <div
          className="logo"
          onClick={() => {
            navigate("/");
            setMenuOpen(false);
          }}
          style={{ cursor: "pointer" }}
        >
          <span className="logo-highlight">Disaster</span>AI
        </div>

        <div
          className={`hamburger ${menuOpen ? "active" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </nav>

      {/* FULLSCREEN MENU */}
      <div className={`fullscreen-menu ${menuOpen ? "open" : ""}`}>
        <ul>
          <li onClick={() => { navigate("/"); setMenuOpen(false); }}>
            Home
          </li>
          <li onClick={() => { navigate("/resources"); setMenuOpen(false); }}>
            Resources
          </li>
          <li>Live Alerts</li>
          <li onClick={() => { navigate("/contacts"); setMenuOpen(false); }}>
            Emergency Contacts
          </li>
        </ul>
      </div>

      {/* ROUTES */}
      <Routes>
        <Route
          path="/"
          element={
            <>
              {/* MAP */}
              <div className="map-wrapper">
                <MapContainer
                  center={[13.0827, 80.2707]}
                  zoom={13}
                  zoomControl={false}
                  style={{ height: "500px", width: "80%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <Marker position={[13.0827, 80.2707]}>
                    <Popup>Chennai 📍</Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* HELP + WEATHER */}
              <section className="help-section">
                <div className="help-wrapper">

                  {/* INCIDENT REPORT */}
                  <div className="help-container">
                    <h2>Report Incident</h2>
                    <p>
                      Enter the location where the incident occurred.
                    </p>

                    <form className="help-form" onSubmit={handleSubmit}>

                      <input
                        type="text"
                        placeholder="Enter location (e.g. Velachery, Chennai)"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button type="submit">+ Submit Alert</button>

                        <button
                          type="button"
                          onClick={getCurrentLocation}
                        >
                          Use My Location
                        </button>
                      </div>

                    </form>
                  </div>

                  {/* WEATHER */}
                  <div className="weather-card">
                    <h3>Live Weather</h3>

                    {weather ? (
                      <>
                        <p><strong>Location:</strong> {weather.name}</p>
                        <p><strong>Temperature:</strong> {weather.main?.temp}°C</p>
                        <p><strong>Condition:</strong> {weather.weather?.[0]?.description}</p>
                        <p><strong>Wind:</strong> {weather.wind?.speed} m/s</p>
                        <p><strong>Humidity:</strong> {weather.main?.humidity}%</p>
                      </>
                    ) : (
                      <p>Loading weather...</p>
                    )}

                  </div>

                </div>
              </section>
            </>
          }
        />

        <Route path="/contacts" element={<EmergencyContacts />} />
        <Route path="/resources" element={<Resources />} />
      </Routes>

    </div>
  );
}

export default App;