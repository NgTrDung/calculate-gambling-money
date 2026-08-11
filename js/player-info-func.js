(function () {
    const STORAGE_KEY = "player_list";
    const INVALID_NAME_PATTERN = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]/u;
    const HOST_ROLE = "host";
    const PLAYER_ROLE = "player";
    let editingState = {};
    let activeNameEditor = null;

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
        const modalElement = document.getElementById("player-info-modal");
        if (modalElement) {
            return modalElement;
        }

        const modalHost = document.getElementById("player-info-modal-host");
        if (!modalHost) {
            return null;
        }

        try {
            const response = await fetch("player-info-modal.html");
            if (!response.ok) {
                throw new Error("Unable to load player info modal file.");
            }

            modalHost.innerHTML = await response.text();
            return document.getElementById("player-info-modal");
        } catch (error) {
            console.error("Failed to load player info modal:", error);
            return null;
        }
    }

    function loadPlayersFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const players = raw ? JSON.parse(raw) : [];
            return players.map((player) => ({
                ...player,
                role: player.role === HOST_ROLE ? HOST_ROLE : PLAYER_ROLE
            }));
        } catch (error) {
            console.warn("Failed to parse players from storage", error);
            return [];
        }
    }

    function savePlayersToStorage(players) {
        try {
            const normalizedPlayers = players.map((player) => ({
                ...player,
                role: player.role === HOST_ROLE ? HOST_ROLE : PLAYER_ROLE
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedPlayers));
        } catch (error) {
            console.error("Failed to save players to storage", error);
        }
    }

    function isValidPlayerName(name) {
        return Boolean(name) && !INVALID_NAME_PATTERN.test(name);
    }

    function getCurrentRolePlayers(players) {
        return players.map((player) => {
            const nextState = editingState[player.player_id] || {};
            return {
                ...player,
                role: nextState.role !== undefined ? nextState.role : player.role
            };
        });
    }

    function updateHostWarning(players) {
        const warningNote = document.getElementById("player-info-warning-note");
        if (!warningNote) {
            return true;
        }

        const nextPlayers = getCurrentRolePlayers(players);
        const hasHost = nextPlayers.some((player) => player.role === HOST_ROLE);
        warningNote.textContent = hasHost ? "" : "NOTE: cần chọn ít nhất 1 host trước khi xác nhận.";
        return hasHost;
    }

    function commitActiveNameEdit() {
        if (!activeNameEditor) {
            return true;
        }

        const { cell, input, playerId, originalName } = activeNameEditor;
        const newName = input.value.trim();

        if (!isValidPlayerName(newName)) {
            input.classList.add("invalid");
            input.focus();
            input.select();
            return false;
        }

        cell.textContent = newName;
        if (newName !== originalName) {
            editingState[playerId] = editingState[playerId] || {};
            editingState[playerId].player_name = newName;
        }

        activeNameEditor = null;
        return true;
    }

    function cancelActiveNameEdit() {
        if (!activeNameEditor) {
            return;
        }

        const { cell, originalName } = activeNameEditor;
        cell.textContent = originalName;
        activeNameEditor = null;
    }

    function enterNameEditMode(nameCell, playerId) {
        if (activeNameEditor && activeNameEditor.cell === nameCell) {
            return;
        }

        if (!commitActiveNameEdit()) {
            return;
        }

        const currentName = nameCell.textContent.trim();
        nameCell.innerHTML = `<input type="text" class="player-name-edit" value="${currentName}" data-player-id="${playerId}" />`;
        const input = nameCell.querySelector(".player-name-edit");

        activeNameEditor = {
            cell: nameCell,
            input,
            playerId,
            originalName: currentName
        };

        input.focus();
        input.select();

        input.addEventListener("input", function () {
            const nextValue = input.value.trim();
            if (isValidPlayerName(nextValue)) {
                input.classList.remove("invalid");
            }
        });

        input.addEventListener("blur", function () {
            if (activeNameEditor && activeNameEditor.input === input) {
                commitActiveNameEdit();
            }
        });

        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                commitActiveNameEdit();
            } else if (event.key === "Escape") {
                cancelActiveNameEdit();
            }
        });
    }

    function toggleGender(genderCell, playerId) {
        const currentGender = genderCell.dataset.gender === "female" ? "female" : "male";
        const newGender = currentGender === "female" ? "male" : "female";
        editingState[playerId] = editingState[playerId] || {};
        editingState[playerId].player_gender = newGender;
        genderCell.dataset.gender = newGender;

        const genderClass = newGender === "female" ? "gender-female" : "gender-male";
        const genderLabel = newGender === "female" ? "Female" : "Male";
        genderCell.innerHTML = `
            <div class="gender-card ${genderClass}">
                <span class="gender-icon"></span>
                <span class="gender-label">${genderLabel}</span>
            </div>
        `;
    }

    function getRoleIconPath(role) {
        return role === HOST_ROLE ? "../static/icon/icon-host.png" : "../static/icon/icon-player.png";
    }

    function renderRoleCell(roleCell, role) {
        const nextRole = role === HOST_ROLE ? HOST_ROLE : PLAYER_ROLE;
        roleCell.dataset.role = nextRole;
        roleCell.innerHTML = `
            <div class="player-role-badge">
                <img class="player-role-icon" src="${getRoleIconPath(nextRole)}" alt="${nextRole}">
            </div>
        `;
    }

    function toggleRole(roleCell, playerId) {
        const currentRole = roleCell.dataset.role === HOST_ROLE ? HOST_ROLE : PLAYER_ROLE;

        if (currentRole === HOST_ROLE) {
            editingState[playerId] = editingState[playerId] || {};
            editingState[playerId].role = PLAYER_ROLE;
            renderRoleCell(roleCell, PLAYER_ROLE);
            updateHostWarning(loadPlayersFromStorage());
            return;
        }

        const roleCells = Array.from(document.querySelectorAll(".player-role-cell"));
        roleCells.forEach((cell) => {
            const cellPlayerId = cell.closest("tr")?.dataset.playerId;
            if (!cellPlayerId) {
                return;
            }

            if (cellPlayerId === playerId) {
                editingState[cellPlayerId] = editingState[cellPlayerId] || {};
                editingState[cellPlayerId].role = HOST_ROLE;
                renderRoleCell(cell, HOST_ROLE);
                return;
            }

            if (cell.dataset.role === HOST_ROLE) {
                editingState[cellPlayerId] = editingState[cellPlayerId] || {};
                editingState[cellPlayerId].role = PLAYER_ROLE;
                renderRoleCell(cell, PLAYER_ROLE);
            }
        });

        updateHostWarning(loadPlayersFromStorage());
    }

    function renderPlayerInfo() {
        const players = loadPlayersFromStorage();
        const body = document.getElementById("player-info-table-body");
        const emptyNote = document.getElementById("player-info-empty");

        if (!body || !emptyNote) {
            return;
        }

        body.innerHTML = "";
        editingState = {};
        activeNameEditor = null;
        updateHostWarning(players);

        if (players.length === 0) {
            emptyNote.style.display = "block";
            return;
        }

        emptyNote.style.display = "none";
        players.forEach((player) => {
            const row = document.createElement("tr");
            row.setAttribute("data-player-id", player.player_id);

            const role = player.role === HOST_ROLE ? HOST_ROLE : PLAYER_ROLE;
            const genderClass = player.player_gender === "female" ? "gender-female" : "gender-male";
            const genderLabel = player.player_gender === "female" ? "Female" : "Male";

            row.innerHTML = `
                <td class="player-role-cell" data-role="${role}">
                    <div class="player-role-badge">
                        <img class="player-role-icon" src="${getRoleIconPath(role)}" alt="${role}">
                    </div>
                </td>
                <td class="player-name-cell">${player.player_name || ""}</td>
                <td class="player-gender-cell" data-gender="${player.player_gender === "female" ? "female" : "male"}">
                    <div class="gender-card ${genderClass}">
                        <span class="gender-icon"></span>
                        <span class="gender-label">${genderLabel}</span>
                    </div>
                </td>
                <td class="player-total-cash-cell">${typeof player.total_cash !== "undefined" ? player.total_cash : 0}</td>
            `;
            body.appendChild(row);

            const roleCell = row.querySelector(".player-role-cell");
            const nameCell = row.querySelector(".player-name-cell");
            const genderCell = row.querySelector(".player-gender-cell");

            roleCell.addEventListener("click", function () {
                toggleRole(roleCell, player.player_id);
            });

            nameCell.addEventListener("click", function () {
                enterNameEditMode(nameCell, player.player_id);
            });

            genderCell.addEventListener("click", function () {
                toggleGender(genderCell, player.player_id);
            });
        });
    }

    document.addEventListener("DOMContentLoaded", async function () {
        const modalElement = await loadModalMarkup();
        const openButton = document.getElementById("open-player-info");
        const cancelButton = document.getElementById("cancel-player-info-modal");
        const confirmButton = document.getElementById("confirm-player-info-modal");

        if (!modalElement || !openButton || !cancelButton || !confirmButton) {
            return;
        }

        function openModal() {
            renderPlayerInfo();
            setModalState(modalElement, true);
        }

        function closeModal() {
            setModalState(modalElement, false);
        }

        function saveEdits() {
            if (!commitActiveNameEdit()) {
                return;
            }

            const currentPlayers = loadPlayersFromStorage();
            if (!updateHostWarning(currentPlayers)) {
                return;
            }

            if (Object.keys(editingState).length === 0) {
                closeModal();
                return;
            }

            let hasChanges = false;
            Object.keys(editingState).forEach((playerId) => {
                const player = currentPlayers.find((item) => item.player_id === playerId);
                if (!player) {
                    return;
                }

                if (
                    editingState[playerId].player_name !== undefined &&
                    editingState[playerId].player_name !== player.player_name
                ) {
                    player.player_name = editingState[playerId].player_name;
                    hasChanges = true;
                }

                if (
                    editingState[playerId].player_gender !== undefined &&
                    editingState[playerId].player_gender !== player.player_gender
                ) {
                    player.player_gender = editingState[playerId].player_gender;
                    hasChanges = true;
                }

                if (
                    editingState[playerId].role !== undefined &&
                    editingState[playerId].role !== player.role
                ) {
                    player.role = editingState[playerId].role;
                    hasChanges = true;
                }
            });

            if (!hasChanges) {
                editingState = {};
                closeModal();
                return;
            }

            savePlayersToStorage(currentPlayers);
            document.dispatchEvent(new CustomEvent("players:updated", { detail: { players: currentPlayers } }));
            editingState = {};
            closeModal();
        }

        openButton.addEventListener("click", openModal);
        openButton.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openModal();
            }
        });

        cancelButton.addEventListener("click", closeModal);
        confirmButton.addEventListener("click", saveEdits);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modalElement.classList.contains("is-open")) {
                closeModal();
            }
        });
    });
})();
