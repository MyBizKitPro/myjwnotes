import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, BookOpen, Save, Trash2, Download, X, ChevronRight, Home, Plus, FileText, Loader2, ExternalLink, Settings, Sparkles, RefreshCw, Search, Users, Megaphone, Heart, CalendarDays, Hash, Book, Copy, Check } from 'lucide-react';

// ---------------- Storage shim ----------------
// In Claude.ai artifacts, window.storage is provided automatically. In a real
// browser deployment we back it with localStorage, keeping the same API shape
// (get returns {value} | null) so the rest of the code is untouched.
const storage = {
  get: async (key) => {
    try {
      const v = localStorage.getItem(key);
      return v != null ? { value: v } : null;
    } catch (e) { return null; }
  },
  set: async (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  },
  delete: async (key) => {
    try { localStorage.removeItem(key); return true; } catch (e) { return false; }
  },
};

// ---------------- Bible reference detection ----------------
const BIBLE_BOOKS = [
  // English
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther',
  'Job','Psalms','Psalm','Proverbs','Ecclesiastes','Song of Solomon','Song of Songs',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
  'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans',
  '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James',
  '1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
  // Tagalog (NWT)
  'Genesis','Exodo','Levitico','Mga Bilang','Deuteronomio','Josue','Mga Hukom','Ruth',
  '1 Samuel','2 Samuel','1 Hari','2 Hari','1 Cronica','2 Cronica','Esra','Nehemias','Esther',
  'Job','Mga Awit','Awit','Mga Kawikaan','Eclesiastes','Awit ni Solomon',
  'Isaias','Jeremias','Mga Panaghoy','Ezekiel','Daniel',
  'Hoseas','Joel','Amos','Obadias','Jonas','Mikas','Nahum','Habakuk','Zefanias','Hagai','Zacarias','Malakias',
  'Mateo','Marcos','Lucas','Juan','Mga Gawa',
  'Mga Taga-Roma','1 Mga Taga-Corinto','2 Mga Taga-Corinto',
  'Mga Taga-Galacia','Mga Taga-Efeso','Mga Taga-Filipos','Mga Taga-Colosas',
  '1 Mga Taga-Tesalonica','2 Mga Taga-Tesalonica',
  '1 Timoteo','2 Timoteo','Tito','Filemon','Mga Hebreo','Santiago',
  '1 Pedro','2 Pedro','1 Juan','2 Juan','3 Juan','Judas','Pahayag','Apocalipsis',
];

const bookPattern = BIBLE_BOOKS
  .sort((a, b) => b.length - a.length)
  .map(b => b.replace(/\s/g, '\\s+'))
  .join('|');
const REFERENCE_REGEX = new RegExp(`\\b(${bookPattern})\\s+(\\d+):(\\d+)(?:[-–](\\d+))?\\b`, 'gi');

const VERSIONS = [
  { id: 'kjv', name: 'King James Version', short: 'KJV', supportsLookup: true },
  { id: 'asv', name: 'American Standard Version', short: 'ASV', supportsLookup: true },
  { id: 'web', name: 'World English Bible', short: 'WEB', supportsLookup: true },
  { id: 'nwt', name: 'New World Translation', short: 'NWT', supportsLookup: false },
];

// ---------------- UI translations ----------------
const I18N = {
  en: {
    subtitle: 'study notes & scripture',
    new: 'New',
    export: 'Export',
    record: 'Record',
    recordNew: 'Record new',
    stop: 'Stop',
    listening: 'Listening…',
    tapToRecord: 'Tap to record',
    recordingHint: 'Speech is transcribed into your notes',
    recordingIdleHint: 'Live transcription appends below',
    notes: 'Notes',
    bullet: 'Bullet',
    notesPlaceholder: 'Write freely, or hit record. Try a reference like John 3:16 — it will be detected below.',
    titlePlaceholder: 'Untitled study',
    untitled: 'Untitled study',
    newSession: 'New session',
    saving: 'saving…',
    saved: '✓ saved',
    scripture: 'Scripture',
    reflection: 'Reflection',
    distillSummary: 'Distill this study into a summary',
    generating: 'Reading and reflecting…',
    summaryFailed: 'Could not generate summary. Try again in a moment.',
    tryAgain: 'Try again',
    aiSummary: 'AI summary',
    notesUpdatedBadge: 'notes updated',
    keyThemes: 'Key themes',
    scriptureInsights: 'Scripture insights',
    apply: 'Apply',
    reflect: 'Reflect',
    library: 'Library',
    tabAll: 'All',
    tabTags: 'Series',
    tabReview: 'Review',
    searchPlaceholder: 'Search topics, words, or scriptures…',
    smartSearchHint: 'Smart search — finds related concepts, not just exact words.',
    noSavedSessions: 'No saved sessions yet. Start typing or recording — they save automatically.',
    noMatchesFor: 'No matches for',
    tryRelated: 'Try a related word, a scripture (e.g. John 3:16), or a theme.',
    pickTemplate: 'Start a new session',
    pickTemplateSubtitle: 'Pick a template — voice fills in the rest',
    bibleVersion: 'Bible version',
    language: 'Language',
    versePublic: 'Verse text shown inline',
    verseNwt: 'Reference saved · opens in JW Library',
    nwtCopyrightNote: "is copyrighted, so verse text isn't shown here. Open it on jw.org:",
    openInJw: 'Open in JW Library / jw.org',
    addTagsPlaceholder: 'Add tags (e.g. Watchtower, prayer, hope)',
    addTagShort: 'add tag…',
    deleteConfirm: 'Delete this session?',
    summarizeSeries: 'Summarize this series',
    summarizeMonth: 'Summarize this month',
    seriesGenerating: 'Reading across sessions…',
    seriesOverarching: 'Overarching theme',
    seriesScriptures: 'Most discussed scriptures',
    seriesApplications: 'Recurring applications',
    seriesQuestions: 'Open questions',
    backTo: 'Back',
    noTagsYet: 'No tags yet. Add tags to your sessions to group them into a series.',
    sessionsLabel: 'sessions',
    pickMonth: 'Pick a month',
    thisMonth: 'This month',
    nothingThisMonth: 'No sessions this month.',
    seriesTitle: (tag) => `#${tag}`,
    seriesSubtitle: (n) => `${n} session${n === 1 ? '' : 's'}`,
    monthSubtitle: (n) => `${n} session${n === 1 ? '' : 's'} this month`,
    noContentToSummarize: 'Add notes to a few sessions first, then come back here.',
  },
  tl: {
    subtitle: 'mga tala sa pag-aaral',
    new: 'Bago',
    export: 'I-export',
    record: 'Mag-record',
    recordNew: 'Bagong record',
    stop: 'Itigil',
    listening: 'Nakikinig…',
    tapToRecord: 'Pindutin para mag-record',
    recordingHint: 'Ang sinasabi ay isinusulat sa iyong mga tala',
    recordingIdleHint: 'Idinadagdag ang transkripsiyon sa ibaba',
    notes: 'Mga Tala',
    bullet: 'Tuldok',
    notesPlaceholder: 'Magsulat o pindutin ang record. Subukang isulat ang Juan 3:16 — makikita ito sa baba.',
    titlePlaceholder: 'Walang pamagat na pag-aaral',
    untitled: 'Walang pamagat',
    newSession: 'Bagong sesyon',
    saving: 'sine-save…',
    saved: '✓ na-save',
    scripture: 'Kasulatan',
    reflection: 'Pagninilay',
    distillSummary: 'Gumawa ng buod ng pag-aaral',
    generating: 'Nagbabasa at nagninilay…',
    summaryFailed: 'Hindi nagawa ang buod. Subukan ulit.',
    tryAgain: 'Subukan ulit',
    aiSummary: 'Buod ng AI',
    notesUpdatedBadge: 'na-update ang tala',
    keyThemes: 'Pangunahing Tema',
    scriptureInsights: 'Aral mula sa Kasulatan',
    apply: 'Ikapit',
    reflect: 'Pagnilayan',
    library: 'Aklatan',
    tabAll: 'Lahat',
    tabTags: 'Serye',
    tabReview: 'Pagsusuri',
    searchPlaceholder: 'Maghanap ng paksa, salita, o kasulatan…',
    smartSearchHint: 'Matalinong paghahanap — nakakahanap ng kaugnay na konsepto.',
    noSavedSessions: 'Wala pang naka-save na sesyon. Magsulat o mag-record — awtomatikong nase-save.',
    noMatchesFor: 'Walang nahanap para sa',
    tryRelated: 'Subukan ang kaugnay na salita, kasulatan (hal. Juan 3:16), o tema.',
    pickTemplate: 'Magsimula ng bagong sesyon',
    pickTemplateSubtitle: 'Pumili ng template — pupunan ng boses ang iba',
    bibleVersion: 'Bersyon ng Bibliya',
    language: 'Wika',
    versePublic: 'Ipinapakita ang teksto ng talata',
    verseNwt: 'Na-save ang reperensiya · bubuksan sa JW Library',
    nwtCopyrightNote: 'ay protektado ng karapatang-ari, kaya hindi ipinapakita ang teksto. Buksan sa jw.org:',
    openInJw: 'Buksan sa JW Library / jw.org',
    addTagsPlaceholder: 'Magdagdag ng tag (hal. Bantayan, panalangin, pag-asa)',
    addTagShort: 'tag…',
    deleteConfirm: 'Burahin ang sesyong ito?',
    summarizeSeries: 'Buurin ang seryeng ito',
    summarizeMonth: 'Buurin ang buwan',
    seriesGenerating: 'Binabasa ang lahat ng sesyon…',
    seriesOverarching: 'Pangkalahatang tema',
    seriesScriptures: 'Pinakamadalas na kasulatan',
    seriesApplications: 'Paulit-ulit na aplikasyon',
    seriesQuestions: 'Bukas na mga tanong',
    backTo: 'Bumalik',
    noTagsYet: 'Walang tag pa. Magdagdag ng tag sa mga sesyon para mabuo ang serye.',
    sessionsLabel: 'mga sesyon',
    pickMonth: 'Pumili ng buwan',
    thisMonth: 'Buwang ito',
    nothingThisMonth: 'Walang sesyon sa buwang ito.',
    seriesTitle: (tag) => `#${tag}`,
    seriesSubtitle: (n) => `${n} sesyon`,
    monthSubtitle: (n) => `${n} sesyon ngayong buwan`,
    noContentToSummarize: 'Maglagay muna ng mga tala sa ilang sesyon, pagkatapos bumalik dito.',
  },
};

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'tl', name: 'Tagalog (Filipino)' },
];

// Speech recognition language codes
const SPEECH_LANG = { en: 'en-US', tl: 'fil-PH' };
// Transcription language hint, ISO-639-1 (not BCP-47 like SPEECH_LANG).
// Empty string means "let the model auto-detect", which is deliberately what
// Tagalog gets: study notes are typically Taglish, and pinning the language to
// `tl` makes the model mangle the English scripture terms mixed into the
// sentences. Set this to 'tl' if you dictate in pure Tagalog.
const TRANSCRIBE_LANG = { en: 'en', tl: '' };

// ---------------- Microphone capability detection ----------------
// The Web Speech API is not a microphone API — it is a vendor speech *service*,
// and it fails in places where mic permission is perfectly fine:
//   • Brave ships SpeechRecognition but removed the Google backend behind it
//   • Firefox has it disabled by default
//   • iOS Safari needs Settings ▸ General ▸ Keyboard ▸ Enable Dictation ON
//   • iOS home-screen (standalone) PWAs are unreliable across iOS versions
// So we detect what we can up front, and fall back to recording audio and
// transcribing it server-side whenever the live path refuses to work.
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const detectEnv = () => {
  const hasWin = typeof window !== 'undefined';
  const isIOS =
    /iPad|iPhone|iPod/.test(UA) ||
    (/Macintosh/.test(UA) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
  let isStandalone = false;
  if (hasWin) {
    try {
      isStandalone =
        window.matchMedia?.('(display-mode: standalone)').matches === true ||
        window.navigator.standalone === true;
    } catch (e) { /* matchMedia unavailable */ }
  }
  const isBrave = typeof navigator !== 'undefined' && !!navigator.brave;
  const isFirefox = /Firefox\//.test(UA);
  const isChromium = /Chrome\/|CriOS\//.test(UA) && !isBrave;
  return {
    isIOS,
    isStandalone,
    isBrave,
    isFirefox,
    isChromium,
    hasSR: hasWin && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    hasMediaRecorder: hasWin && typeof window.MediaRecorder !== 'undefined',
    hasGetUserMedia: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    isSecure: hasWin ? window.isSecureContext !== false : true,
  };
};
const ENV = detectEnv();

// Browsers that expose SpeechRecognition but cannot actually service it.
const LIVE_SPEECH_USABLE = ENV.hasSR && !ENV.isBrave && !ENV.isFirefox;

// Preferred recorder container, in order. iOS Safari only offers mp4.
const pickRecorderMime = () => {
  if (typeof window === 'undefined' || !window.MediaRecorder) return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const c of candidates) {
    try { if (window.MediaRecorder.isTypeSupported(c)) return c; } catch (e) { /* older impl */ }
  }
  return '';
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const s = String(reader.result || '');
    const comma = s.indexOf(',');
    resolve(comma >= 0 ? s.slice(comma + 1) : '');
  };
  reader.onerror = () => reject(new Error('Could not read the recorded audio'));
  reader.readAsDataURL(blob);
});

// ---------------- Pending audio queue (IndexedDB) ----------------
// Kingdom halls have poor reception, so a recorded segment must survive a
// failed upload. Audio blobs are far too big for localStorage, and holding
// them in memory would lose them on reload — so unsent segments go to
// IndexedDB and are retried when the network comes back.
const AUDIO_DB = 'myjwnotes-audio';
const AUDIO_STORE = 'pending';

const openAudioDB = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { reject(new Error('No IndexedDB')); return; }
  const req = indexedDB.open(AUDIO_DB, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(AUDIO_STORE)) {
      db.createObjectStore(AUDIO_STORE, { keyPath: 'id', autoIncrement: true });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error || new Error('Could not open audio store'));
});

const audioTx = async (mode, run) => {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, mode);
    const store = tx.objectStore(AUDIO_STORE);
    let result;
    try { result = run(store); } catch (e) { reject(e); return; }
    tx.oncomplete = () => resolve(result?.result !== undefined ? result.result : result);
    tx.onerror = () => reject(tx.error);
  });
};

const queueSegment = (record) => audioTx('readwrite', (s) => s.add(record));
const listSegments = () => audioTx('readonly', (s) => s.getAll());
const dropSegment = (id) => audioTx('readwrite', (s) => s.delete(id));

// Length of each recorded chunk in fallback mode. Short enough that text lands
// in the notes while you are still studying, and that no upload nears 25MB.
const SEGMENT_MS = 45000;
// jw.org locale code
const JW_LOCALE = { en: 'E', tl: 'T' };

// ---------------- Meeting templates ----------------
// Each template has English + Tagalog variants. The chosen language at "New
// session" time decides which variant fills the title, body, and tags.
const TEMPLATES = [
  {
    id: 'blank',
    Icon: FileText,
    en: { name: 'Blank page', description: 'Start fresh with no structure', titlePrefix: '', tags: [], body: '' },
    tl: { name: 'Blangkong pahina', description: 'Magsimula nang walang istruktura', titlePrefix: '', tags: [], body: '' },
  },
  {
    id: 'watchtower',
    Icon: BookOpen,
    en: {
      name: 'Watchtower Study',
      description: 'Sunday article — Q&A by paragraph',
      titlePrefix: 'Watchtower Study — ',
      tags: ['Watchtower', 'Weekend Meeting'],
      body: `Article title:

Theme scripture:


HIGHLIGHTS BY PARAGRAPH

¶1-2:

¶3-5:

¶6-9:

¶10-13:

¶14-17:

¶18-end:


STANDOUT POINTS
-

PERSONAL APPLICATION
-
`,
    },
    tl: {
      name: 'Pag-aaral sa Bantayan',
      description: 'Artikulo sa Linggo — sagutan kada parapo',
      titlePrefix: 'Pag-aaral sa Bantayan — ',
      tags: ['Bantayan', 'Pulong sa Linggo'],
      body: `Pamagat ng artikulo:

Talatang tema:


MGA TAMPOK NG BAWAT PARAPO

¶1-2:

¶3-5:

¶6-9:

¶10-13:

¶14-17:

¶18-katapusan:


MAHAHALAGANG PUNTO
-

PERSONAL NA APLIKASYON
-
`,
    },
  },
  {
    id: 'midweek',
    Icon: Users,
    en: {
      name: 'Midweek Meeting',
      description: 'Our Christian Life and Ministry — full structure',
      titlePrefix: 'Midweek Meeting — ',
      tags: ['Midweek', 'CLAM'],
      body: `Bible reading this week:


TREASURES FROM GOD'S WORD

Opening talk (10 min):

Spiritual gems (10 min):
-
-

Bible reading (4 min):


APPLY YOURSELF TO THE FIELD MINISTRY

Counsel / training point:

Student parts:
-
-
-


LIVING AS CHRISTIANS

Talk(s):

Congregation Bible Study (chapter ___):
-
-
`,
    },
    tl: {
      name: 'Pulong sa Gitna ng Linggo',
      description: 'Buhay at Ministeryong Kristiyano — kompletong istruktura',
      titlePrefix: 'Pulong sa Gitna ng Linggo — ',
      tags: ['Pulong sa Gitna', 'Buhay at Ministeryo'],
      body: `Pagbabasa ng Bibliya ngayong linggo:


MGA KAYAMANAN MULA SA SALITA NG DIYOS

Pambungad na pahayag (10 min):

Mga espirituwal na hiyas (10 min):
-
-

Pagbabasa ng Bibliya (4 min):


MAGING MAS MAHUSAY SA MINISTERYO

Payo / pagsasanay:

Mga bahagi ng estudyante:
-
-
-


MAMUHAY BILANG MGA KRISTIYANO

Pahayag:

Pag-aaral sa Bibliya ng Kongregasyon (kabanata ___):
-
-
`,
    },
  },
  {
    id: 'public-talk',
    Icon: Megaphone,
    en: {
      name: 'Public Talk',
      description: 'Sunday discourse from a visiting or local speaker',
      titlePrefix: 'Public Talk — ',
      tags: ['Public Talk', 'Weekend Meeting'],
      body: `Title:

Speaker / Congregation:

Theme scripture:


MAIN POINTS
-
-
-

STANDOUT SCRIPTURES
-

PERSONAL TAKEAWAY
`,
    },
    tl: {
      name: 'Pampublikong Pahayag',
      description: 'Pahayag ng bisita o lokal na tagapagsalita sa Linggo',
      titlePrefix: 'Pampublikong Pahayag — ',
      tags: ['Pampublikong Pahayag', 'Pulong sa Linggo'],
      body: `Pamagat:

Tagapagsalita / Kongregasyon:

Talatang tema:


PANGUNAHING MGA PUNTO
-
-
-

NAKAKAGISING NA MGA KASULATAN
-

PERSONAL NA NATUTUHAN
`,
    },
  },
  {
    id: 'personal-study',
    Icon: Book,
    en: {
      name: 'Personal Study',
      description: 'Self-directed research on a topic',
      titlePrefix: 'Personal Study — ',
      tags: ['Personal Study'],
      body: `Topic:


SCRIPTURES CONSULTED
-

KEY INSIGHTS
-

QUESTIONS TO EXPLORE FURTHER
-
`,
    },
    tl: {
      name: 'Personal na Pag-aaral',
      description: 'Sariling pananaliksik sa isang paksa',
      titlePrefix: 'Personal na Pag-aaral — ',
      tags: ['Personal na Pag-aaral'],
      body: `Paksa:


MGA KASULATANG SINURI
-

MGA KAALAMAN
-

MGA TANONG NA SASALIKSIKIN PA
-
`,
    },
  },
  {
    id: 'memorial',
    Icon: Heart,
    en: {
      name: 'Memorial',
      description: "Lord's Evening Meal observance",
      titlePrefix: 'Memorial — ',
      tags: ['Memorial'],
      body: `Speaker:

Theme scripture:


DISCOURSE OUTLINE
-
-
-

KEY SCRIPTURES
-

REFLECTIONS
`,
    },
    tl: {
      name: 'Memoryal',
      description: 'Pagdiriwang ng Hapunan ng Panginoon',
      titlePrefix: 'Memoryal — ',
      tags: ['Memoryal'],
      body: `Tagapagsalita:

Talatang tema:


BALANGKAS NG PAHAYAG
-
-
-

MAHAHALAGANG KASULATAN
-

PAGNINILAY
`,
    },
  },
  {
    id: 'convention',
    Icon: CalendarDays,
    en: {
      name: 'Convention / Assembly',
      description: 'Multi-talk session notes',
      titlePrefix: 'Convention — ',
      tags: ['Convention'],
      body: `Theme:

Session / Day:


TALK 1
Title:
Speaker:
Highlights:
-

TALK 2
Title:
Speaker:
Highlights:
-

DRAMA / SYMPOSIUM
Title:
Highlights:
-


STANDOUT SCRIPTURES
-

PERSONAL APPLICATION
`,
    },
    tl: {
      name: 'Asamblea / Kombensiyon',
      description: 'Tala para sa maraming pahayag',
      titlePrefix: 'Asamblea — ',
      tags: ['Asamblea'],
      body: `Tema:

Sesyon / Araw:


PAHAYAG 1
Pamagat:
Tagapagsalita:
Tampok:
-

PAHAYAG 2
Pamagat:
Tagapagsalita:
Tampok:
-

DULA / SIMPOSIYUM
Pamagat:
Tampok:
-


NAKAKAGISING NA MGA KASULATAN
-

PERSONAL NA APLIKASYON
`,
    },
  },
];

const STORAGE_KEY = 'bible-study-sessions-v1';
const PREF_KEY = 'bible-study-prefs-v3';

// ---------------- Helper functions ----------------
function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function detectReferences(text) {
  const found = new Map();
  let m;
  REFERENCE_REGEX.lastIndex = 0;
  while ((m = REFERENCE_REGEX.exec(text)) !== null) {
    const book = m[1].replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const ch = m[2];
    const v1 = m[3];
    const v2 = m[4];
    const ref = `${book} ${ch}:${v1}${v2 ? `-${v2}` : ''}`;
    if (!found.has(ref)) found.set(ref, { book, chapter: ch, verse: v1, verseEnd: v2, ref });
  }
  return Array.from(found.values());
}

async function fetchVerse(ref, versionId) {
  const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${versionId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('lookup failed');
  return res.json();
}

function jwLinkFor(refObj, lang = 'en') {
  // Map English + Tagalog book names → standard book number
  const bookMap = {
    // English
    'Genesis':1,'Exodus':2,'Leviticus':3,'Numbers':4,'Deuteronomy':5,'Joshua':6,'Judges':7,'Ruth':8,
    '1 Samuel':9,'2 Samuel':10,'1 Kings':11,'2 Kings':12,'1 Chronicles':13,'2 Chronicles':14,
    'Ezra':15,'Nehemiah':16,'Esther':17,'Job':18,'Psalms':19,'Psalm':19,'Proverbs':20,'Ecclesiastes':21,
    'Song of Solomon':22,'Song of Songs':22,'Isaiah':23,'Jeremiah':24,'Lamentations':25,'Ezekiel':26,'Daniel':27,
    'Hosea':28,'Joel':29,'Amos':30,'Obadiah':31,'Jonah':32,'Micah':33,'Nahum':34,'Habakkuk':35,
    'Zephaniah':36,'Haggai':37,'Zechariah':38,'Malachi':39,
    'Matthew':40,'Mark':41,'Luke':42,'John':43,'Acts':44,'Romans':45,
    '1 Corinthians':46,'2 Corinthians':47,'Galatians':48,'Ephesians':49,'Philippians':50,'Colossians':51,
    '1 Thessalonians':52,'2 Thessalonians':53,'1 Timothy':54,'2 Timothy':55,'Titus':56,'Philemon':57,
    'Hebrews':58,'James':59,'1 Peter':60,'2 Peter':61,'1 John':62,'2 John':63,'3 John':64,'Jude':65,'Revelation':66,
    // Tagalog (NWT book names)
    'Exodo':2,'Levitico':3,'Mga Bilang':4,'Deuteronomio':5,'Josue':6,'Mga Hukom':7,
    '1 Hari':11,'2 Hari':12,'1 Cronica':13,'2 Cronica':14,'Esra':15,'Nehemias':16,
    'Mga Awit':19,'Awit':19,'Mga Kawikaan':20,'Eclesiastes':21,'Awit ni Solomon':22,
    'Isaias':23,'Jeremias':24,'Mga Panaghoy':25,
    'Hoseas':28,'Obadias':31,'Jonas':32,'Mikas':33,'Habakuk':35,'Zefanias':36,'Hagai':37,'Zacarias':38,'Malakias':39,
    'Mateo':40,'Marcos':41,'Lucas':42,'Juan':43,'Mga Gawa':44,'Mga Taga-Roma':45,
    '1 Mga Taga-Corinto':46,'2 Mga Taga-Corinto':47,'Mga Taga-Galacia':48,'Mga Taga-Efeso':49,
    'Mga Taga-Filipos':50,'Mga Taga-Colosas':51,
    '1 Mga Taga-Tesalonica':52,'2 Mga Taga-Tesalonica':53,
    '1 Timoteo':54,'2 Timoteo':55,'Tito':56,'Filemon':57,'Mga Hebreo':58,'Santiago':59,
    '1 Pedro':60,'2 Pedro':61,'Judas':65,'Pahayag':66,'Apocalipsis':66,
  };
  const bookNum = bookMap[refObj.book];
  const wtlocale = JW_LOCALE[lang] || 'E';
  if (!bookNum) {
    return lang === 'tl'
      ? 'https://www.jw.org/tl/aklatan/bibliya/'
      : 'https://www.jw.org/en/library/bible/';
  }
  const ch = String(refObj.chapter).padStart(3, '0');
  const v = String(refObj.verse).padStart(3, '0');
  const vEnd = refObj.verseEnd ? String(refObj.verseEnd).padStart(3, '0') : v;
  const b = String(bookNum).padStart(2, '0');
  // The "finder" endpoint is language-aware via wtlocale and routes to NWT in
  // the user's preferred language.
  return `https://www.jw.org/finder?wtlocale=${wtlocale}&pub=nwtsty&bible=${b}${ch}${v}-${b}${ch}${vEnd}`;
}

// ---------------- Smart search (JW/Bible-aware, EN + TL) ----------------
// Each group is a set of interchangeable terms. Searching any one of them
// pulls in matches for any of the others. Tuned for JW vocabulary, with
// Tagalog terms added to the most common groups so search works in either
// language.
const SYNONYM_GROUPS = [
  // Divine names
  ['jehovah', 'god', 'yahweh', 'father', 'almighty', 'creator', 'most high', 'sovereign lord', 'lord god', 'jehova', 'diyos', 'ama', 'maylalang', 'panginoong diyos', 'kataas-taasan'],
  ['jesus', 'christ', 'son of god', 'messiah', 'master', 'king jesus', 'kristo', 'hesus', 'hesukristo', 'anak ng diyos', 'mesiyas', 'panginoong jesus'],
  ['holy spirit', 'active force', "god's spirit", 'spirit of god', 'banal na espiritu', 'aktibong puwersa', 'espiritu ng diyos'],
  ['satan', 'devil', 'opposer', 'serpent', 'adversary', 'tempter', 'satanas', 'diyablo', 'manunukso', 'ahas'],
  ['demons', 'wicked spirits', 'fallen angels', 'unclean spirits', 'mga demonyo', 'masasamang espiritu'],
  ['angels', 'spirit creatures', 'heavenly messengers', 'mga anghel', 'mga espiritung nilalang'],

  // Last days / kingdom
  ['armageddon', 'great tribulation', 'last days', 'end of system', 'judgment day', "god's war", 'final war', 'time of the end', 'armagedon', 'malaking kapighatian', 'mga huling araw', 'wakas ng sistema', 'araw ng paghuhukom', 'digmaan ng diyos', 'panahon ng wakas'],
  ['parousia', 'presence of christ', "christ's presence", 'second coming', 'pagkanaririto ni kristo'],
  ['paradise', 'new world', 'restored earth', 'earthly hope', 'paradise earth', 'paraiso', 'bagong sanlibutan', 'lupang paraiso', 'pag-asa sa lupa'],
  ['kingdom', "god's government", 'heavenly government', 'thousand year reign', 'millennium', 'messianic kingdom', 'kaharian', 'pamahalaan ng diyos', 'sanlibong taong paghahari'],
  ['1914', 'last days began', "kingdom established"],

  // Hope / resurrection
  ['resurrection', 'rising from dead', 'awakening', 'memorial tomb', 'come back to life', 'raised', 'pagkabuhay-muli', 'muling pagkabuhay', 'paggising'],
  ['hope', 'expectation', 'confidence', 'anticipation', 'pag-asa', 'inaasahan'],
  ['anointed', '144000', 'heavenly hope', 'spiritual israel', 'little flock', 'pinahiran', 'pag-asa sa langit'],
  ['great crowd', 'other sheep', 'earthly hope', 'earthly class', 'malaking pulutong', 'ibang tupa'],

  // Death / soul
  ['death', 'die', 'sleep in death', 'unconscious', 'dying', 'kamatayan', 'mamatay', 'natutulog sa kamatayan'],
  ['soul', 'breathing creature', 'living being', 'person', 'kaluluwa', 'humihingang nilalang'],
  ['hell', 'hades', 'sheol', 'common grave', "mankind's grave", 'libingan', 'libingang karaniwan'],

  // Virtues
  ['love', 'agape', 'brotherly love', 'principled love', 'charity', 'affection', 'fondness', 'pag-ibig', 'pagmamahal', 'pagmamahal sa kapatid'],
  ['faith', 'belief', 'trust', 'conviction', 'believing', 'pananampalataya', 'pananalig', 'paniniwala'],
  ['endurance', 'perseverance', 'patience', 'patient endurance', 'persevere', 'pagbabata', 'pagtitiyaga', 'pagtitiis'],
  ['humility', 'humble', 'lowly', 'modest', 'meekness', 'kapakumbabaan', 'mapagpakumbaba', 'kahinhinan'],
  ['kindness', 'kind', 'compassion', 'compassionate', 'kabaitan', 'mabait', 'malasakit'],
  ['joy', 'happiness', 'gladness', 'rejoice', 'happy', 'kagalakan', 'kaligayahan', 'masaya'],
  ['peace', 'peaceful', 'tranquility', 'kapayapaan', 'mapayapa'],
  ['wisdom', 'understanding', 'discernment', 'insight', 'knowledge', 'karunungan', 'pang-unawa', 'kaalaman'],
  ['self control', 'self-control', 'self mastery', 'restraint', 'pagpipigil sa sarili'],
  ['mildness', 'gentleness', 'gentle', 'kahinahunan', 'kaamuan'],
  ['righteousness', 'righteous', 'upright', 'just', 'katuwiran', 'matuwid', 'pagkamatuwid'],

  // Sin / forgiveness
  ['sin', 'transgression', 'wrongdoing', 'iniquity', 'missing the mark', 'sinful', 'kasalanan', 'pagkakasala', 'paglabag'],
  ['repent', 'repentance', 'turn around', 'change of mind', 'change ways', 'pagsisisi', 'magsisi', 'magbago'],
  ['forgive', 'forgiveness', 'pardon', 'mercy', 'merciful', 'magpatawad', 'kapatawaran', 'awa', 'maawain'],
  ['ransom', 'sacrifice of christ', 'corresponding ransom', 'redemption', 'pantubos', 'haing pantubos', 'tubos'],

  // Bible / scripture
  ['bible', 'scripture', 'word of god', "god's word", 'holy writings', 'inspired writings', 'bibliya', 'kasulatan', 'salita ng diyos', 'banal na kasulatan'],
  ['old testament', 'hebrew scriptures', 'hebrew aramaic scriptures', 'mga kasulatang hebreo'],
  ['new testament', 'greek scriptures', 'christian greek scriptures', 'mga kasulatang griego'],
  ['prophecy', 'prediction', 'foretelling', 'prophetic', 'prophesy', 'hula', 'propesiya'],

  // Worship
  ['prayer', 'pray', 'praying', 'supplication', 'petition', 'panalangin', 'dasal', 'manalangin', 'pagdarasal', 'pagsamo'],
  ['worship', 'sacred service', 'devotion', 'worshiping', 'pagsamba', 'banal na paglilingkod', 'pagdebosyon'],
  ['meditation', 'meditate', 'reflection', 'pondering', 'contemplation', 'pagbubulay', 'pagninilay', 'magnilay'],
  ['study', 'examine', 'investigate', 'research', 'consideration', 'pag-aaral', 'mag-aral', 'magsuri'],

  // Ministry / service
  ['preach', 'preaching', 'witness', 'witnessing', 'ministry', 'public ministry', 'door to door', 'door-to-door', 'field service', 'evangelism', 'making disciples', 'public witnessing', 'mangaral', 'pangangaral', 'magpatotoo', 'pagpapatotoo', 'ministeryo', 'paglilingkod sa larangan', 'bahay-bahay'],
  ['pioneer', 'regular pioneer', 'auxiliary pioneer', 'special pioneer', 'full time service', 'payunir', 'regular na payunir', 'panrelyebong payunir'],
  ['baptism', 'baptize', 'baptized', 'dedication', 'dedicated', 'getting baptized', 'bautismo', 'binautismuhan', 'pag-aalay', 'naialay'],

  // Congregation life
  ['congregation', 'kingdom hall', 'meeting place', 'place of worship', 'kongregasyon', 'kongregasiyon', 'kingdom hall', 'sambahayan'],
  ['elder', 'overseer', 'shepherd', 'spiritual shepherd', 'body of elders', 'matatanda', 'tagapangasiwa', 'pastol'],
  ['ministerial servant', 'assistant', 'ministeryal na lingkod'],
  ['governing body', 'gb', 'faithful slave', 'faithful and discreet slave', 'lupong tagapamahala', 'tapat at maingat na alipin'],
  ['brother', 'fellow believer', 'fellow christian', 'spiritual brother', 'kapatid na lalaki', 'kapatid'],
  ['sister', 'fellow believer', 'kapatid na babae'],
  ['meeting', 'congregation meeting', 'midweek meeting', 'weekend meeting', 'christian meeting', 'pulong', 'pagpupulong'],
  ['watchtower', 'wt', 'study article', 'study edition', 'bantayan'],
  ['memorial', "lord's evening meal", "lord's supper", 'observance', 'memoryal', 'hapunan ng panginoon'],
  ['assembly', 'circuit assembly', 'regional convention', 'convention', 'special assembly day', 'asamblea', 'kombensiyon', 'panrehiyong kombensiyon'],

  // Family / morals
  ['family', 'household', 'family worship', 'pamilya', 'sambahayan', 'pamilyang pagsamba'],
  ['marriage', 'married', 'spouse', 'husband and wife', 'matrimony', 'wedding', 'kasal', 'pag-aasawa', 'mag-asawa'],
  ['children', 'young ones', 'youth', 'youths', 'kids', 'young people', 'mga bata', 'kabataan', 'mga kabataan'],
  ['parents', 'father and mother', 'mom and dad', 'mother and father', 'mga magulang', 'tatay at nanay'],
  ['morality', 'morals', 'moral standards', 'godly standards', 'moralidad', 'pamantayang moral'],
  ['fornication', 'sexual immorality', 'porneia', 'pakikiapid', 'imoralidad'],

  // World / separation
  ['world', 'system of things', 'this system', 'present system', 'wicked world', "satan's world", 'sanlibutan', 'masamang sanlibutan', 'sistemang ito'],
  ['neutrality', 'no part of world', 'separated', 'not of world', 'pagiging neutral', 'hindi bahagi ng sanlibutan'],

  // False teaching / Babylon
  ['apostasy', 'apostate', 'falling away', 'false teaching', 'heresy', 'apostasiya', 'pagtalikod sa pananampalataya'],
  ['false religion', 'babylon the great', 'great babylon', 'world empire of false religion', 'huwad na relihiyon', 'babilonyang dakila'],
  ['disfellowship', 'disfellowshipping', 'expelled', 'expulsion', 'removed', 'pagtitiwalag', 'naitiwalag'],

  // Common topics
  ['health', 'sickness', 'illness', 'healing', 'sick', 'kalusugan', 'sakit', 'pagpapagaling'],
  ['suffering', 'trials', 'hardship', 'tribulation', 'persecution', 'pagdurusa', 'pagsubok', 'paghihirap', 'pag-uusig'],
  ['comfort', 'comforted', 'consolation', 'encouraged', 'aliw', 'kaaliwan', 'pampatatag'],
  ['integrity', 'loyal', 'loyalty', 'faithful', 'katapatan', 'tapat'],
  ['blood', 'blood transfusion', 'abstain from blood', 'dugo', 'pagsasalin ng dugo'],
];

// Build a fast lookup: term → list of related terms
const SYNONYM_INDEX = (() => {
  const idx = new Map();
  for (const group of SYNONYM_GROUPS) {
    for (const term of group) {
      const key = term.toLowerCase();
      if (!idx.has(key)) idx.set(key, new Set());
      group.forEach(t => idx.get(key).add(t.toLowerCase()));
    }
  }
  return idx;
})();

function trigrams(text) {
  const padded = `  ${text.toLowerCase().replace(/[^a-z0-9 ]/g, '')}  `;
  const tris = new Set();
  for (let i = 0; i < padded.length - 2; i++) tris.add(padded.slice(i, i + 3));
  return tris;
}

function trigramSimilarity(a, b) {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach(t => { if (tb.has(t)) common++; });
  return common / Math.max(ta.size, tb.size);
}

// Find all terms related to the query (synonym expansion + fuzzy fallback)
function expandQuery(query) {
  const result = new Set();
  const qLower = query.toLowerCase().trim();
  if (!qLower) return result;
  result.add(qLower);

  // tokenize
  const words = qLower.split(/\s+/).filter(w => w.length > 1);
  words.forEach(w => result.add(w));

  // Find groups overlapping with query
  for (const group of SYNONYM_GROUPS) {
    let matches = false;
    for (const term of group) {
      if (qLower.includes(term) || term.includes(qLower)) { matches = true; break; }
      for (const w of words) {
        if (term === w) { matches = true; break; }
        if (w.length >= 4 && term.length >= 4 && (term.includes(w) || trigramSimilarity(w, term) > 0.7)) {
          matches = true; break;
        }
      }
      if (matches) break;
    }
    if (matches) group.forEach(t => result.add(t.toLowerCase()));
  }
  return result;
}

function buildHaystack(session) {
  const parts = [
    session.title || '',
    session.notes || '',
    (session.tags || []).join(' '),
  ];
  if (session.summary) {
    parts.push(session.summary.headline || '');
    (session.summary.themes || []).forEach(t => parts.push(t));
    (session.summary.scriptures || []).forEach(s => parts.push(`${s.ref || ''} ${s.insight || ''}`));
    (session.summary.applications || []).forEach(a => parts.push(a));
    (session.summary.questions || []).forEach(q => parts.push(q));
  }
  return parts.join(' \n ').toLowerCase();
}

function searchSessions(query, sessions) {
  const q = query.trim().toLowerCase();
  if (!q) return sessions.map(s => ({ session: s, score: 0, snippet: '', matchedTerm: '' }));

  const expanded = expandQuery(q);
  const results = [];

  for (const session of sessions) {
    const title = (session.title || '').toLowerCase();
    const haystack = buildHaystack(session);
    const notes = (session.notes || '').toLowerCase();

    let score = 0;
    let matchedTerm = '';
    let snippetSource = '';

    // Direct query match — highest weight
    if (title.includes(q)) { score += 100; matchedTerm = q; snippetSource = title; }
    if (haystack.includes(q)) { score += 40; if (!matchedTerm) { matchedTerm = q; snippetSource = haystack; } }

    // Synonym matches
    expanded.forEach(term => {
      if (term === q || term.length < 2) return;
      if (title.includes(term)) { score += 25; if (!matchedTerm) { matchedTerm = term; snippetSource = title; } }
      else if (haystack.includes(term)) { score += 8; if (!matchedTerm) { matchedTerm = term; snippetSource = haystack; } }
    });

    // Fuzzy fallback (typos)
    if (score === 0 && q.length >= 4) {
      const allWords = haystack.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
      const qWords = q.split(/\s+/).filter(w => w.length >= 3);
      let bestSim = 0;
      let bestWord = '';
      for (const qw of qWords) {
        for (const w of allWords) {
          if (Math.abs(w.length - qw.length) > 3) continue;
          const sim = trigramSimilarity(qw, w);
          if (sim > bestSim) { bestSim = sim; bestWord = w; }
        }
      }
      if (bestSim > 0.55) { score += bestSim * 6; matchedTerm = bestWord; snippetSource = haystack; }
    }

    if (score === 0) continue;

    // Build a snippet around the matched term
    let snippet = '';
    if (matchedTerm && snippetSource) {
      const idx = snippetSource.indexOf(matchedTerm);
      if (idx >= 0) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(snippetSource.length, idx + matchedTerm.length + 90);
        snippet = (start > 0 ? '…' : '') + snippetSource.slice(start, end).replace(/\s+/g, ' ').trim() + (end < snippetSource.length ? '…' : '');
      }
    }

    results.push({ session, score, snippet, matchedTerm });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// Render snippet with the matched term highlighted
function HighlightedSnippet({ text, term, palette }) {
  if (!text) return null;
  if (!term) return <span>{text}</span>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx < 0) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: '#f5e0c4', color: palette.burgundy, padding: '0 2px', borderRadius: 2, fontWeight: 600 }}>
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </span>
  );
}

// ---------------- Main App ----------------
// ---------------- Reusable presentational components ----------------
function SessionCard({ s, snippet, matchedTerm, activeSessionId, palette, serifDisplay, serifBody, onClick, onDelete, showSnippet, t }) {
  return (
    <div
      className="px-3 py-3 mb-1.5 rounded-md cursor-pointer flex items-start justify-between gap-2 group"
      style={{
        backgroundColor: s.id === activeSessionId ? palette.parchmentDark : '#fbf6ea',
        borderWidth: 1,
        borderColor: s.id === activeSessionId ? palette.gold : palette.line,
      }}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.05rem' }}>
          <HighlightedSnippet text={s.title || t('untitled')} term={matchedTerm} palette={palette} />
        </div>
        <div className="text-xs italic mt-0.5" style={{ color: palette.inkSoft }}>
          {formatDate(s.updatedAt)} · {VERSIONS.find(v => v.id === s.version)?.short || 'NWT'}
        </div>
        {showSnippet && snippet ? (
          <div className="text-xs mt-1.5 leading-relaxed" style={{ color: palette.ink }}>
            <HighlightedSnippet text={snippet} term={matchedTerm} palette={palette} />
          </div>
        ) : s.notes ? (
          <div className="text-xs mt-1 truncate" style={{ color: palette.inkSoft }}>
            {s.notes.replace(/\n/g, ' ').slice(0, 80)}
          </div>
        ) : null}
        {(s.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(s.tags || []).slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-[0.65rem] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: palette.parchmentDark,
                  color: palette.burgundy,
                  borderWidth: 1,
                  borderColor: palette.line,
                  ...serifBody,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1.5 rounded opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: palette.burgundyDeep }}
        aria-label="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Multi-session AI summary card. Shows a generate button when no summary
// exists, a loading state during generation, and the summary itself once
// returned. Used by both the Series drill-in and the Review (monthly) tab.
function SeriesSummaryPanel({
  summary, loading, error, onGenerate,
  buttonLabel, generatingLabel, tryAgainLabel,
  themesLabel, scripturesLabel, applicationsLabel, questionsLabel, keyThemesLabel,
  noContentLabel, palette, serifDisplay, hasContent,
}) {
  if (!hasContent) {
    return (
      <p className="italic text-xs px-2 py-3 text-center" style={{ color: palette.inkSoft }}>
        {noContentLabel}
      </p>
    );
  }
  if (loading) {
    return (
      <div
        className="rounded-md px-3 py-3 mb-3 flex items-center gap-2"
        style={{ backgroundColor: '#fbf6ea', borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm italic">{generatingLabel}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="rounded-md px-3 py-3 mb-3 flex items-center justify-between gap-2"
        style={{ backgroundColor: '#fbf6ea', borderWidth: 1, borderColor: palette.burgundy }}
      >
        <span className="text-xs italic" style={{ color: palette.burgundyDeep }}>{error}</span>
        <button
          onClick={onGenerate}
          className="text-xs px-2.5 py-1 rounded"
          style={{ color: palette.parchment, backgroundColor: palette.burgundy, fontWeight: 600 }}
        >
          {tryAgainLabel}
        </button>
      </div>
    );
  }
  if (!summary) {
    return (
      <button
        onClick={onGenerate}
        className="w-full rounded-md px-3 py-3 mb-3 flex items-center justify-center gap-2"
        style={{ backgroundColor: palette.burgundy, color: palette.parchment, fontWeight: 600 }}
      >
        <Sparkles className="w-4 h-4" />
        <span style={{ ...serifDisplay, fontSize: '0.95rem' }}>{buttonLabel}</span>
      </button>
    );
  }
  // Render summary
  return (
    <div
      className="rounded-md px-3 py-3 mb-3"
      style={{ backgroundColor: '#fbf6ea', borderWidth: 1, borderColor: palette.gold }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider" style={{ color: palette.burgundy, fontWeight: 600 }}>
          {themesLabel}
        </span>
        <button
          onClick={onGenerate}
          className="p-1 rounded opacity-60 hover:opacity-100"
          style={{ color: palette.inkSoft }}
          aria-label="Regenerate"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {summary.headline && (
        <p className="text-sm mb-3 leading-relaxed" style={{ ...serifDisplay, color: palette.ink, fontWeight: 600 }}>
          {summary.headline}
        </p>
      )}
      {summary.themes && summary.themes.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs uppercase tracking-widest mb-1" style={{ color: palette.inkSoft, fontWeight: 600 }}>
            {keyThemesLabel}
          </h4>
          <ul className="space-y-1">
            {summary.themes.map((th, i) => (
              <li key={i} className="text-xs leading-relaxed" style={{ color: palette.ink }}>· {th}</li>
            ))}
          </ul>
        </div>
      )}
      {summary.scriptures && summary.scriptures.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs uppercase tracking-widest mb-1" style={{ color: palette.inkSoft, fontWeight: 600 }}>
            {scripturesLabel}
          </h4>
          <ul className="space-y-1.5">
            {summary.scriptures.map((sc, i) => (
              <li key={i} className="text-xs leading-relaxed" style={{ color: palette.ink }}>
                <span style={{ color: palette.burgundy, fontWeight: 600 }}>{sc.ref}</span>
                {sc.insight && <> — <em style={{ color: palette.inkSoft }}>{sc.insight}</em></>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.applications && summary.applications.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs uppercase tracking-widest mb-1" style={{ color: palette.inkSoft, fontWeight: 600 }}>
            {applicationsLabel}
          </h4>
          <ul className="space-y-1">
            {summary.applications.map((ap, i) => (
              <li key={i} className="text-xs leading-relaxed" style={{ color: palette.ink }}>· {ap}</li>
            ))}
          </ul>
        </div>
      )}
      {summary.questions && summary.questions.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-widest mb-1" style={{ color: palette.inkSoft, fontWeight: 600 }}>
            {questionsLabel}
          </h4>
          <ul className="space-y-1">
            {summary.questions.map((q, i) => (
              <li key={i} className="text-xs italic leading-relaxed" style={{ color: palette.inkSoft }}>· {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------- Main app component ----------------
export default function BibleStudyApp() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [version, setVersion] = useState('nwt');
  // UI language controls all visible labels/buttons. Content language controls
  // the voice transcription target, AI summary output, template body, and
  // jw.org link locale. Hybrid mode = uiLanguage 'en' + contentLanguage 'tl'.
  const [uiLanguage, setUiLanguage] = useState('en');
  const [contentLanguage, setContentLanguage] = useState('tl');
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState('');
  // Home is the app's real first screen; the editor is navigated into and back
  // out of, rather than being a modal layered over a blank study.
  const [view, setView] = useState('home'); // 'home' | 'editor'
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  // Library navigation state
  const [libraryTab, setLibraryTab] = useState('all'); // 'all' | 'tags' | 'review'
  const [libraryTagFilter, setLibraryTagFilter] = useState(null); // null = list, string = drill-in
  const [libraryMonthOffset, setLibraryMonthOffset] = useState(0); // 0 = current month, -1 = previous, etc.
  const [seriesSummary, setSeriesSummary] = useState(null); // { headline, themes, scriptures, applications, questions, basis }
  const [seriesSummaryLoading, setSeriesSummaryLoading] = useState(false);
  const [seriesSummaryError, setSeriesSummaryError] = useState('');
  const [verseCache, setVerseCache] = useState({}); // key: `${ref}|${version}` -> {loading, text, error}
  const [expandedRef, setExpandedRef] = useState(null);
  const [loadingState, setLoadingState] = useState(true);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', ''
  const [recError, setRecError] = useState('');
  const [recNotice, setRecNotice] = useState('');   // non-fatal info (e.g. fell back to upload mode)
  const [recMode, setRecMode] = useState(LIVE_SPEECH_USABLE ? 'live' : 'upload'); // 'live' | 'upload'
  const [transcribing, setTranscribing] = useState(0); // count of segments in flight
  const [micPermission, setMicPermission] = useState('unknown'); // 'granted'|'denied'|'prompt'|'unknown'
  const [lastRecErrorCode, setLastRecErrorCode] = useState('');
  const [showMicDiag, setShowMicDiag] = useState(false);
  const [summary, setSummary] = useState(null); // { headline, themes, scriptures, applications, questions, generatedAt, basedOnLength }
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(''); // '' | 'ok' | 'fail'
  const [pendingCount, setPendingCount] = useState(0);   // segments waiting for a network
  const [flushing, setFlushing] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const notesRef = useRef(null);
  const saveTimerRef = useRef(null);
  // Fallback-recording plumbing
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const segmentTimerRef = useRef(null);
  const chunksRef = useRef([]);
  const keepSegmentingRef = useRef(false);
  const recModeRef = useRef(recMode);
  useEffect(() => { recModeRef.current = recMode; }, [recMode]);
  const wakeLockRef = useRef(null);
  const recSessionIdRef = useRef(null);
  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);

  // ---------------- Load fonts ----------------
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch(e){} };
  }, []);

  // ---------------- Load saved sessions on mount ----------------
  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(STORAGE_KEY);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (Array.isArray(parsed)) setSessions(parsed);
        }
      } catch (e) { /* no saved sessions yet */ }
      try {
        const p = await storage.get(PREF_KEY);
        if (p && p.value) {
          const prefs = JSON.parse(p.value);
          if (prefs.version) setVersion(prefs.version);
          // Two-language scheme. Fall back to old single `language` pref if present.
          if (prefs.uiLanguage) setUiLanguage(prefs.uiLanguage);
          else if (prefs.language) setUiLanguage(prefs.language);
          if (prefs.contentLanguage) setContentLanguage(prefs.contentLanguage);
          else if (prefs.language) setContentLanguage(prefs.language);
        }
      } catch (e) {}
      setLoadingState(false);
    })();
  }, []);

  // ---------------- Persist preferences ----------------
  useEffect(() => {
    if (loadingState) return;
    storage.set(PREF_KEY, JSON.stringify({ version, uiLanguage, contentLanguage })).catch(() => {});
  }, [version, uiLanguage, contentLanguage, loadingState]);

  // ---------------- Translation helper (UI text) ----------------
  const t = (key, ...args) => {
    const dict = I18N[uiLanguage] || I18N.en;
    const val = dict[key] !== undefined ? dict[key] : I18N.en[key];
    if (typeof val === 'function') return val(...args);
    return val !== undefined ? val : key;
  };

  // ---------------- Auto-save active session ----------------
  // NOTE on storage: we use window.storage here (artifact persistence).
  // To deploy this app on your own, replace storageGet/storageSet calls below with
  // localStorage.getItem/setItem (synchronous), or with a Supabase client for cross-device sync.
  useEffect(() => {
    if (loadingState) return;
    if (!title && !notes && !summary && tags.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      const id = activeSessionId || `s_${Date.now()}`;
      const updated = {
        id,
        title: title || 'Untitled study',
        notes,
        version,
        summary,
        tags,
        updatedAt: Date.now(),
        createdAt: activeSessionId ? (sessions.find(s => s.id === activeSessionId)?.createdAt || Date.now()) : Date.now(),
      };
      const others = sessions.filter(s => s.id !== id);
      const next = [updated, ...others].sort((a,b) => b.updatedAt - a.updatedAt);
      setSessions(next);
      if (!activeSessionId) setActiveSessionId(id);
      try {
        await storage.set(STORAGE_KEY, JSON.stringify(next));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 1500);
      } catch (e) {
        setSaveStatus('');
      }
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [title, notes, version, summary, tags]); // eslint-disable-line

  // ---------------- Microphone permission probe ----------------
  // Safari throws on the 'microphone' descriptor, so this is best-effort and
  // only feeds the diagnostics panel — it never gates recording.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' });
        if (cancelled) return;
        setMicPermission(status.state);
        status.onchange = () => setMicPermission(status.state);
      } catch (e) { /* unsupported descriptor — leave as 'unknown' */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------------- Keep the screen awake while recording ----------------
  // Same mechanism a video player uses: the Screen Wake Lock API tells the OS
  // not to dim or lock while this page is visible. iOS Safari has supported it
  // since 16.4, including home-screen apps. The lock is dropped automatically
  // whenever the page is hidden, so it has to be re-taken on the way back.
  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) return false;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener?.('release', () => { wakeLockRef.current = null; });
      return true;
    } catch (e) {
      // Thrown when the page is hidden or the OS refuses (e.g. low power mode).
      return false;
    }
  };

  const releaseWakeLock = () => {
    try { wakeLockRef.current?.release(); } catch (e) {}
    wakeLockRef.current = null;
  };

  // Re-acquire after the screen was locked, an app switch, or a tab change.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isRecording && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isRecording]);

  const appendTranscript = (text) => {
    const clean = (text || '').trim();
    if (!clean) return;
    setNotes(prev => {
      const needsSpace = prev && !prev.endsWith(' ') && !prev.endsWith('\n');
      return prev + (needsSpace ? ' ' : '') + clean + ' ';
    });
  };

  // ---------------- Microphone access ----------------
  // Explicitly requesting the mic is what actually shows the browser's
  // permission prompt. SpeechRecognition on its own frequently never asks,
  // which is why "I already allowed the microphone" and "it still fails" can
  // both be true at once.
  const ensureMicAccess = async ({ keep }) => {
    if (!ENV.isSecure) {
      return { ok: false, message: 'Recording needs a secure connection. Open the site over https:// (or on localhost).' };
    }
    if (!ENV.hasGetUserMedia) {
      return { ok: false, message: 'This browser does not expose microphone access at all. Try Chrome, Edge, or Safari.' };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      if (!keep) stream.getTracks().forEach(t => t.stop());
      return { ok: true, stream: keep ? stream : null };
    } catch (e) {
      const name = e?.name || 'Error';
      setLastRecErrorCode(name);
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setMicPermission('denied');
        return {
          ok: false,
          message: ENV.isStandalone
            ? 'The microphone is blocked for this app. Home-screen web apps often cannot get mic access — open myJWnotes in the browser instead and try there.'
            : 'The microphone is blocked for this site. Tap the padlock (or "aA") in the address bar and allow the microphone, then try again.',
        };
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        return { ok: false, message: 'No microphone was found on this device.' };
      }
      if (name === 'NotReadableError') {
        return { ok: false, message: 'The microphone is already in use by another app. Close it and try again.' };
      }
      return { ok: false, message: `Could not open the microphone (${name}).` };
    }
  };

  const releaseStream = () => {
    try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); } catch (e) {}
    mediaStreamRef.current = null;
  };

  // ---------------- Fallback: record audio, transcribe server-side ----------------
  // Give the session a stable id before recording so queued audio can be routed
  // back to the right note even if it's transcribed hours later.
  const ensureSessionId = () => {
    if (activeSessionIdRef.current) return activeSessionIdRef.current;
    const id = `s_${Date.now()}`;
    activeSessionIdRef.current = id;
    setActiveSessionId(id);
    return id;
  };

  // Route transcribed text to the right note — the open one, or a stored one if
  // the user has since moved on.
  const appendTranscriptTo = (sessionId, text) => {
    const clean = (text || '').trim();
    if (!clean) return;
    if (!sessionId || sessionId === activeSessionIdRef.current) { appendTranscript(clean); return; }
    setSessions(prev => {
      const next = prev.map(s => {
        if (s.id !== sessionId) return s;
        const needsSpace = s.notes && !s.notes.endsWith(' ') && !s.notes.endsWith('\n');
        return { ...s, notes: (s.notes || '') + (needsSpace ? ' ' : '') + clean + ' ', updatedAt: Date.now() };
      });
      storage.set(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const refreshPendingCount = async () => {
    try { setPendingCount((await listSegments()).length); } catch (e) { /* no IndexedDB */ }
  };

  const transcribeBlob = async (blob, type) => {
    const base64 = await blobToBase64(blob);
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: base64,
        mimeType: type,
        // Omitted entirely when blank, so the server lets the model auto-detect.
        language: TRANSCRIBE_LANG[contentLanguage] || undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Transcription failed (${response.status})`);
    return data.text;
  };

  const stashSegment = async (blob, type, sessionId, attempts = 0) => {
    try {
      await queueSegment({ blob, type, sessionId, attempts, at: Date.now() });
      await refreshPendingCount();
      return true;
    } catch (e) {
      setRecError('That segment could not be saved for later — this browser blocked offline storage.');
      return false;
    }
  };

  const uploadSegment = async (blob, type, sessionId) => {
    // A container with no speech in it still weighs a couple of KB.
    if (!blob || blob.size < 2000) return;
    // Offline: don't even try — bank it straight away.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await stashSegment(blob, type, sessionId);
      return;
    }
    setTranscribing(n => n + 1);
    try {
      appendTranscriptTo(sessionId, await transcribeBlob(blob, type));
    } catch (e) {
      // Never drop audio on a failure — bank it and retry when there's signal.
      const saved = await stashSegment(blob, type, sessionId);
      if (saved) setRecNotice('No connection — audio is saved and will be transcribed when you\'re back online.');
    } finally {
      setTranscribing(n => n - 1);
    }
  };

  // Retry everything banked, oldest first. Safe to call repeatedly.
  const flushPending = async () => {
    if (flushing) return;
    setFlushing(true);
    try {
      const queued = await listSegments();
      for (const item of queued) {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
        try {
          appendTranscriptTo(item.sessionId, await transcribeBlob(item.blob, item.type));
          await dropSegment(item.id);
        } catch (e) {
          const attempts = (item.attempts || 0) + 1;
          if (attempts >= 5) {
            // Five failures is not a bad network — surface it and stop retrying.
            await dropSegment(item.id);
            setRecError(`A saved segment could not be transcribed after several tries and was discarded. ${e.message}`);
          } else {
            await dropSegment(item.id);
            await stashSegment(item.blob, item.type, item.sessionId, attempts);
            break; // still failing; leave the rest for the next attempt
          }
        }
      }
    } catch (e) {
      /* store unavailable */
    } finally {
      await refreshPendingCount();
      setFlushing(false);
    }
  };

  // Count what's waiting on load, and drain automatically when signal returns.
  useEffect(() => {
    refreshPendingCount();
    const goOnline = () => { setIsOnline(true); flushPending(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []); // eslint-disable-line

  // Records in fixed-length segments rather than one long file: text lands in
  // the notes while you are still studying, and no upload approaches the API's
  // per-file size limit.
  const startSegment = (stream) => {
    const mime = pickRecorderMime();
    let mr;
    try {
      mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (e) {
      setRecError('This browser could not start an audio recorder.');
      keepSegmentingRef.current = false;
      releaseStream();
      setIsRecording(false);
      return;
    }
    mediaRecorderRef.current = mr;
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const type = mr.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      uploadSegment(blob, type, recSessionIdRef.current);
      if (keepSegmentingRef.current && mediaStreamRef.current) {
        startSegment(mediaStreamRef.current);
      } else {
        releaseStream();
      }
    };
    try {
      mr.start();
    } catch (e) {
      setRecError('This browser refused to start recording.');
      return;
    }
    segmentTimerRef.current = setTimeout(() => {
      try { if (mr.state !== 'inactive') mr.stop(); } catch (e) {}
    }, SEGMENT_MS);
  };

  const startUploadRecording = async () => {
    if (!ENV.hasMediaRecorder) {
      setRecError('This browser cannot record audio. Try Chrome, Edge, or Safari.');
      return false;
    }
    const access = await ensureMicAccess({ keep: true });
    if (!access.ok) { setRecError(access.message); return false; }
    recSessionIdRef.current = ensureSessionId();
    mediaStreamRef.current = access.stream;
    keepSegmentingRef.current = true;
    startSegment(access.stream);
    setIsRecording(true);
    return true;
  };

  const stopUploadRecording = () => {
    keepSegmentingRef.current = false;
    if (segmentTimerRef.current) { clearTimeout(segmentTimerRef.current); segmentTimerRef.current = null; }
    try {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') mr.stop(); // onstop uploads the tail and releases the stream
      else releaseStream();
    } catch (e) { releaseStream(); }
    mediaRecorderRef.current = null;
  };

  // Switch to the fallback path when the live speech service refuses to serve
  // us, and keep going without making the user tap record again.
  const fallBackToUpload = async (why) => {
    shouldKeepListeningRef.current = false;
    try { recognitionRef.current?.abort(); } catch (e) {}
    recognitionRef.current = null;
    setRecMode('upload');
    recModeRef.current = 'upload';
    setRecError('');
    setRecNotice(`${why} Switched to recording audio and transcribing it as you go — text appears every ${Math.round(SEGMENT_MS / 1000)}s.`);
    const started = await startUploadRecording();
    if (!started) setIsRecording(false);
  };

  // ---------------- Live speech recognition ----------------
  const setupRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    // iOS ignores `continuous` and ends after each utterance; asking for it
    // there just produces a restart storm.
    rec.continuous = !ENV.isIOS;
    rec.interimResults = true;
    rec.lang = SPEECH_LANG[contentLanguage] || 'en-US';
    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (finalText) appendTranscript(finalText);
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      const code = e.error;
      setLastRecErrorCode(code);
      if (code === 'no-speech' || code === 'aborted') return; // benign; onend handles restart
      if (code === 'not-allowed') {
        shouldKeepListeningRef.current = false;
        setIsRecording(false);
        setRecError(
          ENV.isStandalone
            ? 'Microphone permission was refused for this app. Home-screen web apps often cannot get mic access — open myJWnotes in the browser instead.'
            : 'Microphone permission was refused for this site. Allow it from the padlock in the address bar, then tap record again.'
        );
        return;
      }
      if (code === 'service-not-allowed' || code === 'network' || code === 'language-not-supported') {
        // Not a permission problem: the browser's speech *service* is the one
        // saying no. Move to the fallback instead of blaming the microphone.
        const why =
          code === 'network'
            ? 'The live speech service could not be reached.'
            : ENV.isIOS
              ? 'Your iPhone blocked its dictation service (turn on Settings ▸ General ▸ Keyboard ▸ Enable Dictation to use the faster live mode).'
              : 'This browser blocked its speech service — that is not a microphone permission problem.';
        fallBackToUpload(why);
        return;
      }
      if (code === 'audio-capture') {
        shouldKeepListeningRef.current = false;
        setIsRecording(false);
        setRecError('No microphone was found on this device.');
        return;
      }
      setRecError(`Recording error: ${code}`);
    };
    rec.onend = () => {
      setInterim('');
      if (shouldKeepListeningRef.current) {
        // iOS ends after every utterance, so restarting is normal, not an error.
        try { rec.start(); } catch (e) { /* already starting */ }
      } else {
        setIsRecording(false);
      }
    };
    return rec;
  }, [contentLanguage]);

  const startLiveRecording = () => {
    const rec = setupRecognition();
    if (!rec) return false;
    recognitionRef.current = rec;
    shouldKeepListeningRef.current = true;
    try {
      rec.start();
      setIsRecording(true);
      return true;
    } catch (e) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current = null;
      return false;
    }
  };

  const stopRecording = () => {
    shouldKeepListeningRef.current = false;
    try { recognitionRef.current?.stop(); } catch (e) {}
    recognitionRef.current = null;
    stopUploadRecording();
    setIsRecording(false);
    setInterim('');
  };

  const startRecording = async () => {
    if (!ENV.isSecure) {
      setRecError('Recording needs a secure connection. Open the site over https:// (or on localhost).');
      return;
    }
    // Live transcription is a network service — it cannot work without signal.
    // Offline, go straight to recording audio for later.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (recModeRef.current !== 'upload') { setRecMode('upload'); recModeRef.current = 'upload'; }
      setRecNotice('No connection — recording audio now, and it will be transcribed automatically when you\'re back online.');
      await startUploadRecording();
      return;
    }
    if (recModeRef.current === 'upload' || !LIVE_SPEECH_USABLE) {
      if (recModeRef.current !== 'upload') {
        setRecMode('upload');
        recModeRef.current = 'upload';
        setRecNotice(
          ENV.isBrave
            ? 'Brave removes the live speech service, so myJWnotes records your audio and transcribes it instead.'
            : ENV.isFirefox
              ? 'Firefox has no live speech service, so myJWnotes records your audio and transcribes it instead.'
              : 'Live transcription is unavailable here, so myJWnotes records your audio and transcribes it instead.'
        );
      }
      await startUploadRecording();
      return;
    }
    // Safari (incl. iOS) only starts recognition inside the tap itself, and
    // awaiting getUserMedia first spends that user gesture. So on iOS we start
    // straight away and only ask for the mic explicitly if it complains.
    if (ENV.isIOS) {
      if (startLiveRecording()) return;
      const access = await ensureMicAccess({ keep: false });
      setRecError(access.ok ? 'Microphone is ready — tap record once more to start.' : access.message);
      return;
    }
    const access = await ensureMicAccess({ keep: false });
    if (!access.ok) { setRecError(access.message); return; }
    if (!startLiveRecording()) {
      await fallBackToUpload('Live transcription could not start.');
    }
  };

  const toggleRecording = () => {
    setRecError('');
    setRecNotice('');
    if (isRecording) { stopRecording(); return; }
    // Taken inside the tap, before any await, so the gesture is still live.
    requestWakeLock();
    startRecording();
  };

  // Home screen's primary action: blank study, straight into recording.
  const startNewRecording = () => {
    newSession(null);
    setRecError('');
    setRecNotice('');
    requestWakeLock();
    startRecording();
  };

  // Covers every way recording can end — stop, error, or a start that failed.
  useEffect(() => {
    if (!isRecording) releaseWakeLock();
  }, [isRecording]);

  // Release the mic if the component goes away mid-recording.
  useEffect(() => () => {
    keepSegmentingRef.current = false;
    shouldKeepListeningRef.current = false;
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    try { recognitionRef.current?.abort(); } catch (e) {}
    try { mediaRecorderRef.current?.stop(); } catch (e) {}
    releaseStream();
    releaseWakeLock();
  }, []);

  // ---------------- Notes textarea: bullet support ----------------
  const handleNotesKey = (e) => {
    if (e.key === 'Enter') {
      const ta = e.target;
      const val = ta.value;
      const pos = ta.selectionStart;
      const before = val.slice(0, pos);
      const lineStart = before.lastIndexOf('\n') + 1;
      const currentLine = before.slice(lineStart);
      const bulletMatch = currentLine.match(/^(\s*)([-•*])\s(.*)$/);
      if (bulletMatch) {
        if (bulletMatch[3].trim() === '') {
          // empty bullet — break out
          e.preventDefault();
          const newVal = val.slice(0, lineStart) + val.slice(pos);
          setNotes(newVal);
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart; });
        } else {
          // continue bullet
          e.preventDefault();
          const insert = `\n${bulletMatch[1]}${bulletMatch[2]} `;
          const newVal = val.slice(0, pos) + insert + val.slice(pos);
          setNotes(newVal);
          const newPos = pos + insert.length;
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = newPos; });
        }
      }
    }
  };

  const insertBullet = () => {
    const ta = notesRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const val = notes;
    const before = val.slice(0, pos);
    const lineStart = before.lastIndexOf('\n') + 1;
    const atLineStart = pos === lineStart;
    const prefix = atLineStart ? '' : (val[pos - 1] === '\n' ? '' : '\n');
    const insert = `${prefix}- `;
    const newVal = val.slice(0, pos) + insert + val.slice(pos);
    setNotes(newVal);
    const newPos = pos + insert.length;
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = newPos; });
  };

  // ---------------- New / load / delete sessions ----------------
  const newSession = (template = null) => {
    if (isRecording) toggleRecording();
    // Keep the ref in step synchronously — queued audio is routed by it, and a
    // stale value would file the transcript against the previous note.
    activeSessionIdRef.current = null;
    setActiveSessionId(null);
    if (template && template.id !== 'blank') {
      const trans = template[contentLanguage] || template.en;
      const dateStr = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
      setTitle(`${trans.titlePrefix}${dateStr}`);
      setNotes(trans.body);
      setTags([...trans.tags]);
    } else {
      setTitle('');
      setNotes('');
      setTags([]);
    }
    setSummary(null);
    setSummaryError('');
    setExpandedRef(null);
    setView('editor');
    setShowTemplatePicker(false);
    setTagInput('');
  };

  const loadSession = (s) => {
    if (isRecording) toggleRecording();
    activeSessionIdRef.current = s.id;
    setActiveSessionId(s.id);
    setTitle(s.title || '');
    setNotes(s.notes || '');
    setVersion(s.version || version);
    setSummary(s.summary || null);
    setTags(s.tags || []);
    setSummaryError('');
    setView('editor');
    setExpandedRef(null);
    setTagInput('');
  };

  // ---------------- Tag helpers ----------------
  const addTag = (raw) => {
    const cleaned = raw.trim().replace(/[,#]+/g, '').trim();
    if (!cleaned) return;
    if (tags.includes(cleaned)) return;
    if (cleaned.length > 30) return;
    setTags([...tags, cleaned]);
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagInputKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Suggest tags the user has used before, plus template-suggested ones
  const allKnownTags = Array.from(new Set([
    ...sessions.flatMap(s => s.tags || []),
    ...TEMPLATES.flatMap(t => [...((t.en && t.en.tags) || []), ...((t.tl && t.tl.tags) || [])]),
  ])).filter(t => !tags.includes(t));
  const tagSuggestions = tagInput.trim().length > 0
    ? allKnownTags.filter(t => t.toLowerCase().includes(tagInput.trim().toLowerCase())).slice(0, 5)
    : [];

  const deleteSession = async (id) => {
    const next = sessions.filter(s => s.id !== id);
    setSessions(next);
    if (id === activeSessionId) {
      setActiveSessionId(null);
      setTitle('');
      setNotes('');
    }
    try { await storage.set(STORAGE_KEY, JSON.stringify(next)); } catch(e) {}
  };

  // ---------------- Verse lookup ----------------
  const currentVersion = VERSIONS.find(v => v.id === version);
  const refs = detectReferences(notes);

  const lookupRef = async (refObj) => {
    if (!currentVersion.supportsLookup) return;
    const key = `${refObj.ref}|${version}`;
    if (verseCache[key]) return;
    setVerseCache(prev => ({ ...prev, [key]: { loading: true } }));
    try {
      const data = await fetchVerse(refObj.ref, version);
      setVerseCache(prev => ({ ...prev, [key]: { loading: false, text: data.text?.trim() || '', verses: data.verses || [] } }));
    } catch (e) {
      setVerseCache(prev => ({ ...prev, [key]: { loading: false, error: 'Could not load verse' } }));
    }
  };

  const toggleRef = (refObj) => {
    if (expandedRef === refObj.ref) { setExpandedRef(null); return; }
    setExpandedRef(refObj.ref);
    lookupRef(refObj);
  };

  // ---------------- AI Summary ----------------
  // This calls the Anthropic API directly. In this artifact (running in claude.ai),
  // Anthropic handles the auth — no API key is passed. When you deploy this on your
  // own (Netlify/Vercel/etc.), you'll need to either:
  //   1) Add your Anthropic API key as an environment variable and proxy this call
  //      through a tiny serverless function (recommended — keeps your key secret), or
  //   2) For purely personal/local use only, hardcode the key (NEVER do this for a
  //      shared or deployed app — the key would be visible to anyone).
  // Cost for personal use is ~1-2 cents per summary. Set a spending cap in the
  // Anthropic console to keep things safe.
  const generateSummary = async () => {
    if (!notes.trim()) return;
    setSummaryLoading(true);
    setSummaryError('');
    const langName = contentLanguage === 'tl' ? 'Tagalog (Filipino)' : 'English';
    const prompt = `You are summarizing personal Bible study notes for later review. The notes may be from a meeting or personal study, possibly transcribed via voice so they may be informal or fragmented.

Read the notes and respond with ONLY a JSON object (no markdown code fences, no other text, no explanation):

{
  "headline": "One sentence (max 18 words) capturing the main thrust of this study",
  "themes": ["short theme 1", "short theme 2"],
  "scriptures": [
    {"ref": "Book Ch:V", "insight": "what this verse contributed in 1-2 sentences"}
  ],
  "applications": ["specific, actionable takeaway 1", "specific, actionable takeaway 2"],
  "questions": ["reflection question 1", "reflection question 2"]
}

Rules:
- 2-5 themes max, each a short phrase
- Only include scriptures actually mentioned or clearly alluded to in the notes
- Applications should be specific and actionable, not generic platitudes
- 1-3 reflection questions that go deeper than what was already discussed
- If notes are very short or unclear, still produce a best-effort summary; use empty arrays where appropriate
- Write all output (headline, themes, insights, applications, questions) in ${langName}. Keep scripture references in their conventional form (e.g. "Mateo 24:14" or "Matthew 24:14"). The user is a Jehovah's Witness, so use JW-aligned terminology where natural.

Bible version used in study: ${currentVersion.name}

Notes:
${notes}`;
    try {
      const response = await fetch('/api/claude-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 1500 }),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = await response.json();
      const textBlock = data.content.find(b => b.type === 'text');
      if (!textBlock) throw new Error('No text response');
      let raw = textBlock.text.trim();
      // strip code fences if Claude added them despite instructions
      raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(raw);
      setSummary({
        ...parsed,
        generatedAt: Date.now(),
        basedOnLength: notes.length,
      });
    } catch (e) {
      setSummaryError('Could not generate summary. Try again in a moment.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const clearSummary = () => {
    setSummary(null);
    setSummaryError('');
  };

  // ---------------- Copy summary (for pasting into another notes app) ----------------
  // Plain text rather than Markdown: it pastes cleanly into apps that don't
  // render Markdown, and reads fine in the ones that do.
  const summaryToText = (s, heading) => {
    if (!s) return '';
    const lines = [];
    if (heading) lines.push(heading, '');
    if (s.headline) lines.push(s.headline, '');
    if (s.themes?.length) {
      lines.push(`${t('keyThemes')}:`);
      s.themes.forEach(x => lines.push(`  • ${x}`));
      lines.push('');
    }
    if (s.scriptures?.length) {
      lines.push(`${t('scriptureInsights')}:`);
      s.scriptures.forEach(x => lines.push(`  • ${x.ref}${x.insight ? ` — ${x.insight}` : ''}`));
      lines.push('');
    }
    if (s.applications?.length) {
      lines.push(`${t('apply')}:`);
      s.applications.forEach(x => lines.push(`  • ${x}`));
      lines.push('');
    }
    if (s.questions?.length) {
      lines.push(`${t('reflect')}:`);
      s.questions.forEach(x => lines.push(`  • ${x}`));
      lines.push('');
    }
    return lines.join('\n').trim();
  };

  const copyText = async (text) => {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Older WebKit, or a clipboard write the browser refused outside a gesture.
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length); // iOS ignores select() alone
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e2) {
        return false;
      }
    }
  };

  const copySummary = async () => {
    const heading = title?.trim() || t('untitled');
    const ok = await copyText(summaryToText(summary, heading));
    setCopiedSummary(ok ? 'ok' : 'fail');
    setTimeout(() => setCopiedSummary(''), 2000);
  };

  // detect if notes have changed significantly since summary was generated
  const summaryStale = summary && Math.abs(notes.length - (summary.basedOnLength || 0)) > 50;

  // ---------------- Series / Review summary (multi-session) ----------------
  // Generates a meta-summary across multiple sessions (e.g. all sessions tagged
  // "#prayer", or all sessions from a given month). Uses the same Claude API
  // setup as the per-session summary.
  const generateSeriesSummary = async (sessionsToSummarize, contextLabel) => {
    if (!sessionsToSummarize || sessionsToSummarize.length === 0) return;
    setSeriesSummaryLoading(true);
    setSeriesSummaryError('');
    const langName = contentLanguage === 'tl' ? 'Tagalog (Filipino)' : 'English';

    // Build a compact corpus from session summaries (preferred) or notes
    const corpus = sessionsToSummarize.map((s, i) => {
      const dateStr = new Date(s.updatedAt).toLocaleDateString();
      let body = '';
      if (s.summary) {
        body = `Headline: ${s.summary.headline || ''}
Themes: ${(s.summary.themes || []).join(', ')}
Scriptures: ${(s.summary.scriptures || []).map(x => `${x.ref} (${x.insight})`).join(' | ')}
Applications: ${(s.summary.applications || []).join(' | ')}`;
      } else {
        body = (s.notes || '').slice(0, 1500);
      }
      return `=== Session ${i + 1} — ${s.title || 'Untitled'} (${dateStr}) ===\n${body}`;
    }).join('\n\n');

    const prompt = `You are reviewing multiple Bible study sessions to find patterns, recurring themes, and a deeper understanding across them.

Context: ${contextLabel}
Number of sessions: ${sessionsToSummarize.length}

Respond with ONLY a JSON object (no markdown, no preamble):

{
  "headline": "One sentence capturing the thread that runs through these sessions",
  "themes": ["recurring theme 1", "recurring theme 2"],
  "scriptures": [
    {"ref": "Book Ch:V", "insight": "why this verse keeps coming up across sessions"}
  ],
  "applications": ["pattern of practical takeaway 1", "pattern 2"],
  "questions": ["deeper question this collection raises"]
}

Rules:
- Focus on patterns ACROSS sessions, not just one
- 3-6 themes, each a short phrase
- 3-7 scriptures, ranked by how often they appear or how central they are
- Applications should reflect repeated practical advice
- Questions should be ones that emerge from the whole collection
- Write all output in ${langName}. The user is a Jehovah's Witness — use JW-aligned terminology where natural.

Sessions:
${corpus}`;

    try {
      const response = await fetch('/api/claude-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 2000 }),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = await response.json();
      const textBlock = data.content.find(b => b.type === 'text');
      if (!textBlock) throw new Error('No text response');
      let raw = textBlock.text.trim();
      raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(raw);
      setSeriesSummary({
        ...parsed,
        generatedAt: Date.now(),
        basis: contextLabel,
        sessionCount: sessionsToSummarize.length,
      });
    } catch (e) {
      setSeriesSummaryError('Could not generate summary. Try again in a moment.');
    } finally {
      setSeriesSummaryLoading(false);
    }
  };

  const clearSeriesSummary = () => {
    setSeriesSummary(null);
    setSeriesSummaryError('');
  };

  // ---------------- Export ----------------
  const exportSession = () => {
    const date = new Date().toLocaleString();
    const tagLine = tags.length > 0 ? `\nTags: ${tags.map(t => `#${t}`).join(' ')}` : '';
    let out = `${title || 'Bible Study Notes'}\n${date}\nVersion: ${currentVersion.short}${tagLine}\n\n${'='.repeat(40)}\n\n${notes}\n`;
    if (refs.length) {
      out += `\n${'='.repeat(40)}\nReferences\n${'='.repeat(40)}\n\n`;
      refs.forEach(r => { out += `• ${r.ref}\n`; });
    }
    if (summary) {
      out += `\n${'='.repeat(40)}\nAI Summary\n${'='.repeat(40)}\n\n`;
      if (summary.headline) out += `${summary.headline}\n\n`;
      if (summary.themes?.length) {
        out += `Key themes:\n`;
        summary.themes.forEach(t => out += `  • ${t}\n`);
        out += '\n';
      }
      if (summary.scriptures?.length) {
        out += `Scripture insights:\n`;
        summary.scriptures.forEach(s => out += `  • ${s.ref} — ${s.insight}\n`);
        out += '\n';
      }
      if (summary.applications?.length) {
        out += `Applications:\n`;
        summary.applications.forEach(a => out += `  • ${a}\n`);
        out += '\n';
      }
      if (summary.questions?.length) {
        out += `Questions to reflect on:\n`;
        summary.questions.forEach(q => out += `  • ${q}\n`);
        out += '\n';
      }
    }
    const blob = new Blob([out], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'bible-study').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // ---------------- Backup: export / import every note ----------------
  // Everything lives in this browser's localStorage. Clearing site data or
  // reinstalling the home-screen app wipes it with no warning and no recovery,
  // so a portable file is the only real safety net.
  const exportAllSessions = () => {
    const payload = {
      app: 'myJWnotes',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      sessionCount: sessions.length,
      sessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myjwnotes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const importSessions = async (file) => {
    setBackupMsg('');
    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.sessions;
      if (!Array.isArray(incoming)) throw new Error('That file does not look like a myJWnotes backup.');
      // Merge rather than replace: same id keeps whichever was edited last, so
      // importing an old backup can never silently undo newer work.
      const byId = new Map(sessions.map(s => [s.id, s]));
      let added = 0, updated = 0;
      for (const s of incoming) {
        if (!s || typeof s.id !== 'string') continue;
        const existing = byId.get(s.id);
        if (!existing) { byId.set(s.id, s); added++; }
        else if ((s.updatedAt || 0) > (existing.updatedAt || 0)) { byId.set(s.id, s); updated++; }
      }
      const next = Array.from(byId.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setSessions(next);
      const ok = await storage.set(STORAGE_KEY, JSON.stringify(next));
      if (!ok) throw new Error('Imported, but saving failed — storage may be full.');
      setBackupMsg(`Imported: ${added} new, ${updated} updated, ${incoming.length - added - updated} already current.`);
    } catch (e) {
      setBackupMsg(e.message || 'Could not read that backup file.');
    }
  };

  // ---------------- Styles ----------------
  const palette = {
    parchment: '#f4ecdd',
    parchmentDark: '#e8dcc4',
    ink: '#1f1a14',
    inkSoft: '#4a3f30',
    burgundy: '#7a2230',
    burgundyDeep: '#5c1822',
    gold: '#a4843a',
    goldSoft: '#c9a85f',
    line: '#d4c4a0',
  };

  const serifDisplay = { fontFamily: '"EB Garamond", "Cardo", Georgia, serif' };
  const serifBody = { fontFamily: '"Lora", Georgia, serif' };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: palette.parchment, color: palette.ink, ...serifBody }}>
      {/* Header */}
      <header className="relative border-b" style={{ borderColor: palette.line, backgroundColor: palette.parchmentDark }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0" style={{ backgroundColor: palette.burgundy }}>
              <BookOpen className="w-5 h-5" style={{ color: palette.parchment }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl leading-tight truncate" style={{ ...serifDisplay, fontWeight: 600, letterSpacing: '0.02em' }}>
                myJWnotes
              </h1>
              <p className="text-xs italic truncate" style={{ color: palette.inkSoft }}>{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {view === 'editor' && (
              <button
                onClick={() => { setView('home'); setSearchQuery(''); setLibraryTagFilter(null); clearSeriesSummary(); }}
                className="px-3 py-2 rounded-md flex items-center gap-1.5 text-sm transition-colors"
                style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
                aria-label="All notes"
              >
                <Home className="w-6 h-6" />
                <span className="hidden sm:inline">All notes</span>
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-md transition-colors"
              style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Waiting-audio banner — the reassurance that nothing was lost offline */}
      {(pendingCount > 0 || !isOnline) && (
        <div style={{ backgroundColor: '#f5e6d8', borderBottomWidth: 1, borderColor: palette.line }}>
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: palette.burgundyDeep }}>
              {pendingCount > 0
                ? `${pendingCount} recording${pendingCount === 1 ? '' : 's'} saved, waiting to be transcribed`
                : 'Offline — recordings will be saved and transcribed later'}
            </span>
            {pendingCount > 0 && isOnline && (
              <button
                onClick={flushPending}
                disabled={flushing}
                className="text-sm px-3 py-1 rounded flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                style={{ backgroundColor: palette.burgundy, color: palette.parchment, fontWeight: 600 }}
              >
                {flushing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working…</> : 'Transcribe now'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editor screen */}
      {view === 'editor' && (<>
      <main className="relative max-w-3xl mx-auto px-4 py-5 pb-32">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          className="w-full bg-transparent border-0 outline-none text-2xl pb-2 mb-1"
          style={{ ...serifDisplay, fontWeight: 600, color: palette.ink, letterSpacing: '0.01em' }}
        />
        <div className="flex items-center gap-3 text-xs mb-4 pb-3 border-b" style={{ color: palette.inkSoft, borderColor: palette.line }}>
          <span className="italic">{activeSessionId ? formatDate(sessions.find(s=>s.id===activeSessionId)?.updatedAt || Date.now()) : t('newSession')}</span>
          <span>·</span>
          <button
            onClick={() => setShowSettings(true)}
            className="uppercase tracking-wider hover:underline"
            style={{ color: palette.burgundy, fontWeight: 600, fontSize: '0.7rem' }}
          >
            {currentVersion.short}
          </button>
          {saveStatus && (
            <>
              <span>·</span>
              <span className="italic" style={{ color: palette.gold }}>
                {saveStatus === 'saving' ? t('saving') : t('saved')}
              </span>
            </>
          )}
        </div>

        {/* Tags row */}
        <div className="relative mb-5">
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <Hash className="w-3.5 h-3.5 flex-shrink-0" style={{ color: palette.inkSoft }} />
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: '#fbf6ea',
                  color: palette.ink,
                  borderWidth: 1,
                  borderColor: palette.gold,
                  ...serifBody,
                }}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="p-0.5 rounded hover:opacity-70"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="w-3 h-3" style={{ color: palette.inkSoft }} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKey}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
              placeholder={tags.length ? t('addTagShort') : t('addTagsPlaceholder')}
              className="flex-1 min-w-[100px] bg-transparent border-0 outline-none text-xs py-1"
              style={{ color: palette.ink, ...serifBody }}
            />
          </div>
          {/* Tag suggestions dropdown */}
          {tagSuggestions.length > 0 && (
            <div
              className="absolute left-5 right-0 top-full mt-1 z-10 rounded-md overflow-hidden"
              style={{ backgroundColor: '#fbf6ea', borderWidth: 1, borderColor: palette.line, boxShadow: '0 4px 12px rgba(31,26,20,0.1)' }}
            >
              {tagSuggestions.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-black/5"
                  style={{ color: palette.ink, ...serifBody }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recording Card */}
        <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: palette.parchmentDark, borderWidth: 1, borderColor: palette.line }}>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleRecording}
              className="relative w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                backgroundColor: isRecording ? palette.burgundy : palette.ink,
                boxShadow: isRecording ? `0 0 0 6px ${palette.burgundy}22, 0 0 0 12px ${palette.burgundy}11` : 'none',
              }}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording
                ? <MicOff className="w-6 h-6" style={{ color: palette.parchment }} />
                : <Mic className="w-6 h-6" style={{ color: palette.parchment }} />}
              {isRecording && (
                <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: palette.burgundy, opacity: 0.3 }} />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.05rem' }}>
                {isRecording ? t('listening') : t('tapToRecord')}
              </div>
              <div className="text-xs italic" style={{ color: palette.inkSoft }}>
                {isRecording
                  ? (recMode === 'upload'
                      ? `Recording — text appears every ${Math.round(SEGMENT_MS / 1000)}s`
                      : t('recordingHint'))
                  : t('recordingIdleHint')}
              </div>
            </div>
          </div>
          {interim && (
            <div className="mt-3 pt-3 border-t italic text-sm" style={{ borderColor: palette.line, color: palette.inkSoft }}>
              … {interim}
            </div>
          )}
          {transcribing > 0 && (
            <div className="mt-3 pt-3 border-t text-sm flex items-center gap-2" style={{ borderColor: palette.line, color: palette.inkSoft }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="italic">Transcribing{transcribing > 1 ? ` ${transcribing} segments` : ''}…</span>
            </div>
          )}
          {recNotice && (
            <div className="mt-3 pt-3 border-t text-sm italic" style={{ borderColor: palette.line, color: palette.inkSoft }}>
              {recNotice}
            </div>
          )}
          {recError && (
            <div className="mt-3 pt-3 border-t text-sm" style={{ borderColor: palette.line, color: palette.burgundyDeep }}>
              {recError}
            </div>
          )}
          {(recError || recNotice) && (
            <button
              onClick={() => setShowMicDiag(v => !v)}
              className="mt-2 text-xs underline"
              style={{ color: palette.inkSoft }}
            >
              {showMicDiag ? 'Hide details' : 'Why isn’t this working?'}
            </button>
          )}
          {showMicDiag && (
            <div
              className="mt-2 rounded p-2 text-xs leading-relaxed"
              style={{ backgroundColor: '#fbf6ea', borderWidth: 1, borderColor: palette.line, color: palette.inkSoft, fontFamily: 'ui-monospace, monospace' }}
            >
              <div>browser: {ENV.isBrave ? 'Brave' : ENV.isFirefox ? 'Firefox' : ENV.isChromium ? 'Chromium' : 'Safari/other'}{ENV.isIOS ? ' · iOS' : ''}</div>
              <div>installed to home screen: {String(ENV.isStandalone)}</div>
              <div>secure context: {String(ENV.isSecure)}</div>
              <div>live speech api: {ENV.hasSR ? (LIVE_SPEECH_USABLE ? 'available' : 'present but unusable') : 'missing'}</div>
              <div>audio recorder: {ENV.hasMediaRecorder ? 'available' : 'missing'}</div>
              <div>mic permission: {micPermission}</div>
              <div>mode: {recMode}</div>
              <div>last error: {lastRecErrorCode || 'none'}</div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-widest" style={{ color: palette.inkSoft, fontWeight: 600 }}>{t('notes')}</label>
            <button
              onClick={insertBullet}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded"
              style={{ color: palette.burgundy, fontWeight: 600 }}
            >
              <Plus className="w-3 h-3" /> {t('bullet')}
            </button>
          </div>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleNotesKey}
            placeholder={t('notesPlaceholder')}
            className="w-full bg-transparent border-0 outline-none resize-none leading-relaxed"
            rows={Math.max(8, Math.min(24, notes.split('\n').length + 2))}
            style={{ ...serifBody, fontSize: '1.05rem', color: palette.ink, lineHeight: 1.75 }}
          />
        </div>

        {/* References */}
        {refs.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1" style={{ backgroundColor: palette.line }} />
              <span className="text-xs uppercase tracking-widest italic" style={{ color: palette.gold, fontWeight: 600 }}>
                {t('scripture')}
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: palette.line }} />
            </div>
            <div className="space-y-2">
              {refs.map((r) => {
                const key = `${r.ref}|${version}`;
                const cached = verseCache[key];
                const isOpen = expandedRef === r.ref;
                return (
                  <div key={r.ref} className="rounded-md overflow-hidden" style={{ borderWidth: 1, borderColor: palette.line, backgroundColor: '#fbf6ea' }}>
                    <button
                      onClick={() => toggleRef(r)}
                      className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: palette.burgundy }} />
                        <span style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.05rem' }}>{r.ref}</span>
                        <span className="text-xs italic px-1.5 py-0.5 rounded" style={{ color: palette.inkSoft, backgroundColor: palette.parchmentDark }}>
                          {currentVersion.short}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform" style={{ color: palette.inkSoft, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-1 text-sm" style={{ borderTopWidth: 1, borderColor: palette.line }}>
                        {!currentVersion.supportsLookup ? (
                          <div className="space-y-2">
                            <p className="italic" style={{ color: palette.inkSoft }}>
                              {uiLanguage === 'tl'
                                ? `Ang ${currentVersion.short} ${t('nwtCopyrightNote')}`
                                : `The ${currentVersion.short} ${t('nwtCopyrightNote')}`}
                            </p>
                            <a
                              href={jwLinkFor(r, contentLanguage)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm"
                              style={{ color: palette.burgundy, fontWeight: 600 }}
                            >
                              {t('openInJw')}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : cached?.loading ? (
                          <div className="flex items-center gap-2 italic" style={{ color: palette.inkSoft }}>
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                          </div>
                        ) : cached?.error ? (
                          <div className="italic" style={{ color: palette.burgundyDeep }}>{cached.error}</div>
                        ) : cached?.verses ? (
                          <div className="space-y-1.5" style={{ ...serifBody, lineHeight: 1.7 }}>
                            {cached.verses.map((v, i) => (
                              <p key={i}>
                                <sup className="mr-1" style={{ color: palette.gold, fontWeight: 600 }}>{v.verse}</sup>
                                {v.text.trim()}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Summary */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1" style={{ backgroundColor: palette.line }} />
            <span className="text-xs uppercase tracking-widest italic" style={{ color: palette.gold, fontWeight: 600 }}>
              {t('reflection')}
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: palette.line }} />
          </div>

          {!summary && !summaryLoading && !summaryError && (
            <button
              onClick={generateSummary}
              disabled={!notes.trim()}
              className="w-full rounded-lg px-4 py-4 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: palette.gold,
                backgroundColor: '#fbf6ea',
                color: palette.burgundy,
              }}
            >
              <Sparkles className="w-4 h-4" />
              <span style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.05rem' }}>
                {t('distillSummary')}
              </span>
            </button>
          )}

          {summaryLoading && (
            <div
              className="rounded-lg px-4 py-6 flex items-center justify-center gap-2"
              style={{ borderWidth: 1, borderColor: palette.line, backgroundColor: '#fbf6ea', color: palette.inkSoft }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="italic">{t('generating')}</span>
            </div>
          )}

          {summaryError && (
            <div
              className="rounded-lg px-4 py-3 flex items-center justify-between gap-2"
              style={{ borderWidth: 1, borderColor: palette.line, backgroundColor: '#fbf6ea' }}
            >
              <span className="italic text-sm" style={{ color: palette.burgundyDeep }}>{summaryError}</span>
              <button
                onClick={generateSummary}
                className="text-xs px-2.5 py-1 rounded"
                style={{ color: palette.parchment, backgroundColor: palette.burgundy, fontWeight: 600 }}
              >
                {t('tryAgain')}
              </button>
            </div>
          )}

          {summary && !summaryLoading && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ borderWidth: 1, borderColor: palette.gold, backgroundColor: '#fbf6ea' }}
            >
              {/* Summary header */}
              <div
                className="px-4 py-3 flex items-center justify-between gap-2"
                style={{ borderBottomWidth: 1, borderColor: palette.line, backgroundColor: palette.parchmentDark }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: palette.gold }} />
                  <span className="text-xs uppercase tracking-wider" style={{ color: palette.inkSoft, fontWeight: 600 }}>
                    {t('aiSummary')}
                  </span>
                  {summaryStale && (
                    <span className="text-xs italic px-1.5 py-0.5 rounded" style={{ color: palette.burgundyDeep, backgroundColor: '#f5e6d8' }}>
                      {t('notesUpdatedBadge')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={copySummary}
                    title="Copy summary"
                    aria-label="Copy summary"
                    className="px-2 py-1.5 rounded flex items-center gap-1 text-xs"
                    style={{
                      color: copiedSummary === 'ok' ? palette.burgundy : palette.inkSoft,
                      borderWidth: 1,
                      borderColor: palette.line,
                      fontWeight: 600,
                    }}
                  >
                    {copiedSummary === 'ok'
                      ? <><Check className="w-3.5 h-3.5" /> Copied</>
                      : copiedSummary === 'fail'
                        ? <><Copy className="w-3.5 h-3.5" /> Failed</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                  <button
                    onClick={generateSummary}
                    title="Regenerate"
                    className="p-1.5 rounded"
                    style={{ color: palette.inkSoft }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={clearSummary}
                    title="Clear"
                    className="p-1.5 rounded"
                    style={{ color: palette.inkSoft }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {summary.headline && (
                  <p
                    className="italic"
                    style={{ ...serifDisplay, fontSize: '1.2rem', lineHeight: 1.4, color: palette.ink, fontWeight: 500 }}
                  >
                    “{summary.headline}”
                  </p>
                )}

                {summary.themes?.length > 0 && (
                  <section>
                    <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: palette.burgundy, fontWeight: 600 }}>
                      {t('keyThemes')}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.themes.map((t, i) => (
                        <span
                          key={i}
                          className="text-sm px-2.5 py-1 rounded-full"
                          style={{
                            ...serifBody,
                            backgroundColor: palette.parchmentDark,
                            color: palette.ink,
                            borderWidth: 1,
                            borderColor: palette.line,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {summary.scriptures?.length > 0 && (
                  <section>
                    <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: palette.burgundy, fontWeight: 600 }}>
                      {t('scriptureInsights')}
                    </h3>
                    <ul className="space-y-2">
                      {summary.scriptures.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <BookOpen className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: palette.gold }} />
                          <div>
                            <div style={{ ...serifDisplay, fontWeight: 600, color: palette.burgundy }}>{s.ref}</div>
                            <div className="text-sm" style={{ ...serifBody, lineHeight: 1.6, color: palette.ink }}>{s.insight}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {summary.applications?.length > 0 && (
                  <section>
                    <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: palette.burgundy, fontWeight: 600 }}>
                      {t('apply')}
                    </h3>
                    <ul className="space-y-1.5">
                      {summary.applications.map((a, i) => (
                        <li key={i} className="flex gap-2 text-sm" style={{ ...serifBody, lineHeight: 1.6 }}>
                          <span style={{ color: palette.gold, fontWeight: 700 }}>→</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {summary.questions?.length > 0 && (
                  <section>
                    <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: palette.burgundy, fontWeight: 600 }}>
                      {t('reflect')}
                    </h3>
                    <ul className="space-y-1.5">
                      {summary.questions.map((q, i) => (
                        <li
                          key={i}
                          className="text-sm italic"
                          style={{ ...serifBody, lineHeight: 1.6, color: palette.inkSoft }}
                        >
                          {q}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <p className="text-xs italic pt-2" style={{ color: palette.inkSoft, borderTopWidth: 1, borderColor: palette.line }}>
                  Generated {formatDate(summary.generatedAt)} · saved with this session
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t z-10" style={{ backgroundColor: palette.parchment, borderColor: palette.line }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="px-3 py-2 rounded-md flex items-center gap-1.5 text-sm flex-1 justify-center"
            style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
          >
            <Plus className="w-4 h-4" /> {t('new')}
          </button>
          <button
            onClick={exportSession}
            disabled={!notes && !title}
            className="px-3 py-2 rounded-md flex items-center gap-1.5 text-sm flex-1 justify-center disabled:opacity-40"
            style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
          >
            <Download className="w-4 h-4" /> {t('export')}
          </button>
          <button
            onClick={toggleRecording}
            className="px-4 py-2 rounded-md flex items-center gap-1.5 text-sm flex-1 justify-center"
            style={{
              backgroundColor: isRecording ? palette.burgundy : palette.ink,
              color: palette.parchment,
              fontWeight: 600,
            }}
          >
            {isRecording ? <><MicOff className="w-4 h-4" /> {t('stop')}</> : <><Mic className="w-4 h-4" /> {t('record')}</>}
          </button>
        </div>
      </div>
      </>)}

      {/* Home screen — the app's default view, not a modal */}
      {view === 'home' && (
        <div className="w-full">
          <div
            className="w-full max-w-3xl mx-auto min-h-screen flex flex-col pb-32"
            style={{ backgroundColor: palette.parchment }}
          >
            <div className="sticky top-0 z-10" style={{ backgroundColor: palette.parchmentDark, borderBottomWidth: 1, borderColor: palette.line }}>
              <div className="px-4 py-3 flex items-center justify-between">
                <h2 style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.25rem' }}>{t('library')}</h2>
                {libraryTagFilter !== null && (
                  <button
                    onClick={() => { setLibraryTagFilter(null); clearSeriesSummary(); }}
                    className="text-sm px-2 py-1"
                    style={{ color: palette.burgundy, fontWeight: 600 }}
                  >
                    ← {t('tabTags')}
                  </button>
                )}
              </div>

              {/* Tab nav */}
              {libraryTagFilter === null && (
                <div className="px-3 pb-2 flex gap-1">
                  {[
                    { id: 'all', label: t('tabAll') },
                    { id: 'tags', label: t('tabTags') },
                    { id: 'review', label: t('tabReview') },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setLibraryTab(tab.id); clearSeriesSummary(); }}
                      className="flex-1 px-2 py-1.5 text-xs rounded uppercase tracking-wider"
                      style={{
                        backgroundColor: libraryTab === tab.id ? palette.burgundy : 'transparent',
                        color: libraryTab === tab.id ? palette.parchment : palette.inkSoft,
                        borderWidth: 1,
                        borderColor: libraryTab === tab.id ? palette.burgundy : palette.line,
                        fontWeight: 600,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Search bar (All tab only) */}
              {libraryTab === 'all' && libraryTagFilter === null && (
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ backgroundColor: palette.parchment, borderWidth: 1, borderColor: palette.line }}>
                    <Search className="w-4 h-4 flex-shrink-0" style={{ color: palette.inkSoft }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchPlaceholder')}
                      className="flex-1 bg-transparent border-0 outline-none text-sm"
                      style={{ ...serifBody, color: palette.ink }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="p-0.5" aria-label="Clear search">
                        <X className="w-3.5 h-3.5" style={{ color: palette.inkSoft }} />
                      </button>
                    )}
                  </div>
                  {searchQuery && (
                    <p className="text-xs italic mt-1.5 px-1" style={{ color: palette.inkSoft }}>
                      {t('smartSearchHint')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 flex-1">
              {/* ============ ALL TAB ============ */}
              {libraryTab === 'all' && libraryTagFilter === null && (() => {
                const trimmed = searchQuery.trim();
                const results = trimmed
                  ? searchSessions(trimmed, sessions)
                  : sessions.map(s => ({ session: s, score: 0, snippet: '', matchedTerm: '' }));

                if (sessions.length === 0) {
                  return (
                    <p className="italic text-sm px-2 py-6 text-center" style={{ color: palette.inkSoft }}>
                      {t('noSavedSessions')}
                    </p>
                  );
                }
                if (trimmed && results.length === 0) {
                  return (
                    <div className="px-2 py-8 text-center">
                      <p className="italic text-sm mb-2" style={{ color: palette.inkSoft }}>
                        {t('noMatchesFor')} “{trimmed}”.
                      </p>
                      <p className="text-xs" style={{ color: palette.inkSoft }}>
                        {t('tryRelated')}
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    {trimmed && (
                      <p className="text-xs uppercase tracking-widest mb-2 px-1" style={{ color: palette.inkSoft, fontWeight: 600 }}>
                        {results.length} {results.length === 1 ? 'result' : 'results'}
                      </p>
                    )}
                    {results.map(({ session: s, snippet, matchedTerm }) => (
                      <SessionCard key={s.id} s={s} snippet={snippet} matchedTerm={matchedTerm}
                        activeSessionId={activeSessionId} palette={palette} serifDisplay={serifDisplay} serifBody={serifBody}
                        onClick={() => { loadSession(s); setSearchQuery(''); }}
                        onDelete={() => { if (confirm(t('deleteConfirm'))) deleteSession(s.id); }}
                        showSnippet={!!trimmed}
                        t={t} />
                    ))}
                  </>
                );
              })()}

              {/* ============ SERIES TAB ============ */}
              {libraryTab === 'tags' && libraryTagFilter === null && (() => {
                // Tally tags
                const tagCounts = {};
                sessions.forEach(s => (s.tags || []).forEach(tg => {
                  tagCounts[tg] = (tagCounts[tg] || 0) + 1;
                }));
                const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

                if (sorted.length === 0) {
                  return (
                    <p className="italic text-sm px-2 py-6 text-center" style={{ color: palette.inkSoft }}>
                      {t('noTagsYet')}
                    </p>
                  );
                }

                return (
                  <div className="flex flex-wrap gap-2">
                    {sorted.map(([tg, count]) => (
                      <button
                        key={tg}
                        onClick={() => { setLibraryTagFilter(tg); clearSeriesSummary(); }}
                        className="px-3 py-2 rounded-md flex items-center gap-2 text-left"
                        style={{
                          backgroundColor: '#fbf6ea',
                          borderWidth: 1,
                          borderColor: palette.line,
                        }}
                      >
                        <span style={{ ...serifDisplay, fontWeight: 600, color: palette.burgundy }}>#{tg}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: palette.parchmentDark, color: palette.inkSoft }}>
                          {count}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* ============ TAG DRILL-IN (used by Series tab) ============ */}
              {libraryTagFilter !== null && (() => {
                const filtered = sessions.filter(s => (s.tags || []).includes(libraryTagFilter));
                return (
                  <>
                    <button
                      onClick={() => { setLibraryTagFilter(null); clearSeriesSummary(); }}
                      className="text-xs flex items-center gap-1 mb-3 px-2 py-1 rounded"
                      style={{ color: palette.inkSoft, borderWidth: 1, borderColor: palette.line }}
                    >
                      ← {t('backTo')}
                    </button>
                    <div className="mb-3">
                      <h3 style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.4rem', color: palette.burgundy }}>
                        #{libraryTagFilter}
                      </h3>
                      <p className="text-xs italic" style={{ color: palette.inkSoft }}>
                        {t('seriesSubtitle', filtered.length)}
                      </p>
                    </div>

                    <SeriesSummaryPanel
                      summary={seriesSummary}
                      loading={seriesSummaryLoading}
                      error={seriesSummaryError}
                      onGenerate={() => generateSeriesSummary(filtered, `Sessions tagged #${libraryTagFilter}`)}
                      buttonLabel={t('summarizeSeries')}
                      generatingLabel={t('seriesGenerating')}
                      tryAgainLabel={t('tryAgain')}
                      themesLabel={t('seriesOverarching')}
                      scripturesLabel={t('seriesScriptures')}
                      applicationsLabel={t('seriesApplications')}
                      questionsLabel={t('seriesQuestions')}
                      keyThemesLabel={t('keyThemes')}
                      noContentLabel={t('noContentToSummarize')}
                      palette={palette}
                      serifDisplay={serifDisplay}
                      hasContent={filtered.length > 0}
                    />

                    {filtered.map(s => (
                      <SessionCard key={s.id} s={s} snippet="" matchedTerm=""
                        activeSessionId={activeSessionId} palette={palette} serifDisplay={serifDisplay} serifBody={serifBody}
                        onClick={() => { loadSession(s); setLibraryTagFilter(null); clearSeriesSummary(); }}
                        onDelete={() => { if (confirm(t('deleteConfirm'))) deleteSession(s.id); }}
                        showSnippet={false}
                        t={t} />
                    ))}
                  </>
                );
              })()}

              {/* ============ REVIEW TAB ============ */}
              {libraryTab === 'review' && libraryTagFilter === null && (() => {
                // Compute the year/month for the offset
                const now = new Date();
                const targetMonth = new Date(now.getFullYear(), now.getMonth() + libraryMonthOffset, 1);
                const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1);
                const filtered = sessions.filter(s => {
                  const d = new Date(s.updatedAt);
                  return d >= targetMonth && d < monthEnd;
                });
                const monthLabel = targetMonth.toLocaleDateString(uiLanguage === 'tl' ? 'tl-PH' : undefined, { month: 'long', year: 'numeric' });
                const isCurrent = libraryMonthOffset === 0;

                return (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <button
                        onClick={() => { setLibraryMonthOffset(libraryMonthOffset - 1); clearSeriesSummary(); }}
                        className="px-2 py-1 rounded text-sm"
                        style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
                      >
                        ←
                      </button>
                      <div className="text-center flex-1">
                        <div style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.1rem', color: palette.ink }}>
                          {monthLabel}
                        </div>
                        {isCurrent && (
                          <div className="text-xs italic" style={{ color: palette.inkSoft }}>{t('thisMonth')}</div>
                        )}
                      </div>
                      <button
                        onClick={() => { setLibraryMonthOffset(libraryMonthOffset + 1); clearSeriesSummary(); }}
                        disabled={libraryMonthOffset >= 0}
                        className="px-2 py-1 rounded text-sm disabled:opacity-30"
                        style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
                      >
                        →
                      </button>
                    </div>

                    {filtered.length === 0 ? (
                      <p className="italic text-sm px-2 py-6 text-center" style={{ color: palette.inkSoft }}>
                        {t('nothingThisMonth')}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs italic mb-2 px-1" style={{ color: palette.inkSoft }}>
                          {t('monthSubtitle', filtered.length)}
                        </p>

                        <SeriesSummaryPanel
                          summary={seriesSummary}
                          loading={seriesSummaryLoading}
                          error={seriesSummaryError}
                          onGenerate={() => generateSeriesSummary(filtered, `Sessions from ${monthLabel}`)}
                          buttonLabel={t('summarizeMonth')}
                          generatingLabel={t('seriesGenerating')}
                          tryAgainLabel={t('tryAgain')}
                          themesLabel={t('seriesOverarching')}
                          scripturesLabel={t('seriesScriptures')}
                          applicationsLabel={t('seriesApplications')}
                          questionsLabel={t('seriesQuestions')}
                          keyThemesLabel={t('keyThemes')}
                          noContentLabel={t('noContentToSummarize')}
                          palette={palette}
                          serifDisplay={serifDisplay}
                          hasContent={true}
                        />

                        {filtered.map(s => (
                          <SessionCard key={s.id} s={s} snippet="" matchedTerm=""
                            activeSessionId={activeSessionId} palette={palette} serifDisplay={serifDisplay} serifBody={serifBody}
                            onClick={() => { loadSession(s); }}
                            onDelete={() => { if (confirm(t('deleteConfirm'))) deleteSession(s.id); }}
                            showSnippet={false}
                            t={t} />
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Home action bar */}
          <div className="fixed bottom-0 left-0 right-0 border-t z-10" style={{ backgroundColor: palette.parchment, borderColor: palette.line }}>
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="px-3 py-3 rounded-md flex items-center gap-1.5 text-sm flex-1 justify-center"
                style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
              >
                <Plus className="w-4 h-4" /> {t('new')}
              </button>
              <button
                onClick={startNewRecording}
                className="px-4 py-3 rounded-md flex items-center gap-2 text-sm flex-1 justify-center"
                style={{ backgroundColor: palette.ink, color: palette.parchment, fontWeight: 600 }}
              >
                <Mic className="w-4 h-4" /> {t('recordNew')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div
          className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-3"
          style={{ backgroundColor: 'rgba(31,26,20,0.4)' }}
          onClick={() => setShowTemplatePicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg overflow-hidden flex flex-col"
            style={{ backgroundColor: palette.parchment, borderWidth: 1, borderColor: palette.line, maxHeight: '85vh' }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ backgroundColor: palette.parchmentDark, borderBottomWidth: 1, borderColor: palette.line }}
            >
              <div>
                <h2 style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.25rem' }}>{t('pickTemplate')}</h2>
                <p className="text-xs italic" style={{ color: palette.inkSoft }}>{t('pickTemplateSubtitle')}</p>
              </div>
              <button onClick={() => setShowTemplatePicker(false)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 overflow-y-auto">
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.Icon;
                const trans = tmpl[contentLanguage] || tmpl.en;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => newSession(tmpl)}
                    className="w-full px-3 py-3 mb-1.5 rounded-md flex items-start gap-3 text-left transition-colors"
                    style={{
                      backgroundColor: '#fbf6ea',
                      borderWidth: 1,
                      borderColor: palette.line,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: tmpl.id === 'blank' ? palette.parchmentDark : palette.burgundy,
                        color: tmpl.id === 'blank' ? palette.inkSoft : palette.parchment,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.05rem', color: palette.ink }}>
                        {trans.name}
                      </div>
                      <div className="text-xs italic mt-0.5" style={{ color: palette.inkSoft }}>
                        {trans.description}
                      </div>
                      {trans.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {trans.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[0.65rem] px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: palette.parchmentDark,
                                color: palette.inkSoft,
                                borderWidth: 1,
                                borderColor: palette.line,
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-3" style={{ backgroundColor: 'rgba(31,26,20,0.4)' }} onClick={() => setShowSettings(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg overflow-hidden flex flex-col"
            style={{ backgroundColor: palette.parchment, borderWidth: 1, borderColor: palette.line, maxHeight: '85vh' }}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b flex-shrink-0" style={{ backgroundColor: palette.parchmentDark, borderColor: palette.line }}>
              <h2 style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.25rem' }}>{uiLanguage === 'tl' ? 'Mga Setting' : 'Settings'}</h2>
              <button onClick={() => setShowSettings(false)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 overflow-y-auto">
              {/* Language modes */}
              <div className="text-xs uppercase tracking-widest mb-2 px-1" style={{ color: palette.inkSoft, fontWeight: 600 }}>
                {t('language')}
              </div>
              {[
                {
                  id: 'en',
                  ui: 'en', content: 'en',
                  name: 'English',
                  description: uiLanguage === 'tl' ? 'Lahat sa English' : 'Everything in English',
                },
                {
                  id: 'tl',
                  ui: 'tl', content: 'tl',
                  name: 'Tagalog',
                  description: uiLanguage === 'tl' ? 'Lahat sa Tagalog' : 'Everything in Tagalog',
                },
                {
                  id: 'hybrid',
                  ui: 'en', content: 'tl',
                  name: 'Hybrid',
                  description: uiLanguage === 'tl' ? 'English na buttons, Tagalog na nilalaman' : 'English buttons, Tagalog content (notes, voice, AI summary)',
                },
              ].map(mode => {
                const isActive = uiLanguage === mode.ui && contentLanguage === mode.content;
                return (
                  <button
                    key={mode.id}
                    onClick={() => { setUiLanguage(mode.ui); setContentLanguage(mode.content); }}
                    className="w-full px-3 py-2.5 mb-1.5 rounded-md flex items-center justify-between text-left gap-2"
                    style={{
                      backgroundColor: isActive ? palette.parchmentDark : 'transparent',
                      borderWidth: 1,
                      borderColor: isActive ? palette.gold : palette.line,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div style={{ ...serifDisplay, fontWeight: 600, fontSize: '1rem' }}>{mode.name}</div>
                      <div className="text-xs italic mt-0.5" style={{ color: palette.inkSoft }}>
                        {mode.description}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ color: palette.parchment, backgroundColor: palette.burgundy, fontWeight: 600 }}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Bible version */}
              <div className="text-xs uppercase tracking-widest mb-2 mt-4 px-1" style={{ color: palette.inkSoft, fontWeight: 600 }}>
                {t('bibleVersion')}
              </div>
              {VERSIONS.map(v => (
                <button
                  key={v.id}
                  onClick={() => setVersion(v.id)}
                  className="w-full px-3 py-3 mb-1.5 rounded-md flex items-center justify-between text-left"
                  style={{
                    backgroundColor: version === v.id ? palette.parchmentDark : 'transparent',
                    borderWidth: 1,
                    borderColor: version === v.id ? palette.gold : palette.line,
                  }}
                >
                  <div>
                    <div style={{ ...serifDisplay, fontWeight: 600, fontSize: '1.05rem' }}>{v.name}</div>
                    <div className="text-xs italic mt-0.5" style={{ color: palette.inkSoft }}>
                      {v.supportsLookup ? t('versePublic') : t('verseNwt')}
                    </div>
                  </div>
                  <span className="text-xs uppercase tracking-wider px-2 py-1 rounded" style={{
                    color: version === v.id ? palette.parchment : palette.burgundy,
                    backgroundColor: version === v.id ? palette.burgundy : 'transparent',
                    borderWidth: version === v.id ? 0 : 1,
                    borderColor: palette.burgundy,
                    fontWeight: 600,
                  }}>{v.short}</span>
                </button>
              ))}
              <p className="text-xs italic mt-2 px-1" style={{ color: palette.inkSoft }}>
                {uiLanguage === 'tl'
                  ? 'Ang KJV, ASV, at WEB ay public domain. Ang NWT ay © Watch Tower at tinitingnan sa jw.org.'
                  : 'KJV, ASV, and WEB are public domain and pulled from bible-api.com. NWT is © Watch Tower and viewed via jw.org.'}
              </p>

              {/* Backup */}
              <div className="text-xs uppercase tracking-widest mb-2 mt-5 px-1" style={{ color: palette.inkSoft, fontWeight: 600 }}>
                Backup
              </div>
              <p className="text-xs italic mb-2 px-1" style={{ color: palette.inkSoft }}>
                Your notes are stored only in this browser. Clearing site data or reinstalling the app deletes them permanently — save a backup file somewhere safe.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={exportAllSessions}
                  disabled={sessions.length === 0}
                  className="flex-1 px-3 py-3 rounded-md flex items-center justify-center gap-1.5 text-sm disabled:opacity-40"
                  style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
                >
                  <Download className="w-4 h-4" /> Back up {sessions.length > 0 ? `(${sessions.length})` : ''}
                </button>
                <label
                  className="flex-1 px-3 py-3 rounded-md flex items-center justify-center gap-1.5 text-sm cursor-pointer"
                  style={{ borderWidth: 1, borderColor: palette.line, color: palette.inkSoft }}
                >
                  <Plus className="w-4 h-4" /> Restore
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) importSessions(f); e.target.value = ''; }}
                  />
                </label>
              </div>
              {backupMsg && (
                <p className="text-xs mt-2 px-1" style={{ color: palette.burgundyDeep }}>{backupMsg}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
