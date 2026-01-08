// Language configurations
const TRANSLATIONS = {
  en: {
    // Page Title
    PAGE_TITLE: 'WaniKani Dashboard',

    // User Section
    USER_INFO_TITLE: 'User Info',
    USER_USERNAME: 'Username:',
    USER_LEVEL: 'Level:',

    // Reviews Section
    REVIEWS_AVAILABLE_TITLE: 'Reviews Available',
    REVIEWS_ITEMS_READY: 'items ready for review',
    REVIEWS_BY_TYPE: 'By Type',

    // Browse Section
    BROWSE_SUBJECTS_TITLE: 'Browse Subjects by Level',
    LOAD_SUBJECTS_BUTTON: 'Load Subjects',
    LOADING: 'Loading...',

    // Details Section
    FETCH_DETAILS_BUTTON: 'Fetch Details',
    FORCE_REFRESH_DETAILS_BUTTON: 'Force Refresh Details',
    DETAILS_FETCHING: 'Fetching...',
    DETAILS_CHECKING_CACHE: 'Checking cache...',
    DETAILS_ALREADY_CACHED: 'already cached',

    // Export Filters
    EXPORT_FILTERS_TITLE: 'Export Filters',
    SRS_LEVEL_TITLE: 'SRS Level',
    PARTS_OF_SPEECH_TITLE: 'Parts of Speech',
    SELECT_ALL_BUTTON: 'Select All',
    DESELECT_ALL_BUTTON: 'Deselect All',
    FILTER_COUNT_SHOWING: 'Showing',
    FILTER_COUNT_OF: 'of',
    FILTER_COUNT_SUBJECTS: 'subjects',

    // SRS Levels
    SRS_LOCKED: 'Locked',
    SRS_LESSON: 'Lesson',
    SRS_APPRENTICE: 'Apprentice',
    SRS_GURU: 'Guru',
    SRS_MASTER: 'Master',
    SRS_ENLIGHTENED: 'Enlightened',
    SRS_BURNED: 'Burned',

    // Subject Types
    TYPE_RADICAL: 'radical',
    TYPE_KANJI: 'kanji',
    TYPE_VOCABULARY: 'vocabulary',
    TYPE_KANA_VOCABULARY: 'kana vocabulary',

    // Export Buttons
    EXPORT_CSV_BUTTON: 'Export CSV',
    EXPORT_CONTEXT_SENTENCES_BUTTON: 'Export Context Sentences',
    EXPORT_LIST_BUTTON: 'Export List',

    // Common
    REFRESH_DATA_BUTTON: 'Refresh Data',
    LANGUAGE_BUTTON: '日本語',
    SOURCE: 'Source:',
    SOURCE_CACHE: 'cache',
    SOURCE_API: 'api',

    // Error Messages
    ERROR_TITLE: 'Error',
    ERROR_ENV_TOKEN: 'Make sure you have set your WANIKANI_API_TOKEN in server/.env',

    // Level Display
    LEVEL_PREFIX: 'Lv',
    LEVEL_SINGLE: 'Level',
    LEVEL_RANGE_TO: 'to',

    // Parts of Speech - Special
    POS_EMPTY: '(empty)',

    // CSV Headers
    CSV_CHARACTERS: 'Characters',
    CSV_READINGS: 'Readings',
    CSV_MEANINGS: 'Meanings',
    CSV_PARTS_OF_SPEECH: 'Parts of Speech',
    CSV_TRANSITIVITY: 'Transitivity',
    CSV_DAN: 'Dan',
    CSV_TYPE: 'Type',
    CSV_LEVEL: 'Level',
    CSV_SRS_STAGE: 'SRS Stage',
    CSV_JAPANESE: 'Japanese',
    CSV_ENGLISH: 'English',
  },
  ja: {
    // Page Title
    PAGE_TITLE: 'WaniKaniダッシュボード',

    // User Section
    USER_INFO_TITLE: 'ユーザー情報',
    USER_USERNAME: 'ユーザー名:',
    USER_LEVEL: 'レベル:',

    // Reviews Section
    REVIEWS_AVAILABLE_TITLE: '復習可能',
    REVIEWS_ITEMS_READY: '復習可能なアイテム',
    REVIEWS_BY_TYPE: 'タイプ別',

    // Browse Section
    BROWSE_SUBJECTS_TITLE: 'レベル別の項目を閲覧',
    LOAD_SUBJECTS_BUTTON: '項目を読み込む',
    LOADING: '読み込み中...',

    // Details Section
    FETCH_DETAILS_BUTTON: '詳細を取得',
    FORCE_REFRESH_DETAILS_BUTTON: '詳細を強制更新',
    DETAILS_FETCHING: '取得中...',
    DETAILS_CHECKING_CACHE: 'キャッシュ確認中...',
    DETAILS_ALREADY_CACHED: 'キャッシュ済み',

    // Export Filters
    EXPORT_FILTERS_TITLE: 'エクスポートフィルター',
    SRS_LEVEL_TITLE: 'SRSレベル',
    PARTS_OF_SPEECH_TITLE: '品詞',
    SELECT_ALL_BUTTON: 'すべて選択',
    DESELECT_ALL_BUTTON: 'すべて解除',
    FILTER_COUNT_SHOWING: '表示中',
    FILTER_COUNT_OF: '/',
    FILTER_COUNT_SUBJECTS: '項目',

    // SRS Levels
    SRS_LOCKED: 'ロック済み',
    SRS_LESSON: 'レッスン',
    SRS_APPRENTICE: '見習い',
    SRS_GURU: '熟練',
    SRS_MASTER: '達人',
    SRS_ENLIGHTENED: '悟り',
    SRS_BURNED: '焼却',

    // Subject Types
    TYPE_RADICAL: '部首',
    TYPE_KANJI: '漢字',
    TYPE_VOCABULARY: '単語',
    TYPE_KANA_VOCABULARY: 'かな単語',

    // Export Buttons
    EXPORT_CSV_BUTTON: 'CSVエクスポート',
    EXPORT_CONTEXT_SENTENCES_BUTTON: '例文エクスポート',
    EXPORT_LIST_BUTTON: 'リストエクスポート',

    // Common
    REFRESH_DATA_BUTTON: 'データ更新',
    LANGUAGE_BUTTON: 'English',
    SOURCE: 'ソース:',
    SOURCE_CACHE: 'キャッシュ',
    SOURCE_API: 'API',

    // Error Messages
    ERROR_TITLE: 'エラー',
    ERROR_ENV_TOKEN: 'server/.envにWANIKANI_API_TOKENを設定してください',

    // Level Display
    LEVEL_PREFIX: 'Lv',
    LEVEL_SINGLE: 'レベル',
    LEVEL_RANGE_TO: '〜',

    // Parts of Speech - Special
    POS_EMPTY: '(空)',

    // CSV Headers (keep English for CSV compatibility)
    CSV_CHARACTERS: 'Characters',
    CSV_READINGS: 'Readings',
    CSV_MEANINGS: 'Meanings',
    CSV_PARTS_OF_SPEECH: 'Parts of Speech',
    CSV_TRANSITIVITY: 'Transitivity',
    CSV_DAN: 'Dan',
    CSV_TYPE: 'Type',
    CSV_LEVEL: 'Level',
    CSV_SRS_STAGE: 'SRS Stage',
    CSV_JAPANESE: 'Japanese',
    CSV_ENGLISH: 'English',
  },
};

// Current language (can be changed to 'ja' for Japanese)
let currentLanguage = 'en';

// Function to get a string with fallback to English
const getString = (key) => {
  return TRANSLATIONS[currentLanguage]?.[key] ?? TRANSLATIONS.en[key] ?? key;
};

// Function to set the current language
export const setLanguage = (lang) => {
  if (TRANSLATIONS[lang]) {
    currentLanguage = lang;
  }
};

// Function to get the current language
export const getCurrentLanguage = () => currentLanguage;

// UI Display Strings (proxy to always get current language)
export const UI_STRINGS = new Proxy({}, {
  get: (target, prop) => getString(prop)
});

// CSV Export Column Headers
export const CSV_HEADERS = {
  get CHARACTERS() { return getString('CSV_CHARACTERS'); },
  get READINGS() { return getString('CSV_READINGS'); },
  get MEANINGS() { return getString('CSV_MEANINGS'); },
  get PARTS_OF_SPEECH() { return getString('CSV_PARTS_OF_SPEECH'); },
  get TRANSITIVITY() { return getString('CSV_TRANSITIVITY'); },
  get DAN() { return getString('CSV_DAN'); },
  get TYPE() { return getString('CSV_TYPE'); },
  get LEVEL() { return getString('CSV_LEVEL'); },
  get SRS_STAGE() { return getString('CSV_SRS_STAGE'); },
  get JAPANESE() { return getString('CSV_JAPANESE'); },
  get ENGLISH() { return getString('CSV_ENGLISH'); },
};

// File Name Templates
export const FILE_NAMES = {
  CSV_EXPORT: (minLevel, maxLevel) => `wanikani-export-levels-${minLevel}-${maxLevel}.csv`,
  CONTEXT_SENTENCES: (minLevel, maxLevel) => `wanikani-context-sentences-levels-${minLevel}-${maxLevel}.csv`,
  LIST_EXPORT: (minLevel, maxLevel) => `wanikani-list-levels-${minLevel}-${maxLevel}.txt`,
};

// SRS Stage Mappings
export const getSrsLabel = (stage) => {
  const labels = {
    0: getString('SRS_LESSON'),
    1: getString('SRS_APPRENTICE'),
    2: getString('SRS_APPRENTICE'),
    3: getString('SRS_APPRENTICE'),
    4: getString('SRS_APPRENTICE'),
    5: getString('SRS_GURU'),
    6: getString('SRS_GURU'),
    7: getString('SRS_MASTER'),
    8: getString('SRS_ENLIGHTENED'),
    9: getString('SRS_BURNED'),
  };
  return labels[stage] ?? getString('SRS_LOCKED');
};

export const getSrsClass = (stage) => {
  const classes = {
    0: 'srs-lesson',
    1: 'srs-apprentice',
    2: 'srs-apprentice',
    3: 'srs-apprentice',
    4: 'srs-apprentice',
    5: 'srs-guru',
    6: 'srs-guru',
    7: 'srs-master',
    8: 'srs-enlightened',
    9: 'srs-burned',
  };
  return classes[stage] ?? 'srs-locked';
};
