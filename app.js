/**
 * TugasKu - Manajemen List Tugas Kuliah
 * Logika CRUD Sederhana, Elegan, dan Responsif.
 */

const STORAGE_KEY = 'tugasku_assignment_tracker_v2';
const THEME_KEY = 'tugasku_theme';

// Data Awal Contoh (Hanya jika penyimpanan lokal masih kosong)
const INITIAL_TASKS = [
  {
    id: 'task-demo-1',
    title: 'Membuat Makalah Analisis Kebutuhan Sistem ERP',
    course: 'Analisis & Perancangan Sistem',
    deadline: getFutureDateOffset(1, 23, 59), // Besok malam
    notes: 'Kumpulkan dalam format PDF ke e-learning. Minimal 15 halaman.',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'task-demo-2',
    title: 'Implementasi Fitur CRUD & Dokumentasi API',
    course: 'Pemrograman Web Lanjut',
    deadline: getFutureDateOffset(3, 15, 0), // 3 hari lagi
    notes: 'Unggah ke GitHub dan sertakan link pada lembar pengumpulan.',
    createdAt: new Date(Date.now() - 43200000).toISOString()
  }
];

// Helper: Menghasilkan ISO string tanggal masa depan
function getFutureDateOffset(daysOffset, hours = 23, minutes = 59) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hh}:${mm}`;
}

// State Aplikasi
let tasks = [];
let activeFilter = 'all'; // 'all' | 'urgent' | 'upcoming'
let searchQuery = '';
let currentSort = 'deadline-asc';
let taskToDeleteId = null;

// DOM Elements
const taskListEl = document.getElementById('taskList');
const emptyStateEl = document.getElementById('emptyState');
const taskCountBadge = document.getElementById('taskCountBadge');

// Stats Elements
const statTotalEl = document.getElementById('statTotal');
const statUrgentEl = document.getElementById('statUrgent');
const statUpcomingEl = document.getElementById('statUpcoming');
const statCards = document.querySelectorAll('.stat-card');

// Modal Elements
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const modalTitle = document.getElementById('modalTitle');
const saveBtnText = document.getElementById('saveBtnText');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const emptyAddBtn = document.getElementById('emptyAddBtn');

// Form Input Elements
const taskIdInput = document.getElementById('taskId');
const taskTitleInput = document.getElementById('taskTitle');
const courseNameInput = document.getElementById('courseName');
const taskDeadlineInput = document.getElementById('taskDeadline');
const taskNotesInput = document.getElementById('taskNotes');

// Delete Confirm Modal Elements
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteConfirmText = document.getElementById('deleteConfirmText');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Search & Sort Elements
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const sortSelect = document.getElementById('sortSelect');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const toastContainer = document.getElementById('toastContainer');

// ==========================================================================
// Inisialisasi & Event Listeners
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadTasks();
  attachEventListeners();
  render();
});

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      tasks = JSON.parse(saved);
    } catch (e) {
      tasks = [...INITIAL_TASKS];
      saveTasks();
    }
  } else {
    tasks = [...INITIAL_TASKS];
    saveTasks();
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    showToast('Gagal menyimpan ke penyimpanan lokal', 'danger');
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const target = current === 'dark' ? 'light' : 'dark';
  setTheme(target);
  showToast(`Mode ${target === 'dark' ? 'Gelap' : 'Terang'} aktif`, 'info');
}

function attachEventListeners() {
  // Ganti Tema
  themeToggleBtn.addEventListener('click', toggleTheme);

  // Buka Modal Tambah Tugas
  openAddModalBtn.addEventListener('click', () => openModal());
  emptyAddBtn.addEventListener('click', () => openModal());

  // Tutup Modal Form
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) closeModal();
  });

  // Modal Konfirmasi Hapus
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  confirmDeleteBtn.addEventListener('click', executeDeleteTask);
  deleteConfirmModal.addEventListener('click', (e) => {
    if (e.target === deleteConfirmModal) closeDeleteModal();
  });

  // Form Submit
  taskForm.addEventListener('submit', handleTaskFormSubmit);

  // Stat Card Click to Filter
  statCards.forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      if (activeFilter === filter) {
        activeFilter = 'all'; // Toggle back to all
      } else {
        activeFilter = filter;
      }
      render();
    });
  });

  // Search Input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
    render();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    render();
  });

  // Sorting
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    render();
  });

  // Keyboard Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!taskModal.classList.contains('hidden')) closeModal();
      if (!deleteConfirmModal.classList.contains('hidden')) closeDeleteModal();
    }
  });
}

// ==========================================================================
// CRUD Operasi
// ==========================================================================

function handleTaskFormSubmit(e) {
  e.preventDefault();

  const id = taskIdInput.value;
  const title = taskTitleInput.value.trim();
  const course = courseNameInput.value.trim();
  const deadline = taskDeadlineInput.value;
  const notes = taskNotesInput.value.trim();

  if (!title || !course || !deadline) {
    showToast('Harap isi judul, mata kuliah, dan deadline', 'danger');
    return;
  }

  if (id) {
    // EDIT TUGAS
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        title,
        course,
        deadline,
        notes,
        updatedAt: new Date().toISOString()
      };
      saveTasks();
      showToast('Tugas berhasil diperbarui!', 'success');
    }
  } else {
    // TAMBAH TUGAS
    const newTask = {
      id: 'task-' + Date.now(),
      title,
      course,
      deadline,
      notes,
      createdAt: new Date().toISOString()
    };
    tasks.unshift(newTask);
    saveTasks();
    showToast('Tugas baru berhasil ditambahkan!', 'success');
  }

  closeModal();
  render();
}

function openModal(taskToEdit = null) {
  taskForm.reset();

  if (taskToEdit) {
    modalTitle.textContent = 'Edit Tugas';
    saveBtnText.textContent = 'Simpan Perubahan';
    taskIdInput.value = taskToEdit.id;
    taskTitleInput.value = taskToEdit.title;
    courseNameInput.value = taskToEdit.course;
    taskDeadlineInput.value = taskToEdit.deadline;
    taskNotesInput.value = taskToEdit.notes || '';
  } else {
    modalTitle.textContent = 'Tambah Tugas Baru';
    saveBtnText.textContent = 'Simpan Tugas';
    taskIdInput.value = '';
    taskDeadlineInput.value = getFutureDateOffset(2, 23, 59);
  }

  taskModal.classList.remove('hidden');
  taskModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => taskTitleInput.focus(), 60);
}

function closeModal() {
  taskModal.classList.add('hidden');
  taskModal.setAttribute('aria-hidden', 'true');
  taskForm.reset();
}

function requestDeleteTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  taskToDeleteId = taskId;
  deleteConfirmText.textContent = `Hapus tugas "${task.title}"?`;
  deleteConfirmModal.classList.remove('hidden');
  deleteConfirmModal.setAttribute('aria-hidden', 'false');
}

function closeDeleteModal() {
  deleteConfirmModal.classList.add('hidden');
  deleteConfirmModal.setAttribute('aria-hidden', 'true');
  taskToDeleteId = null;
}

function executeDeleteTask() {
  if (!taskToDeleteId) return;

  tasks = tasks.filter(t => t.id !== taskToDeleteId);
  saveTasks();
  closeDeleteModal();
  showToast('Tugas telah dihapus.', 'info');
  render();
}

// ==========================================================================
// Rendering, Filter & Sorting
// ==========================================================================

function render() {
  updateStats();

  const now = new Date();

  // 1. Filter
  let filtered = tasks.filter(task => {
    // Pencarian
    if (searchQuery) {
      const q = searchQuery;
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchCourse = task.course.toLowerCase().includes(q);
      const matchNotes = (task.notes || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCourse && !matchNotes) {
        return false;
      }
    }

    // Filter Stat Card
    if (activeFilter === 'urgent') {
      const diffHours = (new Date(task.deadline) - now) / (1000 * 60 * 60);
      return diffHours <= 24; // Mendesak jika <= 24 jam atau terlewat
    } else if (activeFilter === 'upcoming') {
      const diffHours = (new Date(task.deadline) - now) / (1000 * 60 * 60);
      return diffHours > 24;
    }

    return true;
  });

  // 2. Sorting
  filtered.sort((a, b) => {
    if (currentSort === 'deadline-asc') {
      return new Date(a.deadline) - new Date(b.deadline);
    } else if (currentSort === 'deadline-desc') {
      return new Date(b.deadline) - new Date(a.deadline);
    } else if (currentSort === 'course-asc') {
      return a.course.localeCompare(b.course);
    } else if (currentSort === 'created-desc') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    return 0;
  });

  // 3. Render Card List
  taskListEl.innerHTML = '';
  taskCountBadge.textContent = `${filtered.length} Tugas`;

  if (filtered.length === 0) {
    emptyStateEl.classList.remove('hidden');
    const emptyTitle = document.getElementById('emptyTitle');
    const emptySubtitle = document.getElementById('emptySubtitle');

    if (searchQuery) {
      emptyTitle.textContent = 'Tidak Ditemukan';
      emptySubtitle.textContent = `Tidak ada tugas yang sesuai dengan kata kunci "${searchQuery}".`;
    } else if (activeFilter === 'urgent') {
      emptyTitle.textContent = 'Bebas Hambatan!';
      emptySubtitle.textContent = 'Tidak ada tugas yang mendekati deadline mendesak saat ini.';
    } else {
      emptyTitle.textContent = 'Semua Tugas Beres!';
      emptySubtitle.textContent = 'Tidak ada daftar tugas yang tertunda. Nikmati waktu santaimu!';
    }
  } else {
    emptyStateEl.classList.add('hidden');
    filtered.forEach(task => {
      const card = createTaskCardElement(task);
      taskListEl.appendChild(card);
    });
  }
}

function createTaskCardElement(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.id = `card-${task.id}`;

  const deadlineStatus = calculateDeadlineStatus(task.deadline);
  const formattedDate = formatDeadlineDate(task.deadline);

  card.innerHTML = `
    <div class="card-top">
      <h3 class="task-title">${escapeHTML(task.title)}</h3>
      <div class="card-actions">
        <button class="action-btn edit-btn" title="Edit Tugas" aria-label="Edit tugas">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="action-btn delete-btn" title="Selesai / Hapus Tugas" aria-label="Hapus tugas">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="card-meta">
      <span class="course-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span>${escapeHTML(task.course)}</span>
      </span>

      <span class="deadline-pill ${deadlineStatus.className}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>${deadlineStatus.label} • ${formattedDate}</span>
      </span>
    </div>

    ${task.notes ? `<div class="card-notes">${escapeHTML(task.notes)}</div>` : ''}
  `;

  // Attach Listeners
  const editBtn = card.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => openModal(task));

  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => requestDeleteTask(task.id));

  return card;
}

function updateStats() {
  const total = tasks.length;
  const now = new Date();

  const urgent = tasks.filter(t => {
    const diffHours = (new Date(t.deadline) - now) / (1000 * 60 * 60);
    return diffHours <= 24; // <= 24 jam atau sudah lewat
  }).length;

  const upcoming = total - urgent;

  statTotalEl.textContent = total;
  statUrgentEl.textContent = urgent;
  statUpcomingEl.textContent = upcoming;
}

// ==========================================================================
// Helper Format Tanggal & Deadline
// ==========================================================================

function calculateDeadlineStatus(deadlineStr) {
  const now = new Date();
  const deadline = new Date(deadlineStr);
  const diffMs = deadline - now;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) {
      return { label: `Terlewat ${overdueHours} jam`, className: 'deadline-urgent' };
    }
    const overdueDays = Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    return { label: `Terlewat ${overdueDays} hari`, className: 'deadline-urgent' };
  }

  if (diffHours <= 12) {
    return { label: `Mendesak! ${diffHours} jam lagi`, className: 'deadline-urgent' };
  } else if (diffHours <= 24) {
    return { label: 'Hari Ini', className: 'deadline-today' };
  } else if (diffDays === 1 || diffHours <= 48) {
    return { label: 'Besok', className: 'deadline-today' };
  } else {
    return { label: `${diffDays} hari lagi`, className: 'deadline-upcoming' };
  }
}

function formatDeadlineDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const options = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    };
    return d.toLocaleDateString('id-ID', options);
  } catch (e) {
    return dateStr;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    danger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  }[type] || '';

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-message">${escapeHTML(message)}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}
