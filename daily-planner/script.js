document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const timeDisplay = document.getElementById('current-time');
    const dateDisplay = document.getElementById('current-date');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskCategory = document.getElementById('task-category');
    const taskList = document.getElementById('task-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const themeBtn = document.getElementById('theme-toggle');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const routineList = document.getElementById('routine-list');
    const completionSound = document.getElementById('completion-sound');

    // State
    let tasks = JSON.parse(localStorage.getItem('dailyPlannerTasks')) || [];
    let currentFilter = 'all';

    // Categories config
    const categoryConfig = {
        'Personal': { class: 'tag-personal', icon: '🌸' },
        'Work': { class: 'tag-work', icon: '💼' },
        'Study': { class: 'tag-study', icon: '📚' },
        'Health': { class: 'tag-health', icon: '🧘' }
    };

    // Daily Routines state
    let routines = JSON.parse(localStorage.getItem('dailyPlannerRoutines')) || [
        { id: 'r1', time: 'Morning', desc: 'Hydrate & Stretch', icon: '🌅' },
        { id: 'r2', time: 'Afternoon', desc: 'Deep Work Session', icon: '☕' },
        { id: 'r3', time: 'Night', desc: 'Read & Relax', icon: '🌙' }
    ];

    // Clock Logic
    function updateClock() {
        const now = new Date();
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

        timeDisplay.textContent = now.toLocaleTimeString('en-US', timeOptions);
        dateDisplay.textContent = now.toLocaleDateString('en-US', dateOptions);
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Theme Logic
    const savedTheme = localStorage.getItem('dailyPlannerTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('dailyPlannerTheme', isDark ? 'dark' : 'light');
    });

    // Save Logic
    function saveTasks() {
        localStorage.setItem('dailyPlannerTasks', JSON.stringify(tasks));
        updateProgress();
    }
    
    function saveRoutines() {
        localStorage.setItem('dailyPlannerRoutines', JSON.stringify(routines));
    }

    // Render Tasks
    function renderTasks() {
        taskList.innerHTML = '';
        
        let filteredTasks = tasks;
        if (currentFilter === 'pending') {
            filteredTasks = tasks.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(t => t.completed);
        }

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `<p style="text-align:center; color: var(--text-muted); padding: 1.5rem 0;">No tasks found.</p>`;
            return;
        }

        filteredTasks.forEach(task => {
            const cat = categoryConfig[task.category] || categoryConfig['Personal'];
            
            const li = document.createElement('div');
            li.className = `task-card ${task.completed ? 'completed' : ''}`;
            li.dataset.id = task.id;
            
            li.innerHTML = `
                <div class="task-content">
                    <label class="checkbox-container">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <span class="task-text">${escapeHTML(task.text)}</span>
                </div>
                <div class="task-meta">
                    <span class="task-tag ${cat.class}">${cat.icon} ${task.category}</span>
                    <div class="task-actions">
                        <button class="action-btn edit-btn" title="Edit Task"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete-btn" title="Delete Task"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            
            taskList.appendChild(li);
        });
        updateProgress();
    }

    // Render Routines
    function renderRoutines() {
        routineList.innerHTML = '';
        routines.forEach((r, index) => {
            const item = document.createElement('div');
            item.className = 'routine-item';
            item.innerHTML = `
                <div class="routine-icon">${r.icon}</div>
                <div class="routine-info">
                    <h4>${r.time}</h4>
                    <p>${escapeHTML(r.desc)}</p>
                </div>
                <button class="action-btn edit-routine-btn" data-index="${index}" title="Edit Routine">
                    <i class="fas fa-edit"></i>
                </button>
            `;
            routineList.appendChild(item);
        });
    }

    // Utility Security
    function escapeHTML(str) {
        let div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    // Add Task
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskInput.value.trim();
        const category = taskCategory.value;
        
        if (text) {
            const newTask = {
                id: Date.now().toString(),
                text,
                category,
                completed: false
            };
            tasks.unshift(newTask);
            saveTasks();
            
            // Switch to All filter so user sees the new task
            if (currentFilter !== 'all') {
                document.querySelector('[data-filter="all"]').click();
            } else {
                renderTasks();
            }
            
            taskInput.value = '';
        }
    });

    // Task Actions Event Delegation (Complete, Delete, Edit)
    taskList.addEventListener('click', (e) => {
        const card = e.target.closest('.task-card');
        if (!card) return;
        const id = card.dataset.id;
        const taskIndex = tasks.findIndex(t => t.id === id);

        // Toggle Complete
        if (e.target.matches('input[type="checkbox"]')) {
            const isCompleted = e.target.checked;
            tasks[taskIndex].completed = isCompleted;
            saveTasks();
            
            if (isCompleted) {
                // Play Sound Effect
                completionSound.currentTime = 0;
                completionSound.play().catch(console.error);
                
                card.classList.add('completed');
                checkAllCompleted();
            } else {
                card.classList.remove('completed');
            }
            
            // Allow animation before re-rendering in filtered views
            if (currentFilter !== 'all') {
                setTimeout(renderTasks, 300); 
            } else {
                updateProgress();
            }
        }

        // Delete Task
        if (e.target.closest('.delete-btn')) {
            card.style.transform = 'scale(0.9)';
            card.style.opacity = '0';
            setTimeout(() => {
                tasks.splice(taskIndex, 1);
                saveTasks();
                renderTasks();
            }, 200);
        }

        // Edit Task
        if (e.target.closest('.edit-btn')) {
            const currentText = tasks[taskIndex].text;
            const newText = prompt('Edit your task:', currentText);
            if (newText !== null && newText.trim() !== '') {
                tasks[taskIndex].text = newText.trim();
                saveTasks();
                renderTasks();
            }
        }
    });

    // Routine Edit Event Delegation
    routineList.addEventListener('click', (e) => {
        if (e.target.closest('.edit-routine-btn')) {
            const btn = e.target.closest('.edit-routine-btn');
            const index = btn.dataset.index;
            const currentDesc = routines[index].desc;
            const newDesc = prompt(`Edit your ${routines[index].time} routine:`, currentDesc);
            
            if (newDesc !== null && newDesc.trim() !== '') {
                routines[index].desc = newDesc.trim();
                saveRoutines();
                renderRoutines();
            }
        }
    });

    // Filtering
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Progress Tracker logic
    function updateProgress() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        
        progressText.textContent = `${completed}/${total} Completed`;
        
        let percentage = 0;
        if (total > 0) {
            percentage = Math.round((completed / total) * 100);
        }
        
        progressBar.style.width = `${percentage}%`;
    }

    function checkAllCompleted() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        
        if (total > 0 && completed === total) {
            // Trigger Confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#2ecc71', '#3498db', '#ff9ff3', '#f1c40f']
            });
        }
    }

    // Initialize View
    renderTasks();
    renderRoutines();
    updateProgress();
});
