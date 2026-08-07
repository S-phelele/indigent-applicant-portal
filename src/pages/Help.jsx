import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import Icon from '../components/ui/Icon';

const FAQS = [
  {
    q: 'Who qualifies for indigent support?',
    a: 'Households whose combined gross monthly income falls at or below the municipal threshold. Income includes salaries, pensions, disability grants, income from a business run at home, and rent received from part of the property.',
  },
  {
    q: 'What documents do I need?',
    a: 'A certified copy of your ID, three months of bank statements, and a signed affidavit are required. A proof of grant, death certificate or letter of authority may also be attached if they apply to your household.',
  },
  {
    q: 'How long does the process take?',
    a: 'Applications are reviewed within 14 days of submission. You can check the status of your application at any time from your dashboard.',
  },
  {
    q: 'Can I re-apply if my application is declined?',
    a: 'Yes. If your circumstances change, or if your application was declined because a document was unclear, you may submit a new application with corrected information.',
  },
  {
    q: 'How is household income calculated?',
    a: 'Every source of income for everyone living on the property is added together to give a gross monthly household figure. That total is then divided by the number of people on the property to give the income per person.',
  },
  {
    q: 'Why do I need to verify my cell number?',
    a: 'The municipality uses your cell number to contact you about your application. Verifying it with a one-time code confirms the number is yours and reachable.',
  },
  {
    q: 'Can I change my application after submitting it?',
    a: 'No. Once submitted, an application is locked so that the reviewer sees exactly what you declared. Contact your municipal office if something needs correcting.',
  },
];

function Inner() {
  const [open, setOpen] = useState(0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Help &amp; FAQ</h1>
          <p>Answers to the questions we are asked most often.</p>
        </div>
      </div>

      <section className="panel">
        <div className="faq">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div className={`faq-item${isOpen ? ' open' : ''}`} key={item.q}>
                <h3 style={{ margin: 0 }}>
                  <button
                    type="button"
                    className="faq-q"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{item.q}</span>
                    <Icon name="chevron-down" size={17} />
                  </button>
                </h3>
                {isOpen ? <div className="faq-a" id={`faq-${i}`}>{item.a}</div> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Still need help?</h3>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          If your question is not answered above, contact your municipal office. Have your application
          reference ready — you will find it on your dashboard.
        </p>
        <div style={{ display: 'grid', gap: '.6rem', maxWidth: 460 }}>
          <div className="criteria-item">
            <Icon name="phone" size={16} />
            <span>Municipal call centre — office hours, Monday to Friday</span>
          </div>
          <div className="criteria-item">
            <Icon name="mail" size={16} />
            <span>Email the indigent support desk with your reference number</span>
          </div>
          <div className="criteria-item">
            <Icon name="home" size={16} />
            <span>Visit your nearest municipal customer care office in person</span>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Help() {
  return (
    <AppLayout title="Help & FAQ">
      <Inner />
    </AppLayout>
  );
}
