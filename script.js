/* ============================================================
   DAILY HABITS TRACKER — script.js
   ============================================================ */

// ── LocalStorage Keys ──────────────────────────────────────
const HABITS_KEY      = 'dht_habits';        // Array of { id, name }
const COMPLETIONS_KEY = 'dht_completions';   // { "YYYY-MM-DD": { habitId: bool } }
const THEME_KEY       = 'dht_theme';         // "light" | "dark"

// ── DOM References ─────────────────────────────────────────
const form           = document.getElementById('add-habit-form');
const habitInput     = document.getElementById('habit-input');
const habitList      = document.getElementById('habit-list');
const emptyState     = document.getElementById('empty-state');
const progressText   = document.getElementById('progress-text');
const progressFill   = document.getElementById('progress-bar-fill');
const progressTrack  = document.querySelector('.progress-bar-track');
const todayDateEl    = document.getElementById('today-date');
const clearBtn       = document.getElementById('clear-btn');
const themeToggle    = document.getElementById('theme-toggle');
const themeIcon      = document.getElementById('theme-icon');

// ── Helpers ────────────────────────────────────────────────

/**
 * Returns today's date string as "YYYY-MM-DD".
 */
function getTodayKey() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a friendly date string, e.g. "Friday, 6 March 2026".
 */
function getFriendlyDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
  });
}

/** Generates a simple unique id from timestamp + random suffix. */
function generateId() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ── Data Layer ─────────────────────────────────────────────

/** Load habits array from localStorage. */
function loadHabits() {
  try {
    return JSON.parse(localStorage.getItem(HABITS_KEY)) || [];
  } catch {
    return [];
  }
}

/** Save habits array to localStorage. */
function saveHabits(habits) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

/** Load the full completions object from localStorage. */
function loadCompletions() {
  try {
    return JSON.parse(localStorage.getItem(COMPLETIONS_KEY)) || {};
  } catch {
    return {};
  }
}

/** Save the full completions object to localStorage. */
function saveCompletions(completions) {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
}

/**
 * Returns today's completion map: { habitId: bool }.
 * Creates a fresh entry for today if one doesn't exist.
 */
function getTodayCompletions() {
  const completions = loadCompletions();
  const todayKey    = getTodayKey();
  if (!completions[todayKey]) {
    completions[todayKey] = {};
    saveCompletions(completions);
  }
  return completions[todayKey];
}

/** Update a single habit's completion state for today. */
function setHabitDone(habitId, isDone) {
  const completions = loadCompletions();
  const todayKey    = getTodayKey();
  if (!completions[todayKey]) completions[todayKey] = {};
  completions[todayKey][habitId] = isDone;
  saveCompletions(completions);
}

/** Remove a habit's entry from all dates in completions. */
function removeHabitFromCompletions(habitId) {
  const completions = loadCompletions();
  for (const date in completions) {
    delete completions[date][habitId];
  }
  saveCompletions(completions);
}

/** Clear today's checkmarks (set all to false). */
function clearTodayCompletions() {
  const completions = loadCompletions();
  const todayKey    = getTodayKey();
  completions[todayKey] = {};
  saveCompletions(completions);
}

// ── Rendering ──────────────────────────────────────────────

/** Update the progress text and bar. */
function updateProgress() {
  const habits  = loadHabits();
  const today   = getTodayCompletions();
  const total   = habits.length;

  // Update track aria attrs
  progressTrack.setAttribute('aria-valuemax', total);

  if (total === 0) {
    progressText.textContent = 'No habits yet — add one above!';
    progressFill.style.width = '0%';
    progressTrack.setAttribute('aria-valuenow', 0);
    return;
  }

  const done       = habits.filter(h => !!today[h.id]).length;
  const percentage = Math.round((done / total) * 100);

  progressText.textContent = `Today's Progress: ${percentage}% (${done} / ${total} habit${total !== 1 ? 's' : ''} done)`;
  progressFill.style.width = `${percentage}%`;
  progressTrack.setAttribute('aria-valuenow', percentage);
}

/**
 * Create a single habit list item element.
 * @param {{ id: string, name: string }} habit
 * @param {boolean} isDone
 * @returns {HTMLLIElement}
 */
function createHabitElement(habit, isDone) {
  const li = document.createElement('li');
  li.className = `habit-item${isDone ? ' done' : ''}`;
  li.dataset.id = habit.id;

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type      = 'checkbox';
  checkbox.className = 'habit-checkbox';
  checkbox.checked   = isDone;
  checkbox.id        = `cb-${habit.id}`;
  checkbox.setAttribute('aria-label', `Mark "${habit.name}" as done`);
  checkbox.addEventListener('change', () => {
    setHabitDone(habit.id, checkbox.checked);
    li.classList.toggle('done', checkbox.checked);
    nameEl.style.transition = 'color 0.2s, text-decoration 0.2s';
    updateProgress();
  });

  // Name label
  const nameEl = document.createElement('label');
  nameEl.className   = 'habit-name';
  nameEl.htmlFor     = `cb-${habit.id}`;
  nameEl.textContent = habit.name;

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className   = 'delete-btn';
  delBtn.innerHTML   = '🗑';
  delBtn.title       = `Delete "${habit.name}"`;
  delBtn.setAttribute('aria-label', `Delete habit: ${habit.name}`);
  delBtn.addEventListener('click', () => deleteHabit(habit.id));

  li.appendChild(checkbox);
  li.appendChild(nameEl);
  li.appendChild(delBtn);

  return li;
}

/** Render all habits from storage into the list. */
function renderHabits() {
  const habits = loadHabits();
  const today  = getTodayCompletions();

  // Clear list (keep empty state node to reuse)
  while (habitList.firstChild) habitList.removeChild(habitList.firstChild);

  if (habits.length === 0) {
    habitList.appendChild(emptyState);
    emptyState.style.display = '';
  } else {
    emptyState.style.display = 'none';
    habits.forEach(habit => {
      const isDone = !!today[habit.id];
      habitList.appendChild(createHabitElement(habit, isDone));
    });
  }

  updateProgress();
}

// ── Event Handlers ─────────────────────────────────────────

/** Add a new habit from the input field. */
function addHabit(event) {
  event.preventDefault();
  const name = habitInput.value.trim();
  if (!name) {
    habitInput.focus();
    habitInput.classList.add('shake');
    setTimeout(() => habitInput.classList.remove('shake'), 400);
    return;
  }

  const habits  = loadHabits();
  const newHabit = { id: generateId(), name };
  habits.push(newHabit);
  saveHabits(habits);

  habitInput.value = '';
  habitInput.focus();
  renderHabits();
}

/** Remove a habit by id. */
function deleteHabit(habitId) {
  let habits = loadHabits();
  habits = habits.filter(h => h.id !== habitId);
  saveHabits(habits);
  removeHabitFromCompletions(habitId);

  // Animate removal
  const li = habitList.querySelector(`[data-id="${habitId}"]`);
  if (li) {
    li.style.transition = 'opacity 0.2s, transform 0.2s';
    li.style.opacity    = '0';
    li.style.transform  = 'translateX(20px)';
    setTimeout(() => renderHabits(), 220);
  } else {
    renderHabits();
  }
}

/** Clear all of today's checkmarks and re-render. */
function clearToday() {
  clearTodayCompletions();
  renderHabits();
}

// ── Theme ──────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);
}

// ── Shake animation (inline, avoids extra CSS) ─────────────
(function injectShakeAnimation() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-6px); }
      40%       { transform: translateX(6px); }
      60%       { transform: translateX(-4px); }
      80%       { transform: translateX(4px); }
    }
    .shake { animation: shake 0.35s ease; }
  `;
  document.head.appendChild(style);
})();

// ── Init ───────────────────────────────────────────────────

function init() {
  // Display today's date
  todayDateEl.textContent = getFriendlyDate();

  // Load saved theme preference
  loadTheme();

  // Render habits (this also calls updateProgress)
  renderHabits();

  // Event listeners
  form.addEventListener('submit', addHabit);
  clearBtn.addEventListener('click', clearToday);
  themeToggle.addEventListener('click', toggleTheme);
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', init);
