class CountdownTimer {
    constructor() {
        this.timers = [];
        this.currentTimer = null;
        this.soundEnabled = true;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSavedTimers();
        this.updateDateTime();
    }

    bindEvents() {
        // Theme selector
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeTheme(e.target.dataset.theme));
        });

        // Start button
        document.getElementById('start-btn').addEventListener('click', () => this.startCountdown());

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setPreset(parseInt(e.target.dataset.minutes)));
        });

        // Control buttons
        document.getElementById('pause-btn').addEventListener('click', () => this.pauseTimer());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetTimer());
        document.getElementById('add-timer-btn').addEventListener('click', () => this.addNewTimer());

        // Sound toggle
        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());

        // Modal close
        document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    changeTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
        
        // Save theme preference
        localStorage.setItem('countdown-theme', theme);
        
        // Add theme change animation
        this.addThemeChangeEffect();
    }

    addThemeChangeEffect() {
        const effect = document.createElement('div');
        effect.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--primary-color);
            opacity: 0.1;
            pointer-events: none;
            z-index: 999;
            animation: themeFlash 0.5s ease-out forwards;
        `;
        
        document.body.appendChild(effect);
        
        setTimeout(() => {
            document.body.removeChild(effect);
        }, 500);
    }

    updateDateTime() {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localTime = new Date(now.getTime() - offset);
        const isoString = localTime.toISOString().slice(0, 16);
        
        const input = document.getElementById('datetime-input');
        if (!input.value) {
            input.min = isoString;
        }
    }

    setPreset(minutes) {
        const now = new Date();
        const target = new Date(now.getTime() + minutes * 60000);
        const offset = target.getTimezoneOffset() * 60000;
        const localTime = new Date(target.getTime() - offset);
        
        document.getElementById('datetime-input').value = localTime.toISOString().slice(0, 16);
        document.getElementById('timer-name').value = `${minutes} Minute Timer`;
        
        this.addPresetAnimation();
    }

    addPresetAnimation() {
        const input = document.getElementById('datetime-input');
        input.style.animation = 'presetPulse 0.5s ease-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
    }

    startCountdown() {
        const dateTimeInput = document.getElementById('datetime-input');
        const timerNameInput = document.getElementById('timer-name');
        
        if (!dateTimeInput.value) {
            this.showNotification('Please select a date and time!', 'error');
            return;
        }

        const targetTime = new Date(dateTimeInput.value);
        const now = new Date();

        if (targetTime <= now) {
            this.showNotification('Please select a future date and time!', 'error');
            return;
        }

        const timerName = timerNameInput.value || 'Countdown Timer';
        
        this.currentTimer = {
            id: Date.now(),
            name: timerName,
            targetTime: targetTime,
            startTime: now,
            isPaused: false,
            interval: null
        };

        this.displayTimer();
        this.startTimer(this.currentTimer);
        this.showNotification(`Timer "${timerName}" started!`, 'success');
    }

    startTimer(timer) {
        if (timer.interval) {
            clearInterval(timer.interval);
        }

        timer.interval = setInterval(() => {
            if (!timer.isPaused) {
                this.updateTimerDisplay(timer);
            }
        }, 1000);

        this.updateTimerDisplay(timer);
    }

    updateTimerDisplay(timer) {
        const now = new Date();
        const timeRemaining = timer.targetTime - now;

        if (timeRemaining <= 0) {
            this.completeTimer(timer);
            return;
        }

        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

        // Update main display if this is the current timer
        if (timer === this.currentTimer) {
            document.getElementById('days').textContent = days.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
            
            document.getElementById('timer-name-display').textContent = timer.name;
            
            // Update progress ring
            this.updateProgressRing(timer, timeRemaining);
        }

        // Update mini timer if it exists
        const miniTimer = document.getElementById(`mini-timer-${timer.id}`);
        if (miniTimer) {
            const timeDisplay = miniTimer.querySelector('.mini-timer-time');
            timeDisplay.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        // Add urgency effects when time is running low
        if (timeRemaining < 60000) { // Less than 1 minute
            this.addUrgencyEffect();
        }
    }

    updateProgressRing(timer, timeRemaining) {
        const totalTime = timer.targetTime - timer.startTime;
        const progress = (totalTime - timeRemaining) / totalTime;
        const circumference = 2 * Math.PI * 45; // radius = 45
        const offset = circumference - (progress * circumference);
        
        const circle = document.querySelector('.progress-ring-circle');
        circle.style.strokeDashoffset = offset;
    }

    addUrgencyEffect() {
        const timeValues = document.querySelectorAll('.time-value');
        timeValues.forEach(value => {
            value.style.color = '#ff4444';
            value.style.animation = 'urgentPulse 0.5s ease-in-out infinite';
        });
    }

    completeTimer(timer) {
        clearInterval(timer.interval);
        
        // Play completion sound
        if (this.soundEnabled) {
            this.playCompletionSound();
        }
        
        // Show completion modal
        this.showCompletionModal(timer);
        
        // Add completion effects
        this.addCompletionEffects();
        
        // Remove from timers array
        this.timers = this.timers.filter(t => t.id !== timer.id);
        
        // Remove mini timer if it exists
        const miniTimer = document.getElementById(`mini-timer-${timer.id}`);
        if (miniTimer) {
            miniTimer.remove();
        }
        
        // Reset current timer if it's the completed one
        if (timer === this.currentTimer) {
            this.currentTimer = null;
            this.resetDisplay();
        }
    }

    showCompletionModal(timer) {
        const modal = document.getElementById('completion-modal');
        const message = document.getElementById('modal-message');
        
        message.textContent = `"${timer.name}" has finished!`;
        modal.classList.add('active');
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            this.closeModal();
        }, 5000);
    }

    closeModal() {
        document.getElementById('completion-modal').classList.remove('active');
    }

    addCompletionEffects() {
        // Create celebration particles
        for (let i = 0; i < 50; i++) {
            this.createParticle();
        }
        
        // Screen flash effect
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--primary-color);
            opacity: 0.3;
            pointer-events: none;
            z-index: 998;
            animation: flashEffect 0.5s ease-out;
        `;
        
        document.body.appendChild(flash);
        
        setTimeout(() => {
            document.body.removeChild(flash);
        }, 500);
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: var(--primary-color);
            border-radius: 50%;
            pointer-events: none;
            z-index: 999;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particleFloat 2s ease-out forwards;
        `;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            document.body.removeChild(particle);
        }, 2000);
    }

    playCompletionSound() {
        // Create audio context for completion sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    pauseTimer() {
        if (!this.currentTimer) return;
        
        this.currentTimer.isPaused = !this.currentTimer.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        
        if (this.currentTimer.isPaused) {
            pauseBtn.textContent = 'Resume';
            this.showNotification('Timer paused', 'info');
        } else {
            pauseBtn.textContent = 'Pause';
            this.showNotification('Timer resumed', 'info');
        }
    }

    resetTimer() {
        if (!this.currentTimer) return;
        
        clearInterval(this.currentTimer.interval);
        this.currentTimer = null;
        this.resetDisplay();
        this.showNotification('Timer reset', 'info');
    }

    resetDisplay() {
        document.getElementById('days').textContent = '00';
        document.getElementById('hours').textContent = '00';
        document.getElementById('minutes').textContent = '00';
        document.getElementById('seconds').textContent = '00';
        document.getElementById('timer-name-display').textContent = '';
        document.getElementById('pause-btn').textContent = 'Pause';
        
        // Reset progress ring
        const circle = document.querySelector('.progress-ring-circle');
        circle.style.strokeDashoffset = 283;
        
        // Reset urgency effects
        const timeValues = document.querySelectorAll('.time-value');
        timeValues.forEach(value => {
            value.style.color = 'var(--primary-color)';
            value.style.animation = 'pulse 2s ease-in-out infinite';
        });
    }

    addNewTimer() {
        const dateTimeInput = document.getElementById('datetime-input');
        const timerNameInput = document.getElementById('timer-name');
        
        if (!dateTimeInput.value) {
            this.showNotification('Please select a date and time!', 'error');
            return;
        }

        const targetTime = new Date(dateTimeInput.value);
        const now = new Date();

        if (targetTime <= now) {
            this.showNotification('Please select a future date and time!', 'error');
            return;
        }

        const timerName = timerNameInput.value || `Timer ${this.timers.length + 1}`;
        
        const newTimer = {
            id: Date.now(),
            name: timerName,
            targetTime: targetTime,
            startTime: now,
            isPaused: false,
            interval: null
        };

        this.timers.push(newTimer);
        this.startTimer(newTimer);
        this.createMiniTimer(newTimer);
        this.showNotification(`Timer "${timerName}" added!`, 'success');
        
        // Clear inputs
        dateTimeInput.value = '';
        timerNameInput.value = '';
    }

    createMiniTimer(timer) {
        const container = document.getElementById('timers-container');
        const miniTimer = document.createElement('div');
        miniTimer.className = 'mini-timer';
        miniTimer.id = `mini-timer-${timer.id}`;
        
        miniTimer.innerHTML = `
            <button class="mini-timer-remove" onclick="countdownApp.removeTimer(${timer.id})">×</button>
            <div class="mini-timer-name">${timer.name}</div>
            <div class="mini-timer-time">00d 00h 00m 00s</div>
        `;
        
        container.appendChild(miniTimer);
        
        // Add entrance animation
        miniTimer.style.animation = 'slideIn 0.5s ease-out';
    }

    removeTimer(timerId) {
        const timer = this.timers.find(t => t.id === timerId);
        if (timer) {
            clearInterval(timer.interval);
            this.timers = this.timers.filter(t => t.id !== timerId);
            
            const miniTimer = document.getElementById(`mini-timer-${timerId}`);
            if (miniTimer) {
                miniTimer.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    miniTimer.remove();
                }, 300);
            }
            
            this.showNotification('Timer removed', 'info');
        }
    }

    displayTimer() {
        const display = document.getElementById('timer-display');
        display.style.display = 'block';
        display.style.animation = 'fadeIn 0.5s ease-out';
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('sound-toggle');
        const soundIcon = soundBtn.querySelector('.sound-icon');
        
        if (this.soundEnabled) {
            soundIcon.textContent = '🔊';
            soundBtn.classList.remove('muted');
            this.showNotification('Sound enabled', 'info');
        } else {
            soundIcon.textContent = '🔇';
            soundBtn.classList.add('muted');
            this.showNotification('Sound disabled', 'info');
        }
        
        localStorage.setItem('countdown-sound', this.soundEnabled);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
            backdrop-filter: blur(10px);
        `;
        
        // Set background color based on type
        const colors = {
            success: 'rgba(40, 167, 69, 0.9)',
            error: 'rgba(220, 53, 69, 0.9)',
            info: 'rgba(23, 162, 184, 0.9)'
        };
        
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    handleKeyboard(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    this.startCountdown();
                    break;
                case ' ':
                    e.preventDefault();
                    this.pauseTimer();
                    break;
                case 'r':
                    e.preventDefault();
                    this.resetTimer();
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }

    loadSavedTimers() {
        // Load saved theme
        const savedTheme = localStorage.getItem('countdown-theme') || 'golden';
        this.changeTheme(savedTheme);
        
        // Load sound preference
        const soundEnabled = localStorage.getItem('countdown-sound') !== 'false';
        if (!soundEnabled) {
            this.toggleSound();
        }
    }

    // Utility method to format time
    formatTime(milliseconds) {
        const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
        const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
        
        return { days, hours, minutes, seconds };
    }
}

// Add custom CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes presetPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); background: var(--primary-color); }
        100% { transform: scale(1); }
    }
    
    @keyframes themeFlash {
        0% { opacity: 0.1; }
        50% { opacity: 0.3; }
        100% { opacity: 0; }
    }
    
    @keyframes flashEffect {
        0% { opacity: 0.3; }
        50% { opacity: 0.6; }
        100% { opacity: 0; }
    }
    
    @keyframes particleFloat {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(-200px) rotate(360deg); opacity: 0; }
    }
    
    @keyframes urgentPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
`;
document.head.appendChild(style);

// Initialize the app
const countdownApp = new CountdownTimer();

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}