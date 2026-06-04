import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { registerServiceWorker } from "./registerServiceWorker";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  BellRing,
  Check,
  ChevronLeft,
  CirclePause,
  CirclePlay,
  Clock3,
  Download,
  FileMusic,
  Home,
  ListMusic,
  Music2,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  Shirt,
  SlidersHorizontal,
  ShoppingBag,
  Sprout,
  Trash2,
  Trophy,
  Upload,
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "usapon-timer-state-v1";
const BACKUP_VERSION = 1;
const MAX_STORED_SESSIONS = 365;
const FOCUS_PRESETS = [10, 25, 50];
const DEFAULT_DAILY_GOAL_MINUTES = 180;
const ALARM_PATTERN_MS = 9000;
const BGM_DB_NAME = "usapon-timer-bgm";
const BGM_DB_VERSION = 1;
const BGM_STORE_NAME = "tracks";
const BGM_EXPORT_MAX_BLOB_BYTES = 18 * 1024 * 1024;
const VIDEO_AUDIO_TARGET_SAMPLE_RATE = 22050;
const VIDEO_COMPACT_MAX_WIDTH = 480;
const VIDEO_COMPACT_FPS = 18;
const SUPPORTED_BGM_AUDIO_EXTENSIONS = ["m4a", "mp3", "aac", "wav", "ogg"];
const SUPPORTED_BGM_AUDIO_MIME_TYPES = [
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/aacp",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "application/ogg",
];
const SUPPORTED_BGM_AUDIO_LABEL = ".m4a / .mp3 / .aac / .wav / .ogg";
const BGM_FILE_ACCEPT = [
  ...SUPPORTED_BGM_AUDIO_EXTENSIONS.map((extension) => `.${extension}`),
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/ogg",
  "video/*",
].join(",");
const STANDARD_BGM_TRACKS = [
  { id: "standard-bgm-1", name: "標準BGM 1", kind: "audio", type: "standard", src: "audio/study-bgm-1.mp3", mimeType: "audio/mpeg" },
  { id: "standard-bgm-2", name: "標準BGM 2", kind: "audio", type: "standard", src: "audio/study-bgm-2.mp3", mimeType: "audio/mpeg" },
  { id: "standard-bgm-3", name: "標準BGM 3", kind: "audio", type: "standard", src: "audio/study-bgm-3.mp3", mimeType: "audio/mpeg" },
  { id: "standard-bgm-4", name: "標準BGM 4", kind: "audio", type: "standard", src: "audio/study-bgm-4.mp3", mimeType: "audio/mpeg" },
].map((track) => ({ ...track, src: asset(track.src) }));
const STANDARD_BGM_TRACK_IDS = STANDARD_BGM_TRACKS.map((track) => track.id);
const DEFAULT_BGM_PLAYLIST_ID = "playlist-default";
const WORK_TYPES = {
  revenue: "収益作業",
  future: "未来投資作業",
};
const DEFAULT_SUBJECTS = [
  { id: "illustration", label: "イラスト", icon: "quest-japanese.png", color: "#d78b9f", workType: "revenue" },
  { id: "posts", label: "投稿づくり", icon: "quest-social.png", color: "#c98766", workType: "revenue" },
  { id: "app", label: "アプリ制作", icon: "quest-science.png", color: "#7aa6bd", workType: "future" },
  { id: "research", label: "学習・研究", icon: "quest-math.png", color: "#7f985e", workType: "future" },
  { id: "admin", label: "事務・返信", icon: "quest-english.png", color: "#d8b85a", workType: "revenue" },
  { id: "goods", label: "グッズ登録", icon: "quest-free.png", color: "#9aa897", workType: "revenue" },
];
const DEFAULT_CHART_COLORS = Object.fromEntries(DEFAULT_SUBJECTS.map((subject) => [subject.id, subject.color]));
const CHART_COLOR_SWATCHES = ["#7f985e", "#7aa6bd", "#d8b85a", "#c98766", "#d78b9f", "#9aa897", "#b49bd4", "#8f7b67"];
const BASIC_SUBJECT_COLORS = CHART_COLOR_SWATCHES;
const SUBJECT_ICON_OPTIONS = [
  { icon: "quest-japanese.png", label: "イラスト" },
  { icon: "quest-social.png", label: "投稿" },
  { icon: "quest-science.png", label: "制作" },
  { icon: "quest-math.png", label: "研究" },
  { icon: "quest-english.png", label: "返信" },
  { icon: "quest-free.png", label: "登録" },
];
const OUTFITS = [
  { id: "outfit-n-1", name: "森の作業服", cost: 0 },
  { id: "outfit-n-2", name: "やさしいカーデ", cost: 400 },
  { id: "outfit-n-3", name: "リボンワンピース", cost: 600 },
  { id: "outfit-r-1", name: "ナチュラルワンピ", cost: 450 },
  { id: "outfit-sunflower", name: "ひまわりの服", cost: 700, saleCost: 500, saleEndsAt: "2026-06-18T23:59:59+09:00" },
];
const DEFAULT_OUTFIT_ID = "outfit-n-1";
const OUTFIT_IDS = new Set(OUTFITS.map((outfit) => outfit.id));
const STUDY_IMAGES = {
  "outfit-n-1": "study/full/outfit-n-1.png",
  "outfit-n-2": "study/full/outfit-n-2.png",
  "outfit-n-3": "study/full/outfit-n-3.png",
  "outfit-r-1": "study/full/outfit-r-1.png",
  "outfit-sunflower": "study/full/outfit-sunflower.png",
};
const SUBJECT_ICON_VERSION = "20260601-usapon-work";
const yenFormatter = new Intl.NumberFormat("ja-JP");

function asset(path) {
  if (!path) return "";
  const clean = path.startsWith("/assets/") ? path.slice(1) : `assets/${path}`;
  return `${import.meta.env.BASE_URL}${clean}`;
}

function subjectIconSrc(icon) {
  return `${asset(`crops/${icon}`)}?v=${SUBJECT_ICON_VERSION}`;
}

function studyImageFor(outfitId) {
  return STUDY_IMAGES[outfitId] || STUDY_IMAGES[DEFAULT_OUTFIT_ID];
}

function outfitSaleActive(outfit, at = Date.now()) {
  if (!outfit?.saleCost || !outfit?.saleEndsAt) return false;
  return at <= new Date(outfit.saleEndsAt).getTime();
}

function outfitPrice(outfit, at = Date.now()) {
  return outfitSaleActive(outfit, at) ? outfit.saleCost : outfit.cost;
}

function outfitSaleLabel(outfit) {
  if (!outfit?.saleEndsAt) return "";
  const end = new Date(outfit.saleEndsAt);
  if (Number.isNaN(end.getTime())) return "";
  return `${end.getMonth() + 1}/${end.getDate()}まで`;
}

function todayKey() {
  return dateKeyFor(new Date());
}

function defaultState() {
  return {
    appName: "うさぽんタイマー",
    points: 0,
    totalMinutes: 0,
    todayMinutes: 0,
    dailyGoalMinutes: DEFAULT_DAILY_GOAL_MINUTES,
    today: todayKey(),
    streak: 0,
    selectedSubject: DEFAULT_SUBJECTS[0].id,
    subjects: DEFAULT_SUBJECTS,
    selectedOutfitId: DEFAULT_OUTFIT_ID,
    unlockedOutfits: [DEFAULT_OUTFIT_ID],
    sessions: [],
    salesByMonth: {},
    salesByDay: {},
    sound: {
      bgm: false,
      selectedPlaylistId: DEFAULT_BGM_PLAYLIST_ID,
      customTracks: [],
      playlists: [
        {
          id: DEFAULT_BGM_PLAYLIST_ID,
          name: "いつものBGM",
          trackIds: STANDARD_BGM_TRACK_IDS,
        },
      ],
    },
    timer: {
      mode: "focus",
      focusMinutes: 25,
      running: false,
      startedAt: null,
      elapsedBeforeStart: 0,
      alarmFiredAt: null,
      lastDisplaySeconds: 25 * 60,
    },
    chartSettings: {
      visibleSubjects: DEFAULT_SUBJECTS.map((subject) => subject.id),
      colors: DEFAULT_CHART_COLORS,
    },
  };
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isLegacyStudySubjects(subjects) {
  if (!Array.isArray(subjects)) return false;
  const legacyIds = new Set(["math", "english", "science", "social", "japanese", "free"]);
  return subjects.length === 6 && subjects.every((subject) => legacyIds.has(subject?.id) && !subject?.workType);
}

function normalizeSubjects(rawSubjects) {
  if (!Array.isArray(rawSubjects) || rawSubjects.length === 0 || isLegacyStudySubjects(rawSubjects)) {
    return DEFAULT_SUBJECTS;
  }
  const seen = new Set();
  const subjects = rawSubjects.map((subject, index) => {
    const defaultSubject = DEFAULT_SUBJECTS.find((item) => item.id === subject?.id);
    const id = typeof subject?.id === "string" && subject.id.trim()
      ? subject.id.trim().replace(/[^a-zA-Z0-9_-]/g, "-")
      : `custom-${Date.now()}-${index}`;
    if (seen.has(id)) return null;
    seen.add(id);
    const label = typeof subject?.label === "string" && subject.label.trim()
      ? subject.label.trim().slice(0, 12)
      : defaultSubject?.label || `項目${index + 1}`;
    const icon = typeof subject?.icon === "string" && subject.icon.trim()
      ? subject.icon
      : defaultSubject?.icon || "quest-free.png";
    const color = isHexColor(subject?.color)
      ? subject.color
      : defaultSubject?.color || CHART_COLOR_SWATCHES[index % CHART_COLOR_SWATCHES.length];
    const workType = subject?.workType === "future" ? "future" : subject?.workType === "revenue" ? "revenue" : defaultSubject?.workType || "revenue";
    return { id, label, icon, color, workType };
  }).filter(Boolean).slice(0, 12);
  return subjects.length ? subjects : DEFAULT_SUBJECTS;
}

function normalizeSalesByMonth(rawSales) {
  if (!rawSales || typeof rawSales !== "object") return {};
  return Object.fromEntries(Object.entries(rawSales).filter(([month]) => /^\d{4}-\d{2}$/.test(month)).map(([month, value]) => [
    month,
    {
      amount: Math.max(0, Number(value?.amount || 0)),
      memo: typeof value?.memo === "string" ? value.memo.slice(0, 120) : "",
      updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
    },
  ]));
}

function normalizeSalesByDay(rawSales) {
  if (!rawSales || typeof rawSales !== "object") return {};
  return Object.fromEntries(Object.entries(rawSales).filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date)).map(([date, value]) => [
    date,
    {
      amount: Math.max(0, Number(value?.amount || 0)),
      memo: typeof value?.memo === "string" ? value.memo.slice(0, 120) : "",
      updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : null,
    },
  ]));
}

function normalizeSession(rawSession, subjects) {
  const subjectIds = new Set(subjects.map((subject) => subject.id));
  const subject = subjectIds.has(rawSession?.subject) ? rawSession.subject : subjects[0].id;
  const minutes = Math.max(1, Math.round(Number(rawSession?.minutes || 1)));
  return {
    id: typeof rawSession?.id === "string" ? rawSession.id : `${Date.now()}-${Math.random()}`,
    date: typeof rawSession?.date === "string" ? rawSession.date : todayKey(),
    subject,
    mode: rawSession?.mode === "free" ? "free" : "focus",
    minutes,
    reward: Math.max(0, Math.round(Number(rawSession?.reward || minutes))),
    completedAt: typeof rawSession?.completedAt === "string" ? rawSession.completedAt : new Date().toISOString(),
    doneText: typeof rawSession?.doneText === "string" ? rawSession.doneText.slice(0, 80) : "",
    outputMemo: typeof rawSession?.outputMemo === "string" ? rawSession.outputMemo.slice(0, 120) : "",
    mood: typeof rawSession?.mood === "string" ? rawSession.mood.slice(0, 16) : "",
    outputCount: Math.max(0, Math.round(Number(rawSession?.outputCount || 0))),
  };
}

function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const today = todayKey();
  const sameDay = raw.today === today;
  const subjects = normalizeSubjects(raw.subjects);
  const rawUnlocked = Array.isArray(raw.unlockedOutfits) && raw.unlockedOutfits.length ? raw.unlockedOutfits : base.unlockedOutfits;
  const unlocked = rawUnlocked.filter((id) => OUTFIT_IDS.has(id));
  if (!unlocked.includes(DEFAULT_OUTFIT_ID)) unlocked.unshift(DEFAULT_OUTFIT_ID);
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions.map((session) => normalizeSession(session, subjects)).slice(0, MAX_STORED_SESSIONS)
    : [];
  return {
    ...base,
    ...raw,
    appName: typeof raw.appName === "string" && raw.appName.trim() && raw.appName.trim() !== "usapon-timer" ? raw.appName.trim().slice(0, 30) : base.appName,
    today,
    todayMinutes: sameDay ? Math.max(0, Number(raw.todayMinutes || 0)) : 0,
    dailyGoalMinutes: normalizeGoalMinutes(raw.dailyGoalMinutes),
    points: Math.max(0, Number(raw.points || 0)),
    totalMinutes: Math.max(0, Number(raw.totalMinutes || 0)),
    streak: Math.max(0, Number(raw.streak || 0)),
    subjects,
    selectedSubject: subjects.some((item) => item.id === raw.selectedSubject) ? raw.selectedSubject : subjects[0].id,
    selectedOutfitId: unlocked.includes(raw.selectedOutfitId) ? raw.selectedOutfitId : unlocked[0] || DEFAULT_OUTFIT_ID,
    unlockedOutfits: unlocked,
    sessions,
    salesByMonth: normalizeSalesByMonth(raw.salesByMonth),
    salesByDay: normalizeSalesByDay(raw.salesByDay),
    sound: normalizeSound(raw.sound, base.sound),
    timer: { ...base.timer, ...(raw.timer || {}) },
    chartSettings: normalizeChartSettings(raw.chartSettings, subjects, base.chartSettings),
  };
}

function normalizeGoalMinutes(value) {
  const minutes = Math.round(Number(value || DEFAULT_DAILY_GOAL_MINUTES));
  return Number.isFinite(minutes) ? Math.min(720, Math.max(15, minutes)) : DEFAULT_DAILY_GOAL_MINUTES;
}

function normalizeChartSettings(settings, subjects = DEFAULT_SUBJECTS, baseSettings = defaultState().chartSettings) {
  const visible = Array.isArray(settings?.visibleSubjects)
    ? settings.visibleSubjects.filter((id) => subjects.some((subject) => subject.id === id))
    : baseSettings.visibleSubjects.filter((id) => subjects.some((subject) => subject.id === id));
  const colors = Object.fromEntries(subjects.map((subject) => [subject.id, subject.color]));
  if (settings?.colors && typeof settings.colors === "object") {
    subjects.forEach((subject) => {
      const color = settings.colors[subject.id];
      if (isHexColor(color)) colors[subject.id] = color;
    });
  }
  return { visibleSubjects: visible.length ? visible : [subjects[0].id], colors };
}

function normalizeSound(rawSound, baseSound = defaultState().sound) {
  const rawTracks = Array.isArray(rawSound?.customTracks) ? rawSound.customTracks : [];
  const seenTracks = new Set();
  const customTracks = rawTracks
    .map((track) => {
      const id = typeof track?.id === "string" && track.id.trim() ? track.id.trim() : "";
      if (!id || seenTracks.has(id)) return null;
      seenTracks.add(id);
      const name = typeof track?.name === "string" && track.name.trim() ? track.name.trim().slice(0, 80) : "追加BGM";
      const kind = track?.kind === "video" ? "video" : "audio";
      const mimeType = typeof track?.mimeType === "string" ? track.mimeType : "";
      const createdAt = typeof track?.createdAt === "string" ? track.createdAt : new Date().toISOString();
      return { id, name, kind, type: "custom", mimeType, createdAt };
    })
    .filter(Boolean)
    .slice(0, 80);
  const validTrackIds = new Set([...STANDARD_BGM_TRACK_IDS, ...customTracks.map((track) => track.id)]);
  const rawPlaylists = Array.isArray(rawSound?.playlists) ? rawSound.playlists : [];
  const seenPlaylists = new Set();
  const playlists = rawPlaylists
    .map((playlist, index) => {
      const id = typeof playlist?.id === "string" && playlist.id.trim() ? playlist.id.trim() : `playlist-${index + 1}`;
      if (seenPlaylists.has(id)) return null;
      seenPlaylists.add(id);
      const name = typeof playlist?.name === "string" && playlist.name.trim() ? playlist.name.trim().slice(0, 30) : `プレイリスト${index + 1}`;
      const trackIds = Array.isArray(playlist?.trackIds)
        ? playlist.trackIds.filter((trackId) => validTrackIds.has(trackId))
        : [];
      return { id, name, trackIds };
    })
    .filter(Boolean);
  if (!playlists.some((playlist) => playlist.id === DEFAULT_BGM_PLAYLIST_ID)) {
    playlists.unshift({
      id: DEFAULT_BGM_PLAYLIST_ID,
      name: "いつものBGM",
      trackIds: STANDARD_BGM_TRACK_IDS,
    });
  }
  const selectedPlaylistId = playlists.some((playlist) => playlist.id === rawSound?.selectedPlaylistId)
    ? rawSound.selectedPlaylistId
    : playlists[0].id;
  return {
    ...baseSound,
    ...(rawSound || {}),
    bgm: Boolean(rawSound?.bgm),
    selectedPlaylistId,
    playlists,
    customTracks,
  };
}

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return defaultState();
  }
}

function dateKeyFor(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKeyFor(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dateFromMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(monthKey, amount) {
  const date = dateFromMonthKey(monthKey);
  date.setMonth(date.getMonth() + amount);
  return monthKeyFor(date);
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addWeeks(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount * 7);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sameDateKey(left, right) {
  return dateKeyFor(left) === dateKeyFor(right);
}

function formatWeekRange(weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return `${formatMonthDay(weekStart)} - ${formatMonthDay(weekEnd)}`;
}

function buildWeeklyChart(sessions, subjects, weekStart) {
  const start = startOfWeek(weekStart);
  const labels = ["月", "火", "水", "木", "金", "土", "日"];
  const days = labels.map((label, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      label,
      date: dateKeyFor(date),
      dateLabel: formatMonthDay(date),
      total: 0,
      subjects: Object.fromEntries(subjects.map((subject) => [subject.id, 0])),
    };
  });
  sessions.forEach((session) => {
    const day = days.find((item) => item.date === session.date);
    if (!day || !Object.prototype.hasOwnProperty.call(day.subjects, session.subject)) return;
    const minutes = Math.max(0, Number(session.minutes || 0));
    day.subjects[session.subject] += minutes;
    day.total += minutes;
  });
  return days;
}

function buildMonthlyStats(state, subjects, monthKey) {
  const monthSessions = state.sessions.filter((session) => session.date?.startsWith(monthKey));
  const categoryMinutes = Object.fromEntries(subjects.map((subject) => [subject.id, 0]));
  let totalMinutes = 0;
  let outputCount = 0;
  let revenueMinutes = 0;
  let futureMinutes = 0;
  monthSessions.forEach((session) => {
    const subject = subjects.find((item) => item.id === session.subject);
    const minutes = Math.max(0, Number(session.minutes || 0));
    totalMinutes += minutes;
    outputCount += Math.max(0, Number(session.outputCount || 0));
    if (subject) {
      categoryMinutes[subject.id] += minutes;
      if (subject.workType === "future") futureMinutes += minutes;
      else revenueMinutes += minutes;
    }
  });
  const monthlySales = Math.max(0, Number(state.salesByMonth?.[monthKey]?.amount || 0));
  const dailySales = Object.entries(state.salesByDay || {})
    .filter(([date]) => date.startsWith(monthKey))
    .reduce((sum, [, value]) => sum + Math.max(0, Number(value?.amount || 0)), 0);
  const sales = monthlySales + dailySales;
  const hourlyRate = totalMinutes > 0 ? Math.round(sales / (totalMinutes / 60)) : null;
  return { monthSessions, categoryMinutes, totalMinutes, outputCount, revenueMinutes, futureMinutes, monthlySales, dailySales, sales, hourlyRate };
}

function displaySeconds(timer, nowTick) {
  const elapsed = elapsedSeconds(timer, nowTick);
  if (timer.mode === "free") return elapsed;
  return Math.max(0, Number(timer.focusMinutes || 25) * 60 - elapsed);
}

function elapsedSeconds(timer, nowTick) {
  const elapsedRunning = timer.running && timer.startedAt ? Math.floor((nowTick - timer.startedAt) / 1000) : 0;
  return Math.max(0, Number(timer.elapsedBeforeStart || 0) + elapsedRunning);
}

function focusDurationSeconds(timer) {
  return Math.max(1, Number(timer.focusMinutes || 25) * 60);
}

function rewardFor(minutes) {
  return Math.max(0, Math.round(Number(minutes || 0)));
}

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatHours(totalMinutes) {
  const safe = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function formatChartTotal(totalMinutes) {
  const safe = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (!hours) return `${minutes}分`;
  if (!minutes) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

function formatChartAxis(totalMinutes) {
  const safe = Math.max(0, Math.round(totalMinutes || 0));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h${minutes}`;
}

function formatCurrency(amount) {
  return `¥${yenFormatter.format(Math.max(0, Math.round(Number(amount || 0))))}`;
}

function backupFileName() {
  return `usapon-timer-backup-${todayKey()}.json`;
}

function bgmLibraryFileName() {
  return `usapon-timer-bgm-library-${todayKey()}.json`;
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function inferBgmKind(file) {
  const type = file?.type || "";
  const extension = fileExtension(file);
  if (isSupportedBgmAudioFile(file)) return "audio";
  const name = (file?.name || "").toLowerCase();
  if (type.startsWith("video/") || ["mov", "mp4", "m4v", "webm"].includes(extension) || /\.(mov|mp4|m4v|webm)$/i.test(name)) return "video";
  return "";
}

function fileExtension(file) {
  const name = (file?.name || "").toLowerCase();
  const match = name.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function normalizedMimeType(type) {
  return String(type || "").split(";")[0].trim().toLowerCase();
}

function mimeTypeForAudioExtension(extension) {
  return {
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    aac: "audio/aac",
    wav: "audio/wav",
    ogg: "audio/ogg",
  }[extension] || "";
}

function isSupportedBgmAudioFile(file) {
  const extension = fileExtension(file);
  const mimeType = normalizedMimeType(file?.type);
  return SUPPORTED_BGM_AUDIO_EXTENSIONS.includes(extension) || SUPPORTED_BGM_AUDIO_MIME_TYPES.includes(mimeType);
}

function audioMimeCandidates(file) {
  const extension = fileExtension(file);
  const mimeType = normalizedMimeType(file?.type);
  return [...new Set([
    mimeType,
    mimeTypeForAudioExtension(extension),
    extension === "m4a" ? "audio/x-m4a" : "",
    extension === "mp3" ? "audio/mp3" : "",
  ].filter(Boolean))];
}

async function verifyAudioFilePlayable(file) {
  if (!isSupportedBgmAudioFile(file)) {
    throw new Error("unsupported audio format");
  }
  const audio = document.createElement("audio");
  const candidates = audioMimeCandidates(file);
  const hasLikelyType = !candidates.length || candidates.some((mimeType) => {
    const result = audio.canPlayType(mimeType);
    return result === "probably" || result === "maybe";
  });
  if (!hasLikelyType) {
    throw new Error("audio format not playable");
  }
  await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    };
    const succeed = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error("audio metadata unavailable"));
    };
    const timeoutId = window.setTimeout(fail, 5000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      window.clearTimeout(timeoutId);
      succeed();
    };
    audio.oncanplay = () => {
      window.clearTimeout(timeoutId);
      succeed();
    };
    audio.onerror = () => {
      window.clearTimeout(timeoutId);
      fail();
    };
    audio.src = url;
    audio.load();
  });
}

function encodeMonoWavFromAudioBuffer(audioBuffer, targetSampleRate = VIDEO_AUDIO_TARGET_SAMPLE_RATE) {
  const duration = audioBuffer.duration || 0;
  const sourceSampleRate = audioBuffer.sampleRate || targetSampleRate;
  const sampleCount = Math.max(1, Math.floor(duration * targetSampleRate));
  const pcmBytes = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + pcmBytes);
  const view = new DataView(buffer);
  const channels = [];
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
    channels.push(audioBuffer.getChannelData(channel));
  }

  function writeString(offset, value) {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcmBytes, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcmBytes, true);

  for (let index = 0; index < sampleCount; index += 1) {
    const sourceIndex = Math.min(channels[0].length - 1, Math.floor((index * sourceSampleRate) / targetSampleRate));
    let sample = 0;
    for (const channelData of channels) {
      sample += channelData[sourceIndex] || 0;
    }
    sample = Math.max(-1, Math.min(1, sample / Math.max(1, channels.length)));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

async function tryConvertVideoToAudioBlob(file) {
  const context = createAudioContext();
  if (!context?.decodeAudioData) throw new Error("audio decode unavailable");
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await context.decodeAudioData(arrayBuffer);
    return encodeMonoWavFromAudioBuffer(decoded);
  } finally {
    context.close?.();
  }
}

function pickMediaRecorderMimeType() {
  if (!window.MediaRecorder) return "";
  const types = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find((type) => window.MediaRecorder.isTypeSupported?.(type)) || "";
}

function loadVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const width = video.videoWidth || VIDEO_COMPACT_MAX_WIDTH;
      const height = video.videoHeight || VIDEO_COMPACT_MAX_WIDTH;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(url);
      resolve({ width, height, duration });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video metadata unavailable"));
    };
    video.src = url;
  });
}

async function tryCompactVideoBlob(file) {
  const mimeType = pickMediaRecorderMimeType();
  if (!mimeType) throw new Error("media recorder unavailable");
  const metadata = await loadVideoMetadata(file);
  const scale = Math.min(1, VIDEO_COMPACT_MAX_WIDTH / Math.max(1, metadata.width));
  const width = Math.max(1, Math.round(metadata.width * scale));
  const height = Math.max(1, Math.round(metadata.height * scale));
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context || !canvas.captureStream) {
    URL.revokeObjectURL(url);
    throw new Error("canvas capture unavailable");
  }

  await new Promise((resolve, reject) => {
    video.onloadeddata = resolve;
    video.onerror = () => reject(new Error("video load unavailable"));
    video.src = url;
  });

  const outputStream = canvas.captureStream(VIDEO_COMPACT_FPS);
  const audioContext = createAudioContext();
  if (audioContext?.createMediaElementSource && audioContext?.createMediaStreamDestination) {
    try {
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      destination.stream.getAudioTracks().forEach((track) => outputStream.addTrack(track));
    } catch {
      // Keep the resized video even if the browser will not expose the audio track.
    }
  }

  const chunks = [];
  const recorder = new MediaRecorder(outputStream, { mimeType, videoBitsPerSecond: 450_000 });
  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onstop = resolve;
    recorder.onerror = () => reject(recorder.error || new Error("video compact unavailable"));
  });

  let drawTimer = null;
  function drawFrame() {
    context.drawImage(video, 0, 0, width, height);
  }

  recorder.start(1000);
  drawTimer = window.setInterval(drawFrame, Math.round(1000 / VIDEO_COMPACT_FPS));
  drawFrame();
  await video.play();
  await new Promise((resolve) => {
    video.onended = resolve;
    const maxDuration = metadata.duration ? (metadata.duration + 1) * 1000 : 180000;
    window.setTimeout(resolve, maxDuration);
  });
  if (recorder.state !== "inactive") recorder.stop();
  await done;
  if (drawTimer) window.clearInterval(drawTimer);
  video.pause();
  audioContext?.close?.();
  URL.revokeObjectURL(url);

  if (!chunks.length) throw new Error("video compact empty");
  return new Blob(chunks, { type: recorder.mimeType || mimeType });
}

async function prepareVideoBgmBlob(file) {
  try {
    const audioBlob = await tryConvertVideoToAudioBlob(file);
    return { blob: audioBlob, kind: "audio", mimeType: audioBlob.type || "audio/wav", status: "audio" };
  } catch {
    // Try a smaller video when the browser cannot decode audio directly from the video file.
  }
  try {
    const compactBlob = await tryCompactVideoBlob(file);
    return { blob: compactBlob, kind: "video", mimeType: compactBlob.type || "video/mp4", status: "compact-video" };
  } catch {
    return { blob: file, kind: "video", mimeType: file.type, status: "original-video" };
  }
}

function openBgmDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("このブラウザでは端末保存を使えません"));
      return;
    }
    const request = indexedDB.open(BGM_DB_NAME, BGM_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BGM_STORE_NAME)) {
        db.createObjectStore(BGM_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("BGM保存を開けませんでした"));
  });
}

async function putBgmBlob(trackId, blob) {
  const db = await openBgmDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
    transaction.objectStore(BGM_STORE_NAME).put(blob, trackId);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("BGMを保存できませんでした"));
    };
  });
}

async function getBgmBlob(trackId) {
  const db = await openBgmDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BGM_STORE_NAME, "readonly");
    const request = transaction.objectStore(BGM_STORE_NAME).get(trackId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("BGMを読み込めませんでした"));
    };
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("BGMを読み込めませんでした"));
    };
  });
}

async function listBgmBlobIds() {
  const db = await openBgmDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(BGM_STORE_NAME, "readonly");
    const store = transaction.objectStore(BGM_STORE_NAME);
    if (!store.getAllKeys) {
      db.close();
      resolve([]);
      return;
    }
    const request = store.getAllKeys();
    request.onsuccess = () => resolve((request.result || []).map(String));
    request.onerror = () => resolve([]);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      resolve([]);
    };
  });
}

async function deleteBgmBlob(trackId) {
  const db = await openBgmDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BGM_STORE_NAME, "readwrite");
    transaction.objectStore(BGM_STORE_NAME).delete(trackId);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("BGMを削除できませんでした"));
    };
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("ファイルを読み込めませんでした"));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("invalid data url");
  }
  const match = dataUrl.match(/^data:([^;,]*)(;base64)?,(.*)$/s);
  if (!match) throw new Error("invalid data url");
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";
  if (!isBase64) {
    return new Blob([decodeURIComponent(payload)], { type: mimeType });
  }
  const binary = atob(payload.replace(/\s/g, ""));
  const chunks = [];
  const chunkSize = 1024 * 512;
  for (let offset = 0; offset < binary.length; offset += chunkSize) {
    const slice = binary.slice(offset, offset + chunkSize);
    const bytes = new Uint8Array(slice.length);
    for (let index = 0; index < slice.length; index += 1) {
      bytes[index] = slice.charCodeAt(index);
    }
    chunks.push(bytes);
  }
  return new Blob(chunks, { type: mimeType });
}

function extractBgmLibraryPayload(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (Array.isArray(parsed.playlists)) {
    return parsed;
  }
  const sound = parsed.sound || parsed.data?.sound || parsed.account?.data?.sound;
  if (sound && Array.isArray(sound.playlists)) {
    return {
      app: "usapon-timer-bgm-library",
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      deviceName: parsed.deviceName || "この端末",
      selectedPlaylistId: sound.selectedPlaylistId,
      playlists: sound.playlists,
      customTracks: sound.customTracks || [],
    };
  }
  return null;
}

function makeJsonFile(filename, payload) {
  const blob = new Blob([typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)], { type: "application/json" });
  return new File([blob], filename, { type: "application/json" });
}

async function shareFile(file) {
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: file.name });
    return "shared";
  }
  throw new Error("share unavailable");
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

function customTrackIdsFromSound(sound) {
  const ids = new Set();
  (sound?.customTracks || []).forEach((track) => {
    if (track?.id && !STANDARD_BGM_TRACK_IDS.includes(track.id)) ids.add(track.id);
  });
  (sound?.playlists || []).forEach((playlist) => {
    (playlist?.trackIds || []).forEach((trackId) => {
      if (trackId && !STANDARD_BGM_TRACK_IDS.includes(trackId)) ids.add(trackId);
    });
  });
  return [...ids];
}

function fallbackCustomTrack(trackId, blob) {
  const kind = blob?.type?.startsWith("video/") ? "video" : "audio";
  const extension = kind === "video" ? "mp4" : "mp3";
  return {
    id: trackId,
    name: `追加BGM-${trackId.slice(-6)}`,
    kind,
    type: "custom",
    mimeType: blob?.type || (kind === "video" ? "video/mp4" : "audio/mpeg"),
    createdAt: new Date().toISOString(),
    fileName: `${trackId}.${extension}`,
  };
}

function deleteBgmDb() {
  return new Promise((resolve) => {
    if (!("indexedDB" in window)) {
      resolve();
      return;
    }
    const request = indexedDB.deleteDatabase(BGM_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState("home");
  const [nowTick, setNowTick] = useState(Date.now());
  const [completionDraft, setCompletionDraft] = useState(null);
  const [rewardToast, setRewardToast] = useState(null);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);
  const [bgmLibraryMessage, setBgmLibraryMessage] = useState("");
  const [pendingBgmExportFile, setPendingBgmExportFile] = useState(null);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState(() => (
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  ));
  const stateRef = useRef(state);
  const audioContextRef = useRef(null);
  const alarmTimeoutsRef = useRef([]);
  const bgmAudioRef = useRef(null);
  const bgmTrackIndexRef = useRef(0);
  const bgmCurrentTrackIdRef = useRef(null);
  const bgmObjectUrlRef = useRef(null);
  const bgmPreviewTimeoutRef = useRef(null);
  const bgmLibraryPreviewRef = useRef(null);
  const bgmLibraryPreviewUrlRef = useRef(null);
  const subjects = state.subjects?.length ? state.subjects : DEFAULT_SUBJECTS;
  const activeOutfit = OUTFITS.find((item) => item.id === state.selectedOutfitId) || OUTFITS[0];
  const selectedSubject = subjects.find((item) => item.id === state.selectedSubject) || subjects[0];
  const remainingOrElapsed = displaySeconds(state.timer, nowTick);
  const spentSeconds = elapsedSeconds(state.timer, nowTick);
  const focusDuration = focusDurationSeconds(state.timer);
  const focusOvertimeSeconds = state.timer.mode === "focus" ? Math.max(0, spentSeconds - focusDuration) : 0;
  const timerDisplayValue = state.timer.mode === "focus" && focusOvertimeSeconds > 0 ? focusOvertimeSeconds : remainingOrElapsed;
  const progress = state.timer.mode === "focus" ? Math.min(1, spentSeconds / focusDuration) : Math.min(1, spentSeconds / (25 * 60));
  const dailyGoalProgress = Math.min(1, (state.todayMinutes || 0) / Math.max(1, state.dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES));
  const bgmPlaylistSignature = JSON.stringify(state.sound?.playlists || []);

  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (state.timer.mode === "focus" && state.timer.running && remainingOrElapsed <= 0 && !state.timer.alarmFiredAt && !completionDraft) {
      fireTimerFinishedAlarm();
    }
  }, [remainingOrElapsed, state.timer.mode, state.timer.running, state.timer.alarmFiredAt, completionDraft]);

  useEffect(() => {
    function handleVisibilityOrFocus() {
      setNowTick(Date.now());
      if (state.timer.mode === "focus" && state.timer.running && displaySeconds(state.timer, Date.now()) <= 0 && !state.timer.alarmFiredAt && !completionDraft) {
        fireTimerFinishedAlarm();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("pageshow", handleVisibilityOrFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("pageshow", handleVisibilityOrFocus);
    };
  }, [state.timer, completionDraft]);

  useEffect(() => () => {
    stopBgm();
    stopBgmLibraryPreview();
    if (bgmObjectUrlRef.current) URL.revokeObjectURL(bgmObjectUrlRef.current);
    stopAlarm();
  }, []);

  useEffect(() => {
    if (state.sound?.bgm && state.timer.running && tab === "timer") {
      startBgm();
    } else {
      stopBgm();
    }
  }, [state.sound?.bgm, state.timer.running, tab]);

  useEffect(() => {
    bgmTrackIndexRef.current = 0;
    bgmCurrentTrackIdRef.current = null;
    if (bgmAudioRef.current) bgmAudioRef.current.pause();
    if (bgmObjectUrlRef.current) {
      URL.revokeObjectURL(bgmObjectUrlRef.current);
      bgmObjectUrlRef.current = null;
    }
    if (state.sound?.bgm && state.timer.running && tab === "timer") {
      startBgm();
    }
  }, [state.sound?.selectedPlaylistId, bgmPlaylistSignature]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && state.sound?.bgm && state.timer.running && tab === "timer") {
        startBgm();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [state.sound?.bgm, state.timer.running, tab]);

  function ensureAudioContext() {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = AudioContextClass ? new AudioContextClass() : null;
    }
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }

  function allBgmTracks(current = stateRef.current) {
    return [...STANDARD_BGM_TRACKS, ...(current.sound?.customTracks || [])];
  }

  function selectedBgmTrackIds(current = stateRef.current) {
    const sound = current.sound || {};
    const playlist = (sound.playlists || []).find((item) => item.id === sound.selectedPlaylistId) || sound.playlists?.[0];
    const ids = Array.isArray(playlist?.trackIds) ? playlist.trackIds : [];
    const validIds = new Set(allBgmTracks(current).map((track) => track.id));
    return ids.filter((id) => validIds.has(id));
  }

  function findBgmTrack(trackId, current = stateRef.current) {
    return allBgmTracks(current).find((track) => track.id === trackId) || null;
  }

  function createBgmMediaElement(kind) {
    const media = document.createElement(kind === "video" ? "video" : "audio");
    media.loop = false;
    media.volume = 0.28;
    media.preload = "auto";
    media.playsInline = true;
    media.addEventListener("ended", () => {
      playNextBgmTrack();
    });
    bgmAudioRef.current = media;
    return media;
  }

  async function resolveBgmSrc(track) {
    if (!track) throw new Error("BGMが見つかりません");
    if (track.type === "standard") return track.src;
    const blob = await getBgmBlob(track.id);
    if (!blob) throw new Error("端末内のBGMファイルを読み込めませんでした");
    if (bgmObjectUrlRef.current) URL.revokeObjectURL(bgmObjectUrlRef.current);
    bgmObjectUrlRef.current = URL.createObjectURL(blob);
    return bgmObjectUrlRef.current;
  }

  async function prepareBgmMedia(track) {
    let media = bgmAudioRef.current;
    if (!media || (track.kind === "video" && media.tagName !== "VIDEO") || (track.kind !== "video" && media.tagName !== "AUDIO")) {
      if (media) media.pause();
      media = createBgmMediaElement(track.kind);
    }
    if (bgmCurrentTrackIdRef.current !== track.id) {
      media.src = await resolveBgmSrc(track);
      bgmCurrentTrackIdRef.current = track.id;
      media.currentTime = 0;
    }
    return media;
  }

  async function playBgmAtIndex(index = bgmTrackIndexRef.current) {
    const ids = selectedBgmTrackIds();
    if (!ids.length) return;
    const safeIndex = ((index % ids.length) + ids.length) % ids.length;
    bgmTrackIndexRef.current = safeIndex;
    const track = findBgmTrack(ids[safeIndex]);
    const media = await prepareBgmMedia(track);
    await media.play();
  }

  function playNextBgmTrack() {
    const ids = selectedBgmTrackIds();
    if (!ids.length) return;
    playBgmAtIndex((bgmTrackIndexRef.current + 1) % ids.length).catch(() => {});
  }

  function startBgm() {
    ensureAudioContext();
    playBgmAtIndex().catch(() => {});
  }

  function playBgmPreview() {
    ensureAudioContext();
    if (bgmPreviewTimeoutRef.current) {
      window.clearTimeout(bgmPreviewTimeoutRef.current);
      bgmPreviewTimeoutRef.current = null;
    }
    bgmTrackIndexRef.current = 0;
    playBgmAtIndex(0).then(() => {
      if (bgmAudioRef.current) bgmAudioRef.current.currentTime = 0;
    }).catch(() => {});
    if (!(state.sound?.bgm && state.timer.running && tab === "timer")) {
      bgmPreviewTimeoutRef.current = window.setTimeout(() => {
        bgmAudioRef.current?.pause();
        bgmPreviewTimeoutRef.current = null;
      }, 8000);
    }
  }

  function stopBgm() {
    const audio = bgmAudioRef.current;
    if (bgmPreviewTimeoutRef.current) {
      window.clearTimeout(bgmPreviewTimeoutRef.current);
      bgmPreviewTimeoutRef.current = null;
    }
    if (audio) audio.pause();
  }

  function stopBgmLibraryPreview() {
    const media = bgmLibraryPreviewRef.current;
    if (media) {
      media.pause();
      media.src = "";
    }
    bgmLibraryPreviewRef.current = null;
    if (bgmLibraryPreviewUrlRef.current) {
      URL.revokeObjectURL(bgmLibraryPreviewUrlRef.current);
      bgmLibraryPreviewUrlRef.current = null;
    }
  }

  async function toggleBgmLibraryPreview(trackId) {
    const track = findBgmTrack(trackId);
    if (!track) return;
    if (bgmLibraryPreviewRef.current?.dataset?.trackId === trackId && !bgmLibraryPreviewRef.current.paused) {
      stopBgmLibraryPreview();
      setBgmLibraryMessage("試聴を停止しました");
      return;
    }
    stopBgmLibraryPreview();
    try {
      const media = document.createElement(track.kind === "video" ? "video" : "audio");
      media.dataset.trackId = trackId;
      media.volume = 0.42;
      media.playsInline = true;
      media.preload = "auto";
      media.onended = () => {
        stopBgmLibraryPreview();
        setBgmLibraryMessage("試聴が終わりました");
      };
      if (track.type === "standard") {
        media.src = track.src;
      } else {
        const blob = await getBgmBlob(track.id);
        if (!blob) throw new Error("missing bgm blob");
        bgmLibraryPreviewUrlRef.current = URL.createObjectURL(blob);
        media.src = bgmLibraryPreviewUrlRef.current;
      }
      bgmLibraryPreviewRef.current = media;
      await media.play();
      setBgmLibraryMessage(`「${track.name}」を試聴中です`);
    } catch {
      stopBgmLibraryPreview();
      setBgmLibraryMessage("このBGMは試聴できませんでした");
    }
  }

  function stopAlarm() {
    alarmTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    alarmTimeoutsRef.current = [];
  }

  function playAlarmTone(context, startOffset = 0) {
    [0, 0.16, 0.34].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = [784, 988, 1318][index];
      const at = context.currentTime + startOffset + offset;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.28);
    });
  }

  function playAlarm() {
    if (!alarmEnabled) return;
    stopAlarm();
    const context = ensureAudioContext();
    if (context) {
      const repeats = Math.ceil(ALARM_PATTERN_MS / 1300);
      Array.from({ length: repeats }).forEach((_, index) => {
        const timeoutId = window.setTimeout(() => playAlarmTone(context), index * 1300);
        alarmTimeoutsRef.current.push(timeoutId);
      });
    }
    if (navigator.vibrate) {
      navigator.vibrate([250, 120, 250, 120, 500]);
    }
  }

  async function showTimerNotification(session) {
    if (!alarmEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("うさぽんタイマー", {
          body: `${session.minutes}分の作業が終わりました。記録を残しましょう。`,
          icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
          badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
          tag: "usapon-timer-finished",
          requireInteraction: true,
          vibrate: [250, 120, 250],
        });
      }
    } catch {
      // Notification support varies across mobile browsers.
    }
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      setNotificationStatus("unsupported");
      return;
    }
    ensureAudioContext();
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setNotificationStatus(result);
      return;
    }
    setNotificationStatus(Notification.permission);
  }

  function fireTimerFinishedAlarm() {
    const draft = makeCompletionPayload(state);
    playAlarm();
    showTimerNotification(draft);
    setState((current) => {
      if (current.timer.alarmFiredAt) return current;
      return {
        ...current,
        timer: {
          ...current.timer,
          alarmFiredAt: Date.now(),
        },
      };
    });
  }

  function changeMode(mode) {
    setCompletionDraft(null);
    stopAlarm();
    setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        mode,
        running: false,
        startedAt: null,
        elapsedBeforeStart: 0,
        alarmFiredAt: null,
        lastDisplaySeconds: mode === "focus" ? current.timer.focusMinutes * 60 : 0,
      },
    }));
  }

  function setFocusMinutes(minutes) {
    setCompletionDraft(null);
    stopAlarm();
    setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        focusMinutes: minutes,
        running: false,
        startedAt: null,
        elapsedBeforeStart: 0,
        alarmFiredAt: null,
        lastDisplaySeconds: minutes * 60,
      },
    }));
  }

  function startTimer() {
    setCompletionDraft(null);
    stopAlarm();
    ensureAudioContext();
    setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        running: true,
        startedAt: Date.now(),
        alarmFiredAt: null,
      },
    }));
    setTab("timer");
  }

  function pauseTimer() {
    stopAlarm();
    setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        running: false,
        elapsedBeforeStart: elapsedSeconds(current.timer, Date.now()),
        startedAt: null,
      },
    }));
  }

  function resetTimer() {
    setCompletionDraft(null);
    stopAlarm();
    setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        running: false,
        startedAt: null,
        elapsedBeforeStart: 0,
        alarmFiredAt: null,
        lastDisplaySeconds: current.timer.mode === "focus" ? current.timer.focusMinutes * 60 : 0,
      },
    }));
  }

  function makeCompletionPayload(current) {
    const seconds = elapsedSeconds(current.timer, Date.now());
    const minutes = Math.max(1, Math.round(seconds / 60));
    const reward = rewardFor(minutes);
    return {
      id: `${Date.now()}`,
      date: todayKey(),
      subject: current.selectedSubject,
      mode: current.timer.mode,
      minutes,
      reward,
      completedAt: new Date().toISOString(),
      doneText: "",
      outputMemo: "",
      mood: "",
      outputCount: 0,
    };
  }

  function openCompletionSheet() {
    const seconds = elapsedSeconds(state.timer, Date.now());
    if (!state.timer.running && seconds < 10) return;
    const draft = makeCompletionPayload(state);
    stopAlarm();
    setState((current) => ({
      ...current,
      timer: {
        ...current.timer,
        running: false,
        elapsedBeforeStart: seconds,
        startedAt: null,
      },
    }));
    setCompletionDraft(draft);
  }

  function applySession(current, session) {
    return {
      ...current,
      points: current.points + session.reward,
      todayMinutes: current.todayMinutes + session.minutes,
      totalMinutes: current.totalMinutes + session.minutes,
      streak: current.todayMinutes ? current.streak || 1 : Math.max(1, current.streak || 0),
      sessions: [session, ...current.sessions].slice(0, MAX_STORED_SESSIONS),
      timer: {
        ...current.timer,
        running: false,
        startedAt: null,
        elapsedBeforeStart: 0,
        alarmFiredAt: null,
        lastDisplaySeconds: current.timer.mode === "focus" ? current.timer.focusMinutes * 60 : 0,
      },
    };
  }

  function saveCompletion(details) {
    if (!completionDraft) return;
    stopAlarm();
    const session = normalizeSession({ ...completionDraft, ...details }, subjects);
    setState((current) => applySession(current, session));
    setCompletionDraft(null);
    setRewardToast({ reward: session.reward, id: `${Date.now()}` });
    window.setTimeout(() => setRewardToast(null), 1500);
    setTab("home");
  }

  function updateSound(nextSound) {
    setState((current) => ({ ...current, sound: normalizeSound({ ...current.sound, ...nextSound }) }));
  }

  function updateBgmSound(updater) {
    setState((current) => ({
      ...current,
      sound: normalizeSound(updater(current.sound || {})),
    }));
  }

  function selectBgmPlaylist(playlistId) {
    updateBgmSound((sound) => ({ ...sound, selectedPlaylistId: playlistId }));
  }

  function createBgmPlaylist() {
    const id = `playlist-${Date.now()}`;
    updateBgmSound((sound) => ({
      ...sound,
      selectedPlaylistId: id,
      playlists: [
        ...(sound.playlists || []),
        { id, name: `プレイリスト${(sound.playlists || []).length + 1}`, trackIds: [] },
      ],
    }));
  }

  function renameBgmPlaylist(playlistId, name) {
    updateBgmSound((sound) => ({
      ...sound,
      playlists: (sound.playlists || []).map((playlist) => (
        playlist.id === playlistId ? { ...playlist, name } : playlist
      )),
    }));
  }

  function deleteBgmPlaylist(playlistId) {
    if (playlistId === DEFAULT_BGM_PLAYLIST_ID) return;
    updateBgmSound((sound) => {
      const playlists = (sound.playlists || []).filter((playlist) => playlist.id !== playlistId);
      return {
        ...sound,
        selectedPlaylistId: sound.selectedPlaylistId === playlistId ? DEFAULT_BGM_PLAYLIST_ID : sound.selectedPlaylistId,
        playlists,
      };
    });
  }

  function addTrackToBgmPlaylist(playlistId, trackId) {
    updateBgmSound((sound) => ({
      ...sound,
      playlists: (sound.playlists || []).map((playlist) => (
        playlist.id === playlistId ? { ...playlist, trackIds: [...playlist.trackIds, trackId] } : playlist
      )),
    }));
  }

  function removeTrackFromBgmPlaylist(playlistId, index) {
    updateBgmSound((sound) => ({
      ...sound,
      playlists: (sound.playlists || []).map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        return { ...playlist, trackIds: playlist.trackIds.filter((_, itemIndex) => itemIndex !== index) };
      }),
    }));
  }

  function moveBgmPlaylistTrack(playlistId, index, direction) {
    updateBgmSound((sound) => ({
      ...sound,
      playlists: (sound.playlists || []).map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= playlist.trackIds.length) return playlist;
        const trackIds = [...playlist.trackIds];
        [trackIds[index], trackIds[nextIndex]] = [trackIds[nextIndex], trackIds[index]];
        return { ...playlist, trackIds };
      }),
    }));
  }

  function renameCustomBgmTrack(trackId, name) {
    const nextName = name.slice(0, 80);
    updateBgmSound((sound) => ({
      ...sound,
      customTracks: (sound.customTracks || []).map((track) => (
        track.id === trackId ? { ...track, name: nextName } : track
      )),
    }));
  }

  async function addBgmFiles(files, playlistId) {
    const rawFiles = Array.from(files || []);
    const classifiedFiles = rawFiles.map((file) => ({ file, kind: inferBgmKind(file) }));
    const selectedFiles = classifiedFiles.filter((item) => item.kind);
    const unsupportedFiles = classifiedFiles.length - selectedFiles.length;
    if (!selectedFiles.length) {
      setBgmLibraryMessage(`BGMを追加できませんでした。対応形式は ${SUPPORTED_BGM_AUDIO_LABEL} と画面録画/動画です`);
      return;
    }
    const addedTracks = [];
    let extractedVideos = 0;
    let compactedVideos = 0;
    let originalVideos = 0;
    let failedAudioFiles = 0;
    let failedSaveFiles = 0;
    try {
      for (const { file, kind } of selectedFiles) {
        try {
          const id = `custom-bgm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          let blob = file;
          let trackKind = kind;
          let mimeType = file.type || mimeTypeForAudioExtension(fileExtension(file));
          const trackExtras = {};
          if (kind === "audio") {
            setBgmLibraryMessage(`${file.name} を読み込めるか確認しています...`);
            await verifyAudioFilePlayable(file);
          }
          if (kind === "video") {
            setBgmLibraryMessage(`${file.name} をBGM用に軽くしています...`);
            const prepared = await prepareVideoBgmBlob(file);
            blob = prepared.blob;
            trackKind = prepared.kind;
            mimeType = prepared.mimeType;
            trackExtras.sourceKind = "video";
            trackExtras.originalFileName = file.name;
            trackExtras.videoProcess = prepared.status;
            if (prepared.status === "audio") extractedVideos += 1;
            if (prepared.status === "compact-video") compactedVideos += 1;
            if (prepared.status === "original-video") originalVideos += 1;
          }
          const track = {
            id,
            name: file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "追加BGM",
            kind: trackKind,
            type: "custom",
            mimeType,
            createdAt: new Date().toISOString(),
            ...trackExtras,
          };
          await putBgmBlob(id, blob);
          addedTracks.push(track);
        } catch {
          if (kind === "audio") failedAudioFiles += 1;
          else failedSaveFiles += 1;
        }
      }
      if (!addedTracks.length) {
        setBgmLibraryMessage(`BGMを追加できませんでした。対応形式は ${SUPPORTED_BGM_AUDIO_LABEL} と画面録画/動画です`);
        return;
      }
      updateBgmSound((sound) => ({
        ...sound,
        customTracks: [...(sound.customTracks || []), ...addedTracks],
        playlists: (sound.playlists || []).map((playlist) => (
          playlist.id === playlistId
            ? { ...playlist, trackIds: [...playlist.trackIds, ...addedTracks.map((track) => track.id)] }
            : playlist
        )),
      }));
      const conversionParts = [];
      if (extractedVideos) conversionParts.push(`音声抽出 ${extractedVideos}件`);
      if (compactedVideos) conversionParts.push(`軽量動画化 ${compactedVideos}件`);
      if (originalVideos) conversionParts.push(`そのまま保存 ${originalVideos}件`);
      const warning = originalVideos ? "。一部の動画はアップロードは難しいです。短めの画面録画にすると移植しやすくなります" : "";
      const failedParts = [];
      if (unsupportedFiles) failedParts.push(`未対応 ${unsupportedFiles}件`);
      if (failedAudioFiles) failedParts.push(`再生確認失敗 ${failedAudioFiles}件`);
      if (failedSaveFiles) failedParts.push(`保存失敗 ${failedSaveFiles}件`);
      const failedNote = failedParts.length ? `。追加できなかったファイルがあります（${failedParts.join("、")}）。対応形式は ${SUPPORTED_BGM_AUDIO_LABEL} です` : "";
      setBgmLibraryMessage(`${addedTracks.length}件のBGMを追加しました${conversionParts.length ? `（${conversionParts.join("、")}）` : ""}${warning}${failedNote}`);
    } catch {
      setBgmLibraryMessage(`BGMを保存できませんでした。容量やファイル形式を確認してください。対応形式は ${SUPPORTED_BGM_AUDIO_LABEL} です`);
    }
  }

  async function deleteCustomBgmTrack(trackId) {
    try {
      await deleteBgmBlob(trackId);
    } catch {
      // Metadata cleanup is still useful when a stale IndexedDB entry cannot be removed.
    }
    updateBgmSound((sound) => ({
      ...sound,
      customTracks: (sound.customTracks || []).filter((track) => track.id !== trackId),
      playlists: (sound.playlists || []).map((playlist) => ({
        ...playlist,
        trackIds: playlist.trackIds.filter((id) => id !== trackId),
      })),
    }));
    setBgmLibraryMessage("追加BGMを削除しました");
  }

  async function optimizeSavedVideoBgms() {
    const videoTracks = (state.sound?.customTracks || []).filter((track) => track.kind === "video");
    if (!videoTracks.length) {
      setBgmLibraryMessage("軽量化が必要な保存済み動画はありません");
      return;
    }
    let extracted = 0;
    let compacted = 0;
    let kept = 0;
    let failed = 0;
    try {
      for (const track of videoTracks) {
        setBgmLibraryMessage(`保存済み動画「${track.name}」を軽くしています...`);
        const blob = await getBgmBlob(track.id);
        if (!blob) {
          failed += 1;
          continue;
        }
        const file = new File([blob], track.originalFileName || `${track.name}.mp4`, { type: blob.type || track.mimeType || "video/mp4" });
        const prepared = await prepareVideoBgmBlob(file);
        await putBgmBlob(track.id, prepared.blob);
        if (prepared.status === "audio") extracted += 1;
        if (prepared.status === "compact-video") compacted += 1;
        if (prepared.status === "original-video") kept += 1;
        updateBgmSound((sound) => ({
          ...sound,
          customTracks: (sound.customTracks || []).map((item) => (
            item.id === track.id
              ? { ...item, kind: prepared.kind, mimeType: prepared.mimeType, sourceKind: "video", videoProcess: prepared.status }
              : item
          )),
        }));
      }
      const warning = kept ? "。一部の動画はアップロードは難しいです。短めの画面録画にすると移植しやすくなります" : "";
      setBgmLibraryMessage(`保存済み動画を処理しました（音声抽出 ${extracted}件、軽量動画化 ${compacted}件、そのまま ${kept}件${failed ? `、失敗 ${failed}件` : ""}）${warning}`);
    } catch {
      setBgmLibraryMessage("保存済み動画の軽量化中に問題が起きました。もう一度お試しください");
    }
  }

  async function exportBgmLibrary() {
    try {
      setPendingBgmExportFile(null);
      setBgmLibraryMessage("プレイリストを書き出す準備をしています...");
      const customTracks = [];
      let skippedTracks = 0;
      let skippedLargeTracks = 0;
      const knownTracks = new Map((state.sound?.customTracks || []).map((track) => [track.id, track]));
      const indexedDbTrackIds = await listBgmBlobIds().catch(() => []);
      const exportTrackIds = [...new Set([...customTrackIdsFromSound(state.sound), ...indexedDbTrackIds])]
        .filter((trackId) => !STANDARD_BGM_TRACK_IDS.includes(trackId));
      for (const trackId of exportTrackIds) {
        const blob = await getBgmBlob(trackId);
        if (!blob) {
          skippedTracks += 1;
          continue;
        }
        if (blob.size > BGM_EXPORT_MAX_BLOB_BYTES) {
          skippedLargeTracks += 1;
          continue;
        }
        const track = knownTracks.get(trackId) || fallbackCustomTrack(trackId, blob);
        customTracks.push({ ...track, dataUrl: await blobToDataUrl(blob) });
      }
      const payload = {
        app: "usapon-timer-bgm-library",
        exportedAt: new Date().toISOString(),
        deviceName: "この端末",
        selectedPlaylistId: state.sound?.selectedPlaylistId || DEFAULT_BGM_PLAYLIST_ID,
        playlists: state.sound?.playlists || [],
        customTracks,
      };
      const file = makeJsonFile(bgmLibraryFileName(), payload);
      setPendingBgmExportFile(file);
      const skippedNote = `${skippedTracks ? `、${skippedTracks}件スキップ` : ""}${skippedLargeTracks ? `、大きいBGM ${skippedLargeTracks}件は除外` : ""}`;
      try {
        if (navigator.userActivation?.isActive !== false) {
          await shareFile(file);
          setPendingBgmExportFile(null);
          setBgmLibraryMessage(`プレイリストを書き出しました（追加BGM ${customTracks.length}件${skippedNote}）`);
          return;
        }
      } catch (shareError) {
        if (shareError?.name === "AbortError") {
          setBgmLibraryMessage("保存をキャンセルしました。必要なら「保存場所を選ぶ」を押してください。");
          return;
        }
      }
      if (skippedLargeTracks) {
        setBgmLibraryMessage(`プレイリストの準備ができました（追加BGM ${customTracks.length}件、大きいBGM ${skippedLargeTracks}件は除外）。画面録画は追加し直すと音声化できる場合があります。`);
      } else {
        setBgmLibraryMessage(`プレイリストの準備ができました（追加BGM ${customTracks.length}件${skippedNote}）。保存場所を選んでください。`);
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      setBgmLibraryMessage("プレイリストを書き出せませんでした。容量や端末の空き容量を確認してください");
    }
  }

  async function sharePreparedBgmLibrary() {
    if (!pendingBgmExportFile) return;
    try {
      const result = await shareFile(pendingBgmExportFile).catch((error) => {
        if (error?.name === "AbortError") throw error;
        return downloadFile(pendingBgmExportFile);
      });
      if (result === "shared") {
        setPendingBgmExportFile(null);
        setBgmLibraryMessage("プレイリストを書き出しました。");
      } else {
        setBgmLibraryMessage("プレイリストをダウンロードしました。");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        setBgmLibraryMessage("保存をキャンセルしました。必要ならもう一度「保存場所を選ぶ」を押してください。");
        return;
      }
      setBgmLibraryMessage("保存場所を開けませんでした。端末の共有設定を確認してください。");
    }
  }

  function importBgmLibraryFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const library = extractBgmLibraryPayload(parsed);
        if (!library || !Array.isArray(library.playlists)) throw new Error("invalid bgm library payload");
        const ok = window.confirm("BGM音楽集を読み込みます。既存の作業記録は消えません。");
        if (!ok) return;
        const importedTracks = [];
        let failedTracks = 0;
        for (const track of library.customTracks || []) {
          if (!track?.id || !track?.dataUrl) {
            failedTracks += track?.id && !track?.dataUrl ? 1 : 0;
            continue;
          }
          try {
            const blob = await dataUrlToBlob(track.dataUrl);
            await putBgmBlob(track.id, blob);
            importedTracks.push({
              id: String(track.id),
              name: typeof track.name === "string" && track.name.trim() ? track.name.trim().slice(0, 80) : "追加BGM",
              kind: track.kind === "video" ? "video" : "audio",
              type: "custom",
              mimeType: typeof track.mimeType === "string" ? track.mimeType : blob.type,
              createdAt: typeof track.createdAt === "string" ? track.createdAt : new Date().toISOString(),
              ...(track.sourceKind === "video" ? { sourceKind: "video" } : {}),
              ...(["audio", "compact-video", "original-video"].includes(track.videoProcess) ? { videoProcess: track.videoProcess } : {}),
              ...(typeof track.originalFileName === "string" ? { originalFileName: track.originalFileName.slice(0, 120) } : {}),
            });
          } catch {
            failedTracks += 1;
          }
        }
        const importedTrackIds = new Set(importedTracks.map((track) => track.id));
        const existingCustomTrackIds = new Set((state.sound?.customTracks || []).map((track) => track.id));
        const importedPlaylists = (library.playlists || [])
          .filter((playlist) => playlist?.id && Array.isArray(playlist.trackIds))
          .map((playlist, index) => ({
            id: String(playlist.id),
            name: typeof playlist.name === "string" && playlist.name.trim() ? playlist.name.trim().slice(0, 30) : `移植プレイリスト${index + 1}`,
            trackIds: playlist.trackIds.filter((trackId) => (
              STANDARD_BGM_TRACK_IDS.includes(trackId) || importedTrackIds.has(trackId) || existingCustomTrackIds.has(trackId)
            )),
          }))
          .filter((playlist) => playlist.trackIds.length > 0);
        if (!importedPlaylists.length && !importedTracks.length) throw new Error("empty bgm library payload");
        const importedPlaylistIds = new Set(importedPlaylists.map((playlist) => playlist.id));
        updateBgmSound((sound) => ({
          ...sound,
          customTracks: [
            ...(sound.customTracks || []).filter((track) => !importedTrackIds.has(track.id)),
            ...importedTracks,
          ],
          playlists: [
            ...(sound.playlists || []).filter((playlist) => !importedPlaylistIds.has(playlist.id)),
            ...importedPlaylists,
          ],
          selectedPlaylistId: importedPlaylistIds.has(library.selectedPlaylistId) ? library.selectedPlaylistId : sound.selectedPlaylistId,
        }));
        setBgmLibraryMessage(`プレイリストを読み込みました（プレイリスト ${importedPlaylists.length}件、追加BGM ${importedTracks.length}件${failedTracks ? `、${failedTracks}件スキップ` : ""}）`);
      } catch {
        setBgmLibraryMessage("BGM音楽集を読み込めませんでした。プレイリストを書き出したJSONファイルか確認してください。");
      }
    };
    reader.onerror = () => setBgmLibraryMessage("BGM音楽集JSONを読み込めませんでした。");
    reader.readAsText(file);
  }

  function toggleSoundPanel() {
    ensureAudioContext();
    setSoundPanelOpen((open) => !open);
  }

  function exportBackup() {
    const payload = {
      app: "usapon-timer",
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: normalizeState(state),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = backupFileName();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importBackupFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const rawData = parsed?.app === "usapon-timer" && parsed?.data ? parsed.data : parsed;
        const restored = normalizeState(rawData);
        const ok = window.confirm("現在の端末内データを、選んだバックアップで上書きします。よろしいですか？");
        if (!ok) return;
        stopAlarm();
        stopBgm();
        setCompletionDraft(null);
        setState(restored);
        setDataManagerOpen(false);
        setTab("home");
      } catch {
        window.alert("バックアップファイルを読み込めませんでした。うさぽんタイマーのJSONファイルか確認してください。");
      }
    };
    reader.readAsText(file);
  }

  function updateChartSettings(nextSettings) {
    setState((current) => ({
      ...current,
      chartSettings: normalizeChartSettings({
        ...current.chartSettings,
        ...nextSettings,
        colors: { ...current.chartSettings?.colors, ...nextSettings.colors },
      }, current.subjects || DEFAULT_SUBJECTS),
    }));
  }

  function updateSubject(subjectId, changes) {
    setState((current) => {
      const nextSubjects = normalizeSubjects(current.subjects).map((subject) => (
        subject.id === subjectId ? { ...subject, ...changes } : subject
      ));
      return {
        ...current,
        subjects: nextSubjects,
        chartSettings: normalizeChartSettings({
          ...current.chartSettings,
          colors: {
            ...current.chartSettings?.colors,
            ...(changes.color ? { [subjectId]: changes.color } : {}),
          },
        }, nextSubjects),
      };
    });
  }

  function addSubject() {
    setState((current) => {
      const currentSubjects = normalizeSubjects(current.subjects);
      if (currentSubjects.length >= 12) return current;
      const color = CHART_COLOR_SWATCHES[currentSubjects.length % CHART_COLOR_SWATCHES.length];
      const subject = {
        id: `custom-${Date.now()}`,
        label: `作業${currentSubjects.length + 1}`,
        icon: "quest-free.png",
        color,
        workType: "revenue",
      };
      const nextSubjects = [...currentSubjects, subject];
      return {
        ...current,
        subjects: nextSubjects,
        selectedSubject: subject.id,
        chartSettings: normalizeChartSettings({
          ...current.chartSettings,
          visibleSubjects: [...(current.chartSettings?.visibleSubjects || []), subject.id],
          colors: { ...current.chartSettings?.colors, [subject.id]: color },
        }, nextSubjects),
      };
    });
  }

  function deleteSubject(subjectId) {
    setState((current) => {
      const currentSubjects = normalizeSubjects(current.subjects);
      if (currentSubjects.length <= 1) return current;
      const nextSubjects = currentSubjects.filter((subject) => subject.id !== subjectId);
      const selectedSubject = current.selectedSubject === subjectId ? nextSubjects[0].id : current.selectedSubject;
      return {
        ...current,
        subjects: nextSubjects,
        selectedSubject,
        chartSettings: normalizeChartSettings({
          ...current.chartSettings,
          visibleSubjects: (current.chartSettings?.visibleSubjects || []).filter((id) => id !== subjectId),
        }, nextSubjects),
      };
    });
  }

  function updateSessionSubject(sessionId, subjectId) {
    setState((current) => {
      if (!current.subjects.some((subject) => subject.id === subjectId)) return current;
      return {
        ...current,
        sessions: current.sessions.map((session) => session.id === sessionId ? { ...session, subject: subjectId } : session),
      };
    });
  }

  function updateDailyGoal(minutes) {
    setState((current) => ({ ...current, dailyGoalMinutes: normalizeGoalMinutes(minutes) }));
  }

  function updateMonthlySales(month, nextSales) {
    setState((current) => ({
      ...current,
      salesByMonth: {
        ...current.salesByMonth,
        [month]: {
          amount: Math.max(0, Math.round(Number(nextSales.amount || 0))),
          memo: typeof nextSales.memo === "string" ? nextSales.memo.slice(0, 120) : "",
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }

  function updateDailySales(date, nextSales) {
    setState((current) => ({
      ...current,
      salesByDay: {
        ...current.salesByDay,
        [date]: {
          amount: Math.max(0, Math.round(Number(nextSales.amount || 0))),
          memo: typeof nextSales.memo === "string" ? nextSales.memo.slice(0, 120) : "",
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }

  function unlockOrSelect(outfit) {
    setState((current) => {
      const isUnlocked = current.unlockedOutfits.includes(outfit.id);
      const price = outfitPrice(outfit);
      if (isUnlocked) return { ...current, selectedOutfitId: outfit.id };
      if (current.points < price) return current;
      return {
        ...current,
        points: current.points - price,
        unlockedOutfits: [...current.unlockedOutfits, outfit.id],
        selectedOutfitId: outfit.id,
      };
    });
  }

  return (
    <main className="stage">
      <div className="showcase" aria-label={state.appName || "うさぽんタイマー"}>
        <PhoneFrame className={tab === "timer" ? "timer-phone" : ""}>
          {tab === "home" && (
            <HomeScreen
              state={state}
              subjects={subjects}
              outfit={activeOutfit}
              subject={selectedSubject}
              progress={dailyGoalProgress}
              setTab={setTab}
              startTimer={startTimer}
              setSubject={(id) => setState((current) => ({ ...current, selectedSubject: id }))}
              updateDailyGoal={updateDailyGoal}
            />
          )}
          {tab === "timer" && (
            <TimerScreen
              state={state}
              subjects={subjects}
              subject={selectedSubject}
              outfit={activeOutfit}
              displayValue={timerDisplayValue}
              spentSeconds={spentSeconds}
              overtimeSeconds={focusOvertimeSeconds}
              progress={progress}
              changeMode={changeMode}
              setFocusMinutes={setFocusMinutes}
              startTimer={startTimer}
              pauseTimer={pauseTimer}
              resetTimer={resetTimer}
              completeSession={openCompletionSheet}
              rewardToast={rewardToast}
              alarmEnabled={alarmEnabled}
              notificationStatus={notificationStatus}
              requestNotifications={requestNotifications}
              toggleAlarm={() => setAlarmEnabled((enabled) => !enabled)}
              setSubject={(id) => setState((current) => ({ ...current, selectedSubject: id }))}
              setTab={setTab}
              sound={state.sound}
              soundPanelOpen={soundPanelOpen}
              toggleSoundPanel={toggleSoundPanel}
              updateSound={updateSound}
              selectPlaylist={selectBgmPlaylist}
              playBgmPreview={playBgmPreview}
            />
          )}
          {tab === "records" && (
            <RecordsScreen
              state={state}
              subjects={subjects}
              setTab={setTab}
              updateChartSettings={updateChartSettings}
              updateSessionSubject={updateSessionSubject}
              updateMonthlySales={updateMonthlySales}
              updateDailySales={updateDailySales}
            />
          )}
          {tab === "settings" && (
            <SettingsScreen
              state={state}
              setTab={setTab}
              openDataManager={() => setDataManagerOpen(true)}
            />
          )}
          {tab === "bgm-library" && (
            <BgmLibraryScreen
              state={state}
              setTab={setTab}
              tracks={allBgmTracks()}
              message={bgmLibraryMessage}
              preparedExportFile={pendingBgmExportFile}
              selectPlaylist={selectBgmPlaylist}
              createPlaylist={createBgmPlaylist}
              renamePlaylist={renameBgmPlaylist}
              deletePlaylist={deleteBgmPlaylist}
              addFiles={addBgmFiles}
              addTrack={addTrackToBgmPlaylist}
              removeTrack={removeTrackFromBgmPlaylist}
              moveTrack={moveBgmPlaylistTrack}
              deleteCustomTrack={deleteCustomBgmTrack}
              renameCustomTrack={renameCustomBgmTrack}
              previewTrack={toggleBgmLibraryPreview}
              optimizeSavedVideos={optimizeSavedVideoBgms}
              exportLibrary={exportBgmLibrary}
              sharePreparedExport={sharePreparedBgmLibrary}
              importLibrary={importBgmLibraryFile}
            />
          )}
          {tab === "subjects" && (
            <SubjectEditScreen
              state={state}
              subjects={subjects}
              setTab={setTab}
              updateSubject={updateSubject}
              addSubject={addSubject}
              deleteSubject={deleteSubject}
            />
          )}
          {tab === "wardrobe" && <WardrobeScreen state={state} outfits={OUTFITS} unlockOrSelect={unlockOrSelect} setTab={setTab} />}
          {tab === "closet" && <ClosetScreen state={state} outfits={OUTFITS} unlockOrSelect={unlockOrSelect} setTab={setTab} />}
          <BottomNav active={tab} setTab={setTab} />
          {completionDraft && (
            <CompletionSheet
              draft={completionDraft}
              subject={subjects.find((item) => item.id === completionDraft.subject) || selectedSubject}
              onSave={saveCompletion}
              onCancel={() => {
                stopAlarm();
                setCompletionDraft(null);
              }}
            />
          )}
          {dataManagerOpen && (
            <DataManagementSheet
              onExport={exportBackup}
              onImport={importBackupFile}
              onClose={() => setDataManagerOpen(false)}
            />
          )}
        </PhoneFrame>
      </div>
    </main>
  );
}

function PhoneFrame({ children, className = "" }) {
  return (
    <section className={`phone-frame ${className}`}>
      <Vines />
      {children}
    </section>
  );
}

function Vines() {
  return (
    <>
      <div className="vine vine-left" />
      <div className="vine vine-right" />
      <div className="flower flower-a">✤</div>
      <div className="flower flower-b">✿</div>
    </>
  );
}

function TopBar({ title, points, onBack, avatarSrc }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="icon-button" type="button" onClick={onBack} aria-label="戻る"><ChevronLeft size={20} /></button>
      ) : (
        <span className="mini-avatar" style={{ backgroundImage: `url(${avatarSrc || asset("crops/protagonist.png")})` }} aria-hidden="true" />
      )}
      <strong>{title}</strong>
      <div className="top-pills">
        {typeof points === "number" && <span><Sprout size={15} />{points.toLocaleString()} pt</span>}
      </div>
    </header>
  );
}

function HomeScreen({ state, subjects, outfit, subject, progress, setTab, startTimer, setSubject, updateDailyGoal }) {
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalHours, setGoalHours] = useState(String(Math.floor((state.dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES) / 60)));
  const [goalMinutes, setGoalMinutes] = useState(String((state.dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES) % 60));
  const todayOutputs = state.sessions.filter((session) => session.date === todayKey()).reduce((sum, session) => sum + Number(session.outputCount || 0), 0);
  const plantScale = 0.72 + progress * 0.42;

  function openGoalEditor() {
    const goal = state.dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES;
    setGoalHours(String(Math.floor(goal / 60)));
    setGoalMinutes(String(goal % 60));
    setGoalOpen(true);
  }

  function saveGoal() {
    const hours = Math.max(0, Math.min(12, Math.round(Number(goalHours || 0))));
    const minutes = Math.max(0, Math.min(59, Math.round(Number(goalMinutes || 0))));
    updateDailyGoal(hours * 60 + minutes);
    setGoalOpen(false);
  }

  return (
    <div className="screen home-screen">
      <TopBar title={state.appName || "うさぽんタイマー"} points={state.points} avatarSrc={asset(`avatar/full/${outfit.id}.png`)} />
      <section className="hero-card" style={{ "--hero-room-bg": `url(${asset("crops/home-bg.png")})` }}>
        <div className="hero-copy">
          <span>今日の作業時間</span>
          <strong>{formatHours(state.todayMinutes)}</strong>
          <button className="goal-edit-button" type="button" onClick={openGoalEditor}>目標 {formatHours(state.dailyGoalMinutes || DEFAULT_DAILY_GOAL_MINUTES)}</button>
        </div>
        <div className="ring" style={{ "--progress": `${Math.round(progress * 360)}deg` }}>
          <span className={progress >= 1 ? "ring-plant bloom" : "ring-plant"} style={{ "--plant-scale": plantScale }}>{progress >= 1 ? "✿" : <Sprout size={30} />}</span>
        </div>
        <img className="home-character" src={asset(`avatar/full/${outfit.id}.png`)} alt="うさぽん" />
      </section>
      <section className="work-metric-grid" aria-label="今日の積み上げ">
        <div><span>今日の成果物</span><b>{todayOutputs}<small>個</small></b></div>
        <div><span>pt</span><b>{state.points.toLocaleString()}<small>pt</small></b></div>
      </section>
      {goalOpen && (
        <div className="goal-editor-overlay" role="dialog" aria-modal="true" aria-label="目標作業時間の編集">
          <button className="settings-scrim" type="button" aria-label="閉じる" onClick={() => setGoalOpen(false)} />
          <section className="goal-editor-sheet">
            <div className="sheet-head"><div><span><Clock3 size={16} />目標作業時間</span><small>今日の積み上げとグラフの目安に使います</small></div><button className="icon-button" type="button" onClick={() => setGoalOpen(false)} aria-label="閉じる">×</button></div>
            <div className="goal-input-row">
              <label><span>時間</span><input type="number" min="0" max="12" inputMode="numeric" value={goalHours} onChange={(event) => setGoalHours(event.target.value)} /></label>
              <label><span>分</span><input type="number" min="0" max="59" inputMode="numeric" value={goalMinutes} onChange={(event) => setGoalMinutes(event.target.value)} /></label>
            </div>
            <div className="goal-presets">{[60, 120, 180, 240, 300, 360].map((minutes) => <button key={minutes} type="button" onClick={() => { setGoalHours(String(Math.floor(minutes / 60))); setGoalMinutes(String(minutes % 60)); }}>{formatChartTotal(minutes)}</button>)}</div>
            <div className="sheet-actions"><button type="button" onClick={() => setGoalOpen(false)}>キャンセル</button><button className="primary" type="button" onClick={saveGoal}>保存</button></div>
          </section>
        </div>
      )}
      <section className="subject-card">
        <div className="section-head"><b>作業カテゴリ</b><button type="button" onClick={() => setTab("subjects")}><Pencil size={15} />項目編集</button></div>
        <div className="subject-row">
          {subjects.map((item) => (
            <button key={item.id} type="button" className={state.selectedSubject === item.id ? "active" : ""} style={{ "--subject-color": item.color }} onClick={() => setSubject(item.id)}>
              <img src={subjectIconSrc(item.icon)} alt="" />{item.label}
            </button>
          ))}
        </div>
      </section>
      <button className="start-button" type="button" onClick={startTimer}><Clock3 size={22} />作業をはじめる</button>
      <div className="quick-grid">
        <QuickTile icon={<BookOpen size={24} />} label="記録" onClick={() => setTab("records")} />
        <QuickTile icon={<Trophy size={24} />} label="ごほうび" onClick={() => setTab("wardrobe")} />
        <QuickTile icon={<Shirt size={24} />} label="衣装" onClick={() => setTab("closet")} />
        <QuickTile icon={<SlidersHorizontal size={24} />} label="カテゴリ" onClick={() => setTab("subjects")} />
        <QuickTile icon={<Settings size={24} />} label="設定" onClick={() => setTab("settings")} />
      </div>
      <p className="soft-line">{subject.label}を少しずつ積み上げよう。完了するとptがもらえるよ。</p>
    </div>
  );
}

function QuickTile({ icon, label, onClick }) {
  return <button className="quick-tile" type="button" onClick={onClick}>{icon}<span>{label}</span></button>;
}

function DataManagementSheet({ onExport, onImport, onClose }) {
  const inputId = "backup-file-input";

  return (
    <div className="chart-settings-overlay" role="dialog" aria-modal="true" aria-label="データ管理">
      <button className="settings-scrim" type="button" aria-label="閉じる" onClick={onClose} />
      <section className="chart-settings-sheet compact-picker-sheet data-management-sheet">
        <div className="sheet-head">
          <div>
            <span><Download size={16} />データ管理</span>
            <small>端末内の記録をJSONで保存・復元できます</small>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="閉じる">×</button>
        </div>
        <div className="backup-actions">
          <button className="backup-action primary" type="button" onClick={onExport}>
            <Download size={18} />
            <span>バックアップを保存</span>
            <small>記録・売上・カテゴリ・BGM設定・ptを書き出します</small>
          </button>
          <label className="backup-action" htmlFor={inputId}>
            <Upload size={18} />
            <span>バックアップから復元</span>
            <small>選んだJSONで現在の端末内データを上書きします</small>
          </label>
          <input
            id={inputId}
            className="backup-file-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              onImport(file);
            }}
          />
        </div>
        <p className="backup-note">追加したBGMファイル本体は端末内だけに残ります。復元前に今のデータも必要なら、先にバックアップを保存してください。</p>
      </section>
    </div>
  );
}

function SettingsScreen({ state, setTab, openDataManager }) {
  return (
    <div className="screen settings-screen">
      <TopBar title="設定" points={state.points} onBack={() => setTab("home")} />
      <section className="settings-card">
        <button className="settings-row-button" type="button" onClick={() => setTab("bgm-library")}>
          <span className="settings-row-icon"><ListMusic size={22} /></span>
          <span>
            <strong>BGMファイルを編集する</strong>
            <small>音楽や画面録画を追加してプレイリストを作れます</small>
          </span>
          <ChevronLeft size={18} />
        </button>
        <button className="settings-row-button" type="button" onClick={openDataManager}>
          <span className="settings-row-icon"><Download size={22} /></span>
          <span>
            <strong>データ管理</strong>
            <small>記録や設定をJSONで保存・復元します</small>
          </span>
          <ChevronLeft size={18} />
        </button>
        <button className="settings-row-button warning" type="button" onClick={resetLocal}>
          <span className="settings-row-icon"><RotateCcw size={22} /></span>
          <span>
            <strong>アプリの記録をリセット</strong>
            <small>端末内の作業記録、売上、設定、追加BGMを初期化します</small>
          </span>
        </button>
      </section>
    </div>
  );
}

function BgmLibraryScreen({
  state,
  setTab,
  tracks,
  message,
  preparedExportFile,
  selectPlaylist,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addFiles,
  addTrack,
  removeTrack,
  moveTrack,
  deleteCustomTrack,
  renameCustomTrack,
  previewTrack,
  optimizeSavedVideos,
  exportLibrary,
  sharePreparedExport,
  importLibrary,
}) {
  const fileInputRef = useRef(null);
  const importLibraryInputRef = useRef(null);
  const sound = state.sound || {};
  const playlists = sound.playlists || [];
  const selectedPlaylist = playlists.find((playlist) => playlist.id === sound.selectedPlaylistId) || playlists[0];
  const selectedTrackIds = selectedPlaylist?.trackIds || [];
  const standardTracks = tracks.filter((track) => track.type === "standard");
  const customTracks = tracks.filter((track) => track.type === "custom");

  function trackById(trackId) {
    return tracks.find((track) => track.id === trackId);
  }

  function handleFiles(event) {
    addFiles(event.target.files, selectedPlaylist.id);
    event.target.value = "";
  }

  return (
    <div className="screen bgm-library-screen">
      <TopBar title="BGM音楽集" points={state.points} onBack={() => setTab("settings")} />
      <section className="bgm-panel">
        <div className="section-head">
          <b>iCloudで移植</b>
          <span className="small-note">BGM音楽集だけを移せます</span>
        </div>
        <div className="bgm-transfer-actions">
          <button className="bgm-transfer-button primary" type="button" onClick={exportLibrary}>
            <Upload size={18} />
            <span>プレイリストを書き出す</span>
          </button>
          {preparedExportFile && (
            <button className="bgm-transfer-button primary" type="button" onClick={sharePreparedExport}>
              <Upload size={18} />
              <span>保存場所を選ぶ</span>
            </button>
          )}
          <button className="bgm-transfer-button" type="button" onClick={() => importLibraryInputRef.current?.click()}>
            <Download size={18} />
            <span>プレイリストを読み込む</span>
          </button>
          <input
            ref={importLibraryInputRef}
            className="hidden-file-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              importLibrary(file);
            }}
          />
        </div>
        <p className="bgm-transfer-note">他の端末で書き出したBGM音楽集JSONをここから読み込めます。書き出し後は「ファイルに保存」からiCloud Driveなどを選べます。</p>
      </section>
      <section className="bgm-panel">
        <div className="section-head">
          <b>プレイリスト</b>
          <button type="button" onClick={createPlaylist}><Plus size={15} />追加</button>
        </div>
        <div className="playlist-tabs">
          {playlists.map((playlist) => (
            <button key={playlist.id} type="button" className={playlist.id === selectedPlaylist?.id ? "active" : ""} onClick={() => selectPlaylist(playlist.id)}>
              {playlist.name}
            </button>
          ))}
        </div>
        {selectedPlaylist && (
          <div className="playlist-editor">
            <label>
              <span>名前</span>
              <input type="text" value={selectedPlaylist.name} maxLength={30} onChange={(event) => renamePlaylist(selectedPlaylist.id, event.target.value)} />
            </label>
            {selectedPlaylist.id !== DEFAULT_BGM_PLAYLIST_ID && (
              <button type="button" className="delete-playlist" onClick={() => deletePlaylist(selectedPlaylist.id)}>
                <Trash2 size={15} />削除
              </button>
            )}
          </div>
        )}
      </section>

      <section className="bgm-panel">
        <div className="section-head">
          <b>このリストで流す曲</b>
          <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={15} />端末から追加</button>
        </div>
        <button className="bgm-compact-button" type="button" onClick={optimizeSavedVideos}>
          <FileMusic size={16} />
          保存済み動画を軽量化
        </button>
        <input ref={fileInputRef} className="hidden-file-input" type="file" accept={BGM_FILE_ACCEPT} multiple onChange={handleFiles} />
        {message && <p className="bgm-message">{message}</p>}
        <p className="bgm-transfer-note">音声は {SUPPORTED_BGM_AUDIO_LABEL} に対応しています。iPhone/iPadのショートカットで作ったM4Aもそのまま選べます。</p>
        <div className="bgm-track-list">
          {selectedTrackIds.length ? selectedTrackIds.map((trackId, index) => {
            const track = trackById(trackId);
            if (!track) return null;
            return (
              <article className="bgm-track-row" key={`${trackId}-${index}`}>
                <span className="track-kind"><FileMusic size={18} /></span>
                <div>
                  <strong>{track.name}</strong>
                  <small>{trackLabel(track)}</small>
                </div>
                <button type="button" aria-label="試聴" onClick={() => previewTrack(track.id)}><CirclePlay size={15} /></button>
                <button type="button" aria-label="上へ" onClick={() => moveTrack(selectedPlaylist.id, index, -1)} disabled={index === 0}><ArrowUp size={15} /></button>
                <button type="button" aria-label="下へ" onClick={() => moveTrack(selectedPlaylist.id, index, 1)} disabled={index === selectedTrackIds.length - 1}><ArrowDown size={15} /></button>
                <button type="button" aria-label="リストから外す" onClick={() => removeTrack(selectedPlaylist.id, index)}><Trash2 size={15} /></button>
              </article>
            );
          }) : (
            <p className="empty compact">曲を追加すると、タイマー中に順番に流れます。</p>
          )}
        </div>
      </section>

      <section className="bgm-panel">
        <div className="section-head">
          <b>曲一覧</b>
          <span className="small-note">標準曲と追加曲を選べます</span>
        </div>
        <BgmCatalog title="標準曲" tracks={standardTracks} playlistId={selectedPlaylist?.id} addTrack={addTrack} previewTrack={previewTrack} />
        <BgmCatalog
          title="追加した曲・画面録画"
          tracks={customTracks}
          playlistId={selectedPlaylist?.id}
          addTrack={addTrack}
          deleteCustomTrack={deleteCustomTrack}
          renameCustomTrack={renameCustomTrack}
          previewTrack={previewTrack}
        />
      </section>
    </div>
  );
}

function trackLabel(track) {
  if (track.type === "standard") return "標準曲";
  if (track.videoProcess === "audio" || track.sourceKind === "video") {
    if (track.kind === "audio") return "画面録画から音声化";
    if (track.videoProcess === "compact-video") return "画面録画を軽量化";
    if (track.videoProcess === "original-video") return "画面録画/動画（アップロードは難しいです）";
  }
  return track.kind === "video" ? "画面録画/動画" : "追加音楽";
}

function BgmCatalog({ title, tracks, playlistId, addTrack, deleteCustomTrack, renameCustomTrack, previewTrack }) {
  return (
    <div className="bgm-catalog">
      <h3>{title}</h3>
      {tracks.length ? tracks.map((track) => (
        <article className="bgm-catalog-row" key={track.id}>
          <span className="track-kind"><FileMusic size={18} /></span>
          <div>
            {track.type === "custom" && renameCustomTrack ? (
              <input
                className="track-name-input"
                type="text"
                value={track.name}
                maxLength={80}
                aria-label={`${track.name}の曲名`}
                onChange={(event) => renameCustomTrack(track.id, event.target.value)}
              />
            ) : (
              <strong>{track.name}</strong>
            )}
            <small>{trackLabel(track)}</small>
          </div>
          <button type="button" aria-label="試聴" onClick={() => previewTrack(track.id)}><CirclePlay size={15} /></button>
          <button type="button" onClick={() => addTrack(playlistId, track.id)}>追加</button>
          {track.type === "custom" && (
            <button type="button" className="danger-icon" aria-label="端末保存から削除" onClick={() => deleteCustomTrack(track.id)}>
              <Trash2 size={15} />
            </button>
          )}
        </article>
      )) : (
        <p className="empty compact">まだ追加曲はありません。</p>
      )}
    </div>
  );
}

function TimerScreen({
  state,
  subjects,
  subject,
  outfit,
  displayValue,
  spentSeconds,
  overtimeSeconds,
  progress,
  changeMode,
  setFocusMinutes,
  startTimer,
  pauseTimer,
  resetTimer,
  completeSession,
  rewardToast,
  alarmEnabled,
  notificationStatus,
  requestNotifications,
  toggleAlarm,
  setSubject,
  setTab,
  sound,
  soundPanelOpen,
  toggleSoundPanel,
  updateSound,
  selectPlaylist,
  playBgmPreview,
}) {
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [customFocusOpen, setCustomFocusOpen] = useState(false);
  const [customFocusMinutes, setCustomFocusMinutes] = useState(String(state.timer.focusMinutes || 25));
  const isRunning = state.timer.running;
  const isOvertime = state.timer.mode === "focus" && overtimeSeconds > 0;
  const isCustomFocus = !FOCUS_PRESETS.includes(Number(state.timer.focusMinutes));
  const playlists = sound?.playlists || [];
  const selectedPlaylist = playlists.find((playlist) => playlist.id === sound?.selectedPlaylistId) || playlists[0];

  function applyCustomFocus() {
    const parsedMinutes = Number(customFocusMinutes);
    const minutes = Number.isFinite(parsedMinutes) ? Math.min(180, Math.max(1, Math.round(parsedMinutes))) : 25;
    setFocusMinutes(minutes);
    setCustomFocusMinutes(String(minutes));
    setCustomFocusOpen(false);
  }

  return (
    <div className="screen timer-screen">
      <header className="timer-header">
        <button className="icon-button" type="button" onClick={() => setTab("home")} aria-label="戻る"><ChevronLeft size={20} /></button>
        <button className="task-pill top-task-pill" type="button" onClick={() => setSubjectPickerOpen(true)}><img src={subjectIconSrc(subject.icon)} alt="" /><span>{subject.label}を記録する</span><Pencil size={16} /></button>
        <button className={`icon-button ${sound?.bgm ? "active" : ""}`} type="button" aria-label="音" onClick={toggleSoundPanel}>
          <Music2 size={18} />
        </button>
      </header>
      {soundPanelOpen && (
        <section className="sound-panel">
          <div className="sound-row">
            <label>
              <input type="checkbox" checked={Boolean(sound?.bgm)} onChange={(event) => updateSound({ bgm: event.target.checked })} />
              作業用BGM
            </label>
            <button type="button" onClick={playBgmPreview}>試す</button>
          </div>
          <label className="playlist-select-label">
            <span>プレイリスト</span>
            <select value={selectedPlaylist?.id || ""} onChange={(event) => selectPlaylist(event.target.value)} disabled={!playlists.length}>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>{playlist.name || "プレイリスト"}</option>
              ))}
            </select>
          </label>
          <button className="sound-edit-link" type="button" onClick={() => setTab("bgm-library")}>
            <ListMusic size={15} />BGM音楽集を編集
          </button>
        </section>
      )}
      {subjectPickerOpen && (
        <div className="subject-picker-overlay" role="dialog" aria-modal="true" aria-label="作業カテゴリを選ぶ">
          <button className="settings-scrim" type="button" aria-label="閉じる" onClick={() => setSubjectPickerOpen(false)} />
          <section className="subject-picker-sheet">
            <div className="sheet-head"><div><span><BookOpen size={16} />作業カテゴリを選ぶ</span><small>このタイマーで記録する項目です</small></div><button className="icon-button" type="button" onClick={() => setSubjectPickerOpen(false)} aria-label="閉じる">×</button></div>
            <div className="subject-picker-grid">
              {subjects.map((item) => <button key={item.id} type="button" className={state.selectedSubject === item.id ? "active" : ""} style={{ "--subject-color": item.color }} onClick={() => { setSubject(item.id); setSubjectPickerOpen(false); }}><img src={subjectIconSrc(item.icon)} alt="" /><span>{item.label}</span></button>)}
            </div>
          </section>
        </div>
      )}
      <div className="mode-switch"><button type="button" className={state.timer.mode === "focus" ? "active" : ""} onClick={() => changeMode("focus")}>タイマー</button><button type="button" className={state.timer.mode === "free" ? "active" : ""} onClick={() => changeMode("free")}>自由計測</button></div>
      {state.timer.mode === "focus" && (
        <>
          <div className="preset-row">
            {FOCUS_PRESETS.map((minutes) => <button key={minutes} type="button" className={state.timer.focusMinutes === minutes ? "active" : ""} onClick={() => { setFocusMinutes(minutes); setCustomFocusOpen(false); }}>{minutes}</button>)}
            <button type="button" className={isCustomFocus ? "active" : ""} onClick={() => setCustomFocusOpen((open) => !open)} aria-label="カスタム時間"><Plus size={16} /></button>
          </div>
          {customFocusOpen && <div className="custom-focus-panel"><label><span>カスタム</span><input type="number" min="1" max="180" inputMode="numeric" value={customFocusMinutes} onChange={(event) => setCustomFocusMinutes(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyCustomFocus(); }} aria-label="カスタム時間 分" /><small>分</small></label><button type="button" onClick={applyCustomFocus}>設定</button></div>}
        </>
      )}
      <section className="focus-scene">
        <div className="timer-wreath" style={{ "--progress": `${Math.round(progress * 360)}deg` }}><span>{formatTime(displayValue)}</span><small>{isOvertime ? "追加計測" : state.timer.mode === "focus" ? "残り時間" : "経過時間"}</small></div>
        <img className="desk-bg" src={asset("crops/home-bg.png")} alt="" draggable="false" />
        <img className="study-character" src={asset(studyImageFor(outfit.id))} alt={`${outfit.name}で作業するうさぽん`} draggable="false" />
      </section>
      <div className="timer-actions">
        {!isRunning ? <button className="pill-action primary" type="button" onClick={startTimer}><CirclePlay size={19} />開始</button> : <button className="pill-action primary" type="button" onClick={pauseTimer}><CirclePause size={19} />一時停止</button>}
        <button className="pill-action" type="button" onClick={completeSession} disabled={spentSeconds < 10}><Check size={18} />完了</button>
        <button className="round-action" type="button" onClick={resetTimer} aria-label="リセット"><RotateCcw size={18} /></button>
      </div>
      <div className="alarm-card">
        <div>
          <span><BellRing size={17} />アラーム</span>
          <small>予定時間を過ぎても止めるまで超過時間を数えます</small>
        </div>
        <button type="button" className={alarmEnabled ? "active" : ""} onClick={toggleAlarm}>
          {alarmEnabled ? "ON" : "OFF"}
        </button>
        <button type="button" onClick={requestNotifications} disabled={notificationStatus === "granted" || notificationStatus === "unsupported"}>
          {notificationStatus === "granted" ? "通知OK" : notificationStatus === "denied" ? "通知OFF" : notificationStatus === "unsupported" ? "通知非対応" : "通知を許可"}
        </button>
      </div>
      <div className="bonus-card"><span><Sprout size={17} />獲得pt</span><b>+{rewardFor(Math.max(1, Math.round(spentSeconds / 60)))} pt</b><progress value={Math.min(100, Math.round(progress * 100))} max="100" /></div>
      {rewardToast && <div className="reward-get-toast" role="status" aria-live="polite"><span>+{rewardToast.reward}pt</span><strong>GET</strong></div>}
    </div>
  );
}

function CompletionSheet({ draft, subject, onSave, onCancel }) {
  const [doneText, setDoneText] = useState(draft.doneText || "");
  const [outputMemo, setOutputMemo] = useState(draft.outputMemo || "");
  const [mood, setMood] = useState(draft.mood || "");
  const [outputCount, setOutputCount] = useState(String(draft.outputCount || 0));

  return (
    <div className="completion-overlay" role="dialog" aria-modal="true" aria-label="作業の記録">
      <button className="settings-scrim" type="button" aria-label="閉じる" onClick={onCancel} />
      <section className="completion-sheet">
        <div className="sheet-head"><div><span><Check size={16} />作業を記録</span><small>{subject.label} / {draft.minutes}分 / +{draft.reward}pt</small></div><button className="icon-button" type="button" onClick={onCancel} aria-label="閉じる">×</button></div>
        <label className="memo-field"><span>今日やったこと</span><input type="text" value={doneText} maxLength={80} placeholder="例: 商品画像のラフを作った" onChange={(event) => setDoneText(event.target.value)} /></label>
        <label className="memo-field"><span>成果物メモ</span><textarea value={outputMemo} maxLength={120} placeholder="URLや投稿名、できたものなど" onChange={(event) => setOutputMemo(event.target.value)} /></label>
        <div className="completion-row">
          <label><span>成果物数</span><input type="number" min="0" max="99" inputMode="numeric" value={outputCount} onChange={(event) => setOutputCount(event.target.value)} /></label>
          <label><span>気分</span><select value={mood} onChange={(event) => setMood(event.target.value)}><option value="">未選択</option><option value="よい">よい</option><option value="ふつう">ふつう</option><option value="つかれた">つかれた</option><option value="進んだ">進んだ</option></select></label>
        </div>
        <div className="sheet-actions"><button type="button" onClick={onCancel}>あとで</button><button className="primary" type="button" onClick={() => onSave({ doneText, outputMemo, mood, outputCount: Math.max(0, Math.round(Number(outputCount || 0))) })}>保存</button></div>
      </section>
    </div>
  );
}

function SubjectEditScreen({ state, subjects, setTab, updateSubject, addSubject, deleteSubject }) {
  const [colorSubjectId, setColorSubjectId] = useState(null);
  const [iconSubjectId, setIconSubjectId] = useState(null);
  const colorSubject = subjects.find((subject) => subject.id === colorSubjectId);
  const iconSubject = subjects.find((subject) => subject.id === iconSubjectId);

  return (
    <div className="screen subject-edit-screen">
      <TopBar title="カテゴリ編集" points={state.points} onBack={() => setTab("home")} />
      <section className="subject-editor-card">
        <div className="section-head"><b>作業カテゴリ</b><button type="button" onClick={addSubject} disabled={subjects.length >= 12}><Plus size={15} />追加</button></div>
        <div className="subject-edit-list">
          {subjects.map((subject) => (
            <article className="subject-edit-row" key={subject.id}>
              <img src={subjectIconSrc(subject.icon)} alt="" />
              <label><span>名前</span><input type="text" value={subject.label} maxLength={12} onChange={(event) => updateSubject(subject.id, { label: event.target.value })} /></label>
              <div className="subject-row-actions">
                <button className="subject-icon-button" type="button" onClick={() => setIconSubjectId(subject.id)}><img src={subjectIconSrc(subject.icon)} alt="" />アイコン</button>
                <button className="subject-color-field" type="button" onClick={() => setColorSubjectId(subject.id)}><i className="subject-color-swatch" style={{ "--subject-color": subject.color }} />色</button>
              </div>
              <div className="work-type-toggle" aria-label={`${subject.label}の分類`}>
                {Object.entries(WORK_TYPES).map(([id, label]) => <button key={id} type="button" className={subject.workType === id ? "active" : ""} onClick={() => updateSubject(subject.id, { workType: id })}>{label}</button>)}
              </div>
              <button className="delete-subject-button" type="button" onClick={() => deleteSubject(subject.id)} disabled={subjects.length <= 1}><Trash2 size={15} />削除</button>
            </article>
          ))}
        </div>
      </section>
      {colorSubject && (
        <div className="chart-settings-overlay" role="dialog" aria-modal="true" aria-label={`${colorSubject.label}の色を選ぶ`}>
          <button className="settings-scrim" type="button" aria-label="閉じる" onClick={() => setColorSubjectId(null)} />
          <section className="chart-settings-sheet compact-picker-sheet"><div className="sheet-head"><div><span><Palette size={16} />色を選ぶ</span><small>{colorSubject.label}の表示色を変更します</small></div><button className="icon-button" type="button" onClick={() => setColorSubjectId(null)} aria-label="閉じる">×</button></div><label className="large-color-picker" style={{ "--subject-color": colorSubject.color }}><span>自由に調整</span><input type="color" value={colorSubject.color} onChange={(event) => updateSubject(colorSubject.id, { color: event.target.value })} aria-label={`${colorSubject.label}の色`} /></label><div className="basic-color-grid" aria-label="基本色">{BASIC_SUBJECT_COLORS.map((color) => <button key={color} className={colorSubject.color.toLowerCase() === color.toLowerCase() ? "active" : ""} type="button" style={{ "--swatch-color": color }} onClick={() => updateSubject(colorSubject.id, { color })} aria-label={`${color}を選ぶ`} />)}</div><div className="sheet-actions single"><button className="primary" type="button" onClick={() => setColorSubjectId(null)}>完了</button></div></section>
        </div>
      )}
      {iconSubject && (
        <div className="chart-settings-overlay" role="dialog" aria-modal="true" aria-label={`${iconSubject.label}のアイコンを選ぶ`}>
          <button className="settings-scrim" type="button" aria-label="閉じる" onClick={() => setIconSubjectId(null)} />
          <section className="chart-settings-sheet compact-picker-sheet"><div className="sheet-head"><div><span><BookOpen size={16} />アイコンを選ぶ</span><small>{iconSubject.label}のアイコンを変更します</small></div><button className="icon-button" type="button" onClick={() => setIconSubjectId(null)} aria-label="閉じる">×</button></div><div className="icon-choice-grid">{SUBJECT_ICON_OPTIONS.map((option) => <button key={option.icon} className={iconSubject.icon === option.icon ? "active" : ""} type="button" onClick={() => updateSubject(iconSubject.id, { icon: option.icon })}><img src={subjectIconSrc(option.icon)} alt="" /><span>{option.label}</span></button>)}</div><div className="sheet-actions single"><button className="primary" type="button" onClick={() => setIconSubjectId(null)}>完了</button></div></section>
        </div>
      )}
    </div>
  );
}

function RecordsScreen({ state, subjects, setTab, updateChartSettings, updateSessionSubject, updateMonthlySales, updateDailySales }) {
  const [recordTab, setRecordTab] = useState("log");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [visibleWeekStart, setVisibleWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthKey, setMonthKey] = useState(monthKeyFor(new Date()));
  const totalToday = state.sessions.filter((session) => session.date === todayKey()).reduce((sum, session) => sum + session.minutes, 0);
  const outputsToday = state.sessions.filter((session) => session.date === todayKey()).reduce((sum, session) => sum + Number(session.outputCount || 0), 0);
  const currentWeekStart = startOfWeek(new Date());
  const isCurrentWeek = sameDateKey(visibleWeekStart, currentWeekStart);
  const weekDays = buildWeeklyChart(state.sessions, subjects, visibleWeekStart);
  const visibleSubjects = subjects.filter((subject) => state.chartSettings.visibleSubjects.includes(subject.id));
  const visibleTotals = weekDays.map((day) => visibleSubjects.reduce((sum, subject) => sum + day.subjects[subject.id], 0));
  const chartMaxMinutes = Math.max(60, normalizeGoalMinutes(state.dailyGoalMinutes), ...visibleTotals);
  const weekTotal = visibleTotals.reduce((sum, minutes) => sum + minutes, 0);
  const editingSession = state.sessions.find((session) => session.id === editingSessionId);
  const monthlyStats = useMemo(() => buildMonthlyStats(state, subjects, monthKey), [state, subjects, monthKey]);

  function toggleChartSubject(subjectId) {
    const current = state.chartSettings.visibleSubjects;
    const next = current.includes(subjectId) ? current.filter((id) => id !== subjectId) : [...current, subjectId];
    updateChartSettings({ visibleSubjects: next.length ? next : [subjectId] });
  }

  function moveWeek(amount) {
    setVisibleWeekStart((current) => {
      const next = addWeeks(current, amount);
      return next > currentWeekStart ? currentWeekStart : next;
    });
  }

  return (
    <div className="screen record-screen">
      <TopBar title="記録" points={state.points} onBack={() => setTab("home")} />
      <div className="record-tabs" role="tablist" aria-label="記録メニュー">
        {[{ id: "log", label: "作業ログ" }, { id: "analysis", label: "分析" }, { id: "sales", label: "売上" }].map((item) => <button key={item.id} type="button" className={recordTab === item.id ? "active" : ""} onClick={() => setRecordTab(item.id)}>{item.label}</button>)}
      </div>
      <section className="record-summary"><div><span>今日</span><b>{totalToday}<small>分</small></b></div><div><span>成果物</span><b>{outputsToday}<small>個</small></b></div><div><span>pt</span><b>{state.points}<small>pt</small></b></div></section>
      {recordTab === "log" && (
        <>
          <section className="weekly-chart-card">
            <div className="chart-head"><div><span><BookOpen size={16} />今週の作業時間</span><small>{formatWeekRange(visibleWeekStart)}</small><b>{formatChartTotal(weekTotal)}</b></div><button className="chart-settings-button" type="button" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={15} />表示設定</button></div>
            <div className="week-nav" aria-label="表示する週"><button type="button" onClick={() => moveWeek(-1)}>前の週</button><button type="button" onClick={() => setVisibleWeekStart(currentWeekStart)} disabled={isCurrentWeek}>今週</button><button type="button" onClick={() => moveWeek(1)} disabled={isCurrentWeek}>次の週</button></div>
            <div className="weekly-chart" aria-label="1週間分の作業時間"><div className="chart-grid-lines" aria-hidden="true"><span>{formatChartAxis(chartMaxMinutes)}</span><span>{formatChartAxis(chartMaxMinutes / 2)}</span><span>0</span></div><div className="chart-bars">{weekDays.map((day) => { const dayTotal = visibleSubjects.reduce((sum, subject) => sum + day.subjects[subject.id], 0); return <div className="chart-day" key={day.date}><div className="chart-bar-track"><div className="chart-stack" style={{ height: `${Math.max(dayTotal ? 8 : 0, (dayTotal / chartMaxMinutes) * 100)}%` }}>{visibleSubjects.map((subject) => { const minutes = day.subjects[subject.id]; if (!minutes) return null; return <span key={subject.id} className="chart-segment" style={{ "--segment-color": state.chartSettings.colors[subject.id], flexGrow: minutes }} title={`${subject.label} ${minutes}分`} />; })}</div></div><span className="chart-day-label"><b>{day.label}</b><small>{day.dateLabel}</small></span></div>; })}</div></div>
            <div className="chart-legend">{visibleSubjects.map((subject) => <span key={subject.id}><i style={{ background: state.chartSettings.colors[subject.id] }} />{subject.label}</span>)}</div>
          </section>
          <DailySalesPanel weekDays={weekDays} salesByDay={state.salesByDay || {}} updateDailySales={updateDailySales} />
          <HistoryList state={state} subjects={subjects} setEditingSessionId={setEditingSessionId} />
        </>
      )}
      {recordTab === "analysis" && <AnalysisPanel subjects={subjects} monthKey={monthKey} setMonthKey={setMonthKey} stats={monthlyStats} state={state} />}
      {recordTab === "sales" && <SalesPanel monthKey={monthKey} setMonthKey={setMonthKey} state={state} stats={monthlyStats} updateMonthlySales={updateMonthlySales} />}
      {settingsOpen && <ChartSettingsSheet subjects={subjects} state={state} toggleChartSubject={toggleChartSubject} close={() => setSettingsOpen(false)} reset={() => updateChartSettings({ visibleSubjects: subjects.map((subject) => subject.id) })} />}
      {editingSession && <SessionSubjectSheet subjects={subjects} editingSession={editingSession} updateSessionSubject={updateSessionSubject} close={() => setEditingSessionId(null)} />}
    </div>
  );
}

function HistoryList({ state, subjects, setEditingSessionId }) {
  return (
    <div className="history-list">
      {state.sessions.length === 0 ? <p className="empty">まだ記録はありません。最初の1回を気軽にはじめよう。</p> : state.sessions.map((session) => {
        const subject = subjects.find((item) => item.id === session.subject) || { label: "削除済み", icon: "quest-free.png" };
        return <article className="history-card work-history-card" key={session.id}><img src={subjectIconSrc(subject.icon)} alt="" /><div><strong>{subject.label}</strong><span>{session.mode === "focus" ? "タイマー" : "自由計測"} / {session.minutes}分 / {session.outputCount || 0}個</span>{session.doneText && <small>{session.doneText}</small>}{session.outputMemo && <small>{session.outputMemo}</small>}{session.mood && <em>{session.mood}</em>}</div><button type="button" onClick={() => setEditingSessionId(session.id)} aria-label="カテゴリを変更">変更</button><b>+{session.reward} pt</b></article>;
      })}
    </div>
  );
}

function DailySalesPanel({ weekDays, salesByDay, updateDailySales }) {
  const [editingDate, setEditingDate] = useState(null);
  const selectedDay = weekDays.find((day) => day.date === editingDate);
  const selectedSales = editingDate ? salesByDay[editingDate] || { amount: 0, memo: "" } : null;

  return (
    <section className="daily-sales-card">
      <div className="chart-head">
        <div>
          <span><ShoppingBag size={16} />日ごとの売上</span>
          <small>作業ログに合わせて、1日ごとの売上も残せます</small>
        </div>
      </div>
      <div className="daily-sales-list">
        {weekDays.map((day) => {
          const sales = salesByDay[day.date] || { amount: 0, memo: "" };
          return (
            <button key={day.date} type="button" className="daily-sales-row" onClick={() => setEditingDate(day.date)}>
              <span><b>{day.label}</b><small>{day.dateLabel}</small></span>
              <strong>{formatCurrency(sales.amount)}</strong>
              {sales.memo && <em>{sales.memo}</em>}
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <DailySalesSheet
          day={selectedDay}
          sales={selectedSales}
          onSave={(nextSales) => {
            updateDailySales(selectedDay.date, nextSales);
            setEditingDate(null);
          }}
          onCancel={() => setEditingDate(null)}
        />
      )}
    </section>
  );
}

function DailySalesSheet({ day, sales, onSave, onCancel }) {
  const [amount, setAmount] = useState(String(sales.amount || 0));
  const [memo, setMemo] = useState(sales.memo || "");

  useEffect(() => {
    setAmount(String(sales.amount || 0));
    setMemo(sales.memo || "");
  }, [sales.amount, sales.memo]);

  return (
    <div className="chart-settings-overlay" role="dialog" aria-modal="true" aria-label={`${day.dateLabel}の売上`}>
      <button className="settings-scrim" type="button" aria-label="閉じる" onClick={onCancel} />
      <section className="chart-settings-sheet compact-picker-sheet">
        <div className="sheet-head">
          <div>
            <span><ShoppingBag size={16} />{day.dateLabel}の売上</span>
            <small>作業ログに紐づく日別の売上です</small>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="閉じる">×</button>
        </div>
        <label className="memo-field">
          <span>売上</span>
          <input type="number" min="0" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="memo-field">
          <span>メモ</span>
          <textarea value={memo} maxLength={120} placeholder="販売先、投稿、商品名など" onChange={(event) => setMemo(event.target.value)} />
        </label>
        <div className="sheet-actions">
          <button type="button" onClick={onCancel}>キャンセル</button>
          <button className="primary" type="button" onClick={() => onSave({ amount, memo })}>保存</button>
        </div>
      </section>
    </div>
  );
}

function MonthNavigator({ monthKey, setMonthKey }) {
  const currentMonth = monthKeyFor(new Date());
  return <div className="month-nav" aria-label="表示する月"><button type="button" onClick={() => setMonthKey(addMonths(monthKey, -1))}>前の月</button><strong>{formatMonthLabel(monthKey)}</strong><button type="button" onClick={() => setMonthKey(addMonths(monthKey, 1))} disabled={monthKey >= currentMonth}>次の月</button></div>;
}

function AnalysisPanel({ subjects, monthKey, setMonthKey, stats }) {
  return (
    <section className="analysis-panel">
      <MonthNavigator monthKey={monthKey} setMonthKey={setMonthKey} />
      <div className="analysis-grid">
        <div><span>月間作業時間</span><b>{formatChartTotal(stats.totalMinutes)}</b></div>
        <div><span>売上</span><b>{formatCurrency(stats.sales)}</b></div>
        <div className="soft-hourly"><span>実質時給</span><b>{stats.hourlyRate === null ? "-" : `${formatCurrency(stats.hourlyRate)}/h`}</b></div>
        <div><span>成果物数</span><b>{stats.outputCount}<small>個</small></b></div>
      </div>
      <p className="analysis-note">売上は「月ごとの一括売上」と「作業ログの日別売上」の合計です。</p>
      <section className="weekly-chart-card compact-analysis"><div className="chart-head"><div><span><Sprout size={16} />作業の内訳</span><small>収益作業と未来投資作業を分けて見ます</small></div></div><div className="work-type-summary"><div><span>収益作業</span><b>{formatChartTotal(stats.revenueMinutes)}</b></div><div><span>未来投資作業</span><b>{formatChartTotal(stats.futureMinutes)}</b></div></div></section>
      <section className="weekly-chart-card compact-analysis"><div className="chart-head"><div><span><BookOpen size={16} />カテゴリ別時間</span><small>月ごとの作業バランス</small></div></div><div className="category-total-list">{subjects.map((subject) => { const minutes = stats.categoryMinutes[subject.id] || 0; const ratio = stats.totalMinutes ? Math.round((minutes / stats.totalMinutes) * 100) : 0; return <div className="category-total-row" key={subject.id}><span><i style={{ background: subject.color }} />{subject.label}</span><b>{formatChartTotal(minutes)}</b><progress value={ratio} max="100" /></div>; })}</div></section>
    </section>
  );
}

function SalesPanel({ monthKey, setMonthKey, state, stats, updateMonthlySales }) {
  const saved = state.salesByMonth?.[monthKey] || { amount: 0, memo: "" };
  const [amount, setAmount] = useState(String(saved.amount || 0));
  const [memo, setMemo] = useState(saved.memo || "");
  useEffect(() => { setAmount(String(saved.amount || 0)); setMemo(saved.memo || ""); }, [monthKey, saved.amount, saved.memo]);
  return (
    <section className="sales-panel">
      <MonthNavigator monthKey={monthKey} setMonthKey={setMonthKey} />
      <div className="sales-card"><div className="sheet-head"><div><span><ShoppingBag size={16} />月ごとの一括売上</span><small>日別に入れない売上だけをここに足します</small></div></div><label className="memo-field"><span>一括売上</span><input type="number" min="0" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="memo-field"><span>メモ</span><textarea value={memo} maxLength={120} placeholder="販売先、キャンペーン、気づきなど" onChange={(event) => setMemo(event.target.value)} /></label><div className="sales-breakdown"><span>日別売上 {formatCurrency(stats.dailySales)}</span><span>月合計 {formatCurrency(stats.sales)}</span></div><div className="sheet-actions"><span className="sales-hourly-note">実質時給 {stats.hourlyRate === null ? "-" : `${formatCurrency(stats.hourlyRate)}/h`}</span><button className="primary" type="button" onClick={() => updateMonthlySales(monthKey, { amount, memo })}>保存</button></div></div>
    </section>
  );
}

function ChartSettingsSheet({ subjects, state, toggleChartSubject, close, reset }) {
  return <div className="chart-settings-overlay" role="dialog" aria-modal="true" aria-label="表示設定"><button className="settings-scrim" type="button" aria-label="閉じる" onClick={close} /><section className="chart-settings-sheet"><div className="sheet-head"><div><span><Palette size={16} />表示設定</span><small>グラフに表示するカテゴリを選べます</small></div><button className="icon-button" type="button" onClick={close} aria-label="閉じる"><Check size={18} /></button></div><div className="subject-settings-list">{subjects.map((subject) => { const checked = state.chartSettings.visibleSubjects.includes(subject.id); return <button className={checked ? "subject-setting-row active" : "subject-setting-row"} type="button" key={subject.id} onClick={() => toggleChartSubject(subject.id)}><span className={`setting-check ${checked ? "checked" : ""}`}>{checked && <Check size={13} />}</span><img src={subjectIconSrc(subject.icon)} alt="" /><strong>{subject.label}</strong><span className="color-chip" style={{ background: state.chartSettings.colors[subject.id] }} /></button>; })}</div><div className="sheet-actions"><button type="button" onClick={reset}>すべて表示</button><button className="primary" type="button" onClick={close}>保存</button></div></section></div>;
}

function SessionSubjectSheet({ subjects, editingSession, updateSessionSubject, close }) {
  return <div className="chart-settings-overlay" role="dialog" aria-modal="true" aria-label="記録のカテゴリ変更"><button className="settings-scrim" type="button" aria-label="閉じる" onClick={close} /><section className="chart-settings-sheet compact-picker-sheet"><div className="sheet-head"><div><span><BookOpen size={16} />カテゴリを変更</span><small>記録後でも作業カテゴリを直せます</small></div><button className="icon-button" type="button" onClick={close} aria-label="閉じる">×</button></div><div className="subject-picker-grid">{subjects.map((item) => <button key={item.id} type="button" className={editingSession.subject === item.id ? "active" : ""} style={{ "--subject-color": item.color }} onClick={() => { updateSessionSubject(editingSession.id, item.id); close(); }}><img src={subjectIconSrc(item.icon)} alt="" /><span>{item.label}</span></button>)}</div></section></div>;
}

function WardrobeScreen({ state, outfits, unlockOrSelect, setTab }) {
  const [purchaseOutfit, setPurchaseOutfit] = useState(null);
  const [previewOutfit, setPreviewOutfit] = useState(null);
  const [outfitMessage, setOutfitMessage] = useState("");
  const purchaseUnlocked = purchaseOutfit ? state.unlockedOutfits.includes(purchaseOutfit.id) : false;
  const purchasePrice = purchaseOutfit ? outfitPrice(purchaseOutfit) : 0;
  const purchaseOnSale = purchaseOutfit ? outfitSaleActive(purchaseOutfit) : false;
  const purchaseCanBuy = purchaseOutfit ? state.points >= purchasePrice : false;
  function handleOutfitTap(outfit) {
    if (state.unlockedOutfits.includes(outfit.id)) {
      unlockOrSelect(outfit);
      setOutfitMessage(`${outfit.name}に着替えました`);
      return;
    }
    setPurchaseOutfit(outfit);
  }

  function confirmPurchase() {
    if (!purchaseOutfit || !purchaseCanBuy || purchaseUnlocked) return;
    unlockOrSelect(purchaseOutfit);
    setOutfitMessage(`${purchaseOutfit.name}を交換して着替えました`);
    setPurchaseOutfit(null);
  }

  return (
    <div className={`screen wardrobe-screen ${purchaseOutfit || previewOutfit ? "modal-open" : ""}`}>
      <TopBar title="ショップ" points={state.points} onBack={() => setTab("home")} />
      <div className="shop-tabs"><button className="active" type="button">おようふく</button><button type="button">家具</button></div>
      {outfitMessage && <p className="outfit-message" role="status">{outfitMessage}</p>}
      <div className="outfit-grid">
        {outfits.map((outfit) => {
          const unlocked = state.unlockedOutfits.includes(outfit.id);
          const selected = state.selectedOutfitId === outfit.id;
          const price = outfitPrice(outfit);
          const onSale = outfitSaleActive(outfit);
          return (
            <article className={`outfit-card ${selected ? "selected" : ""} ${!unlocked ? "locked" : ""}`} key={outfit.id}>
              <button className="zoom" type="button" aria-label={`${outfit.name}を大きく表示`} onClick={() => setPreviewOutfit(outfit)}>⌕</button>
              <img src={asset(`crops/${outfit.id}.png`)} alt="" />
              <strong>{outfit.name}</strong>
              <button className="outfit-action" type="button" onClick={() => handleOutfitTap(outfit)} disabled={selected}>
                {unlocked ? (selected ? "着用中" : "着る") : (
                  <>
                    {onSale && <span className="original-price">{outfit.cost.toLocaleString()} pt</span>}
                    {price.toLocaleString()} pt
                  </>
                )}
              </button>
              {onSale && !unlocked && <small className="sale-note">{outfitSaleLabel(outfit)}</small>}
            </article>
          );
        })}
      </div>
      {purchaseOutfit && (
        <div className="purchase-overlay" role="dialog" aria-modal="true" aria-label="購入確認">
          <button className="purchase-scrim" type="button" aria-label="閉じる" onClick={() => setPurchaseOutfit(null)} />
          <section className="purchase-dialog">
            <img src={asset(`crops/${purchaseOutfit.id}.png`)} alt="" />
            <div>
              <span>{purchaseOutfit.name}</span>
              <strong>{purchasePrice.toLocaleString()}ptで交換しますか？</strong>
              {purchaseOnSale && <small>新発売セール中: 通常 {purchaseOutfit.cost.toLocaleString()}pt / {outfitSaleLabel(purchaseOutfit)}</small>}
              {!purchaseCanBuy && <small>ptが足りません</small>}
            </div>
            <div className="purchase-actions">
              <button type="button" onClick={() => setPurchaseOutfit(null)}>キャンセル</button>
              <button className="primary" type="button" onClick={confirmPurchase} disabled={!purchaseCanBuy}>交換する</button>
            </div>
          </section>
        </div>
      )}
      {previewOutfit && <OutfitPreview outfit={previewOutfit} close={() => setPreviewOutfit(null)} />}
    </div>
  );
}

function ClosetScreen({ state, outfits, unlockOrSelect, setTab }) {
  const [previewOutfit, setPreviewOutfit] = useState(null);
  const [outfitMessage, setOutfitMessage] = useState("");
  const unlockedOutfits = outfits.filter((outfit) => state.unlockedOutfits.includes(outfit.id));

  function wearOutfit(outfit) {
    unlockOrSelect(outfit);
    setOutfitMessage(`${outfit.name}に着替えました`);
  }

  return (
    <div className="screen wardrobe-screen closet-screen">
      <TopBar title="クローゼット" points={state.points} onBack={() => setTab("home")} />
      <div className="closet-toolbar"><span><Shirt size={16} />交換済み</span><button type="button" onClick={() => setTab("wardrobe")}><ShoppingBag size={15} />ショップ</button></div>
      {outfitMessage && <p className="outfit-message" role="status">{outfitMessage}</p>}
      <div className="outfit-grid">
        {unlockedOutfits.map((outfit) => {
          const selected = state.selectedOutfitId === outfit.id;
          return (
            <article className={`outfit-card ${selected ? "selected" : ""}`} key={outfit.id}>
              <button className="zoom" type="button" aria-label={`${outfit.name}を大きく表示`} onClick={() => setPreviewOutfit(outfit)}>⌕</button>
              <img src={asset(`crops/${outfit.id}.png`)} alt="" />
              <strong>{outfit.name}</strong>
              <button className="outfit-action" type="button" onClick={() => wearOutfit(outfit)} disabled={selected}>{selected ? "着用中" : "着る"}</button>
            </article>
          );
        })}
      </div>
      {previewOutfit && <OutfitPreview outfit={previewOutfit} close={() => setPreviewOutfit(null)} />}
    </div>
  );
}

function OutfitPreview({ outfit, close }) {
  return <div className="outfit-preview-overlay" role="dialog" aria-modal="true" aria-label={`${outfit.name}の拡大表示`}><button className="preview-scrim" type="button" aria-label="閉じる" onClick={close} /><section className="outfit-preview-dialog"><button className="icon-button preview-close" type="button" aria-label="閉じる" onClick={close}>×</button><img src={asset(`crops/${outfit.id}.png`)} alt={outfit.name} /><strong>{outfit.name}</strong></section></div>;
}

function BottomNav({ active, setTab }) {
  const items = [
    { id: "home", label: "ホーム", icon: <Home size={20} /> },
    { id: "records", label: "記録", icon: <BookOpen size={20} /> },
    { id: "timer", label: "タイマー", icon: <Clock3 size={20} /> },
    { id: "wardrobe", label: "ショップ", icon: <ShoppingBag size={20} /> },
  ];
  return <nav className="bottom-nav">{items.map((item) => <button key={item.id} className={active === item.id ? "active" : ""} type="button" onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>;
}

async function resetLocal() {
  const ok = window.confirm("本当にアプリの記録をリセットしてもいいですか？端末内の作業記録、売上、設定、追加BGMは削除されます。必要なら先にデータ管理からバックアップを保存してください。");
  if (!ok) return;
  await deleteBgmDb();
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

const rootElement = document.getElementById("root");
const root = window.__USAPON_TIMER_ROOT__ || createRoot(rootElement);
window.__USAPON_TIMER_ROOT__ = root;
root.render(<App />);
registerServiceWorker();
