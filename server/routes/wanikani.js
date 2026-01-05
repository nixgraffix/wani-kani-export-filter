import { Router } from 'express';
import db from '../db.js';

const router = Router();
const WANIKANI_API = 'https://api.wanikani.com/v2';

async function fetchFromWaniKani(endpoint) {
  const token = process.env.WANIKANI_API_TOKEN;
  if (!token) {
    throw new Error('WANIKANI_API_TOKEN not set in environment');
  }

  const response = await fetch(`${WANIKANI_API}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Wanikani-Revision': '20170710'
    }
  });

  if (!response.ok) {
    throw new Error(`WaniKani API error: ${response.status}`);
  }

  return response.json();
}

// Get user info
router.get('/user', async (req, res) => {
  try {
    // Check cache first (valid for 5 minutes)
    const cached = db.prepare('SELECT * FROM user WHERE id = 1').get();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    if (cached && cached.fetched_at > fiveMinutesAgo) {
      return res.json({
        source: 'cache',
        data: cached
      });
    }

    // Fetch fresh data
    const result = await fetchFromWaniKani('/user');
    const user = result.data;

    // Update cache
    db.prepare(`
      INSERT OR REPLACE INTO user (id, username, level, max_level, profile_url, fetched_at)
      VALUES (1, ?, ?, ?, ?, ?)
    `).run(
      user.username,
      user.level,
      user.subscription.max_level_granted,
      user.profile_url,
      new Date().toISOString()
    );

    res.json({
      source: 'api',
      data: {
        username: user.username,
        level: user.level,
        max_level: user.subscription.max_level_granted,
        profile_url: user.profile_url
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reviews (assignments available for review)
router.get('/reviews', async (req, res) => {
  try {
    // Check cache first (valid for 1 minute)
    const cached = db.prepare('SELECT * FROM reviews ORDER BY available_at ASC').all();
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    if (cached.length > 0 && cached[0].fetched_at > oneMinuteAgo) {
      return res.json({
        source: 'cache',
        count: cached.length,
        data: cached
      });
    }

    // Fetch assignments that are available for review
    const now = new Date().toISOString();
    const result = await fetchFromWaniKani(`/assignments?immediately_available_for_review=true`);

    // Clear old reviews and insert new ones
    db.prepare('DELETE FROM reviews').run();

    const insert = db.prepare(`
      INSERT INTO reviews (assignment_id, subject_id, subject_type, srs_stage, available_at, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const fetchedAt = new Date().toISOString();
    for (const assignment of result.data) {
      insert.run(
        assignment.id,
        assignment.data.subject_id,
        assignment.data.subject_type,
        assignment.data.srs_stage,
        assignment.data.available_at,
        fetchedAt
      );
    }

    res.json({
      source: 'api',
      count: result.data.length,
      data: result.data.map(a => ({
        assignment_id: a.id,
        subject_id: a.data.subject_id,
        subject_type: a.data.subject_type,
        srs_stage: a.data.srs_stage,
        available_at: a.data.available_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch assignments by subject IDs to get srs_stage
async function fetchAssignmentsBySubjectIds(subjectIds) {
  const assignments = new Map();

  // WaniKani API limits subject_ids to 1000 per request
  const chunks = [];
  for (let i = 0; i < subjectIds.length; i += 1000) {
    chunks.push(subjectIds.slice(i, i + 1000));
  }

  for (const chunk of chunks) {
    let nextUrl = `/assignments?subject_ids=${chunk.join(',')}`;

    while (nextUrl) {
      const result = await fetchFromWaniKani(nextUrl);

      for (const assignment of result.data) {
        assignments.set(assignment.data.subject_id, {
          srs_stage: assignment.data.srs_stage,
          unlocked_at: assignment.data.unlocked_at,
          started_at: assignment.data.started_at,
          passed_at: assignment.data.passed_at,
          burned_at: assignment.data.burned_at
        });
      }

      nextUrl = result.pages.next_url
        ? result.pages.next_url.replace(WANIKANI_API, '')
        : null;
    }
  }

  return assignments;
}

// Get subjects by level(s) and optionally filter by type(s)
// Usage: /api/subjects?levels=1,2,3&types=kanji,vocabulary
async function fetchSubjectsByLevels(levels, types = null) {
  const allSubjects = [];
  let nextUrl = `/subjects?levels=${levels.join(',')}`;
  if (types && types.length > 0) {
    nextUrl += `&types=${types.join(',')}`;
  }

  // Handle pagination - WaniKani returns max 500 per page
  while (nextUrl) {
    const result = await fetchFromWaniKani(nextUrl);

    for (const subject of result.data) {
      allSubjects.push({
        id: subject.id,
        type: subject.object,
        level: subject.data.level,
        characters: subject.data.characters || subject.data.slug,
        meanings: subject.data.meanings.map(m => m.meaning),
        readings: subject.data.readings?.map(r => r.reading) || []
      });
    }

    // Check if there's another page
    nextUrl = result.pages.next_url
      ? result.pages.next_url.replace(WANIKANI_API, '')
      : null;
  }

  return allSubjects;
}

router.get('/subjects', async (req, res) => {
  try {
    const levelsParam = req.query.levels;
    const typesParam = req.query.types;

    if (!levelsParam) {
      return res.status(400).json({ error: 'levels query parameter required (e.g., ?levels=1,2,3)' });
    }

    const levels = levelsParam.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (levels.length === 0) {
      return res.status(400).json({ error: 'Invalid levels parameter' });
    }

    const validTypes = ['radical', 'kanji', 'vocabulary', 'kana_vocabulary'];
    const types = typesParam
      ? typesParam.split(',').filter(t => validTypes.includes(t))
      : null;

    // Check cache first
    const levelPlaceholders = levels.map(() => '?').join(',');
    let query = `SELECT * FROM subjects WHERE level IN (${levelPlaceholders})`;
    let queryParams = [...levels];

    if (types && types.length > 0) {
      const typePlaceholders = types.map(() => '?').join(',');
      query += ` AND type IN (${typePlaceholders})`;
      queryParams = [...queryParams, ...types];
    }

    const cached = db.prepare(query).all(...queryParams);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    if (cached.length > 0 && cached[0].fetched_at > oneHourAgo) {
      return res.json({
        source: 'cache',
        count: cached.length,
        data: cached.map(s => ({
          ...s,
          meanings: JSON.parse(s.meanings),
          readings: JSON.parse(s.readings),
          srs_stage: s.srs_stage,
          unlocked: s.srs_stage !== null,
          started: s.srs_stage !== null && s.srs_stage > 0,
          passed: s.srs_stage !== null && s.srs_stage >= 5,
          burned: s.srs_stage === 9
        }))
      });
    }

    // Fetch fresh data
    const subjects = await fetchSubjectsByLevels(levels, types);

    // Fetch assignments for these subjects to get srs_stage
    const subjectIds = subjects.map(s => s.id);
    const assignments = await fetchAssignmentsBySubjectIds(subjectIds);

    // Merge srs_stage into subjects
    const subjectsWithSrs = subjects.map(subject => {
      const assignment = assignments.get(subject.id);
      return {
        ...subject,
        srs_stage: assignment?.srs_stage ?? null,
        unlocked: assignment?.unlocked_at != null,
        started: assignment?.started_at != null,
        passed: assignment?.passed_at != null,
        burned: assignment?.burned_at != null
      };
    });

    // Cache in database
    const insert = db.prepare(`
      INSERT OR REPLACE INTO subjects (id, type, level, characters, meanings, readings, srs_stage, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const fetchedAt = new Date().toISOString();
    for (const subject of subjectsWithSrs) {
      insert.run(
        subject.id,
        subject.type,
        subject.level,
        subject.characters,
        JSON.stringify(subject.meanings),
        JSON.stringify(subject.readings),
        subject.srs_stage,
        fetchedAt
      );
    }

    res.json({
      source: 'api',
      count: subjectsWithSrs.length,
      data: subjectsWithSrs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch without retry - throw on rate limit
async function fetchSingle(endpoint) {
  return await fetchFromWaniKani(endpoint);
}

// Fetch detailed subject info for specific IDs with SSE progress
// GET /api/subject-details/stream?ids=1,2,3&force=false
router.get('/subject-details/stream', async (req, res) => {
  const idsParam = req.query.ids;
  const force = req.query.force === 'true';

  if (!idsParam) {
    return res.status(400).json({ error: 'ids query parameter required' });
  }

  const ids = idsParam.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Check which IDs are already cached
    const placeholders = ids.map(() => '?').join(',');
    const cached = db.prepare(`SELECT id FROM subject_details WHERE id IN (${placeholders})`).all(...ids);
    const cachedIds = new Set(cached.map(r => r.id));
    const idsToFetch = force ? ids : ids.filter(id => !cachedIds.has(id));

    sendEvent({ type: 'start', total: idsToFetch.length, cached: ids.length - idsToFetch.length });

    // Fetch missing subjects from API with rate limiting
    let fetchedCount = 0;
    for (let i = 0; i < idsToFetch.length; i++) {
      const id = idsToFetch[i];
      try {
        if (i > 0) {
          await delay(200); // Increased delay to help avoid rate limits
        }
        const result = await fetchSingle(`/subjects/${id}`);
        const subject = result.data;

        const detail = {
          id: result.id,
          type: result.object,
          level: subject.level,
          characters: subject.characters || subject.slug,
          meanings: subject.meanings?.map(m => m.meaning) || [],
          readings: subject.readings?.map(r => r.reading) || [],
          component_subject_ids: subject.component_subject_ids || [],
          amalgamation_subject_ids: subject.amalgamation_subject_ids || [],
          meaning_mnemonic: subject.meaning_mnemonic || '',
          meaning_hint: subject.meaning_hint || '',
          reading_mnemonic: subject.reading_mnemonic || '',
          reading_hint: subject.reading_hint || '',
          context_sentences: subject.context_sentences || [],
          parts_of_speech: subject.parts_of_speech || []
        };

        // Cache in database
        db.prepare(`
          INSERT OR REPLACE INTO subject_details
          (id, type, level, characters, meanings, readings, component_subject_ids,
           amalgamation_subject_ids, meaning_mnemonic, meaning_hint, reading_mnemonic,
           reading_hint, context_sentences, parts_of_speech, fetched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          detail.id,
          detail.type,
          detail.level,
          detail.characters,
          JSON.stringify(detail.meanings),
          JSON.stringify(detail.readings),
          JSON.stringify(detail.component_subject_ids),
          JSON.stringify(detail.amalgamation_subject_ids),
          detail.meaning_mnemonic,
          detail.meaning_hint,
          detail.reading_mnemonic,
          detail.reading_hint,
          JSON.stringify(detail.context_sentences),
          JSON.stringify(detail.parts_of_speech),
          new Date().toISOString()
        );

        fetchedCount++;
        sendEvent({
          type: 'progress',
          current: i + 1,
          total: idsToFetch.length,
          id,
          characters: detail.characters,
          parts_of_speech: detail.parts_of_speech
        });
      } catch (err) {
        // Check for rate limit error - stop immediately
        if (err.message.includes('429')) {
          sendEvent({
            type: 'rate_limit',
            message: 'Rate limited by WaniKani API. Please wait a minute and try again.',
            fetched: fetchedCount,
            remaining: idsToFetch.length - i
          });
          res.end();
          return;
        }
        sendEvent({ type: 'error', id, message: err.message });
      }
    }

    // Send completion
    const allDetails = db.prepare(`SELECT * FROM subject_details WHERE id IN (${placeholders})`).all(...ids);
    sendEvent({
      type: 'complete',
      fetched: idsToFetch.length,
      cached: ids.length - idsToFetch.length,
      total: allDetails.length
    });
    res.end();
  } catch (error) {
    sendEvent({ type: 'error', message: error.message });
    res.end();
  }
});

// Fetch detailed subject info for specific IDs (non-streaming version)
// POST /api/subject-details with body { ids: [1,2,3], force: false }
router.post('/subject-details', async (req, res) => {
  try {
    const { ids, force = false } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required in request body' });
    }

    // Check which IDs are already cached
    const placeholders = ids.map(() => '?').join(',');
    const cached = db.prepare(`SELECT id FROM subject_details WHERE id IN (${placeholders})`).all(...ids);
    const cachedIds = new Set(cached.map(r => r.id));

    // Determine which IDs need fetching
    const idsToFetch = force ? ids : ids.filter(id => !cachedIds.has(id));

    // Fetch missing subjects from API with rate limiting
    const fetchedDetails = [];
    for (let i = 0; i < idsToFetch.length; i++) {
      const id = idsToFetch[i];
      try {
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
          await delay(150); // 150ms delay between requests
        }
        const result = await fetchWithRetry(`/subjects/${id}`);
        const subject = result.data;

        const detail = {
          id: result.id,
          type: result.object,
          level: subject.level,
          characters: subject.characters || subject.slug,
          meanings: subject.meanings?.map(m => m.meaning) || [],
          readings: subject.readings?.map(r => r.reading) || [],
          component_subject_ids: subject.component_subject_ids || [],
          amalgamation_subject_ids: subject.amalgamation_subject_ids || [],
          meaning_mnemonic: subject.meaning_mnemonic || '',
          meaning_hint: subject.meaning_hint || '',
          reading_mnemonic: subject.reading_mnemonic || '',
          reading_hint: subject.reading_hint || '',
          context_sentences: subject.context_sentences || [],
          parts_of_speech: subject.parts_of_speech || []
        };

        fetchedDetails.push(detail);

        // Cache in database
        db.prepare(`
          INSERT OR REPLACE INTO subject_details
          (id, type, level, characters, meanings, readings, component_subject_ids,
           amalgamation_subject_ids, meaning_mnemonic, meaning_hint, reading_mnemonic,
           reading_hint, context_sentences, parts_of_speech, fetched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          detail.id,
          detail.type,
          detail.level,
          detail.characters,
          JSON.stringify(detail.meanings),
          JSON.stringify(detail.readings),
          JSON.stringify(detail.component_subject_ids),
          JSON.stringify(detail.amalgamation_subject_ids),
          detail.meaning_mnemonic,
          detail.meaning_hint,
          detail.reading_mnemonic,
          detail.reading_hint,
          JSON.stringify(detail.context_sentences),
          JSON.stringify(detail.parts_of_speech),
          new Date().toISOString()
        );
      } catch (err) {
        console.error(`Failed to fetch subject ${id}:`, err.message);
      }
    }

    // Return all requested details from cache
    const allDetails = db.prepare(`SELECT * FROM subject_details WHERE id IN (${placeholders})`).all(...ids);

    res.json({
      fetched: fetchedDetails.length,
      cached: ids.length - idsToFetch.length,
      data: allDetails.map(d => ({
        ...d,
        meanings: JSON.parse(d.meanings),
        readings: JSON.parse(d.readings),
        component_subject_ids: JSON.parse(d.component_subject_ids),
        amalgamation_subject_ids: JSON.parse(d.amalgamation_subject_ids),
        context_sentences: JSON.parse(d.context_sentences),
        parts_of_speech: d.parts_of_speech ? JSON.parse(d.parts_of_speech) : []
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get cached subject details by IDs
router.get('/subject-details', async (req, res) => {
  try {
    const idsParam = req.query.ids;
    if (!idsParam) {
      return res.status(400).json({ error: 'ids query parameter required' });
    }

    const ids = idsParam.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    const placeholders = ids.map(() => '?').join(',');
    const details = db.prepare(`SELECT * FROM subject_details WHERE id IN (${placeholders})`).all(...ids);

    res.json({
      count: details.length,
      missing: ids.filter(id => !details.find(d => d.id === id)),
      data: details.map(d => ({
        ...d,
        meanings: JSON.parse(d.meanings),
        readings: JSON.parse(d.readings),
        component_subject_ids: JSON.parse(d.component_subject_ids),
        amalgamation_subject_ids: JSON.parse(d.amalgamation_subject_ids),
        context_sentences: JSON.parse(d.context_sentences),
        parts_of_speech: d.parts_of_speech ? JSON.parse(d.parts_of_speech) : []
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force sync from WaniKani API
router.post('/sync', async (req, res) => {
  try {
    // Clear cache timestamps to force refresh
    db.prepare('UPDATE user SET fetched_at = NULL').run();
    db.prepare('DELETE FROM reviews').run();
    db.prepare('UPDATE subjects SET fetched_at = NULL').run();

    res.json({ message: 'Cache cleared, next request will fetch fresh data' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
