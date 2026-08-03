const STEPS = [
  { num: 1, label: 'Applicant' },
  { num: 2, label: 'Property' },
  { num: 3, label: 'Household' },
  { num: 4, label: 'General' },
  { num: 5, label: 'Documents' },
];

export default function Stepper({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((s) => (
        <div
          key={s.num}
          className={`step ${current === s.num ? 'active' : ''} ${current > s.num ? 'completed' : ''}`}
        >
          <div className="step-circle">{s.num}</div>
          <div className="step-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
