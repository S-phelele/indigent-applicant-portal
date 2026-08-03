import { Link } from 'react-router-dom';
import Header from '../components/Header';

export default function Landing() {
  return (
    <div>
      <Header />
      <section className="hero">
        <h1>Apply for indigent support</h1>
        <p>
          Whether you qualify for indigent support depends on your monthly household income.
          If your total household income is R7 500 or less per month, you could qualify for a
          discount on your water, sewerage, electricity, waste collection and property rates.
        </p>
        <Link to="/register" className="btn">Click here to apply</Link>
      </section>

      <section className="section">
        <h2>Important Information</h2>
        <p style={{ textAlign: 'center', color: 'var(--gray-500)', maxWidth: 700, margin: '0 auto' }}>
          Please ensure all information provided is accurate. Supporting documents such as ID copy,
          bank statements and affidavit are required. Incomplete applications may be declined.
        </p>
      </section>

      <section className="section" style={{ background: 'white' }}>
        <h2>How does it work?</h2>
        <div className="cards-grid">
          <div className="info-card">
            <div className="icon">✏️</div>
            <h3>Complete Form</h3>
            <p>Fill in your personal, property, household income and general details.</p>
            <Link to="/register">Get started →</Link>
          </div>
          <div className="info-card">
            <div className="icon">📄</div>
            <h3>Upload Documents</h3>
            <p>Upload required supporting documents (ID, bank statements, affidavit).</p>
            <Link to="/register">Get started →</Link>
          </div>
          <div className="info-card">
            <div className="icon">🔔</div>
            <h3>Get Notification</h3>
            <p>You will be notified once your application has been reviewed.</p>
            <Link to="/register">Get started →</Link>
          </div>
          <div className="info-card">
            <div className="icon">👤</div>
            <h3>Get Support</h3>
            <p>If approved, discounts will be applied to your municipal account.</p>
            <Link to="/register">Get started →</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#1e293b', color: 'white' }}>
        <h2 style={{ color: 'white' }}>Frequently Asked Questions</h2>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {[
            'Who qualifies for indigent support?',
            'What documents do I need?',
            'How long does the process take?',
            'Can I re-apply if declined?',
            'How is household income calculated?',
          ].map((q) => (
            <div
              key={q}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                padding: '1rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span>{q}</span>
              <span>▾</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">Terms & Conditions © 2024. All rights reserved.</footer>
    </div>
  );
}
