import Icon from './ui/Icon';

const STEPS = [
  { num: 1, label: 'Applicant' },
  { num: 2, label: 'Property' },
  { num: 3, label: 'Income' },
  { num: 4, label: 'General' },
  { num: 5, label: 'Documents' },
];

export default function Stepper({ current }) {
  return (
    <nav className="stepper" aria-label={`Application progress, step ${current} of ${STEPS.length}`}>
      {STEPS.map((s) => {
        const done = current > s.num;
        const active = current === s.num;
        return (
          <div
            key={s.num}
            className={`step${active ? ' active' : ''}${done ? ' completed' : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            <div className="step-circle">
              {done ? <Icon name="check" size={15} strokeWidth={2.5} /> : s.num}
            </div>
            <div className="step-label">{s.label}</div>
          </div>
        );
      })}
    </nav>
  );
}
