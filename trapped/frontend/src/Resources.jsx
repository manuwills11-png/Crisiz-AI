import "./App.css";

function Resources() {
  return (
    <div className="resources-page">
      <h1>Chennai City Resources</h1>

      <div className="resources-grid">

        <div className="resource-card">
          <h3>Relief Shelters</h3>
          <p>Government schools, cyclone shelters, community halls used during emergencies.</p>
        </div>

        <div className="resource-card">
          <h3>Hospitals</h3>
          <p>Government General Hospital, Stanley Medical College, nearby trauma centers.</p>
        </div>

        <div className="resource-card">
          <h3>Fire Stations</h3>
          <p>Fire & Rescue Services stations across Chennai districts.</p>
        </div>

        <div className="resource-card">
          <h3>Police Stations</h3>
          <p>Chennai city police stations & control rooms.</p>
        </div>

        <div className="resource-card">
          <h3>Food & Water Supply</h3>
          <p>Relief kitchens, ration centers, water tanker supply points.</p>
        </div>

        <div className="resource-card">
          <h3>Utilities & Infrastructure</h3>
          <p>Electricity board helplines, water board complaints, road closure updates.</p>
        </div>

      </div>
    </div>
  );
}

export default Resources;