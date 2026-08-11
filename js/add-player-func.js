(function () {
    function syncModalLockState() {
        const hasOpenModal = Boolean(document.querySelector(".modal.is-open"));
        document.body.classList.toggle("modal-open", hasOpenModal);
    }

    function setModalState(modalElement, isOpen) {
        modalElement.classList.toggle("is-open", isOpen);
        modalElement.setAttribute("aria-hidden", isOpen ? "false" : "true");
        syncModalLockState();
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

        const STORAGE_KEY = "player_list";

        function closeModal() {
            setModalState(modalElement, false);
        }

        function cancelModal() {
            resetModalForm();
            closeModal();
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

            const modalBody = modalElement.querySelector(".modal-body");
            const nameInput = rowElement.querySelector('input[name^="player-name-"]');

            requestAnimationFrame(function () {
                rowElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
                if (modalBody) {
                    modalBody.scrollTop = modalBody.scrollHeight;
                }
                if (nameInput) {
                    nameInput.focus();
                }
            });
        }

        function resetModalForm() {
            tableBody.innerHTML = "";

            for (let rowCount = 1; rowCount <= 2; rowCount += 1) {
                const rowElement = document.createElement("tr");
                rowElement.innerHTML = createGenderCardRow(rowCount);
                tableBody.appendChild(rowElement);
            }

            const duplicateNote = modalElement.querySelector("#duplicate-note");
            if (duplicateNote) {
                duplicateNote.textContent = "";
            }

            updateDuplicateHighlights();
            updateConfirmState();
        }

        function sanitizePlayerName(value) {
            const emojiRegex = /\p{Extended_Pictographic}/gu;
            return value.replace(emojiRegex, "").trimStart();
        }

        function hasEmoji(value) {
            if (!value) {
                return false;
            }

            const emojiRegex = /\p{Extended_Pictographic}/u;
            return emojiRegex.test(value);
        }

        function getDuplicateNameNote() {
            const nameInputs = Array.from(modalElement.querySelectorAll('input[name^="player-name-"]'));
            const names = nameInputs.map((input) => input.value.trim()).filter(Boolean);
            const currentLower = names.map((name) => name.toLowerCase());
            const storedNames = getStoredPlayerNames();

            const duplicatesInCurrent = Array.from(new Set(
                currentLower.filter((name, index) => currentLower.indexOf(name) !== index)
            ));
            const duplicatesInStorage = Array.from(new Set(
                currentLower.filter((name) => storedNames.includes(name))
            ));

            const notes = [];

            if (duplicatesInStorage.length > 0) {
                const name = duplicatesInStorage[0];
                const original = names.find((item) => item.toLowerCase() === name) || name;
                notes.push(
                    `NOTE: "${original}" đã có trong danh sách player hiện tại. Hãy đổi tên (vd: ${original}123, ${original}456) để tránh trùng.`
                );
            }

            if (duplicatesInCurrent.length > 0) {
                const name = duplicatesInCurrent[0];
                const original = names.find((item) => item.toLowerCase() === name) || name;
                notes.push(
                    `NOTE: trong danh sách vừa nhập có tên trùng nhau ("${original}"). Hãy đổi tên (vd: ${original}123, ${original}456) để dễ phân biệt.`
                );
            }

            return notes.join(" ");
        }

        function getStoredPlayerNames() {
            return loadPlayersFromStorage()
                .map((player) => player.player_name.trim().toLowerCase())
                .filter(Boolean);
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
                input.classList.toggle("duplicate-name", isDuplicateCurrent || isDuplicateStored);
            });
        }

        function updateConfirmState() {
            const inputs = Array.from(modalElement.querySelectorAll('input[name^="player-name-"]'));
            const hasAny = inputs.some((input) => input.value && input.value.trim().length > 0);
            const hasInvalidValue = inputs.some((input) => {
                const value = input.value ? input.value.trim() : "";
                return value && hasEmoji(value);
            });
            const hasWarningNote = hasDuplicateNames();
            const shouldDisable = !hasAny || hasInvalidValue || hasWarningNote;

            confirmButton.disabled = shouldDisable;
            confirmButton.setAttribute("aria-disabled", shouldDisable.toString());
        }

        function hasDuplicateNames() {
            const nameInputs = Array.from(modalElement.querySelectorAll('input[name^="player-name-"]'));
            const currentLower = nameInputs.map((input) => input.value.trim().toLowerCase()).filter(Boolean);
            const storedNames = getStoredPlayerNames();
            const hasCurrentDuplicates = currentLower.some((name, index) => currentLower.indexOf(name) !== index);
            const hasStorageDuplicates = currentLower.some((name) => storedNames.includes(name));
            return hasCurrentDuplicates || hasStorageDuplicates;
        }

        function loadPlayersFromStorage() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (error) {
                console.warn("Failed to parse players from storage", error);
                return [];
            }
        }

        function savePlayersToStorage(players) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
            } catch (error) {
                console.error("Failed to save players to storage", error);
            }
        }

        function generatePlayerId() {
            return `p_${Date.now().toString(36)}_${Math.floor(Math.random() * 90000 + 10000)}`;
        }

        function updateGenderSelection(card) {
            const group = card.closest(".gender-card-group");
            if (!group) {
                return;
            }

            const hiddenInput = group.querySelector('input[type="hidden"]');
            if (!hiddenInput) {
                return;
            }

            group.querySelectorAll(".gender-card").forEach((item) => {
                item.classList.toggle("selected", item === card);
            });
            hiddenInput.value = card.dataset.value;
        }

        tableBody.addEventListener("input", function (event) {
            const input = event.target.closest('input[name^="player-name-"]');
            if (!input) {
                return;
            }

            input.classList.toggle("invalid", hasEmoji(input.value));
            updateDuplicateHighlights();

            const duplicateNote = modalElement.querySelector("#duplicate-note");
            if (duplicateNote) {
                duplicateNote.textContent = getDuplicateNameNote();
            }

            updateConfirmState();
        });

        tableBody.addEventListener("click", function (event) {
            const card = event.target.closest(".gender-card");
            if (card) {
                updateGenderSelection(card);
            }
        });

        tableBody.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                const card = event.target.closest(".gender-card");
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
                const value = input.value;
                if (!value || value.trim().length === 0) {
                    input.classList.remove("invalid");
                    return;
                }

                if (hasEmoji(value)) {
                    input.classList.add("invalid");
                    allValid = false;
                } else {
                    input.classList.remove("invalid");
                }
            });

            const duplicateNote = modalElement.querySelector("#duplicate-note");
            if (duplicateNote) {
                duplicateNote.textContent = getDuplicateNameNote();
            }

            updateDuplicateHighlights();
            if (hasDuplicateNames()) {
                allValid = false;
            }

            if (!allValid) {
                alert("Tên người chơi không được chứa emoji.");
                return;
            }

            const rows = Array.from(modalElement.querySelectorAll("#player-table-body tr"));
            const newPlayers = rows
                .map((row) => {
                    const nameInput = row.querySelector('input[name^="player-name-"]');
                    const genderHidden = row.querySelector('input[type="hidden"]');
                    const name = nameInput ? nameInput.value.trim() : "";
                    const gender = genderHidden ? genderHidden.value : "male";

                    return {
                        player_id: generatePlayerId(),
                        player_name: name,
                        player_gender: gender,
                        role: "player",
                        total_cash: 0
                    };
                })
                .filter((player) => player.player_name);

            const existingPlayers = loadPlayersFromStorage();
            const players = [...existingPlayers, ...newPlayers];

            savePlayersToStorage(players);
            document.dispatchEvent(new CustomEvent("players:updated", { detail: { players } }));
            resetModalForm();
            closeModal();
        });

        openButton.addEventListener("click", openModal);
        cancelButton.addEventListener("click", cancelModal);
        addRowButton.addEventListener("click", createRow);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modalElement.classList.contains("is-open")) {
                cancelModal();
            }
        });
    });
})();
