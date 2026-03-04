import "./App.css";

function EmergencyContacts() {
  return (
    <div className="contacts-page">
      <h1>Chennai District Emergency Contacts</h1>

      <div className="contacts-grid">

        <div className="contact-card">
          <h3>Police Control Room</h3>
          <p>100</p>
        </div>

        <div className="contact-card">
          <h3>Fire & Rescue</h3>
          <p>101</p>
        </div>

        <div className="contact-card">
          <h3>Ambulance</h3>
          <p>108</p>
        </div>

        <div className="contact-card">
          <h3>Disaster Management TN</h3>
          <p>1070</p>
        </div>

        <div className="contact-card">
          <h3>Women Helpline</h3>
          <p>181</p>
        </div>

        <div className="contact-card">
          <h3>Child Helpline</h3>
          <p>1098</p>
        </div>

      </div>
    </div>
  );
}

export default EmergencyContacts;