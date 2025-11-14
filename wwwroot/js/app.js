// Comfy Portal - JavaScript Interop

window.comfyPortal = {
    // Clipboard operations
    clipboard: {
        writeText: async function (text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                return false;
            }
        },
        readText: async function () {
            try {
                const text = await navigator.clipboard.readText();
                return text;
            } catch (err) {
                console.error('Failed to read from clipboard:', err);
                return null;
            }
        }
    },

    // Local storage helpers
    storage: {
        setItem: function (key, value) {
            localStorage.setItem(key, value);
        },
        getItem: function (key) {
            return localStorage.getItem(key);
        },
        removeItem: function (key) {
            localStorage.removeItem(key);
        },
        clear: function () {
            localStorage.clear();
        }
    },

    // Theme management
    theme: {
        set: function (isDark) {
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        },
        get: function () {
            const theme = localStorage.getItem('theme');
            if (theme) {
                return theme === 'dark';
            }
            // Default to system preference
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    },

    // File operations
    file: {
        downloadFile: function (filename, contentType, content) {
            const blob = new Blob([content], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            window.URL.revokeObjectURL(url);
        },
        downloadBase64: function (filename, contentType, base64) {
            const binaryString = window.atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            this.downloadFile(filename, contentType, bytes);
        }
    },

    // Utility functions
    utils: {
        scrollToTop: function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        scrollToElement: function (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        },
        getViewportSize: function () {
            return {
                width: window.innerWidth,
                height: window.innerHeight
            };
        }
    },

    // PWA installation
    pwa: {
        installPrompt: null,
        canInstall: false,

        init: function () {
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.installPrompt = e;
                this.canInstall = true;
                console.log('PWA install prompt ready');
            });

            window.addEventListener('appinstalled', () => {
                this.installPrompt = null;
                this.canInstall = false;
                console.log('PWA installed successfully');
            });
        },

        isInstallable: function () {
            return this.canInstall;
        },

        promptInstall: async function () {
            if (!this.installPrompt) {
                return false;
            }

            this.installPrompt.prompt();
            const { outcome } = await this.installPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted PWA installation');
                return true;
            } else {
                console.log('User dismissed PWA installation');
                return false;
            }
        },

        isInstalled: function () {
            return window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true;
        }
    }
};

// Initialize PWA handlers
window.comfyPortal.pwa.init();

// Set initial theme
const isDark = window.comfyPortal.theme.get();
window.comfyPortal.theme.set(isDark);

console.log('Comfy Portal JavaScript loaded');
