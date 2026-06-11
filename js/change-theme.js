(function () {
    const storageKey = "cardGameTheme";
    const root = document.documentElement;

    function getPreferredTheme() {
        const savedTheme = localStorage.getItem(storageKey);
        if (savedTheme === "light" || savedTheme === "dark") {
            return savedTheme;
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function updateToggleLabel(theme) {
        const toggleButton = document.getElementById("theme-toggle");
        if (!toggleButton) {
            return;
        }

        const nextTheme = theme === "dark" ? "light" : "dark";
        toggleButton.setAttribute("aria-label", `Chuyển sang ${nextTheme} mode`);
        toggleButton.setAttribute("title", `Đổi sang ${nextTheme} mode`);
    }

    function applyTheme(theme) {
        root.setAttribute("data-theme", theme);
        localStorage.setItem(storageKey, theme);
        updateToggleLabel(theme);
    }

    document.addEventListener("DOMContentLoaded", function () {
        applyTheme(getPreferredTheme());

        const toggleButton = document.getElementById("theme-toggle");
        if (!toggleButton) {
            return;
        }

        toggleButton.addEventListener("click", function () {
            const currentTheme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            applyTheme(nextTheme);
        });
    });
})();
