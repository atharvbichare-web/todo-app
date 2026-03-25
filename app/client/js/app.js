document.addEventListener('DOMContentLoaded', () => {
  // --- Constants & State ---
  let currentDate = new Date();
  let tasks = [];
  let routines = [];
  let currentFilter = 'all';
  let completingTaskId = null; // Temp holder for memory capture
  
  // Motivational Quotes
  const quotes = [
    "Every morning starts a new page in your story.",
    "Small steps lead to beautiful destinations.",
    "Rest when you're weary. Refresh and renew yourself.",
    "Your calmness is your superpower.",
    "Breathe in the morning, breathe out the stress."
  ];

  // --- DOM Elements ---
  const themeToggleBtn = document.getElementById('theme-toggle');
  const addTaskForm = document.getElementById('add-task-form');
  const taskTitleInput = document.getElementById('task-title');
  const taskCategoryInput = document.getElementById('task-category');
  const taskDateInput = document.getElementById('task-date');
  const taskDeadlineInput = document.getElementById('task-deadline');
  
  const taskListEl = document.getElementById('task-list');
  const routineListEl = document.getElementById('routine-list');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const memoryGalleryEl = document.getElementById('memory-gallery');

  // Stats & Motivation
  const todayProgressRing = document.getElementById('today-progress');
  const todayProgressText = todayProgressRing.querySelector('.progress-text');
  const todayFraction = document.getElementById('today-fraction');
  const monthProgressRing = document.getElementById('month-progress');
  const monthProgressText = monthProgressRing.querySelector('.progress-text');
  const monthFraction = document.getElementById('month-fraction');
  const yearProgressRing = document.getElementById('year-progress');
  const yearProgressText = yearProgressRing.querySelector('.progress-text');
  const yearFraction = document.getElementById('year-fraction');
  
  const dailyQuoteEl = document.getElementById('daily-quote');
  const streakCounterEl = document.getElementById('streak-counter');

  // Modal DOM
  const memoryModal = document.getElementById('memory-modal');
  const modalTaskTitle = document.getElementById('modal-task-title');
  const cameraFeed = document.getElementById('camera-feed');
  const cameraCanvas = document.getElementById('camera-canvas');
  const imagePreview = document.getElementById('image-preview');
  
  const btnStartCamera = document.getElementById('btn-start-camera');
  const btnCapture = document.getElementById('btn-capture');
  const fileUploadBtn = document.getElementById('file-upload');
  const btnSaveMemory = document.getElementById('btn-save-memory');
  const btnSkipMemory = document.getElementById('btn-skip-memory');

  let stream = null; // Camera stream

  // Set today's date in form as default
  const todayStr = currentDate.toISOString().split('T')[0];
  taskDateInput.value = todayStr;
  
  // Set random quote
  dailyQuoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  // --- Theme Management ---
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });

  // --- Init App ---
  async function init() {
    await fetchTasks();
    await fetchRoutines();
    checkExpirations(); // Check local expiries
    await fetchAnalytics();
    renderTasks();
    renderRoutines();
    renderMemoryGallery();
    updateTodayProgress();
    updateStreak();
    
    // Check expirations every minute
    setInterval(checkExpirations, 60000);
  }

  // --- Data Fetching ---
  async function fetchTasks() {
    tasks = await api.getTasks() || [];
  }

  async function fetchRoutines() {
    routines = await api.getRoutines() || [];
  }

  async function fetchAnalytics() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-indexed for backend API

    const monthData = await api.getMonthAnalytics(year, month);
    const yearData = await api.getYearAnalytics(year);

    updateRing(monthProgressRing, monthProgressText, monthData.completionPercentage || 0);
    monthFraction.textContent = `${monthData.expiredPercentage || 0}% Expired`;
    
    updateRing(yearProgressRing, yearProgressText, yearData.completionPercentage || 0);
    yearFraction.textContent = `${yearData.expiredPercentage || 0}% Expired`;
  }

  // --- Logic ---
  function checkExpirations() {
    let hasChanges = false;
    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 5); // HH:MM
    const currentDateStr = now.toISOString().split('T')[0];

    tasks.forEach(task => {
      if (task.status === 'pending' && !task.expired && task.deadline) {
        // If task is from a past date, or today and past the deadline
        if (task.date < currentDateStr || (task.date === currentDateStr && task.deadline < currentTimeStr)) {
          task.expired = true;
          api.updateTask(task._id, { expired: true });
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      renderTasks();
      fetchAnalytics();
    }
  }

  function updateStreak() {
    // Basic streak calculation: consecutive days with at least 1 completed task
    const datesWithCompletion = [...new Set(tasks.filter(t => t.status === 'completed').map(t => t.date))];
    datesWithCompletion.sort((a,b) => new Date(b) - new Date(a)); // Descending dates
    
    let streak = 0;
    let expectedDate = new Date(todayStr); // Start from today
    
    // If no task done today, check if yesterday was done (streak ongoing but pending today's task)
    if (!datesWithCompletion.includes(todayStr)) {
      expectedDate.setDate(expectedDate.getDate() - 1);
    }
    
    for (const d of datesWithCompletion) {
       let edStr = expectedDate.toISOString().split('T')[0];
       if (d === edStr) {
         streak++;
         expectedDate.setDate(expectedDate.getDate() - 1);
       } else if (d < edStr) {
         break; // Streak broken
       }
    }
    
    streakCounterEl.textContent = streak;
  }

  addTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    const category = taskCategoryInput.value;
    const date = taskDateInput.value;
    const deadline = taskDeadlineInput.value;

    if (!title) return;

    const newTask = await api.addTask({ title, category, date, deadline });
    if (newTask) {
      tasks.unshift(newTask);
      taskTitleInput.value = '';
      taskDeadlineInput.value = '';
      checkExpirations();
      renderTasks();
      updateTodayProgress();
      fetchAnalytics(); 
    } else {
      alert("Failed to add task. Please check your connection or try again.");
    }
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // --- Rendering ---
  function renderTasks() {
    taskListEl.innerHTML = '';
    
    let filteredTasks = tasks;
    if (currentFilter === 'pending') {
      filteredTasks = tasks.filter(t => t.status === 'pending' && !t.expired);
    } else if (currentFilter === 'completed') {
      filteredTasks = tasks.filter(t => t.status === 'completed');
    }

    if (filteredTasks.length === 0) {
      taskListEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No tasks found 🍃</p>';
      return;
    }

    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      let statusClass = '';
      let isCompleted = task.status === 'completed';
      if (isCompleted) statusClass = 'completed';
      else if (task.expired) statusClass = 'expired';
      
      li.className = `task-item ${statusClass}`;
      
      li.innerHTML = `
        <div class="task-left">
          <div class="custom-checkbox ${isCompleted ? 'checked' : ''} ${task.expired && !isCompleted ? 'disabled' : ''}" data-id="${task._id}">
            ${isCompleted ? '✓' : (task.expired && !isCompleted ? 'x' : '')}
          </div>
          <div class="task-details">
            <span class="task-title">${task.title}</span>
            <div class="task-meta">
              <span class="task-category">${task.category}</span>
              <span>${task.date}</span>
              ${task.deadline ? `<span class="task-deadline">⏳ ${task.deadline}</span>` : ''}
              ${task.expired && !isCompleted ? `<span class="expired-text" style="margin-left:5px">Expired</span>` : ''}
              ${task.image ? `<span title="Memory saved" style="font-size:1.1rem">📸</span>` : ''}
            </div>
          </div>
        </div>
        <button class="btn-delete" data-id="${task._id}">×</button>
      `;
      
      // Checkbox event
      const cb = li.querySelector('.custom-checkbox');
      if (!task.expired || isCompleted) {
        cb.addEventListener('click', () => toggleTask(task._id));
      }
      
      // Delete event
      li.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task._id));

      taskListEl.appendChild(li);
    });
  }

  function renderRoutines() {
    routineListEl.innerHTML = '';
    if (routines.length === 0) {
      routineListEl.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No daily routines yet.</p>';
      return;
    }
    routines.forEach(r => {
      const li = document.createElement('li');
      li.className = 'task-item';
      li.style.padding = '0.8rem';
      li.innerHTML = `
        <div class="task-left">
           <div class="task-details">
            <span class="task-title" style="font-size: 1rem;">${r.title}</span>
            <span class="task-category" style="font-size: 0.75rem;">${r.category}</span>
          </div>
        </div>
        <button class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="addRoutineToToday('${r.title}', '${r.category}')">+</button>
      `;
      routineListEl.appendChild(li);
    });
  }

  // Modal logic for memory capture
  function openMemoryModal(taskId) {
    completingTaskId = taskId;
    const task = tasks.find(t => t._id === taskId);
    modalTaskTitle.textContent = task.title;
    
    // Reset view
    cameraFeed.style.display = 'none';
    imagePreview.style.display = 'none';
    btnCapture.style.display = 'none';
    btnSaveMemory.style.display = 'none';
    btnStartCamera.style.display = 'inline-block';
    
    memoryModal.classList.add('active');
  }
  
  function closeMemoryModal() {
    memoryModal.classList.remove('active');
    stopCamera();
    completingTaskId = null;
  }

  btnSkipMemory.addEventListener('click', closeMemoryModal);

  // Camera handling
  btnStartCamera.addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraFeed.srcObject = stream;
      cameraFeed.style.display = 'block';
      btnStartCamera.style.display = 'none';
      btnCapture.style.display = 'inline-block';
    } catch (err) {
      alert("Camera access denied or unavailabe.");
    }
  });

  btnCapture.addEventListener('click', () => {
    cameraCanvas.width = cameraFeed.videoWidth;
    cameraCanvas.height = cameraFeed.videoHeight;
    const context = cameraCanvas.getContext('2d');
    context.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);
    
    const imageUrl = cameraCanvas.toDataURL('image/png');
    imagePreview.src = imageUrl;
    imagePreview.style.display = 'block';
    cameraFeed.style.display = 'none';
    btnCapture.style.display = 'none';
    btnSaveMemory.style.display = 'block';
    stopCamera();
  });

  // File upload handling
  fileUploadBtn.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        imagePreview.src = evt.target.result;
        imagePreview.style.display = 'block';
        cameraFeed.style.display = 'none';
        btnStartCamera.style.display = 'none';
        btnCapture.style.display = 'none';
        btnSaveMemory.style.display = 'block';
        stopCamera();
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  // Save memory -> Backend
  btnSaveMemory.addEventListener('click', async () => {
    if(!completingTaskId) return;
    btnSaveMemory.textContent = 'Saving...';
    btnSaveMemory.disabled = true;

    try {
      // If we have a file selected
      let fileData = null;
      let isBlob = false;
      if (fileUploadBtn.files && fileUploadBtn.files[0]) {
        fileData = fileUploadBtn.files[0];
      } else if (imagePreview.src.startsWith('data:image')) {
        // From camera -> convert data URI to blob
        const res = await fetch(imagePreview.src);
        fileData = await res.blob();
        isBlob = true;
      }

      if (fileData) {
        const uploadRes = await api.uploadImage(fileData, isBlob);
        if (uploadRes && uploadRes.imageUrl) {
          // Update task in state & db
          const task = tasks.find(t => t._id === completingTaskId);
          task.image = uploadRes.imageUrl;
          await api.updateTask(task._id, { image: task.image });
          renderTasks();
          renderMemoryGallery();
        }
      }
    } catch (e) {
      console.error(e);
      alert('Failed to upload image.');
    }

    btnSaveMemory.textContent = 'Save Memory 🌿';
    btnSaveMemory.disabled = false;
    closeMemoryModal();
  });

  function renderMemoryGallery() {
    memoryGalleryEl.innerHTML = '';
    const taskMemories = tasks.filter(t => t.image && t.status === 'completed');
    
    if (taskMemories.length === 0) {
      memoryGalleryEl.innerHTML = '<p style="color:var(--text-secondary)">No memories yet. Complete tasks and capture 📸!</p>';
      return;
    }
    
    taskMemories.forEach(task => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
      const baseUrl = isLocalhost ? 'http://localhost:5000' : '';
      const url = `${baseUrl}${task.image}`;
      card.innerHTML = `
        <img src="${url}" alt="Memory for ${task.title}">
        <div class="memory-overlay">
          <strong>${task.title}</strong><br/>
          ${task.date}
        </div>
      `;
      memoryGalleryEl.appendChild(card);
    });
  }

  // Global functions
  window.addRoutineToToday = async function(title, category) {
    const newTask = await api.addTask({ title, category, date: todayStr });
    if(newTask) {
      tasks.unshift(newTask);
      renderTasks();
      updateTodayProgress();
      fetchAnalytics();
    }
  };

  async function toggleTask(id) {
    const task = tasks.find(t => t._id === id);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    task.status = newStatus;
    
    renderTasks();
    updateTodayProgress();
    updateStreak();
    
    if (newStatus === 'completed') {
      checkConfetti();
      openMemoryModal(id); // Open camera/upload prompt!
    }

    await api.updateTask(id, { status: newStatus });
    fetchAnalytics();
  }

  async function deleteTask(id) {
    tasks = tasks.filter(t => t._id !== id);
    renderTasks();
    updateTodayProgress();
    renderMemoryGallery();
    await api.deleteTask(id);
    fetchAnalytics();
  }

  // --- UI Updates ---
  function updateRing(ringElement, textElement, percentage) {
    ringElement.style.background = `conic-gradient(var(--accent-color) ${percentage}%, rgba(0,0,0,0.1) ${percentage}%)`;
    textElement.textContent = `${percentage}%`;
  }

  function updateTodayProgress() {
    const todayTasks = tasks.filter(t => t.date === todayStr);
    const total = todayTasks.length;
    const completed = todayTasks.filter(t => t.status === 'completed').length;
    
    todayFraction.textContent = `${completed} / ${total} Tasks`;
    
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    updateRing(todayProgressRing, todayProgressText, percentage);
  }

  function checkConfetti() {
    const todayTasks = tasks.filter(t => t.date === todayStr);
    const total = todayTasks.length;
    if (total === 0) return;
    const completed = todayTasks.filter(t => t.status === 'completed').length;
    
    if (completed === total) {
      triggerConfetti();
    }
  }

  function triggerConfetti() {
    if (typeof confetti !== 'undefined') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#26a69a', '#80cbc4', '#e0f2f1', '#4db6ac', '#fbc02d', '#4caf50', '#e53935']
      });
    }
  }

  // Initialize
  init();
});
