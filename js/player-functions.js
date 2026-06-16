(function () {
    function setModalState(modalElement, isOpen) {
        modalElement.classList.toggle("is-open", isOpen);
        modalElement.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }

    async function loadModalMarkup() {
        const modalElement = document.getElementById("player-modal");

        if (modalElement) {
            return modalElement;
        }

        const modalHost = document.getElementById("player-modal-host");

        if (!modalHost) {
            return null;
        }

        try {
            const response = await fetch("player-modal.html");

            if (!response.ok) {
                throw new Error("Unable to load player modal file.");
            }

            modalHost.innerHTML = await response.text();
            return document.getElementById("player-modal");
        } catch (error) {
            console.error("Failed to load player modal:", error);
            return null;
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        const modalElement = await loadModalMarkup();
        const openButton = document.getElementById("create-player-list");
        const closeButton = document.getElementById("close-player-modal");
        const cancelButton = document.getElementById("cancel-player-modal");
        const confirmButton = document.getElementById("confirm-player-modal");
        const addRowButton = document.getElementById("add-player-row");
        const tableBody = document.getElementById("player-table-body");

        if (!modalElement || !openButton || !closeButton || !cancelButton || !confirmButton || !addRowButton || !tableBody) {
            return;
        }

        function closeModal() {
            setModalState(modalElement, false);
        }

        function openModal() {
            setModalState(modalElement, true);
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
        }

        function sanitizePlayerName(value) {
            const emojiRegex = /\p{Extended_Pictographic}/gu;
            return value.replace(emojiRegex, '').trimStart();
        }

        function hasInvalidPlayerName(value) {
            const trimmed = value.trim();
            return trimmed.length > 0 && trimmed !== value;
        }

        function getDuplicateNameNote() {
            const nameInputs = Array.from(modalElement.querySelectorAll('input[name^="player-name-"]'));
            const names = nameInputs.map((input) => input.value.trim()).filter(Boolean);
            const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
            const uniqueDuplicates = Array.from(new Set(duplicates));
            if (uniqueDuplicates.length === 0) {
                return '';
            }
            const example = `${uniqueDuplicates[0]}123`;
            return `NOTE: có thể sử dụng ${example}, ${uniqueDuplicates[0]}456, ... để dễ phân biệt`;
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
            const clean = sanitizePlayerName(input.value);
            if (input.value !== clean) {
                input.value = clean;
            }
            input.classList.toggle('invalid', hasInvalidPlayerName(input.value));
            const duplicateNote = modalElement.querySelector('#duplicate-note');
            if (duplicateNote) {
                duplicateNote.textContent = getDuplicateNameNote();
            }
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
                const cleanValue = sanitizePlayerName(input.value);
                if (input.value !== cleanValue) {
                    input.value = cleanValue;
                }
                const valid = isValidPlayerName(cleanValue);
                input.classList.toggle('invalid', !valid);
                if (!valid) {
                    allValid = false;
                }
            });

            const duplicateNote = modalElement.querySelector('#duplicate-note');
            if (duplicateNote) {
                duplicateNote.textContent = getDuplicateNameNote();
            }

            const hasDuplicates = !!getDuplicateNameNote();
            if (hasDuplicates) {
                allValid = false;
            }

            if (allValid) {
                closeModal();
            } else {
                alert('Tên người chơi không được để trống và không chứa emoji.');
            }
        });

        openButton.addEventListener("click", openModal);
        closeButton.addEventListener("click", closeModal);
        cancelButton.addEventListener("click", closeModal);
        addRowButton.addEventListener("click", createRow);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modalElement.classList.contains("is-open")) {
                closeModal();
            }
        });
    });
})();
