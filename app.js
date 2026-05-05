const STORAGE_KEY = "reminder-studio-items";
const state = {
  reminders: loadReminders(),
  activeDate: "all",
  filter: "all",
  deferredInstallPrompt: null,
  recognition: null,
  listening: false,
};

const els = {
  form: document.querySelector("#reminderForm"),
  title: document.querySelector("#titleInput"),
  date: document.querySelector("#dateInput"),
  time: document.querySelector("#timeInput"),
  folder: document.querySelector("#folderInput"),
  language: document.querySelector("#languageInput"),
  record: document.querySelector("#recordButton"),
  recordLabel: document.querySelector("#recordLabel"),
  voiceStatus: document.querySelector("#voiceStatus"),
  voiceHelp: document.querySelector("#voiceHelp"),
  translate: document.querySelector("#translateButton"),
  translationPreview: document.querySelector("#translationPreview"),
  translationText: document.querySelector("#translationText"),
  notify: document.querySelector("#notifyButton"),
  install: document.querySelector("#installButton"),
  folders: document.querySelector("#folderList"),
  list: document.querySelector("#reminderList"),
  template: document.querySelector("#reminderTemplate"),
  dailyGreeting: document.querySelector("#dailyGreeting"),
  totalCount: document.querySelector("#totalCount"),
  todayCount: document.querySelector("#todayCount"),
  doneCount: document.querySelector("#doneCount"),
  activeFolderLabel: document.querySelector("#activeFolderLabel"),
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

init();

function init() {
  els.date.value = toDateInput(new Date());
  setDailyGreeting();
  setupSpeechRecognition();
  bindEvents();
  render();
  registerServiceWorker();
  startNotificationLoop();
}

function bindEvents() {
  els.form.addEventListener("submit", handleSubmit);
  els.record.addEventListener("click", toggleRecording);
  els.translate.addEventListener("click", translateCurrentText);
  els.notify.addEventListener("click", requestNotifications);
  els.install.addEventListener("click", installApp);
  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      els.title.value = button.dataset.example;
      els.title.dispatchEvent(new Event("input"));
      els.title.focus();
    });
  });

  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
      render();
    });
  });

  els.title.addEventListener("input", () => {
    clearTranslationPreview();
    const parsed = parseReminderText(els.title.value);
    if (parsed.date && !els.date.matches(":focus")) els.date.value = parsed.date;
    if (parsed.time && !els.time.matches(":focus")) els.time.value = parsed.time;
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    els.install.hidden = false;
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;

  const submitButton = els.form.querySelector(".primary-button");
  submitButton.disabled = true;
  submitButton.textContent = "Saving...";

  const parsed = parseReminderText(title);
  const targetLanguage = els.language.value;
  let translation = els.translationText.dataset.source === title ? els.translationText.textContent : "";
  if (targetLanguage && !translation) {
    try {
      translation = await translateText(title, targetLanguage);
    } catch {
      translation = "";
    }
  }

  const reminder = {
    id: crypto.randomUUID(),
    title,
    translation,
    date: els.date.value || parsed.date || toDateInput(new Date()),
    time: els.time.value || parsed.time || "",
    folder: els.folder.value || "Personal",
    color: document.querySelector("input[name='color']:checked")?.value || "#2f80ed",
    done: false,
    createdAt: new Date().toISOString(),
    notified: false,
  };

  state.reminders.unshift(reminder);
  saveReminders();
  els.form.reset();
  els.date.value = toDateInput(new Date());
  document.querySelector("input[name='color'][value='#2f80ed']").checked = true;
  clearTranslationPreview();
  submitButton.disabled = false;
  submitButton.textContent = "Save reminder";
  render();
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.record.disabled = true;
    els.voiceStatus.textContent = "Voice is not available here";
    els.voiceHelp.textContent = "Typing still works beautifully.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-AU";

  recognition.onstart = () => setRecording(true);
  recognition.onend = () => setRecording(false);
  recognition.onerror = (event) => {
    els.voiceStatus.textContent = "Voice input paused";
      els.voiceHelp.textContent = event.error === "not-allowed" ? "Microphone access was blocked." : "Tap to talk and try again.";
  };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();

    els.title.value = transcript;
    clearTranslationPreview();
    const parsed = parseReminderText(transcript);
    if (parsed.date) els.date.value = parsed.date;
    if (parsed.time) els.time.value = parsed.time;
    els.voiceStatus.textContent = event.results[event.results.length - 1].isFinal ? "Got it" : "Listening...";
    els.voiceHelp.textContent = transcript || "Keep speaking.";
  };

  state.recognition = recognition;
}

function toggleRecording() {
  if (!state.recognition) return;
  if (state.listening) {
    state.recognition.stop();
  } else {
    state.recognition.start();
  }
}

function setRecording(isRecording) {
  state.listening = isRecording;
  els.record.classList.toggle("recording", isRecording);
  els.record.setAttribute("aria-pressed", String(isRecording));
  els.recordLabel.textContent = isRecording ? "Stop" : "Tap to talk";
  els.voiceStatus.textContent = isRecording ? "Listening..." : "Ready when you are";
}

async function translateCurrentText() {
  const text = els.title.value.trim();
  const target = els.language.value;
  if (!text || !target) {
    els.voiceStatus.textContent = "Add words and choose a language first";
    return;
  }

  els.translate.disabled = true;
    els.translate.textContent = "Translating...";
  try {
    const translation = await translateText(text, target);
    els.translationText.textContent = translation;
    els.translationText.dataset.source = text;
    els.translationPreview.hidden = false;
    els.voiceStatus.textContent = "Translation ready";
    els.voiceHelp.textContent = "The original and translation will both be saved.";
  } catch (error) {
    els.voiceStatus.textContent = "Translation was not available";
    els.voiceHelp.textContent = error.message;
  } finally {
    els.translate.disabled = false;
    els.translate.textContent = "Translate";
  }
}

function clearTranslationPreview() {
  els.translationText.textContent = "";
  els.translationText.dataset.source = "";
  els.translationPreview.hidden = true;
}

async function translateText(text, targetLanguage) {
  if ("Translator" in window && window.Translator?.create) {
    const translator = await window.Translator.create({
      sourceLanguage: "auto",
      targetLanguage,
    });
    return translator.translate(text);
  }

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `en|${targetLanguage}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error("The free translation service could not be reached.");
  const data = await response.json();
  return data.responseData?.translatedText || text;
}

function parseReminderText(text) {
  const lower = text.toLowerCase();
  const now = new Date();
  let date = null;
  let time = null;

  if (lower.includes("today")) date = toDateInput(now);
  if (lower.includes("tomorrow")) date = toDateInput(addDays(now, 1));
  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) date = toDateInput(addDays(now, Number(inDays[1])));

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekday = weekdays.find((day) => lower.includes(day));
  if (weekday) {
    const target = weekdays.indexOf(weekday);
    const diff = (target + 7 - now.getDay()) % 7 || 7;
    date = toDateInput(addDays(now, diff));
  }

  const numericDate = lower.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numericDate) {
    const day = Number(numericDate[1]);
    const month = Number(numericDate[2]) - 1;
    const year = numericDate[3] ? normalizeYear(Number(numericDate[3])) : now.getFullYear();
    date = toDateInput(new Date(year, month, day));
  }

  const timeMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (timeMatch && !lower.match(/\b\d+\s+days?\b/)) {
    let hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2] || "0");
    const suffix = timeMatch[3];
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    if (hour < 24 && minute < 60) time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return { date, time };
}

function render() {
  renderStats();
  renderFolders();
  renderReminders();
}

function renderStats() {
  const today = toDateInput(new Date());
  els.totalCount.textContent = state.reminders.length;
  els.todayCount.textContent = state.reminders.filter((item) => item.date === today && !item.done).length;
  els.doneCount.textContent = state.reminders.filter((item) => item.done).length;
}

function renderFolders() {
  const groups = groupByDate(state.reminders);
  const entries = [["all", "All dates", state.reminders.length], ...groups];
  els.folders.replaceChildren(
    ...entries.map(([key, label, count]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "folder-button";
      button.classList.toggle("active", state.activeDate === key);
      button.innerHTML = `<span class="folder-name"></span><span class="folder-count"></span>`;
      button.querySelector(".folder-name").textContent = label;
      button.querySelector(".folder-count").textContent = count;
      button.addEventListener("click", () => {
        state.activeDate = key;
        render();
      });
      return button;
    })
  );
}

function renderReminders() {
  const filtered = state.reminders
    .filter((item) => state.activeDate === "all" || item.date === state.activeDate)
    .filter((item) => state.filter === "all" || (state.filter === "done" ? item.done : !item.done))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const activeLabel = state.activeDate === "all" ? "All dates" : formatDateLabel(state.activeDate);
  els.activeFolderLabel.textContent = activeLabel;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("strong");
    title.textContent = state.activeDate === "all" ? "Nothing waiting on you." : "This day is clear.";
    const body = document.createElement("span");
    body.textContent = "Add a reminder whenever something pops into your head.";
    empty.append(title, body);
    els.list.replaceChildren(empty);
    return;
  }

  els.list.replaceChildren(...filtered.map(createReminderCard));
}

function createReminderCard(reminder) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  node.classList.toggle("done", reminder.done);
  node.style.setProperty("--item-color", reminder.color);
  node.querySelector(".folder-pill").textContent = reminder.folder;
  node.querySelector("time").textContent = formatDateTime(reminder.date, reminder.time);
  node.querySelector("h3").textContent = reminder.title;

  const translation = node.querySelector(".translation");
  if (reminder.translation) {
    translation.hidden = false;
    translation.textContent = reminder.translation;
  }

  const complete = node.querySelector(".complete-button");
  complete.textContent = reminder.done ? "Bring back" : "Finished";
  complete.addEventListener("click", () => {
    reminder.done = !reminder.done;
    saveReminders();
    render();
  });

  node.querySelector(".delete-button").addEventListener("click", () => {
    state.reminders = state.reminders.filter((item) => item.id !== reminder.id);
    saveReminders();
    render();
  });

  return node;
}

function groupByDate(reminders) {
  const counts = new Map();
  reminders.forEach((item) => counts.set(item.date, (counts.get(item.date) || 0) + 1));
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => [date, formatDateLabel(date), count]);
}

function formatDateLabel(value) {
  const today = toDateInput(new Date());
  const tomorrow = toDateInput(addDays(new Date(), 1));
  if (value === today) return "Today";
  if (value === tomorrow) return "Tomorrow";
  return dateFormatter.format(parseLocalDate(value));
}

function formatDateTime(date, time) {
  const dateText = formatDateLabel(date);
  if (!time) return dateText;
  const [hour, minute] = time.split(":").map(Number);
  const value = parseLocalDate(date);
  value.setHours(hour, minute);
  return `${dateText}, ${timeFormatter.format(value)}`;
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    els.voiceStatus.textContent = "This browser does not support notifications";
    return;
  }

  const permission = await Notification.requestPermission();
  els.voiceStatus.textContent = permission === "granted" ? "Alerts are enabled" : "Alerts were not enabled";
}

function startNotificationLoop() {
  setInterval(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    state.reminders.forEach((reminder) => {
      if (reminder.done || reminder.notified || !reminder.time) return;
      const due = parseLocalDate(reminder.date);
      const [hour, minute] = reminder.time.split(":").map(Number);
      due.setHours(hour, minute, 0, 0);
      if (due <= now) {
        new Notification("Kind Reminders", {
          body: reminder.title,
          tag: reminder.id,
        });
        reminder.notified = true;
        saveReminders();
      }
    });
  }, 30000);
}

function setDailyGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    els.dailyGreeting.textContent = "Good morning. Let's keep it light.";
  } else if (hour < 18) {
    els.dailyGreeting.textContent = "Good afternoon. One thing at a time.";
  } else {
    els.dailyGreeting.textContent = "Good evening. Tomorrow can wait its turn.";
  }
}

async function installApp() {
  if (!state.deferredInstallPrompt) return;
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice;
  state.deferredInstallPrompt = null;
  els.install.hidden = true;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

function loadReminders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReminders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reminders));
}

function toDateInput(date) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}
