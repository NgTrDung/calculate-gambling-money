(function () {
    function setModalState(modalElement, isOpen) {
        modalElement.classList.toggle("is-open", isOpen);
        modalElement.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }

    async function loadModalMarkup() {
        const modalElement = document.getElementById("add-player-modal");

        if (modalElement) {
            return modalElement;
        }

        const modalHost = document.getElementById("add-player-modal-host");

        if (!modalHost) {
            return null;
        }

        try {
            const response = await fetch("add-player-modal.html");

            if (!response.ok) {
                throw new Error("Unable to load player modal file.");
            }

            modalHost.innerHTML = await response.text();
            return document.getElementById("add-player-modal");
        } catch (error) {
            console.error("Failed to load player modal:", error);
            return null;
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        const modalElement = await loadModalMarkup();
        const openButton = document.getElementById("create-player-list");
        const cancelButton = document.getElementById("cancel-add-player-modal");
        const confirmButton = document.getElementById("confirm-add-player-modal");
        const addRowButton = document.getElementById("add-player-row");
        const tableBody = document.getElementById("player-table-body");

        if (!modalElement || !openButton || !cancelButton || !confirmButton || !addRowButton || !tableBody) {
            return;
        }

        function closeModal() {
            setModalState(modalElement, false);
        }

        function openModal() {
            setModalState(modalElement, true);
            updateConfirmState();
        }

        function createGenderCardRow(rowCount) {
            return `
                <td><input type="text" name="player-name-${rowCount}" placeholder="Player name"></td>
                <td>
                    <div class="gender-card-group" data-name="player-gender-${rowCount}">
                        <input type="hidden" name="player-gender-${rowCount}" value="male">
                        <div class="gender-card gender-male selected" data-value="male" role="button" tabindex="0">
                            <span class="gender-icon"></span>
                            <span class="gender-label">Male</span>
                        </div>
                        <div class="gender-card gender-female" data-value="female" role="button" tabindex="0">
                            <span class="gender-icon"></span>
                            <span class="gender-label">Female</span>
                        </div>
                    </div>
                </td>
            `;
        }

        function createRow() {
            const rowCount = tableBody.querySelectorAll("tr").length + 1;
            const rowElement = document.createElement("tr");
            rowElement.innerHTML = createGenderCardRow(rowCount);
            tableBody.appendChild(rowElement);
            updateConfirmState();
        }

        function sanitizePlayerName(value) {
            const emojiRegex = /\p{Extended_Pictographic}/gu;
            return value.replace(emojiRegex, '').trimStart();
        }

        function hasEmoji(value) {
            if (!value) return false;
            const emojiRegex = /\p{Extended_Pictographic}/u;
            return emojiRegex.test(value);
        }

        function hasInvalidPlayerName(value) {
            const trimmed = value.trim();
            return trimmed.length > 0 && trimmed !== value;
        }

        function getDuplicateNameNote() {
            const nameInputs = Array.from(modalElement.querySelectorAll('input[name^="player-name-"]'));
            const names = nameInputs.map((input) => input.value.trim()).filter(Boolean);
            const currentLower = names.map((name) => name.toLowerCase());
            const storedNames = getStoredPlayerNames();

            const duplicatesInCurrent = currentLower.filter((name, index) => currentLower.indexOf(name) !== index);
            const duplicatesInStorage = currentLower.filter((name) => storedNames.includes(name));
            const uniqueDuplicates = Array.from(new Set([...duplicatesInCurrent, ...duplicatesInStorage]));

            if (uniqueDuplicates.length === 0) {
                return '';
            }

            const example = `${uniqueDuplicates[0]}123`;
            return `NOTE: tên trùng hiện tại có thể dùng ${example}, ${uniqueDuplicates[0]}456 ... để dễ phân biệt`;
        }

        function isValidPlayerName(value) {
            if (!value) return false;
            const cleaned = sanitizePlayerName(value);
            return typeof value === 'string' && value.trim().length > 0 && cleaned === value;
        }

        function getStoredPlayerNames() {
            return loadPlayersFromStorage().map((player) => player.player_name.trim().toLowerCase()).filter(Boolean);
        }

        function updateDuplicateHighlights() {
            const inputs = Array.from(modalElement.querySelectorAll('input[name^="player-name-"]'));
            const names = inputs.map((input) => input.value.trim());
            const lowerNames = names.map((name) => name.toLowerCase());
            const storedNames = getStoredPlayerNames();

            inputs.forEach((input, index) => {
                const lower = lowerNames[index];
                const isDuplicateCurrent = lower && lowerNames.filter((name) => name === lower).length > 1;
                const isDuplicateStored = lower && storedNames.includes(lower);
                input.classList.toggle('duplicate-name', isDuplicateCurrent || isDuplicateStored);
            });
        }

        function updateConfirmState() {
            if (!confirmButton) return;
            const inputs = Array.from(modalElement.querySelectorAll('input[name^="player-name-"]'));
            const hasAny = inputs.some((i) => i.value && i.value.trim().length > 0);
            confirmButton.disabled = !hasAny;
            // accessibility: mirror disabled state with aria-disabled
            confirmButton.setAttribute('aria-disabled', (!hasAny).toString());
        }

        function hasDuplicateNames() {
            const nameInputs = Array.from(modalElement.querySelectorAll('input[name^="player-name-"]'));
            const currentLower = nameInputs.map((input) => input.value.trim().toLowerCase()).filter(Boolean);
            const storedNames = getStoredPlayerNames();
            const hasCurrentDuplicates = currentLower.some((name, index) => currentLower.indexOf(name) !== index);
            const hasStorageDuplicates = currentLower.some((name) => storedNames.includes(name));
            return hasCurrentDuplicates || hasStorageDuplicates;
        }

        const STORAGE_KEY = 'player_list';

        function loadPlayersFromStorage() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Failed to parse players from storage', e);
                return [];
            }
        }

        function savePlayersToStorage(players) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
            } catch (e) {
                console.error('Failed to save players to storage', e);
            }
        }

        function generatePlayerId() {
            return 'p_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 90000 + 10000);
        }

        function updateGenderSelection(card) {
            const group = card.closest('.gender-card-group');
            if (!group) return;
            const hiddenInput = group.querySelector('input[type="hidden"]');
            if (!hiddenInput) return;

            group.querySelectorAll('.gender-card').forEach((item) => {
                item.classList.toggle('selected', item === card);
            });
            hiddenInput.value = card.dataset.value;
        }

        tableBody.addEventListener('input', function (event) {
            const input = event.target.closest('input[name^="player-name-"]');
            if (!input) return;
            // Validation now only checks for emoji characters in the name
            input.classList.toggle('invalid', hasEmoji(input.value));
            updateDuplicateHighlights();
            const duplicateNote = modalElement.querySelector('#duplicate-note');
            if (duplicateNote) {
                duplicateNote.textContent = getDuplicateNameNote();
            }
            updateConfirmState();
        });

        tableBody.addEventListener('click', function (event) {
            const card = event.target.closest('.gender-card');
            if (card) {
                updateGenderSelection(card);
            }
        });

        tableBody.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                const card = event.target.closest('.gender-card');
                if (card) {
                    event.preventDefault();
                    updateGenderSelection(card);
                }
            }
        });

        confirmButton.addEventListener("click", function () {
            const nameInputs = modalElement.querySelectorAll('input[name^="player-name-"]');
            let allValid = true;
            nameInputs.forEach((input) => {
                const val = input.value;
                // Skip empty rows
                if (!val || val.trim().length === 0) {
                    input.classList.remove('invalid');
                    return;
                }
                // Only validate emoji presence
                if (hasEmoji(val)) {
                    input.classList.add('invalid');
                    allValid = false;
                } else {
                    input.classList.remove('invalid');
                }
            });

            const duplicateNote = modalElement.querySelector('#duplicate-note');
            if (duplicateNote) {
                duplicateNote.textContent = getDuplicateNameNote();
            }

            updateDuplicateHighlights();
            const hasDuplicates = hasDuplicateNames();
            if (hasDuplicates) {
                allValid = false;
            }

            if (allValid) {
                const rows = Array.from(modalElement.querySelectorAll('#player-table-body tr'));
                const players = rows.map((row) => {
                    const nameInput = row.querySelector('input[name^="player-name-"]');
                    const genderHidden = row.querySelector('input[type="hidden"]');
                    const name = nameInput ? nameInput.value.trim() : '';
                    const gender = genderHidden ? genderHidden.value : 'male';
                    return {
                        player_id: generatePlayerId(),
                        player_name: name,
                        player_gender: gender,
                        total_cash: 0,
                    };
                }).filter(p => p.player_name);

                savePlayersToStorage(players);
                document.dispatchEvent(new CustomEvent('players:updated', { detail: { players } }));
                closeModal();
            } else {
                alert('Tên người chơi không được chứa emoji.');
            }
        });

        openButton.addEventListener("click", openModal);
        cancelButton.addEventListener("click", closeModal);
        addRowButton.addEventListener("click", createRow);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modalElement.classList.contains("is-open")) {
                closeModal();
            }
        });
    });
})();