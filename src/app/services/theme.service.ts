import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    isDarkMode = signal(true);

    constructor() {
        // Check localStorage for saved preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            this.isDarkMode.set(false);
            document.documentElement.classList.add('light-mode');
        }
    }

    toggleTheme() {
        this.isDarkMode.update(dark => !dark);

        if (this.isDarkMode()) {
            document.documentElement.classList.remove('light-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        }
    }
}
