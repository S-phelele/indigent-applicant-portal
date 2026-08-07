import Icon from './ui/Icon';

/**
 * Vertical stage tracker.
 *
 * A status badge alone ("Pending") tells someone waiting on a municipal decision
 * almost nothing. This shows the whole journey, which stage they are on, and
 * what is still ahead.
 */

const STATE_STYLE = {
  done: { icon: 'check', bg: 'var(--success-soft)', fg: 'var(--success)', line: 'var(--success)' },
  current: { icon: 'clock', bg: 'var(--brand-soft)', fg: 'var(--brand)', line: 'var(--gray-200)' },
  blocked: { icon: 'alert-triangle', bg: 'var(--warning-soft)', fg: 'var(--warning)', line: 'var(--gray-200)' },
  upcoming: { icon: 'circle', bg: 'var(--gray-100)', fg: 'var(--gray-400)', line: 'var(--gray-200)' },
};

const OUTCOME_STYLE = {
  APPROVED: { bg: 'var(--success-soft)', fg: 'var(--success)', icon: 'check-circle' },
  DECLINED: { bg: 'var(--danger-soft)', fg: 'var(--danger)', icon: 'alert-circle' },
};

const when = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

export default function Timeline({ stages = [] }) {
  if (stages.length === 0) return null;

  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {stages.map((stage, i) => {
        const isLast = i === stages.length - 1;
        const outcome = stage.outcome ? OUTCOME_STYLE[stage.outcome] : null;
        const style = outcome || STATE_STYLE[stage.state] || STATE_STYLE.upcoming;

        return (
          <li key={stage.key} style={{ display: 'flex', gap: '.9rem', position: 'relative' }}>
            {/* Marker column, with the connector to the next stage. */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <span
                style={{
                  display: 'grid', placeItems: 'center',
                  width: 30, height: 30, borderRadius: '50%',
                  background: style.bg, color: style.fg,
                  border: stage.state === 'current' ? `2px solid ${style.fg}` : '2px solid transparent',
                }}
              >
                <Icon name={style.icon} size={15} strokeWidth={2.2} />
              </span>
              {!isLast && (
                <span
                  style={{
                    width: 2, flex: 1, minHeight: 26,
                    background: (STATE_STYLE[stage.state] || STATE_STYLE.upcoming).line,
                    marginBlock: 2,
                  }}
                />
              )}
            </div>

            <div style={{ paddingBottom: isLast ? 0 : '1.25rem', minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontWeight: stage.state === 'current' || stage.state === 'blocked' ? 600 : 500,
                    color: stage.state === 'upcoming' ? 'var(--gray-500)' : 'var(--ink)',
                    fontSize: '.9375rem',
                  }}
                >
                  {stage.label}
                </span>
                {when(stage.at) && (
                  <span style={{ fontSize: '.75rem', color: 'var(--gray-500)' }}>{when(stage.at)}</span>
                )}
              </div>
              <p
                style={{
                  margin: '.2rem 0 0',
                  fontSize: '.8125rem',
                  color: stage.state === 'blocked' ? 'var(--warning)' : 'var(--gray-500)',
                  maxWidth: '58ch',
                }}
              >
                {stage.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
