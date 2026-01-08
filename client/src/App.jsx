import { useState, useEffect, useCallback } from 'react';
import LevelRangeSlider from './components/LevelRangeSlider';

const SRS_STAGES = {
  0: { label: 'Lesson', class: 'srs-lesson' },
  1: { label: 'Apprentice', class: 'srs-apprentice' },
  2: { label: 'Apprentice', class: 'srs-apprentice' },
  3: { label: 'Apprentice', class: 'srs-apprentice' },
  4: { label: 'Apprentice', class: 'srs-apprentice' },
  5: { label: 'Guru', class: 'srs-guru' },
  6: { label: 'Guru', class: 'srs-guru' },
  7: { label: 'Master', class: 'srs-master' },
  8: { label: 'Enlightened', class: 'srs-enlightened' },
  9: { label: 'Burned', class: 'srs-burned' }
};

const getSrsLabel = (stage) => SRS_STAGES[stage]?.label ?? 'Locked';
const getSrsClass = (stage) => SRS_STAGES[stage]?.class ?? 'srs-locked';

function App() {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsStatus, setDetailsStatus] = useState(null);
  const [detailsProgress, setDetailsProgress] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState(null);

  // Helper to parse URL params and initialize state
  const getInitialStateFromURL = () => {
    const params = new URLSearchParams(window.location.search);

    // Parse level range
    const minLevel = parseInt(params.get('minLevel')) || 1;
    const maxLevel = parseInt(params.get('maxLevel')) || 3;

    // Parse subject types
    const typesParam = params.get('types');
    const subjectTypes = typesParam
      ? {
          radical: typesParam.includes('radical'),
          kanji: typesParam.includes('kanji'),
          vocabulary: typesParam.includes('vocabulary'),
          kana_vocabulary: typesParam.includes('kana_vocabulary')
        }
      : {
          radical: true,
          kanji: true,
          vocabulary: true,
          kana_vocabulary: true
        };

    // Parse SRS filter
    const srsParam = params.get('srs');
    const srsFilter = srsParam
      ? {
          locked: srsParam.includes('locked'),
          lesson: srsParam.includes('lesson'),
          apprentice: srsParam.includes('apprentice'),
          guru: srsParam.includes('guru'),
          master: srsParam.includes('master'),
          enlightened: srsParam.includes('enlightened'),
          burned: srsParam.includes('burned')
        }
      : {
          locked: true,
          lesson: true,
          apprentice: true,
          guru: true,
          master: true,
          enlightened: true,
          burned: true
        };

    // Parse parts of speech filter
    const posParam = params.get('pos');
    const posFilter = posParam
      ? posParam.split(',').reduce((acc, pos) => {
          acc[pos] = true;
          return acc;
        }, {})
      : { '(empty)': true };

    return { minLevel, maxLevel, subjectTypes, srsFilter, posFilter };
  };

  const initialState = getInitialStateFromURL();
  const [levelRange, setLevelRange] = useState({ min: initialState.minLevel, max: initialState.maxLevel });
  const [subjectTypes, setSubjectTypes] = useState(initialState.subjectTypes);
  const [srsFilter, setSrsFilter] = useState(initialState.srsFilter);
  const [posFilter, setPosFilter] = useState(initialState.posFilter);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);

  // Update URL whenever state changes
  useEffect(() => {
    const params = new URLSearchParams();

    // Add level range
    params.set('minLevel', levelRange.min);
    params.set('maxLevel', levelRange.max);

    // Add subject types (only include checked ones)
    const checkedTypes = Object.entries(subjectTypes)
      .filter(([, checked]) => checked)
      .map(([type]) => type);
    if (checkedTypes.length > 0) {
      params.set('types', checkedTypes.join(','));
    }

    // Add SRS filter (only include checked ones)
    const checkedSrs = Object.entries(srsFilter)
      .filter(([, checked]) => checked)
      .map(([srs]) => srs);
    if (checkedSrs.length > 0) {
      params.set('srs', checkedSrs.join(','));
    }

    // Add parts of speech filter (only include checked ones)
    const checkedPos = Object.entries(posFilter)
      .filter(([, checked]) => checked)
      .map(([pos]) => pos);
    if (checkedPos.length > 0) {
      params.set('pos', checkedPos.join(','));
    }

    // Update URL without reloading the page
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [levelRange, subjectTypes, srsFilter, posFilter]);

  const handleTypeToggle = (type) => {
    setSubjectTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSrsFilterToggle = (srs) => {
    setSrsFilter(prev => ({ ...prev, [srs]: !prev[srs] }));
  };

  const handlePosFilterToggle = (pos) => {
    setPosFilter(prev => ({ ...prev, [pos]: !prev[pos] }));
  };

  // Map srs_stage to filter key
  const getSrsFilterKey = (stage) => {
    if (stage === null || stage === undefined) return 'locked';
    if (stage === 0) return 'lesson';
    if (stage >= 1 && stage <= 4) return 'apprentice';
    if (stage >= 5 && stage <= 6) return 'guru';
    if (stage === 7) return 'master';
    if (stage === 8) return 'enlightened';
    if (stage === 9) return 'burned';
    return 'locked';
  };

  const fetchDetails = async (force = false) => {
    if (!subjects || subjects.data.length === 0) return;

    setDetailsLoading(true);
    setDetailsStatus(null);
    setDetailsProgress(null);

    const ids = subjects.data.map(s => s.id);
    const url = `/api/subject-details/stream?ids=${ids.join(',')}&force=${force}`;

    console.log(`[Details] Starting fetch for ${ids.length} subjects (force: ${force})`);

    try {
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'start':
            console.log(`[Details] ${data.cached} cached, ${data.total} to fetch`);
            setDetailsProgress({ current: 0, total: data.total, cached: data.cached });
            break;

          case 'progress':
            console.log(`[Details] Fetched ${data.current}/${data.total}: ${data.characters} (id: ${data.id})`);
            setDetailsProgress(prev => ({ ...prev, current: data.current }));
            // Add new parts of speech to filter
            if (data.parts_of_speech && data.parts_of_speech.length > 0) {
              setPosFilter(prev => {
                const updated = { ...prev };
                data.parts_of_speech.forEach(pos => {
                  if (!(pos in updated)) {
                    updated[pos] = true;
                  }
                });
                return updated;
              });
            }
            break;

          case 'error':
            console.error(`[Details] Error fetching ${data.id}: ${data.message}`);
            break;

          case 'rate_limit':
            console.warn(`[Details] Rate limited! Fetched ${data.fetched}, ${data.remaining} remaining.`);
            console.warn(`[Details] ${data.message}`);
            setDetailsStatus({
              error: `Rate limited. ${data.fetched} fetched, ${data.remaining} remaining. Wait a minute and try again.`
            });
            setDetailsProgress(null);
            setDetailsLoading(false);
            eventSource.close();
            break;

          case 'complete':
            console.log(`[Details] Complete! Fetched: ${data.fetched}, Cached: ${data.cached}, Total: ${data.total}`);
            setDetailsStatus({
              fetched: data.fetched,
              cached: data.cached,
              total: data.total
            });
            setDetailsProgress(null);
            setDetailsLoading(false);
            eventSource.close();
            break;
        }
      };

      eventSource.onerror = (err) => {
        console.error('[Details] EventSource error:', err);
        setDetailsStatus({ error: 'Connection error' });
        setDetailsLoading(false);
        eventSource.close();
      };
    } catch (err) {
      console.error('[Details] Fetch error:', err);
      setDetailsStatus({ error: err.message });
      setDetailsLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [userRes, reviewsRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/reviews')
      ]);

      if (!userRes.ok || !reviewsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const userData = await userRes.json();
      const reviewsData = await reviewsRes.json();

      setUser(userData);
      setReviews(reviewsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    await fetch('/api/sync', { method: 'POST' });
    fetchData();
  };

  const fetchSubjects = useCallback(async () => {
    const selectedTypes = Object.entries(subjectTypes)
      .filter(([, checked]) => checked)
      .map(([type]) => type);

    if (selectedTypes.length === 0) {
      setSubjects({ count: 0, data: [] });
      return;
    }

    setSubjectsLoading(true);
    try {
      const levels = [];
      for (let i = levelRange.min; i <= levelRange.max; i++) {
        levels.push(i);
      }
      const params = new URLSearchParams({
        levels: levels.join(','),
        types: selectedTypes.join(',')
      });
      const res = await fetch(`/api/subjects?${params}`);
      if (!res.ok) throw new Error('Failed to fetch subjects');
      const data = await res.json();
      setSubjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubjectsLoading(false);
    }
  }, [levelRange, subjectTypes]);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fetch subjects on mount if URL has parameters (only once)
  useEffect(() => {
    if (hasAutoFetched || !user) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('minLevel') || params.has('maxLevel') || params.has('types')) {
      fetchSubjects();
      setHasAutoFetched(true);
    }
  }, [user, hasAutoFetched, fetchSubjects]);

  // Auto-fetch details when subjects load
  useEffect(() => {
    if (subjects && subjects.data.length > 0) {
      fetchDetails(false);
    }
  }, [subjects]);

  // Fetch parts of speech data when details finish loading (even if there was an error, we may have partial data)
  useEffect(() => {
    if (detailsStatus && subjects && subjects.data.length > 0 && !detailsLoading) {
      const detailIds = subjects.data.map(s => s.id).join(',');
      fetch(`/api/subject-details?ids=${detailIds}`)
        .then(res => res.json())
        .then(detailsData => {
          setSubjectDetails(detailsData.data);
          // Extract unique parts of speech and initialize filter
          const allPos = new Set();
          detailsData.data.forEach(d => {
            if (d.parts_of_speech && d.parts_of_speech.length > 0) {
              d.parts_of_speech.forEach(pos => allPos.add(pos));
            }
          });
          if (allPos.size > 0) {
            const posFilterInit = { '(empty)': true }; // Always include empty option
            allPos.forEach(pos => { posFilterInit[pos] = true; });
            setPosFilter(posFilterInit);
            console.log('[Details] Parts of speech:', Array.from(allPos));
          }
        })
        .catch(err => console.error('[Details] Failed to fetch details:', err));
    }
  }, [detailsStatus, subjects, detailsLoading]);

  if (loading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="container">
        <h1>Error</h1>
        <p className="error">{error}</p>
        <p>Make sure you have set your WANIKANI_API_TOKEN in server/.env</p>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>WaniKani Dashboard</h1>
        <button onClick={handleSync}>Refresh Data</button>
      </header>

      {user && (
        <section className="card">
          <h2>User Info</h2>
          <p><strong>Username:</strong> {user.data.username}</p>
          <p><strong>Level:</strong> {user.data.level} / {user.data.max_level}</p>
          <p className="source">Source: {user.source}</p>
        </section>
      )}

      {reviews && (
        <section className="card">
          <h2>Reviews Available</h2>
          <p className="review-count">{reviews.count}</p>
          <p>items ready for review</p>
          {reviews.count > 0 && (
            <div className="review-breakdown">
              <h3>By Type</h3>
              <ul>
                {Object.entries(
                  reviews.data.reduce((acc, r) => {
                    acc[r.subject_type] = (acc[r.subject_type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => (
                  <li key={type}>{type}: {count}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="source">Source: {reviews.source}</p>
        </section>
      )}

      <section className="card">
        <h2>Browse Subjects by Level</h2>
        {user && (
          <LevelRangeSlider
            min={1}
            max={user.data.max_level}
            value={levelRange}
            onChange={setLevelRange}
          />
        )}

        <div className="type-filters">
          {Object.entries(subjectTypes).map(([type, checked]) => (
            <label key={type} className={`type-checkbox ${type}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleTypeToggle(type)}
              />
              <span>{type.replace('_', ' ')}</span>
            </label>
          ))}
        </div>

        <button
          onClick={fetchSubjects}
          disabled={subjectsLoading}
          style={{ marginTop: '1rem' }}
        >
          {subjectsLoading ? 'Loading...' : 'Load Subjects'}
        </button>

        {subjects && (
          <div className="subjects-results">
            <p className="subjects-count">{subjects.count} subjects found</p>
            <p className="source">Source: {subjects.source}</p>

            <div className="details-actions">
              <button
                onClick={() => fetchDetails(false)}
                disabled={detailsLoading || subjects.count === 0}
              >
                {detailsLoading && detailsProgress
                  ? detailsProgress.total > 0
                    ? `Fetching... (${detailsProgress.current}/${detailsProgress.total})`
                    : 'Checking cache...'
                  : detailsLoading
                    ? 'Fetching...'
                    : 'Fetch Details'}
              </button>
              {detailsLoading && detailsProgress && detailsProgress.cached > 0 && (
                <span className="details-cached-note">({detailsProgress.cached} already cached)</span>
              )}
              <button
                onClick={() => fetchDetails(true)}
                disabled={detailsLoading || subjects.count === 0}
                className="secondary"
              >
                Force Refresh Details
              </button>
              {detailsStatus && !detailsStatus.error && (
                <span className="details-status">
                  {detailsStatus.fetched} fetched, {detailsStatus.cached} from cache
                </span>
              )}
              {detailsStatus?.error && (
                <span className="details-error">{detailsStatus.error}</span>
              )}
            </div>

            <div className="export-filters">
              <h3>Export Filters</h3>
              <div className="filter-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}>SRS Level</h4>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const allSelected = Object.values(srsFilter).every(v => v);
                      if (allSelected) {
                        setSrsFilter({
                          locked: false,
                          lesson: false,
                          apprentice: false,
                          guru: false,
                          master: false,
                          enlightened: false,
                          burned: false
                        });
                      } else {
                        setSrsFilter({
                          locked: true,
                          lesson: true,
                          apprentice: true,
                          guru: true,
                          master: true,
                          enlightened: true,
                          burned: true
                        });
                      }
                    }}
                    type="button"
                    style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                  >
                    {Object.values(srsFilter).every(v => v) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="filter-checkboxes">
                  {Object.entries(srsFilter).map(([srs, checked]) => (
                    <label key={srs} className={`filter-checkbox srs-${srs}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleSrsFilterToggle(srs)}
                      />
                      <span>{srs.charAt(0).toUpperCase() + srs.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {Object.keys(posFilter).length > 0 && (
                <div className="filter-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>Parts of Speech</h4>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const allSelected = Object.values(posFilter).every(v => v);
                        const updatedPosFilter = {};
                        Object.keys(posFilter).forEach(pos => {
                          updatedPosFilter[pos] = !allSelected;
                        });
                        setPosFilter(updatedPosFilter);
                      }}
                      type="button"
                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.5rem' }}
                    >
                      {Object.values(posFilter).every(v => v) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="filter-checkboxes">
                    {Object.entries(posFilter)
                      .sort(([a], [b]) => {
                        // Put (empty) first
                        if (a === '(empty)') return -1;
                        if (b === '(empty)') return 1;
                        return a.localeCompare(b);
                      })
                      .map(([pos, checked]) => (
                        <label key={pos} className={`filter-checkbox pos ${pos === '(empty)' ? 'empty' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handlePosFilterToggle(pos)}
                          />
                          <span>{pos}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              <p className="filter-count">
                Showing {[...subjects.data].filter(subject => {
                  // Filter by subject type
                  if (!subjectTypes[subject.type]) return false;

                  // Filter by SRS stage
                  const srsKey = getSrsFilterKey(subject.srs_stage);
                  if (!srsFilter[srsKey]) return false;

                  // Filter by parts of speech
                  if (subjectDetails && Object.keys(posFilter).length > 0) {
                    const detail = subjectDetails.find(d => d.id === subject.id);
                    if (detail) {
                      if (!detail.parts_of_speech || detail.parts_of_speech.length === 0) {
                        // Item has no parts of speech - check (empty) filter
                        if (!posFilter['(empty)']) return false;
                      } else {
                        const hasMatchingPos = detail.parts_of_speech.some(pos => posFilter[pos]);
                        if (!hasMatchingPos) return false;
                      }
                    }
                  }
                  return true;
                }).length} of {subjects.count} subjects
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    const filtered = [...subjects.data]
                      .filter(subject => {
                        // Filter by subject type
                        if (!subjectTypes[subject.type]) return false;

                        // Filter by SRS stage
                        const srsKey = getSrsFilterKey(subject.srs_stage);
                        if (!srsFilter[srsKey]) return false;

                        // Filter by parts of speech
                        if (subjectDetails && Object.keys(posFilter).length > 0) {
                          const detail = subjectDetails.find(d => d.id === subject.id);
                          if (detail) {
                            if (!detail.parts_of_speech || detail.parts_of_speech.length === 0) {
                              if (!posFilter['(empty)']) return false;
                            } else {
                              const hasMatchingPos = detail.parts_of_speech.some(pos => posFilter[pos]);
                              if (!hasMatchingPos) return false;
                            }
                          }
                        }
                        return true;
                      })
                      .sort((a, b) => a.level - b.level);

                    const csv = filtered.map(s => {
                      const detail = subjectDetails?.find(d => d.id === s.id);
                      const pos = detail?.parts_of_speech || [];

                      // Extract transitivity (transitive verb or intransitive verb)
                      const transitivity = pos.find(p => p === 'transitive verb' || p === 'intransitive verb') || '';

                      // Extract dan (ichidan verb or godan verb)
                      const dan = pos.find(p => p === 'ichidan verb' || p === 'godan verb') || '';

                      return [
                        s.characters || '',
                        s.readings?.join('; ') || '',
                        s.meanings.join('; '),
                        detail?.parts_of_speech?.join('; ') || '',
                        transitivity,
                        dan,
                        s.type,
                        s.level,
                        getSrsLabel(s.srs_stage)
                      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
                    });

                    const header = ['Characters', 'Readings', 'Meanings', 'Parts of Speech', 'Transitivity', 'Dan', 'Type', 'Level', 'SRS Stage'].join(',');
                    const blob = new Blob([header + '\n' + csv.join('\n')], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `wanikani-export-levels-${levelRange.min}-${levelRange.max}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export CSV
                </button>

                <button
                  onClick={() => {
                    const filtered = [...subjects.data]
                      .filter(subject => {
                        // Filter by subject type
                        if (!subjectTypes[subject.type]) return false;

                        // Filter by SRS stage
                        const srsKey = getSrsFilterKey(subject.srs_stage);
                        if (!srsFilter[srsKey]) return false;

                        // Filter by parts of speech
                        if (subjectDetails && Object.keys(posFilter).length > 0) {
                          const detail = subjectDetails.find(d => d.id === subject.id);
                          if (detail) {
                            if (!detail.parts_of_speech || detail.parts_of_speech.length === 0) {
                              if (!posFilter['(empty)']) return false;
                            } else {
                              const hasMatchingPos = detail.parts_of_speech.some(pos => posFilter[pos]);
                              if (!hasMatchingPos) return false;
                            }
                          }
                        }
                        return true;
                      })
                      .sort((a, b) => a.level - b.level);

                    const rows = [];
                    filtered.forEach(s => {
                      const detail = subjectDetails?.find(d => d.id === s.id);
                      const sentences = detail?.context_sentences || [];
                      if (sentences.length === 0) {
                        // Include row with empty sentences
                        rows.push([
                          s.characters || '',
                          s.readings?.join('; ') || '',
                          s.meanings.join('; '),
                          '',
                          ''
                        ]);
                      } else {
                        sentences.forEach(sentence => {
                          rows.push([
                            s.characters || '',
                            s.readings?.join('; ') || '',
                            s.meanings.join('; '),
                            sentence.ja || '',
                            sentence.en || ''
                          ]);
                        });
                      }
                    });

                    const csv = rows.map(row =>
                      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
                    );

                    const header = ['Characters', 'Readings', 'Meanings', 'Japanese', 'English'].join(',');
                    const blob = new Blob([header + '\n' + csv.join('\n')], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `wanikani-context-sentences-levels-${levelRange.min}-${levelRange.max}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={!subjectDetails}
                >
                  Export Context Sentences
                </button>

                <button
                  onClick={() => {
                    const filtered = [...subjects.data]
                      .filter(subject => {
                        // Filter by subject type
                        if (!subjectTypes[subject.type]) return false;

                        // Filter by SRS stage
                        const srsKey = getSrsFilterKey(subject.srs_stage);
                        if (!srsFilter[srsKey]) return false;

                        // Filter by parts of speech
                        if (subjectDetails && Object.keys(posFilter).length > 0) {
                          const detail = subjectDetails.find(d => d.id === subject.id);
                          if (detail) {
                            if (!detail.parts_of_speech || detail.parts_of_speech.length === 0) {
                              if (!posFilter['(empty)']) return false;
                            } else {
                              const hasMatchingPos = detail.parts_of_speech.some(pos => posFilter[pos]);
                              if (!hasMatchingPos) return false;
                            }
                          }
                        }
                        return true;
                      })
                      .sort((a, b) => a.level - b.level);

                    const characters = filtered
                      .map(s => s.characters || '')
                      .filter(c => c)
                      .join(', ');

                    const blob = new Blob([characters], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `wanikani-list-levels-${levelRange.min}-${levelRange.max}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export List
                </button>
              </div>
            </div>

            <div className="subjects-grid">
              {[...subjects.data]
                .filter(subject => {
                  // Filter by subject type
                  if (!subjectTypes[subject.type]) return false;

                  // Filter by SRS stage
                  const srsKey = getSrsFilterKey(subject.srs_stage);
                  if (!srsFilter[srsKey]) return false;

                  // Filter by parts of speech
                  if (subjectDetails && Object.keys(posFilter).length > 0) {
                    const detail = subjectDetails.find(d => d.id === subject.id);
                    if (detail) {
                      if (!detail.parts_of_speech || detail.parts_of_speech.length === 0) {
                        // Item has no parts of speech - check (empty) filter
                        if (!posFilter['(empty)']) return false;
                      } else {
                        const hasMatchingPos = detail.parts_of_speech.some(pos => posFilter[pos]);
                        if (!hasMatchingPos) return false;
                      }
                    }
                  }
                  return true;
                })
                .sort((a, b) => a.level - b.level)
                .map(subject => (
                  <div key={subject.id} className={`subject-card ${subject.type} ${getSrsClass(subject.srs_stage)}`}>
                    <span className="subject-level">Lv {subject.level}</span>
                    <span className="subject-char">{subject.characters}</span>
                    <span className="subject-meaning">{subject.meanings[0]}</span>
                    <span className="subject-srs">{getSrsLabel(subject.srs_stage)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
