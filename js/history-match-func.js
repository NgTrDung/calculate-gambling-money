(function () {
    const STORAGE_KEY = "history_matches";

    function normalizePlayerInfoPerGame(playerInfoPerGame = {}) {
        const normalized = {};

        Object.entries(playerInfoPerGame).forEach(([playerName, point]) => {
            const nextPlayerName = String(playerName || "").trim();
            if (!nextPlayerName) {
                return;
            }

            const numericPoint = Number(point);
            normalized[nextPlayerName] = Number.isFinite(numericPoint) ? numericPoint : 0;
        });

        return normalized;
    }

    function loadHistoryMatches() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.warn("Failed to parse history matches from storage", error);
            return [];
        }
    }

    function saveHistoryMatches(historyMatches) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(historyMatches));
        } catch (error) {
            console.error("Failed to save history matches to storage", error);
        }
    }

    function createHistoryMatchEntry(entry = {}) {
        return {
            host: String(entry.host || "").trim(),
            player_info_per_game: normalizePlayerInfoPerGame(entry.player_info_per_game),
            check_out: Boolean(entry.check_out)
        };
    }

    function addHistoryMatch(gameEntry) {
        const historyMatches = loadHistoryMatches();
        historyMatches.push(createHistoryMatchEntry(gameEntry));
        saveHistoryMatches(historyMatches);
        return historyMatches;
    }

    window.historyMatchStore = {
        storageKey: STORAGE_KEY,
        loadHistoryMatches,
        saveHistoryMatches,
        normalizePlayerInfoPerGame,
        createHistoryMatchEntry,
        addHistoryMatch
    };
})();
