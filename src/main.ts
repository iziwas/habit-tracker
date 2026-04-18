import { invoke } from '@tauri-apps/api/core';
import { HabitsData } from './types.ts';

let data: HabitsData = { habits: [], completions: {} };
let currentDate = new Date();

// --- Chargement / Sauvegarde ---

async function loadData() {
  const raw = await invoke<string>('load_data');
  const parsed = JSON.parse(raw);
  data = {
    habits: (parsed.habits || []).map((h: any) => ({
      ...h,
      days: h.days ?? [0, 1, 2, 3, 4, 5, 6] // tous les jours si pas défini
    })),
    completions: parsed.completions || {}
  };
}

async function saveData() {
  await invoke('save_data', { data: JSON.stringify(data) }).catch((err) => {
    console.error('Erreur saveData:', err);
  });
}

// --- Rendu du calendrier ---

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Titre du mois
  document.getElementById('month-title')!.textContent =
      new Date(year, month).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  const grid = document.getElementById('calendar-grid')!;
  grid.innerHTML = '';

  // En-têtes des jours
  ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].forEach(day => {
    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = day;
    grid.appendChild(header);
  });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Décalage pour commencer le lundi
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  // Cases vides avant le 1er
  for (let i = 0; i < startOffset; i++) {
    grid.appendChild(document.createElement('div'));
  }

  // Jours du mois
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    // Vérifie si c'est aujourd'hui
    const today = new Date();
    const isToday =
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();
    if (isToday) cell.classList.add('today');

    const dayNum = document.createElement('span');
    dayNum.className = 'day-number';
    dayNum.textContent = String(day);
    cell.appendChild(dayNum);

    // Indicateurs d'habitudes complétées
    // Indicateurs d'habitudes complétées
    const completions = data.completions[dateStr] || [];
    const dayOfWeek = new Date(year, month, day).getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const habitsForDay = data.habits.filter(h => h.days.includes(adjustedDay));
    habitsForDay.forEach(habit => {
      const dot = document.createElement('div');
      dot.className = 'habit-dot';
      dot.style.backgroundColor = completions.includes(habit.id)
          ? habit.color
          : '#e0e0e0';

      const isCompleted = completions.includes(habit.id);

      // Ajout du nom à côté du point
      const dotCircle = document.createElement('span');
      dotCircle.className = 'habit-dot-circle';

      const dotLabel = document.createElement('span');
      dotLabel.className = 'habit-dot-label';
      dotLabel.textContent = habit.name;

      if (isCompleted) {
        dot.classList.add('completed');           // ← ajout
        dot.style.backgroundColor = habit.color; // ← fond coloré
      }

      dot.appendChild(dotCircle);
      dot.appendChild(dotLabel);
      dot.addEventListener('click', () => toggleHabit(dateStr, habit.id));
      cell.appendChild(dot);
    });

    grid.appendChild(cell);
  }
}

// --- Toggle habitude ---

async function toggleHabit(dateStr: string, habitId: string) {
  if (!data.completions[dateStr]) data.completions[dateStr] = [];
  const idx = data.completions[dateStr].indexOf(habitId);
  if (idx === -1) {
    data.completions[dateStr].push(habitId);
  } else {
    data.completions[dateStr].splice(idx, 1);
  }
  await saveData();
  renderCalendar();
}

// --- Gestion des habitudes ---

function renderHabits() {
  const list = document.getElementById('habits-list')!;
  list.innerHTML = '';
  data.habits.forEach(habit => {
    const item = document.createElement('div');
    item.className = 'habit-item';
    item.innerHTML = `
      <span class="habit-color" style="background:${habit.color}"></span>
      <span>${habit.name}</span>
      <button data-id="${habit.id}" class="edit-habit">✎</button>
      <button data-id="${habit.id}" class="delete-habit">✕</button>
    `;
    item.querySelector('.edit-habit')!.addEventListener('click', () => openEditModal(habit));
    item.querySelector('.delete-habit')!.addEventListener('click', () => deleteHabit(habit.id));
    list.appendChild(item);
  });
}

let selectedColor = '#6366f1';
let selectedDays: number[] = [0, 1, 2, 3, 4, 5, 6]; // tous les jours par défaut
let editingHabitId: string | null = null;
let editSelectedColor = '#6366f1';
let editSelectedDays: number[] = [0, 1, 2, 3, 4, 5, 6];

// ── Modale ajout ──

function openModal() {
  const overlay = document.getElementById('modal-overlay')!;
  const input = document.getElementById('habit-name-input') as HTMLInputElement;

  input.value = '';
  selectedColor = '#6366f1';
  selectedDays = [0, 1, 2, 3, 4, 5, 6];

  document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
  document.querySelector('.color-option[data-color="#6366f1"]')!.classList.add('selected');
  document.querySelectorAll('.day-option').forEach(el => el.classList.add('selected'));

  overlay.classList.remove('hidden');
  input.focus();
}

function closeModal() {
  document.getElementById('modal-overlay')!.classList.add('hidden');
}

async function addHabit() {
  const input = document.getElementById('habit-name-input') as HTMLInputElement;
  const name = input.value.trim();
  if (!name) return;
  if (selectedDays.length === 0) {
    alert('Sélectionne au moins un jour.');
    return;
  }

  data.habits.push({
    id: crypto.randomUUID(),
    name,
    color: selectedColor,
    days: selectedDays
  });
  await saveData();
  renderHabits();
  renderCalendar();
  closeModal();
}

// Sélection couleur (ajout)
document.querySelectorAll('.color-option').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.color-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    selectedColor = (el as HTMLElement).dataset.color!;
  });
});

// Sélection jours (ajout)
document.querySelectorAll('.day-option').forEach(el => {
  el.addEventListener('click', () => {
    const day = parseInt((el as HTMLElement).dataset.day!);
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter(d => d !== day);
      el.classList.remove('selected');
    } else {
      selectedDays.push(day);
      el.classList.add('selected');
    }
  });
});

document.getElementById('add-habit')!.addEventListener('click', openModal);
document.getElementById('modal-cancel')!.addEventListener('click', closeModal);
document.getElementById('modal-confirm')!.addEventListener('click', addHabit);
document.getElementById('modal-overlay')!.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('habit-name-input')!.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addHabit();
  if (e.key === 'Escape') closeModal();
});

// ── Modale édition ──

function openEditModal(habit: { id: string; name: string; color: string; days: number[] }) {
  editingHabitId = habit.id;
  editSelectedColor = habit.color;
  editSelectedDays = [...habit.days];

  const input = document.getElementById('edit-habit-name-input') as HTMLInputElement;
  input.value = habit.name;

  document.querySelectorAll('.edit-color-option').forEach(el => {
    el.classList.toggle('selected', (el as HTMLElement).dataset.color === habit.color);
  });

  document.querySelectorAll('.edit-day-option').forEach(el => {
    const day = parseInt((el as HTMLElement).dataset.day!);
    el.classList.toggle('selected', habit.days.includes(day));
  });

  document.getElementById('edit-modal-overlay')!.classList.remove('hidden');
  input.focus();
}

function closeEditModal() {
  document.getElementById('edit-modal-overlay')!.classList.add('hidden');
  editingHabitId = null;
}

async function saveEditHabit() {
  const input = document.getElementById('edit-habit-name-input') as HTMLInputElement;
  const name = input.value.trim();
  if (!name || !editingHabitId) return;
  if (editSelectedDays.length === 0) {
    alert('Sélectionne au moins un jour.');
    return;
  }

  data.habits = data.habits.map(h =>
      h.id === editingHabitId
          ? { ...h, name, color: editSelectedColor, days: editSelectedDays }
          : h
  );
  await saveData();
  renderHabits();
  renderCalendar();
  closeEditModal();
}

// Sélection couleur (édition)
document.querySelectorAll('.edit-color-option').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.edit-color-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    editSelectedColor = (el as HTMLElement).dataset.color!;
  });
});

// Sélection jours (édition)
document.querySelectorAll('.edit-day-option').forEach(el => {
  el.addEventListener('click', () => {
    const day = parseInt((el as HTMLElement).dataset.day!);
    if (editSelectedDays.includes(day)) {
      editSelectedDays = editSelectedDays.filter(d => d !== day);
      el.classList.remove('selected');
    } else {
      editSelectedDays.push(day);
      el.classList.add('selected');
    }
  });
});

document.getElementById('edit-modal-cancel')!.addEventListener('click', closeEditModal);
document.getElementById('edit-modal-confirm')!.addEventListener('click', saveEditHabit);
document.getElementById('edit-modal-overlay')!.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeEditModal();
});
document.getElementById('edit-habit-name-input')!.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveEditHabit();
  if (e.key === 'Escape') closeEditModal();
});
// Gestion des couleurs
document.querySelectorAll('.color-option').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.color-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    selectedColor = (el as HTMLElement).dataset.color!;
  });
});

// Boutons modale
document.getElementById('add-habit')!.addEventListener('click', openModal);
document.getElementById('modal-cancel')!.addEventListener('click', closeModal);
document.getElementById('modal-confirm')!.addEventListener('click', addHabit);
document.getElementById('modal-overlay')!.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Touche Entrée pour valider
document.getElementById('habit-name-input')!.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addHabit();
  if (e.key === 'Escape') closeModal();
});

async function deleteHabit(id: string) {
  data.habits = data.habits.filter(h => h.id !== id);
  await saveData();
  renderHabits();
  renderCalendar();
}

// --- Navigation ---

document.getElementById('prev-month')!.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('next-month')!.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// --- Init ---
loadData()
    .then(() => {
      renderHabits();
      renderCalendar();
    })