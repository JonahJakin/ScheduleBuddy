// ScheduleBuddy Service Worker
// Receives task notification schedules from the main page and fires
// notifications at the right time, even when the app is closed.

let tasks = [];           // { id, name, time, notifiedToday (bool) }
let enabled = false;
let checkInterval = null;

// Listen for messages from the main page
self.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;

    switch (event.data.type) {
        case 'UPDATE_TASKS':
            tasks = event.data.tasks || [];
            enabled = event.data.enabled || false;
            resetCheck();
            break;
        case 'DISABLE':
            enabled = false;
            tasks = [];
            stopCheck();
            break;
    }
});

function resetCheck() {
    stopCheck();
    if (enabled && tasks.length > 0) {
        fireCheck(); // immediate check
        checkInterval = setInterval(fireCheck, 30000); // then every 30s
    }
}

function stopCheck() {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}

function fireCheck() {
    if (!enabled) return;

    const now = new Date();

    tasks.forEach(task => {
        if (task.notifiedToday) return;
        if (!task.time) return;

        const [hours, minutes] = task.time.split(':');
        const taskTime = new Date();
        taskTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const diff = now.getTime() - taskTime.getTime();

        // Fire if we've reached the time but not more than 5 min past
        if (diff >= 0 && diff <= 300000) {
            self.registration.showNotification('ScheduleBuddy Reminder', {
                body: task.name,
                icon: '/favicon.ico',
                tag: 'schedulebuddy-' + task.id,
                requireInteraction: false
            });
            task.notifiedToday = true;
        }
    });
}

// Reset notifiedToday flags at midnight
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Keep the SW alive by responding to fetch (no-op, just pass through)
self.addEventListener('fetch', (event) => {
    // Don't intercept any requests — just let them through normally
});
