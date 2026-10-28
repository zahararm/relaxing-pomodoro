const $ = s => document.querySelector(s), now = new Date();

const HS = [
    ["lamp", "desk lamp on/off", 550, 420, '<ellipse cx="548" cy="448" rx="75" ry="72"/>']
];

(() => {
    $("#hs").innerHTML = HS.map(([k, l, x, y, s]) => {
        const w = l.length * 8.6 + 26;
        return `<g class="hs" tabindex="0" data-k="${k}">${s}<g class="lbl"><rect x="${x - w / 2}" y="${y - 24}" width="${w}" height="32" rx="8"/><text x="${x}" y="${y - 2}">${l}</text></g></g>`;
    }).join("");
})();

let rn = "";
for (let i = 0; i < 60; i++) {
    rn += `<line x1="${330 + i * 17}" y1="${60 + (i * 37) % 90}" x2="${326 + i * 17}" y2="${95 + (i * 37) % 90}" style="animation-delay:-${(i % 7) / 10}s"/>`;
}
$("#rain").innerHTML = rn;

let mode = "night", started = false;

function setMode(m) {
    mode = m;
    document.body.dataset.mode = m;
    document.querySelectorAll("#bar [data-m]").forEach(x => x.classList.toggle("on", x.dataset.m == m));
}

document.querySelectorAll("#bar [data-m]").forEach(x => x.onclick = e => {
    e.stopPropagation();
    setMode(x.dataset.m);
});

const activeLayers = {};

function toggleLayer(id, btn) {
    if (!started) unlockAudio();
    const media = document.getElementById(`audio-${id}`);
    if (!media) return;

    if (activeLayers[id]) {
        media.pause();
        delete activeLayers[id];
        btn.classList.remove("on");
        if (id === "rain") document.body.dataset.rainfx = "0";
    } else {
        media.currentTime = 0; 
        media.play().catch(e => console.log("Playback prevented:", e));
        activeLayers[id] = true;
        btn.classList.add("on");
        if (id === "rain") document.body.dataset.rainfx = "1";
    }
}

function unlockAudio() {
    if (started) return;
    started = true;
    $("#snd").style.opacity = 0;
}

addEventListener("pointerdown", unlockAudio);
addEventListener("keydown", unlockAudio);

function toast(t) {
    const e = $("#toast");
    e.textContent = t;
    e.classList.add("on");
    setTimeout(() => e.classList.remove("on"), 1800);
}

const K = {
    lamp: () => $("#room").classList.toggle("lampoff")
};

document.querySelectorAll(".hs").forEach(e => {
    const f = () => K[e.dataset.k]();
    e.onclick = f;
    e.onkeydown = ev => { if (ev.key == "Enter" || ev.key == " ") f(); };
});

const sv = (id, h) => $(id).insertAdjacentHTML("beforeend", h);

const CITY = [[340, 470, 110, 130], [455, 400, 90, 200], [700, 450, 80, 150], [770, 520, 60, 80], [880, 360, 70, 240], [960, 300, 80, 300], [1050, 390, 90, 210], [1150, 250, 80, 350], [1240, 340, 70, 260], [1300, 410, 70, 190]];
let cs = "", ls = "";

CITY.forEach(([x, y, w, h], k) => {
    cs += `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    for (let gx = x + 8; gx < x + w - 8; gx += 16) {
        for (let gy = y + 10; gy < y + h - 6; gy += 20) {
            if ((gx * 7 + gy * 13 + k * 5) % 5 < 2) {
                ls += `<rect x="${gx}" y="${gy}" width="7" height="10" fill="#ffd98a"/>`;
            }
        }
    }
});
sv("#city", cs);

[[575, 250], [575, 300], [560, 380], [592, 380], [560, 440], [592, 440], [512, 520], [640, 520]].forEach(([x, y]) => {
    ls += `<rect x="${x}" y="${y}" width="9" height="18" rx="4" fill="#ffd98a"/>`;
});
sv("#lit", ls);

$("#calm").textContent = now.toLocaleString("en-US", { month: "long" });
setMode("night");

document.querySelectorAll("#mixer .mx").forEach(row => {
    const id = row.dataset.id, btn = row.querySelector(".mxBtn");
    btn.onclick = () => toggleLayer(id, btn);
});

// Pomodoro Timer
const pomo = { type: "focus", remaining: 25 * 60, running: false, sessions: 0, focusMin: 25, breakMin: 5 };
const fmt = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
let pomoInt = null;

function renderPomo() {
    $("#pomoTime").textContent = fmt(pomo.remaining);
    $("#pomoLabel").textContent = pomo.type == "focus" ? "Focus" : "Break";
    $("#pomoCard").classList.toggle("onbreak", pomo.type != "focus");
    $("#pomoCount").textContent = "🍅".repeat(pomo.sessions) || "no sessions yet";
    $("#pomoStart").textContent = pomo.running ? "Pause" : "Start";
}

function setChar(state) { document.body.dataset.char = state; }

function pomoTick() {
    pomo.remaining--;
    if (pomo.remaining <= 0) {
        pomo.type = pomo.type == "focus" ? "break" : "focus";
        pomo.remaining = (pomo.type == "focus" ? pomo.focusMin : pomo.breakMin) * 60;
        if (pomo.type == "break") {
            pomo.sessions++;
            setChar("sleep");
            toast("Break time — rest up! 😴");
        } else {
            setChar("awake");
            toast("Back to focus! ✏️");
        }
    }
    renderPomo();
}

$("#pomoStart").onclick = () => {
    if (pomo.running) {
        pomo.running = false;
        clearInterval(pomoInt);
    } else {
        pomo.running = true;
        setChar(pomo.type == "focus" ? "awake" : "sleep");
        pomoInt = setInterval(pomoTick, 1000);
    }
    renderPomo();
};

$("#pomoReset").onclick = () => {
    pomo.running = false;
    clearInterval(pomoInt);
    pomo.type = "focus";
    pomo.remaining = pomo.focusMin * 60;
    setChar("awake");
    renderPomo();
};

setChar("awake");
renderPomo();

// Task list 
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem("tasks") || "[]"); } catch (e) {}
const saveTasks = () => { try { localStorage.setItem("tasks", JSON.stringify(tasks)); } catch (e) {} };

function renderTasks() {
    $("#taskList").innerHTML = tasks.map((t, i) => `<li class="${t.done ? "done" : ""}"><button class="chk" data-i="${i}">${t.done ? "✓" : ""}</button><span>${t.text}</span><button class="rm" data-i="${i}">×</button></li>`).join("") || '<li class="empty">nothing on the list yet</li>';
}

$("#taskForm").onsubmit = e => {
    e.preventDefault();
    const v = $("#taskInput").value.trim();
    if (!v) return;
    tasks.push({ text: v, done: false });
    $("#taskInput").value = "";
    renderTasks();
    saveTasks();
};

$("#taskList").addEventListener("click", e => {
    const i = e.target.dataset.i;
    if (i == null) return;
    if (e.target.classList.contains("chk")) {
        tasks[i].done = !tasks[i].done;
        renderTasks();
        saveTasks();
    }
    if (e.target.classList.contains("rm")) {
        tasks.splice(i, 1);
        renderTasks();
        saveTasks();
    }
});

renderTasks();
