(function () {
    const STORAGE_KEY = 'player_list';
    let editingState = {}; // Track edited player data

    function setModalState(modalElement, isOpen) {
        modalElement.classList.toggle('is-open', isOpen);
        modalElement.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    async function loadModalMarkup() {
        const modalElement = document.getElementById('player-info-modal');
        if (modalElement) {
            return modalElement;
        }

        const modalHost = document.getElementById('player-info-modal-host');
        if (!modalHost) {
            return null;
        }

        try {
            const response = await fetch('player-info-modal.html');
            if (!response.ok) {
                throw new Error('Unable to load player info modal file.');
            }

            modalHost.innerHTML = await response.text();
            return document.getElementById('player-info-modal');
        } catch (error) {
            console.error('Failed to load player info modal:', error);
            return null;
        }
    }

    function loadPlayersFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (error) {
            console.warn('Failed to parse players from storage', error);
            return [];
        }
    }

    function savePlayersToStorage(players) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
        } catch (error) {
            console.error('Failed to save players to storage', error);
        }
    }

    function enterNameEditMode(nameCell, playerId) {
        const currentName = nameCell.textContent.trim();
        nameCell.innerHTML = `<input type="text" class="player-name-edit" value="${currentName}" data-player-id="${playerId}" />`;
        const input = nameCell.querySelector('.player-name-edit');
        input.focus();
        input.select();

        function saveNameEdit() {
            const newName = input.value.trim();
            if (newName) {
                editingState[playerId] = editingState[playerId] || {};
                editingState[playerId].player_name = newName;
                nameCell.textContent = newName;
            } else {
                nameCell.textContent = currentName;
            }
        }

        input.addEventListener('blur', saveNameEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveNameEdit();
            } else if (e.key === 'Escape') {
                nameCell.textContent = currentName;
            }
        });
    }

    function toggleGender(genderCell, playerId, currentGender) {
        const newGender = currentGender === 'female' ? 'male' : 'female';
        editingState[playerId] = editingState[playerId] || {};
        editingState[playerId].player_gender = newGender;

        const genderClass = newGender === 'female' ? 'gender-female' : 'gender-male';
        const genderLabel = newGender === 'female' ? 'Female' : 'Male';
        genderCell.innerHTML = `
            <div class="gender-card ${genderClass}">
                <span class="gender-icon"></span>
                <span class="gender-label">${genderLabel}</span>
            </div>
        `;
    }

    function renderPlayerInfo() {
        const players = loadPlayersFromStorage();
        const body = document.getElementById('player-info-table-body');
        const emptyNote = document.getElementById('player-info-empty');

        if (!body || !emptyNote) {
            return;
        }

        body.innerHTML = '';
        editingState = {}; // Reset editing state

        if (players.length === 0) {
            emptyNote.style.display = 'block';
            return;
        }

        emptyNote.style.display = 'none';
        players.forEach((player) => {
            const row = document.createElement('tr');
            row.setAttribute('data-player-id', player.player_id);

            const genderClass = player.player_gender === 'female' ? 'gender-female' : 'gender-male';
            const genderLabel = player.player_gender === 'female' ? 'Female' : 'Male';

            row.innerHTML = `
                <td class="player-name-cell">${player.player_name || ''}</td>
                <td class="player-gender-cell">
                    <div class="gender-card ${genderClass}">
                        <span class="gender-icon"></span>
                        <span class="gender-label">${genderLabel}</span>
                    </div>
                </td>
                <td>${typeof player.total_cash !== 'undefined' ? player.total_cash : 0}</td>
            `;
            body.appendChild(row);

            // Add event listeners for editing
            const nameCell = row.querySelector('.player-name-cell');
            const genderCell = row.querySelector('.player-gender-cell');

            nameCell.addEventListener('click', () => {
                enterNameEditMode(nameCell, player.player_id);
            });

            genderCell.addEventListener('click', () => {
                toggleGender(genderCell, player.player_id, player.player_gender);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', async function () {
        const modalElement = await loadModalMarkup();
        const openButton = document.getElementById('open-player-info');
        const cancelButton = document.getElementById('cancel-player-info-modal');
        const confirmButton = document.getElementById('confirm-player-info-modal');

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
            const players = loadPlayersFromStorage();
            // Apply editing state to players
            Object.keys(editingState).forEach((playerId) => {
                const player = players.find(p => p.player_id === playerId);
                if (player) {
                    if (editingState[playerId].player_name !== undefined) {
                        player.player_name = editingState[playerId].player_name;
                    }
                    if (editingState[playerId].player_gender !== undefined) {
                        player.player_gender = editingState[playerId].player_gender;
                    }
                }
            });
            savePlayersToStorage(players);
            document.dispatchEvent(new CustomEvent('players:updated', { detail: { players } }));
            editingState = {}; // Reset editing state after save
            closeModal();
        }

        openButton.addEventListener('click', openModal);
        openButton.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openModal();
            }
        });

        cancelButton.addEventListener('click', closeModal);
        confirmButton.addEventListener('click', saveEdits);

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && modalElement.classList.contains('is-open')) {
                closeModal();
            }
        });
    });
})();
