import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { registerServiceWorker } from "./registerServiceWorker";
import {
  BookOpen,
  BellRing,
  Check,
  ChevronLeft,
  CirclePause,
  CirclePlay,
  Clock3,
  Download,
  Home,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
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
];
const DEFAULT_OUTFIT_ID = "outfit-n-1";
const OUTFIT_IDS = new Set(OUTFITS.map((outfit) => outfit.id));
const STUDY_IMAGES = {
  "outfit-n-1": "study/full/outfit-n-1.png",
  "outfit-n-2": "study/full/outfit-n-2.png",
  "outfit-n-3": "study/full/outfit-n-3.png",
  "outfit-r-1": "study/full/outfit-r-1.png",
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

function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState("home");
  const [nowTick, setNowTick] = useState(Date.now());
  const [completionDraft, setCompletionDraft] = useState(null);
  const [rewardToast, setRewardToast] = useState(null);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState(() => (
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  ));
  const audioContextRef = React.useRef(null);
  const alarmTimeoutsRef = React.useRef([]);
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

  useEffect(() => {
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
    stopAlarm();
  }, []);

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
      if (isUnlocked) return { ...current, selectedOutfitId: outfit.id };
      if (current.points < outfit.cost) return current;
      return {
        ...current,
        points: current.points - outfit.cost,
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
              openDataManager={() => setDataManagerOpen(true)}
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

function HomeScreen({ state, subjects, outfit, subject, progress, setTab, startTimer, setSubject, updateDailyGoal, openDataManager }) {
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
        <QuickTile icon={<Download size={24} />} label="データ" onClick={openDataManager} />
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
            <small>記録・売上・カテゴリ・ptを書き出します</small>
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
        <p className="backup-note">復元前に今のデータも必要なら、先にバックアップを保存してください。</p>
      </section>
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
}) {
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [customFocusOpen, setCustomFocusOpen] = useState(false);
  const [customFocusMinutes, setCustomFocusMinutes] = useState(String(state.timer.focusMinutes || 25));
  const isRunning = state.timer.running;
  const isOvertime = state.timer.mode === "focus" && overtimeSeconds > 0;
  const isCustomFocus = !FOCUS_PRESETS.includes(Number(state.timer.focusMinutes));

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
        <span className="timer-mini-pt">+{rewardFor(Math.max(1, Math.round(spentSeconds / 60)))} pt</span>
      </header>
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
  const purchaseUnlocked = purchaseOutfit ? state.unlockedOutfits.includes(purchaseOutfit.id) : false;
  const purchaseCanBuy = purchaseOutfit ? state.points >= purchaseOutfit.cost : false;
  function handleOutfitTap(outfit) {
    if (state.unlockedOutfits.includes(outfit.id)) { unlockOrSelect(outfit); return; }
    setPurchaseOutfit(outfit);
  }
  return <div className="screen wardrobe-screen"><TopBar title="ショップ" points={state.points} onBack={() => setTab("home")} /><div className="shop-tabs"><button className="active" type="button">おようふく</button><button type="button">家具</button></div><div className="outfit-grid">{outfits.map((outfit) => { const unlocked = state.unlockedOutfits.includes(outfit.id); const selected = state.selectedOutfitId === outfit.id; return <article className={`outfit-card ${selected ? "selected" : ""} ${!unlocked ? "locked" : ""}`} key={outfit.id}><button className="zoom" type="button" aria-label={`${outfit.name}を大きく表示`} onClick={() => setPreviewOutfit(outfit)}>⌕</button><img src={asset(`crops/${outfit.id}.png`)} alt="" /><strong>{outfit.name}</strong><button className="outfit-action" type="button" onClick={() => handleOutfitTap(outfit)} disabled={selected}>{unlocked ? (selected ? "着用中" : "着る") : `${outfit.cost.toLocaleString()} pt`}</button></article>; })}</div>{purchaseOutfit && <div className="purchase-overlay" role="dialog" aria-modal="true" aria-label="購入確認"><button className="purchase-scrim" type="button" aria-label="閉じる" onClick={() => setPurchaseOutfit(null)} /><section className="purchase-dialog"><img src={asset(`crops/${purchaseOutfit.id}.png`)} alt="" /><div><span>{purchaseOutfit.name}</span><strong>{purchaseOutfit.cost.toLocaleString()}ptで交換しますか？</strong>{!purchaseCanBuy && <small>ptが足りません</small>}</div><div className="purchase-actions"><button type="button" onClick={() => setPurchaseOutfit(null)}>キャンセル</button><button className="primary" type="button" onClick={() => { if (!purchaseCanBuy || purchaseUnlocked) return; unlockOrSelect(purchaseOutfit); setPurchaseOutfit(null); }} disabled={!purchaseCanBuy}>交換する</button></div></section></div>}{previewOutfit && <OutfitPreview outfit={previewOutfit} close={() => setPreviewOutfit(null)} />}</div>;
}

function ClosetScreen({ state, outfits, unlockOrSelect, setTab }) {
  const [previewOutfit, setPreviewOutfit] = useState(null);
  const unlockedOutfits = outfits.filter((outfit) => state.unlockedOutfits.includes(outfit.id));
  return <div className="screen wardrobe-screen closet-screen"><TopBar title="クローゼット" points={state.points} onBack={() => setTab("home")} /><div className="closet-toolbar"><span><Shirt size={16} />交換済み</span><button type="button" onClick={() => setTab("wardrobe")}><ShoppingBag size={15} />ショップ</button></div><div className="outfit-grid">{unlockedOutfits.map((outfit) => { const selected = state.selectedOutfitId === outfit.id; return <article className={`outfit-card ${selected ? "selected" : ""}`} key={outfit.id}><button className="zoom" type="button" aria-label={`${outfit.name}を大きく表示`} onClick={() => setPreviewOutfit(outfit)}>⌕</button><img src={asset(`crops/${outfit.id}.png`)} alt="" /><strong>{outfit.name}</strong><button className="outfit-action" type="button" onClick={() => unlockOrSelect(outfit)} disabled={selected}>{selected ? "着用中" : "着る"}</button></article>; })}</div>{previewOutfit && <OutfitPreview outfit={previewOutfit} close={() => setPreviewOutfit(null)} />}</div>;
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

const rootElement = document.getElementById("root");
const root = window.__USAPON_TIMER_ROOT__ || createRoot(rootElement);
window.__USAPON_TIMER_ROOT__ = root;
root.render(<App />);
registerServiceWorker();
