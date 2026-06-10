let players = [];
let history = [];
let playerScores = {};

// Sửa đổi nhỏ trong hàm này
function displayPlayers() {
    const playerList = document.getElementById("player-list");
    playerList.innerHTML = "";
    players.forEach((player, index) => {
        const currentScore = getCurrentScore(player);
        const li = document.createElement("li");
        li.innerHTML = `
            <span>
                <p>${player}</p>
                <strong id="score-display-${player}">${currentScore}</strong>
            </span>
            <button class="btn btn-danger" onclick="removePlayer(${index})">Xóa</button>`;
        playerList.appendChild(li);
    });
    updatePlayerScores(); // Cập nhật màu sắc điểm ngay khi hiển thị
}

function getCurrentScore(player) {
    return playerScores[player] || 0;
}

function updatePlayerScores() {
    players.forEach((player) => {
        const scoreElement = document.getElementById(`score-display-${player}`);
        if (scoreElement) {
            const currentScore = getCurrentScore(player);
            scoreElement.textContent = currentScore;
            // Cập nhật màu cho điểm số tổng
            scoreElement.style.color = currentScore > 0 ? 'var(--success-color)' : currentScore < 0 ? 'var(--danger-color)' : 'var(--dark-color)';
            scoreElement.style.backgroundColor = currentScore !== 0 ? 'transparent' : 'var(--border-color)';
            scoreElement.style.fontWeight = '700';

        }
    });
}

function addPlayer() {
    const playerNameInput = document.getElementById("player-name");
    const playerName = playerNameInput.value.trim();
    if (playerName && !players.includes(playerName)) {
        players.push(playerName);
        displayPlayers();
        saveToLocalStorage();
    } else {
        alert("Tên người chơi đã tồn tại hoặc không hợp lệ!");
    }
    playerNameInput.value = "";
    playerNameInput.focus();
}

function removePlayer(index) {
    const playerName = players[index];
    const confirmation = confirm(`Bạn có chắc chắn muốn xoá người chơi "${playerName}"?`);
    if (confirmation) {
        // Xóa điểm của người chơi
        delete playerScores[playerName];
        
        // Xóa người chơi khỏi danh sách
        players.splice(index, 1);
        
        // Cập nhật lại lịch sử (tùy chọn, có thể bỏ qua nếu muốn giữ nguyên lịch sử)
        // history = history.map(game => game.filter(p => p.player !== playerName));
        
        displayPlayers();
        displayHistory();
        saveToLocalStorage();
    }
}

function clearAll() {
    const confirmation = confirm(`Bạn có chắc chắn muốn XOÁ TẤT CẢ dữ liệu (người chơi, điểm số và lịch sử)? Thao tác này không thể hoàn tác!`);
    if (confirmation) {
        players = [];
        history = [];
        playerScores = {};
        displayPlayers();
        displayHistory();
        localStorage.clear(); // Xóa sạch Local Storage
    }
}

// Sửa đổi hàm này
function startGame() {
    if (players.length < 2) {
        alert("Cần ít nhất 2 người chơi để bắt đầu!");
        return;
    }

    const popup = document.getElementById("score-popup");
    popup.classList.add("show"); // Thay đổi ở đây

    const scoreInputs = document.getElementById("score-inputs");
    scoreInputs.innerHTML = "";
    players.forEach((player) => {
        // Cập nhật cấu trúc HTML cho phù hợp với CSS mới
        scoreInputs.innerHTML += `
            <div class="score-controls">
                <label for="score-${player}">${player}:</label>
                <input type="number" id="score-${player}" value="0" class="neutral" oninput="updateColor('${player}'); updateTotalScore();">
                <div class="score-adjust-buttons">
                    <button class="hide-on-mobile" onclick="adjustScore('${player}', -10)">-10</button>
                    <button onclick="adjustScore('${player}', -5)">-5</button>
                    <button onclick="adjustScore('${player}', -1)">-1</button>
                    <button onclick="adjustScore('${player}', 1)">+1</button>
                    <button onclick="adjustScore('${player}', 5)">+5</button>
                    <button class="hide-on-mobile" onclick="adjustScore('${player}', 10)">+10</button>
                </div>
            </div>`;
    });

    updateTotalScore();
}

function adjustScore(player, amount) {
    const scoreInput = document.getElementById(`score-${player}`);
    scoreInput.value = parseInt(scoreInput.value) + amount;
    updateColor(player);
    updateTotalScore();
}

function updateTotalScore() {
    let total = 0;
    players.forEach((player) => {
        const scoreInput = document.getElementById(`score-${player}`);
        if(scoreInput) {
            total += parseInt(scoreInput.value) || 0;
        }
    });
    const totalScoreElement = document.getElementById("total-score");
    totalScoreElement.textContent = total;
    totalScoreElement.style.color = total !== 0 ? 'var(--danger-color)' : 'var(--success-color)';
}

function updateColor(player) {
    const scoreInput = document.getElementById(`score-${player}`);
    const value = parseInt(scoreInput.value);

    scoreInput.classList.remove("positive", "negative", "neutral");
    if (value > 0) {
        scoreInput.classList.add("positive");
    } else if (value < 0) {
        scoreInput.classList.add("negative");
    } else {
        scoreInput.classList.add("neutral");
    }
}

// Sửa đổi hàm này
function saveGame() {
    const scores = players.map((player) => {
        const score = parseInt(document.getElementById(`score-${player}`).value) || 0;
        return { player, score };
    });

    const total = scores.reduce((sum, player) => sum + player.score, 0);

    if (total !== 0) {
        alert("Tổng số tiền thắng thua phải bằng 0.");
        return;
    }

    scores.forEach(({ player, score }) => {
        if (!playerScores[player]) {
            playerScores[player] = 0;
        }
        playerScores[player] += score;
    });

    history.push(scores);
    saveToLocalStorage();
    displayHistory();
    updatePlayerScores();

    closePopup(); // Thay đổi ở đây
}

// Sửa đổi nhỏ trong hàm này
function displayHistory() {
    const historyList = document.getElementById("game-history");
    historyList.innerHTML = "";

    // Hiển thị từ ván mới nhất đến cũ nhất
    [...history].reverse().forEach((game, index) => {
        const div = document.createElement("div");
        const li = document.createElement("li");
        
        const gameDetails = game
            .map(p => `${p.player}: ${p.score > 0 ? '+' : ''}${p.score}`)
            .join(" | ");

        div.innerHTML = `<strong>Ván ${history.length - index}</strong>`;
        li.textContent = gameDetails;

        div.appendChild(li);
        historyList.appendChild(div);
    });
}

// Sửa đổi hàm này
function closePopup() {
    const popup = document.getElementById("score-popup");
    popup.classList.remove("show"); // Thay đổi ở đây
}

function saveToLocalStorage() {
    localStorage.setItem("cardGamePlayers", JSON.stringify(players));
    localStorage.setItem("cardGameHistory", JSON.stringify(history));
    localStorage.setItem("cardGameScores", JSON.stringify(playerScores));
}

function loadFromLocalStorage() {
    const storedPlayers = localStorage.getItem("cardGamePlayers");
    const storedHistory = localStorage.getItem("cardGameHistory");
    const storedPlayerScores = localStorage.getItem("cardGameScores");

    if (storedPlayers) {
        players = JSON.parse(storedPlayers);
    }
    if (storedHistory) {
        history = JSON.parse(storedHistory);
    }
    if (storedPlayerScores) {
        playerScores = JSON.parse(storedPlayerScores);
    }

    displayPlayers();
    displayHistory();
}

window.onload = loadFromLocalStorage;
