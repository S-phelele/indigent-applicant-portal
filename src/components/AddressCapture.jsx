import { useState } from 'react';
import Icon from './ui/Icon';
import api from '../services/api';
import { friendlyError } from '../utils/apiError';

/**
 * Residential address capture.
 *
 * Three ways in, because one alone fails somebody:
 *
 *  1. **Use my current location** — fastest and most accurate, and the only
 *     workable option in an informal settlement with no street address. Needs
 *     permission and a device fix.
 *  2. **Search the typed address** — for someone applying from a library
 *     computer, or whose home is not where they are sitting.
 *  3. **Type it and move on** — always available. A household must never be
 *     blocked from applying because a geocoder could not find their street.
 *
 * Coordinates are optional throughout. They help a reviewer confirm the property
 * is in the municipal area; they are not a requirement to apply.
 */
export default function AddressCapture({
  address,
  onAddressChange,
  coordinates,          // { latitude, longitude, formatted, source, accuracyM } | null
  onCoordinatesChange,
}) {
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const clear = () => { setError(''); setNote(''); setCandidates(null); };

  /** Ask the browser where we are, then turn that into a readable address. */
  const useCurrentLocation = () => {
    clear();
    if (!('geolocation' in navigator)) {
      setError('This device cannot share its location. Please type your address instead.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          const res = await api.get('/geocode/reverse', { params: { lat: latitude, lon: longitude } });
          const found = res.data.data;

          onCoordinatesChange({
            latitude: found.latitude,
            longitude: found.longitude,
            formatted: found.formatted || null,
            source: 'DEVICE',
            accuracyM: Math.round(accuracy),
          });

          if (found.formatted) {
            // Only overwrite what they typed if they have not typed anything.
            if (!address?.trim()) onAddressChange(found.formatted);
            setNote(`Location captured, accurate to about ${Math.round(accuracy)} m.`);
          } else {
            setNote(res.data.message || 'Position captured. Please describe your address below.');
          }
        } catch (err) {
          // The position is still worth keeping even if the lookup failed.
          onCoordinatesChange({
            latitude: Number(latitude.toFixed(7)),
            longitude: Number(longitude.toFixed(7)),
            formatted: null,
            source: 'DEVICE',
            accuracyM: Math.round(accuracy),
          });
          setNote(friendlyError(err, 'Position captured, but we could not look up the address. Please type it below.'));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        const reasons = {
          1: 'You declined location access. You can allow it in your browser settings, or simply type your address.',
          2: 'Your location could not be determined. Please type your address instead.',
          3: 'Finding your location took too long. Please try again or type your address.',
        };
        setError(reasons[err.code] || 'We could not get your location. Please type your address.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /** Look up whatever they have typed. */
  const verifyTyped = async () => {
    clear();
    const q = (address || '').trim();
    if (q.length < 4) {
      setError('Type a little more of the address before searching.');
      return;
    }

    setSearching(true);
    try {
      const res = await api.get('/geocode/search', { params: { q } });
      const results = res.data.data || [];
      if (results.length === 0) {
        setNote(res.data.message || 'No matching address found. You can still continue with what you typed.');
      } else if (results.length === 1) {
        choose(results[0]);
      } else {
        setCandidates(results);
      }
    } catch (err) {
      setError(friendlyError(err, 'Address lookup is unavailable. You can continue without it.'));
    } finally {
      setSearching(false);
    }
  };

  const choose = (result) => {
    onAddressChange(result.formatted);
    onCoordinatesChange({
      latitude: result.latitude,
      longitude: result.longitude,
      formatted: result.formatted,
      source: 'SEARCH',
      accuracyM: null,
    });
    setCandidates(null);
    setNote('Address confirmed.');
  };

  const removePin = () => {
    clear();
    onCoordinatesChange(null);
  };

  const hasPin = coordinates?.latitude != null && coordinates?.longitude != null;

  return (
    <div className="form-group">
      <label htmlFor="residentialAddress">Residential address</label>

      <input
        id="residentialAddress"
        value={address}
        onChange={(e) => { onAddressChange(e.target.value); clear(); }}
        placeholder="Street number and name, suburb, town"
      />

      <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={useCurrentLocation} disabled={locating}>
          <Icon name="map-pin" size={14} />
          {locating ? 'Finding you…' : 'Use my current location'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={verifyTyped} disabled={searching || !address?.trim()}>
          <Icon name="search" size={14} />
          {searching ? 'Searching…' : 'Verify this address'}
        </button>
      </div>

      <div className="field-hint" style={{ marginTop: '.4rem' }}>
        Pinning your home helps the municipality confirm the property is in their area. It is optional —
        you can apply without it.
      </div>

      {error ? (
        <div className="alert alert-warning" style={{ marginTop: '.6rem', marginBottom: 0 }}>
          <Icon name="alert-triangle" size={15} />
          <span>{error}</span>
        </div>
      ) : null}

      {note && !error ? (
        <div className="alert alert-info" style={{ marginTop: '.6rem', marginBottom: 0 }}>
          <Icon name="info" size={15} />
          <span>{note}</span>
        </div>
      ) : null}

      {candidates ? (
        <div className="panel" style={{ marginTop: '.6rem', marginBottom: 0, padding: '.75rem' }}>
          <p style={{ fontSize: '.8125rem', fontWeight: 600, marginBottom: '.5rem' }}>
            Which of these is your home?
          </p>
          <div style={{ display: 'grid', gap: '.35rem' }}>
            {candidates.map((c) => (
              <button
                key={`${c.latitude},${c.longitude}`}
                type="button"
                className="menu-item"
                style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)' }}
                onClick={() => choose(c)}
              >
                <Icon name="map-pin" size={14} />
                <span style={{ fontSize: '.8125rem' }}>{c.formatted}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: '.5rem' }}
            onClick={() => { setCandidates(null); setNote('Keeping the address as you typed it.'); }}
          >
            None of these — keep what I typed
          </button>
        </div>
      ) : null}

      {hasPin ? (
        <div
          style={{
            marginTop: '.6rem', padding: '.7rem .85rem',
            background: 'var(--success-soft)', border: '1px solid var(--success-line)',
            borderRadius: 'var(--radius)',
            display: 'flex', alignItems: 'flex-start', gap: '.6rem',
          }}
        >
          <Icon name="check-circle" size={16} style={{ color: 'var(--success)', marginTop: '.1rem' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '.8125rem', fontWeight: 600, color: 'var(--success)' }}>
              Location pinned
              {coordinates.source === 'DEVICE' ? ' from your device' : coordinates.source === 'SEARCH' ? ' from the address' : ''}
            </div>
            <div className="muted" style={{ fontSize: '.75rem', marginTop: '.15rem' }}>
              {Number(coordinates.latitude).toFixed(5)}, {Number(coordinates.longitude).toFixed(5)}
              {coordinates.accuracyM ? ` · accurate to about ${coordinates.accuracyM} m` : ''}
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={removePin}>Remove</button>
        </div>
      ) : null}
    </div>
  );
}
