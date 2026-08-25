import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Icon from '../components/ui/Icon';

const CARDS = [
  { icon: 'edit', title: 'Complete Form', body: 'Fill in your personal, property, household income and general details.' },
  { icon: 'file', title: 'Upload Documents', body: 'Upload required supporting documents (ID, bank statements, affidavit).' },
  { icon: 'bell', title: 'Get Notification', body: 'You will be notified once your application has been reviewed.' },
  { icon: 'user', title: 'Get Support', body: 'If approved, discounts will be applied to your municipal account.' },
];

const FAQS = [
  'Who qualifies for indigent support?',
  'What documents do I need?',
  'How long does the process take?',
  'Can I re-apply if declined?',
  'How is household income calculated?',
];

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
          {CARDS.map((c) => (
            <div className="info-card" key={c.title}>
              <div className="info-card-step" aria-hidden="true">
                <Icon name={c.icon} size={17} />
              </div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <Link to="/register">Get started</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ background: '#1e293b', color: 'white' }}>
        <h2 style={{ color: 'white' }}>Frequently Asked Questions</h2>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {FAQS.map((q) => (
            <div
              key={q}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.15)',
                padding: '1rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
              }}
            >
              <span>{q}</span>
              <Icon name="chevron-down" size={16} />
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>Terms &amp; Conditions © 2026. All rights reserved.</p>
        <p>Powered by Malcam ICT Solutions</p>
      </footer>
    </div>
  );
}
