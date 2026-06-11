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

        function createRow() {
            const rowCount = tableBody.querySelectorAll("tr").length + 1;
            const rowElement = document.createElement("tr");
            rowElement.innerHTML = `
                <td><input type="text" name="player-name-${rowCount}" placeholder="Player name"></td>
                <td><input type="text" name="player-gender-${rowCount}" placeholder="Gender"></td>
            `;
            tableBody.appendChild(rowElement);
        }

        openButton.addEventListener("click", openModal);
        closeButton.addEventListener("click", closeModal);
        cancelButton.addEventListener("click", closeModal);
        confirmButton.addEventListener("click", closeModal);
        addRowButton.addEventListener("click", createRow);

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modalElement.classList.contains("is-open")) {
                closeModal();
            }
        });
    });
})();
