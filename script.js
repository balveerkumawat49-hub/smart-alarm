/* =========================================================
   BALVEER SMART ALARM
   FINAL SCRIPT
   ========================================================= */


// =========================================================
// VARIABLES
// =========================================================

let alarms = [];

let schedules = [];

let activeAlarmIndex = null;

let activeAlarmData = null;

let activeAlarmIsSchedule = false;

let scheduleSnoozeTimer = null;

let audioContext = null;

let customRingtoneFile = null;

let customRingtoneURL = null;

let customRingtoneBuffer = null;

let customRingtoneName = "";

let customSource = null;

let builtInTimer = null;

let audioReady = false;


// =========================================================
// DOM HELPER
// =========================================================

function $(id) {
  return document.getElementById(id);
}


// =========================================================
// CLOCK
// =========================================================

function updateClock() {

  const now = new Date();

  const time = $("currentTime");

  const date = $("currentDate");


  if (time) {

    time.textContent =
      now.toLocaleTimeString("en-IN");

  }


  if (date) {

    date.textContent =
      now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });

  }

}


updateClock();

setInterval(
  updateClock,
  1000
);


// =========================================================
// AUDIO CONTEXT
// =========================================================

function getAudioContext() {

  if (audioContext) {

    return audioContext;

  }


  const AudioCtx =
    window.AudioContext ||
    window.webkitAudioContext;


  if (!AudioCtx) {

    return null;

  }


  audioContext =
    new AudioCtx();


  return audioContext;

}


// =========================================================
// UNLOCK AUDIO
// =========================================================

async function unlockAudio() {

  const ctx =
    getAudioContext();


  if (!ctx) {

    return false;

  }


  try {

    if (
      ctx.state === "suspended"
    ) {

      await ctx.resume();

    }


    /*
      Create a silent buffer once.
      This helps Android/browser mark
      the audio context as user activated.
    */

    if (!audioReady) {

      const buffer =
        ctx.createBuffer(
          1,
          1,
          ctx.sampleRate
        );


      const source =
        ctx.createBufferSource();


      source.buffer =
        buffer;


      source.connect(
        ctx.destination
      );


      source.start(0);


      audioReady = true;

    }


    return true;

  } catch (error) {

    console.error(
      "Audio unlock error:",
      error
    );

    return false;

  }

}


document.addEventListener(
  "click",
  unlockAudio,
  {
    passive: true
  }
);


document.addEventListener(
  "touchstart",
  unlockAudio,
  {
    passive: true
  }
);


// =========================================================
// LOCAL STORAGE - ALARMS
// =========================================================

function loadAlarms() {

  try {

    const saved =
      localStorage.getItem(
        "alarms"
      );


    if (!saved) {

      alarms = [];

      return;

    }


    const data =
      JSON.parse(saved);


    if (
      !Array.isArray(data)
    ) {

      alarms = [];

      return;

    }


    alarms =
      data
        .filter(
          alarm =>
            alarm &&
            typeof alarm === "object"
        )
        .map(
          alarm => ({

            id:
              alarm.id ||
              (
                Date.now() +
                "-" +
                Math.random()
              ),

            time:
              alarm.time || "",

            purpose:
              alarm.purpose || "",

            ringtone:
              alarm.ringtone || "bell",

            lastTriggeredKey:
              alarm.lastTriggeredKey ||
              null

          })
        )
        .filter(
          alarm =>
            /^\d{2}:\d{2}$/.test(
              alarm.time
            )
        );


  } catch (error) {

    console.error(
      "Alarm loading error:",
      error
    );

    alarms = [];

  }

}


function saveAlarms() {

  try {

    localStorage.setItem(
      "alarms",
      JSON.stringify(alarms)
    );

  } catch (error) {

    console.error(
      "Alarm saving error:",
      error
    );

  }

}


loadAlarms();


// =========================================================
// LOCAL STORAGE - SCHEDULES
// =========================================================

function loadSchedules() {
  try {
    const saved = localStorage.getItem("schedules");
    if (!saved) {
      schedules = [];
      return;
    }
    const data = JSON.parse(saved);
    schedules = Array.isArray(data) ? data.filter(s => s && typeof s === "object").map(s => ({
      id: s.id || (Date.now() + "-" + Math.random()),
      time: s.time || "",
      purpose: s.purpose || "",
      ringtone: s.ringtone || "bell",
      repeat: s.repeat || "daily",
      days: Array.isArray(s.days) ? s.days.map(Number) : [0,1,2,3,4,5,6],
      date: s.date || "",
      enabled: s.enabled !== false,
      lastTriggeredKey: s.lastTriggeredKey || null
    })).filter(s => /^\d{2}:\d{2}$/.test(s.time)) : [];
  } catch (error) {
    console.error("Schedule loading error:", error);
    schedules = [];
  }
}

function saveSchedules() {
  try {
    localStorage.setItem("schedules", JSON.stringify(schedules));
  } catch (error) {
    console.error("Schedule saving error:", error);
  }
}

loadSchedules();

function updateScheduleRepeatUI() {
  const repeat = $("scheduleRepeat")?.value || "daily";
  const days = $("scheduleDays");
  const date = $("scheduleDateGroup");
  if (days) days.classList.toggle("hidden-section", repeat !== "days");
  if (date) date.classList.toggle("hidden-section", repeat !== "once");
}

function getSelectedScheduleDays() {
  return Array.from(document.querySelectorAll("#scheduleDays input[type=checkbox]:checked"))
    .map(input => Number(input.value));
}

function scheduleRepeatText(schedule) {
  if (schedule.repeat === "daily") return "Every day";
  if (schedule.repeat === "once") return schedule.date ? "Once • " + schedule.date : "One time";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (schedule.days || []).sort((a,b) => a-b).map(d => names[d]).join(", ") || "Selected days";
}

function setSchedule() {
  const time = $("scheduleTime")?.value || "";
  const purpose = ($("schedulePurpose")?.value || "").trim();
  const repeat = $("scheduleRepeat")?.value || "daily";
  const ringtone = $("scheduleRingtone")?.value || "bell";
  const date = $("scheduleDate")?.value || "";
  let days = repeat === "daily" ? [0,1,2,3,4,5,6] : getSelectedScheduleDays();

  if (!time) return showToast("Time required", "Please select schedule time.");
  if (!purpose) return showToast("Purpose required", "Please enter the schedule purpose.");
  if (repeat === "days" && days.length === 0) return showToast("Select days", "Choose at least one day.");
  if (repeat === "once" && !date) return showToast("Date required", "Please select a date.");

  if (repeat === "once" && date < new Date().toISOString().slice(0,10)) {
    return showToast("Invalid date", "Please select today or a future date.");
  }

  schedules.push({
    id: Date.now() + "-" + Math.random().toString(16).slice(2),
    time, purpose, ringtone, repeat, days, date,
    enabled: true, lastTriggeredKey: null
  });

  saveSchedules();
  renderSchedules();
  $("scheduleTime").value = "";
  $("schedulePurpose").value = "";
  $("scheduleRepeat").value = "daily";
  $("scheduleDate").value = "";
  document.querySelectorAll("#scheduleDays input[type=checkbox]").forEach(x => x.checked = false);
  updateScheduleRepeatUI();
  showToast("Schedule added", time + " schedule saved");
}

function deleteSchedule(id) {
  schedules = schedules.filter(s => s.id !== id);
  saveSchedules();
  renderSchedules();
  showToast("Schedule deleted", "Schedule removed successfully.");
}

function toggleSchedule(id) {
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return;
  schedule.enabled = !schedule.enabled;
  saveSchedules();
  renderSchedules();
  showToast(schedule.enabled ? "Schedule enabled" : "Schedule disabled", schedule.enabled ? "The schedule is active." : "The schedule is paused.");
}

function renderSchedules() {
  const list = $("scheduleList");
  if (!list) return;
  if (!schedules.length) {
    list.innerHTML = "No schedules set yet";
    return;
  }
  list.innerHTML = schedules.map(schedule => `
    <div class="schedule-card ${schedule.enabled ? "" : "schedule-disabled"}">
      <div class="alarm-top">
        <div class="alarm-time">${escapeHTML(schedule.time)}</div>
        <button type="button" class="delete-btn" onclick="deleteSchedule('${escapeHTML(schedule.id)}')" aria-label="Delete schedule">✕</button>
      </div>
      <div class="alarm-purpose">${escapeHTML(schedule.purpose)}</div>
      <div class="schedule-repeat">📅 ${escapeHTML(scheduleRepeatText(schedule))}</div>
      <div class="schedule-actions">
        <button type="button" class="schedule-toggle ${schedule.enabled ? "enabled" : "disabled"}" onclick="toggleSchedule('${escapeHTML(schedule.id)}')">${schedule.enabled ? "✓ Enabled" : "○ Disabled"}</button>
      </div>
    </div>
  `).join("");
}

function getScheduleTriggerKey(schedule) {
  const now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0") + "_" + schedule.time;
}

function isScheduleDue(schedule, now) {
  const today = now.getDay();
  if (schedule.repeat === "once") {
    return schedule.date === now.toISOString().slice(0,10);
  }
  return schedule.repeat === "daily" || (schedule.days || []).includes(today);
}

function checkSchedules(now, currentTime) {
  let changed = false;
  schedules.forEach(schedule => {
    if (!schedule.enabled || schedule.time !== currentTime || !isScheduleDue(schedule, now)) return;
    const key = getScheduleTriggerKey(schedule);
    if (schedule.lastTriggeredKey === key) return;
    schedule.lastTriggeredKey = key;
    changed = true;
    showAlarmPopup(schedule, null);
    if (schedule.repeat === "once") schedule.enabled = false;
  });
  if (changed) {
    saveSchedules();
    renderSchedules();
  }
}

async function previewScheduleRingtone() {
  await unlockAudio();
  const ringtone = $("scheduleRingtone")?.value || "bell";
  if (ringtone === "custom" && !customRingtoneBuffer) {
    return showToast("No custom ringtone", "Choose a custom ringtone from the Alarms tab first.");
  }
  playRingtone(ringtone);
}

// =========================================================
// INDEXED DB - CUSTOM RINGTONE
// =========================================================

const DB_NAME =
  "BalveerSmartAlarmDB";

const DB_VERSION =
  1;

const STORE_NAME =
  "ringtoneStore";

let dbPromise = null;


function openDatabase() {

  if (dbPromise) {

    return dbPromise;

  }


  dbPromise =
    new Promise(
      (resolve, reject) => {

        const request =
          indexedDB.open(
            DB_NAME,
            DB_VERSION
          );


        request.onupgradeneeded =
          function(event) {

            const db =
              event.target.result;


            if (
              !db.objectStoreNames.contains(
                STORE_NAME
              )
            ) {

              db.createObjectStore(
                STORE_NAME
              );

            }

          };


        request.onsuccess =
          function() {

            resolve(
              request.result
            );

          };


        request.onerror =
          function() {

            reject(
              request.error
            );

          };

      }
    );


  return dbPromise;

}


// =========================================================
// SAVE RINGTONE
// =========================================================

async function saveCustomRingtone(
  file
) {

  try {

    const db =
      await openDatabase();


    await new Promise(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            STORE_NAME,
            "readwrite"
          );


        const store =
          transaction.objectStore(
            STORE_NAME
          );


        const request =
          store.put(
            file,
            "custom"
          );


        request.onsuccess =
          () => resolve();


        request.onerror =
          () => reject(
            request.error
          );

      }
    );


    localStorage.setItem(
      "customRingtoneName",
      file.name
    );


    return true;

  } catch (error) {

    console.error(
      "Ringtone save error:",
      error
    );

    return false;

  }

}


// =========================================================
// LOAD RINGTONE
// =========================================================

async function loadCustomRingtone() {

  try {

    const db =
      await openDatabase();


    const file =
      await new Promise(
        (resolve, reject) => {

          const transaction =
            db.transaction(
              STORE_NAME,
              "readonly"
            );


          const store =
            transaction.objectStore(
              STORE_NAME
            );


          const request =
            store.get("custom");


          request.onsuccess =
            () => resolve(
              request.result
            );


          request.onerror =
            () => reject(
              request.error
            );

        }
      );


    if (!file) {

      return false;

    }


    customRingtoneFile =
      file;


    customRingtoneName =
      localStorage.getItem(
        "customRingtoneName"
      ) ||
      file.name ||
      "Custom Ringtone";


    createCustomURL(
      file
    );


    await prepareCustomRingtone(
      file
    );


    ensureCustomOption();

    updateRingtoneInfo();


    return true;


  } catch (error) {

    console.error(
      "Ringtone loading error:",
      error
    );

    return false;

  }

}


// =========================================================
// CREATE OBJECT URL
// =========================================================

function createCustomURL(
  file
) {

  if (
    customRingtoneURL
  ) {

    try {

      URL.revokeObjectURL(
        customRingtoneURL
      );

    } catch (error) {}

  }


  customRingtoneURL =
    URL.createObjectURL(
      file
    );

}


// =========================================================
// PREPARE CUSTOM AUDIO BUFFER
// =========================================================

async function prepareCustomRingtone(
  file
) {

  try {

    const ctx =
      getAudioContext();


    if (!ctx) {

      return false;

    }


    const arrayBuffer =
      await file.arrayBuffer();


    /*
      Decode a copy of the file.
      The decoded AudioBuffer remains
      available even after the input
      file picker is closed.
    */

    customRingtoneBuffer =
      await ctx.decodeAudioData(
        arrayBuffer.slice(0)
      );


    return true;


  } catch (error) {

    console.error(
      "Ringtone decode error:",
      error
    );


    customRingtoneBuffer =
      null;


    return false;

  }

}


// =========================================================
// RINGTONE UI
// =========================================================

function ensureCustomOption() {

  const select =
    $("ringtoneSelect");


  if (!select) {

    return;

  }


  let option =
    select.querySelector(
      'option[value="custom"]'
    );


  if (!option) {

    option =
      document.createElement(
        "option"
      );


    option.value =
      "custom";


    option.textContent =
      "🎵 Custom Ringtone";


    select.appendChild(
      option
    );

  }

  const scheduleSelect = $("scheduleRingtone");
  if (scheduleSelect && !scheduleSelect.querySelector('option[value="custom"]')) {
    const scheduleOption = document.createElement("option");
    scheduleOption.value = "custom";
    scheduleOption.textContent = "🎵 Custom Ringtone";
    scheduleSelect.appendChild(scheduleOption);
  }

}


// =========================================================
// CREATE STORAGE BUTTON
// =========================================================

function createRingtoneUI() {

  const select =
    $("ringtoneSelect");


  if (!select) {

    return;

  }


  if (
    $("customRingtoneArea")
  ) {

    return;

  }


  const area =
    document.createElement(
      "div"
    );


  area.id =
    "customRingtoneArea";


  area.style.marginTop =
    "10px";


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.textContent =
    "📁 Choose Ringtone From Storage";


  button.style.width =
    "100%";


  button.style.padding =
    "13px 15px";


  button.style.border =
    "none";


  button.style.borderRadius =
    "14px";


  button.style.background =
    "rgba(255,255,255,0.08)";


  button.style.color =
    "white";


  button.style.fontSize =
    "14px";


  button.style.fontWeight =
    "600";


  button.style.cursor =
    "pointer";


  const input =
    document.createElement(
      "input"
    );


  input.type =
    "file";


  input.accept =
    "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm";


  input.style.display =
    "none";


  input.id =
    "customRingtoneInput";


  const info =
    document.createElement(
      "div"
    );


  info.id =
    "customRingtoneInfo";


  info.style.marginTop =
    "8px";


  info.style.fontSize =
    "12px";


  info.style.color =
    "#94a3b8";


  button.onclick =
    async function() {

      await unlockAudio();

      input.click();

    };


  input.addEventListener(
    "change",
    async function() {

      const file =
        input.files &&
        input.files[0];


      if (!file) {

        return;

      }


      if (
        !isAudioFile(file)
      ) {

        showToast(
          "Invalid ringtone",
          "Please select an audio file."
        );

        input.value =
          "";

        return;

      }


      const ready =
        await prepareCustomRingtone(
          file
        );


      if (!ready) {

        showToast(
          "Ringtone error",
          "This audio file could not be loaded."
        );

        input.value =
          "";

        return;

      }


      customRingtoneFile =
        file;


      customRingtoneName =
        file.name;


      createCustomURL(
        file
      );


      const saved =
        await saveCustomRingtone(
          file
        );


      ensureCustomOption();


      select.value =
        "custom";


      localStorage.setItem(
        "selectedRingtone",
        "custom"
      );


      updateRingtoneInfo();


      showToast(
        "Ringtone selected",
        saved
          ? file.name
          : "Selected for this session."
      );


      input.value =
        "";

    }
  );


  area.appendChild(
    button
  );


  area.appendChild(
    input
  );


  area.appendChild(
    info
  );


  select.parentNode.appendChild(
    area
  );

}


// =========================================================
// AUDIO FILE CHECK
// =========================================================

function isAudioFile(
  file
) {

  if (
    file.type &&
    file.type.startsWith(
      "audio/"
    )
  ) {

    return true;

  }


  const name =
    file.name.toLowerCase();


  return (
    name.endsWith(".mp3") ||
    name.endsWith(".wav") ||
    name.endsWith(".ogg") ||
    name.endsWith(".m4a") ||
    name.endsWith(".aac") ||
    name.endsWith(".webm")
  );

}


// =========================================================
// RINGTONE INFO
// =========================================================

function updateRingtoneInfo() {

  const info =
    $("customRingtoneInfo");


  if (!info) {

    return;

  }


  if (
    customRingtoneName
  ) {

    info.textContent =
      "✅ " +
      customRingtoneName;

  } else {

    info.textContent =
      "No custom ringtone selected.";

  }

}


// =========================================================
// RINGTONE SELECT
// =========================================================

function setupRingtoneSelect() {

  const select =
    $("ringtoneSelect");


  if (!select) {

    return;

  }


  select.addEventListener(
    "change",
    async function() {

      await unlockAudio();


      localStorage.setItem(
        "selectedRingtone",
        select.value
      );

    }
  );


  const saved =
    localStorage.getItem(
      "selectedRingtone"
    );


  if (
    saved === "bell" ||
    saved === "digital" ||
    saved === "soft"
  ) {

    select.value =
      saved;

  }

}


// =========================================================
// SELECTED RINGTONE
// =========================================================

function getSelectedRingtone() {

  const select =
    $("ringtoneSelect");


  if (!select) {

    return "bell";

  }


  return (
    select.value ||
    "bell"
  );

}


// =========================================================
// SET ALARM
// =========================================================

async function setAlarm() {

  await unlockAudio();


  const timeInput =
    $("alarmTime");


  const purposeInput =
    $("alarmText");


  if (
    !timeInput ||
    !purposeInput
  ) {

    showToast(
      "Error",
      "Alarm fields not found."
    );

    return;

  }


  const time =
    timeInput.value;


  const purpose =
    purposeInput.value.trim();


  const ringtone =
    getSelectedRingtone();


  if (!time) {

    showToast(
      "Time required",
      "Please select alarm time."
    );

    return;

  }


  if (!purpose) {

    showToast(
      "Purpose required",
      "Please enter the alarm purpose."
    );

    return;

  }


  if (
    ringtone === "custom" &&
    !customRingtoneBuffer
  ) {

    showToast(
      "Ringtone not ready",
      "Please select the ringtone again."
    );

    return;

  }


  const duplicate =
    alarms.some(
      alarm =>
        alarm.time === time &&
        alarm.purpose === purpose
    );


  if (duplicate) {

    showToast(
      "Alarm already exists",
      time + " is already in your list."
    );

    return;

  }


  const alarm = {

    id:
      Date.now() +
      "-" +
      Math.random()
        .toString(16)
        .slice(2),

    time:
      time,

    purpose:
      purpose,

    ringtone:
      ringtone,

    lastTriggeredKey:
      null

  };


  alarms.push(
    alarm
  );


  saveAlarms();


  /*
    IMPORTANT:
    Render ONLY when alarm list changes.
    This is what prevents blinking.
  */

  renderAlarms();


  timeInput.value =
    "";


  purposeInput.value =
    "";


  showToast(
    "Alarm set successfully",
    time + " alarm added"
  );

}


// =========================================================
// DELETE ALARM
// =========================================================

function deleteAlarm(
  index
) {

  if (
    index < 0 ||
    index >= alarms.length
  ) {

    return;

  }


  if (
    activeAlarmIndex === index
  ) {

    stopAlarm();

  }


  alarms.splice(
    index,
    1
  );


  if (
    activeAlarmIndex !== null &&
    index < activeAlarmIndex
  ) {

    activeAlarmIndex--;

  }


  saveAlarms();

  renderAlarms();


  showToast(
    "Alarm deleted",
    "Alarm removed successfully."
  );

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


// =========================================================
// REMAINING TIME
// =========================================================

function getRemaining(
  time
) {

  if (
    !time ||
    !time.includes(":")
  ) {

    return "";

  }


  const parts =
    time.split(":");


  const hours =
    Number(parts[0]);


  const minutes =
    Number(parts[1]);


  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {

    return "";

  }


  const now =
    new Date();


  const target =
    new Date();


  target.setHours(
    hours,
    minutes,
    0,
    0
  );


  if (
    target <= now
  ) {

    target.setDate(
      target.getDate() + 1
    );

  }


  const diff =
    target.getTime() -
    now.getTime();


  const totalMinutes =
    Math.max(
      0,
      Math.floor(
        diff / 60000
      )
    );


  const h =
    Math.floor(
      totalMinutes / 60
    );


  const m =
    totalMinutes % 60;


  return (
    h +
    "h " +
    m +
    "m remaining"
  );

}


// =========================================================
// RENDER ALARM LIST
// =========================================================

function renderAlarms() {

  const status =
    $("status");


  if (!status) {

    return;

  }


  if (
    alarms.length === 0
  ) {

    status.innerHTML =
      "No alarms set yet";

    return;

  }


  status.innerHTML =
    alarms
      .map(
        (alarm, index) => `

          <div
            class="alarm-card"
            data-alarm-index="${index}"
          >

            <div class="alarm-top">

              <div class="alarm-time">
                ${escapeHTML(
                  alarm.time
                )}
              </div>

              <button
                type="button"
                class="delete-btn"
                onclick="deleteAlarm(${index})"
                aria-label="Delete alarm"
              >
                ✕
              </button>

            </div>

            <div class="alarm-purpose">

              📌
              ${escapeHTML(
                alarm.purpose
              )}

            </div>

            <div
              class="alarm-countdown"
              id="countdown-${index}"
            >
              ⏳
              ${getRemaining(
                alarm.time
              )}
            </div>

          </div>

        `
      )
      .join("");

}


// =========================================================
// UPDATE COUNTDOWN ONLY
// =========================================================
//
// IMPORTANT:
// This function NEVER rebuilds alarm cards.
// So no blinking.
// =========================================================

function updateCountdowns() {

  alarms.forEach(
    (alarm, index) => {

      const element =
        $("countdown-" + index);


      if (element) {

        element.textContent =
          "⏳ " +
          getRemaining(
            alarm.time
          );

      }

    }
  );

}


// =========================================================
// BUILT-IN AUDIO
// =========================================================

function playTone(
  frequency,
  duration,
  type,
  volume
) {

  const ctx =
    getAudioContext();


  if (!ctx) {

    return;

  }


  if (
    ctx.state === "suspended"
  ) {

    ctx.resume();

  }


  const oscillator =
    ctx.createOscillator();


  const gain =
    ctx.createGain();


  oscillator.type =
    type || "sine";


  oscillator.frequency.value =
    frequency;


  gain.gain.setValueAtTime(
    0,
    ctx.currentTime
  );


  gain.gain.linearRampToValueAtTime(
    volume || 0.25,
    ctx.currentTime + 0.02
  );


  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + duration
  );


  oscillator.connect(
    gain
  );


  gain.connect(
    ctx.destination
  );


  oscillator.start();


  oscillator.stop(
    ctx.currentTime +
    duration +
    0.05
  );

}


// =========================================================
// BELL
// =========================================================

function playBell() {

  playTone(
    880,
    0.35,
    "sine",
    0.35
  );


  setTimeout(
    function() {

      playTone(
        660,
        0.45,
        "sine",
        0.30
      );

    },
    180
  );

}


// =========================================================
// DIGITAL
// =========================================================

function playDigital() {

  playTone(
    1250,
    0.12,
    "square",
    0.20
  );


  setTimeout(
    function() {

      playTone(
        850,
        0.12,
        "square",
        0.20
      );

    },
    160
  );

}


// =========================================================
// SOFT
// =========================================================

function playSoft() {

  playTone(
    523,
    0.45,
    "sine",
    0.22
  );


  setTimeout(
    function() {

      playTone(
        659,
        0.45,
        "sine",
        0.20
      );

    },
    350
  );

}


// =========================================================
// STOP CUSTOM AUDIO
// =========================================================

function stopCustomRingtone() {

  if (customSource) {

    try {

      customSource.stop();

    } catch (error) {}

    customSource =
      null;

  }

}


// =========================================================
// PLAY CUSTOM RINGTONE
// =========================================================

async function playCustomRingtone() {

  if (
    !customRingtoneBuffer
  ) {

    console.error(
      "Custom ringtone buffer unavailable."
    );

    return;

  }


  const ctx =
    getAudioContext();


  if (!ctx) {

    return;

  }


  try {

    if (
      ctx.state === "suspended"
    ) {

      await ctx.resume();

    }

  } catch (error) {

    console.error(
      "Audio resume failed:",
      error
    );

    return;

  }


  stopCustomRingtone();


  const source =
    ctx.createBufferSource();


  source.buffer =
    customRingtoneBuffer;


  /*
    Loop selected ringtone continuously
    while alarm is ringing.
  */

  source.loop =
    true;


  source.connect(
    ctx.destination
  );


  customSource =
    source;


  source.start(0);

}


// =========================================================
// PLAY SELECTED RINGTONE
// =========================================================

async function playRingtone(
  ringtone
) {

  if (
    ringtone === "custom"
  ) {

    await playCustomRingtone();

    return;

  }


  if (
    ringtone === "digital"
  ) {

    playDigital();

    return;

  }


  if (
    ringtone === "soft"
  ) {

    playSoft();

    return;

  }


  playBell();

}


// =========================================================
// START ALARM SOUND
// =========================================================

async function startAlarmSound(
  alarm
) {

  stopRingtone();


  if (
    alarm.ringtone === "custom"
  ) {

    await playCustomRingtone();

    return;

  }


  await playRingtone(
    alarm.ringtone ||
    "bell"
  );


  /*
    Built-in sounds are short,
    therefore repeat them.
  */

  builtInTimer =
    setInterval(
      function() {

        if (
          activeAlarmIndex === null
        ) {

          return;

        }


        playRingtone(
          alarm.ringtone ||
          "bell"
        );

      },
      1800
    );

}


// =========================================================
// STOP RINGTONE
// =========================================================

function stopRingtone() {

  if (builtInTimer) {

    clearInterval(
      builtInTimer
    );

    builtInTimer =
      null;

  }


  stopCustomRingtone();

}


// =========================================================
// ALARM POPUP
// =========================================================

function showAlarmPopup(
  alarm,
  index
) {

  /*
    If another alarm is already ringing,
    don't create duplicate popups.
  */

  if (
    activeAlarmIndex !== null
  ) {

    return;

  }


  activeAlarmIndex =
    index;

  activeAlarmData = alarm;

  activeAlarmIsSchedule = index === -1;


  const popup =
    $("alarmPopup");


  const popupTime =
    $("popupTime");


  const popupTask =
    $("popupTask");


  if (popupTime) {

    popupTime.textContent =
      alarm.time;

  }


  if (popupTask) {

    popupTask.textContent =
      "📌 " +
      alarm.purpose;

  }


  if (popup) {

    popup.classList.remove(
      "hidden"
    );

  }


  startAlarmSound(
    alarm
  );


  if (
    navigator.vibrate
  ) {

    navigator.vibrate([
      500,
      250,
      500,
      250,
      500
    ]);

  }

}


// =========================================================
// STOP ALARM
// =========================================================

function stopAlarm() {

  stopRingtone();


  if (
    navigator.vibrate
  ) {

    navigator.vibrate(0);

  }


  const popup =
    $("alarmPopup");


  if (popup) {

    popup.classList.add(
      "hidden"
    );

  }


  activeAlarmIndex =
    null;

  activeAlarmData = null;

  activeAlarmIsSchedule = false;

}


// =========================================================
// SNOOZE 5 MINUTES
// =========================================================

function snoozeAlarm() {

  if (activeAlarmIndex === null || !activeAlarmData) {
    return;
  }

  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);

  const newTime =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");

  if (activeAlarmIsSchedule) {
    const snoozeAlarmData = {
      time: newTime,
      purpose: activeAlarmData.purpose + " (Snooze)",
      ringtone: activeAlarmData.ringtone || "bell"
    };

    stopAlarm();

    if (scheduleSnoozeTimer) clearTimeout(scheduleSnoozeTimer);
    const delay = Math.max(1000, now.getTime() - Date.now());
    scheduleSnoozeTimer = setTimeout(function() {
      scheduleSnoozeTimer = null;
      showAlarmPopup(snoozeAlarmData, -1);
    }, delay);

    showToast("Alarm snoozed", "Next ring: " + newTime);
    return;
  }

  const alarm = alarms[activeAlarmIndex];

  if (!alarm) {
    stopAlarm();
    return;
  }

  alarm.time = newTime;
  alarm.lastTriggeredKey = null;

  saveAlarms();
  stopAlarm();
  renderAlarms();

  showToast("Alarm snoozed", "Next ring: " + newTime);

}


// =========================================================
// TRIGGER KEY
// =========================================================

function getTriggerKey(
  alarm
) {

  const now =
    new Date();


  const date =

    now.getFullYear() +
    "-" +
    String(
      now.getMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      now.getDate()
    ).padStart(2, "0");


  return (
    date +
    "_" +
    alarm.time
  );

}


// =========================================================
// CHECK ALARMS
// =========================================================
//
// IMPORTANT:
// No renderAlarms() here.
// This prevents the blinking issue.
// =========================================================

function checkAlarms() {

  const now =
    new Date();


  const currentTime =

    String(
      now.getHours()
    ).padStart(2, "0")

    +

    ":"

    +

    String(
      now.getMinutes()
    ).padStart(2, "0");


  let changed =
    false;


  checkSchedules(now, currentTime);


  alarms.forEach(
    function(alarm, index) {

      if (
        alarm.time !==
        currentTime
      ) {

        return;

      }


      const key =
        getTriggerKey(
          alarm
        );


      if (
        alarm.lastTriggeredKey ===
        key
      ) {

        return;

      }


      /*
        Mark immediately before
        starting the alarm.
      */

      alarm.lastTriggeredKey =
        key;


      changed =
        true;


      showAlarmPopup(
        alarm,
        index
      );

    }
  );


  if (changed) {

    saveAlarms();

  }

}


// =========================================================
// PREVIEW
// =========================================================

async function previewRingtone() {

  await unlockAudio();


  const ringtone =
    getSelectedRingtone();


  if (
    ringtone === "custom"
  ) {

    if (
      !customRingtoneBuffer
    ) {

      showToast(
        "No custom ringtone",
        "Choose a ringtone from storage first."
      );

      return;

    }


    /*
      Preview uses the same custom
      audio system as the alarm.
    */

    await playCustomRingtone();


    setTimeout(
      function() {

        stopCustomRingtone();

      },
      5000
    );


    return;

  }


  playRingtone(
    ringtone
  );

}


// =========================================================
// APP TOAST
// =========================================================

function showToast(
  title,
  message
) {

  let toast =
    $("appToast");


  if (!toast) {

    toast =
      document.createElement(
        "div"
      );


    toast.id =
      "appToast";


    toast.innerHTML = `

      <div
        class="app-toast-icon"
        style="
          width:38px;
          height:38px;
          min-width:38px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          background:
            linear-gradient(
              135deg,
              #22c55e,
              #16a34a
            );
          color:white;
          font-size:22px;
          font-weight:800;
        "
      >
        ✓
      </div>

      <div style="min-width:0;">

        <div
          class="app-toast-title"
          style="
            color:white;
            font-size:15px;
            font-weight:700;
          "
        ></div>

        <div
          class="app-toast-message"
          style="
            color:#aeb8cc;
            font-size:13px;
            margin-top:2px;
          "
        ></div>

      </div>

    `;


    Object.assign(
      toast.style,
      {

        position:
          "fixed",

        left:
          "50%",

        bottom:
          "95px",

        width:
          "calc(100% - 40px)",

        maxWidth:
          "420px",

        display:
          "flex",

        alignItems:
          "center",

        gap:
          "12px",

        padding:
          "14px 17px",

        borderRadius:
          "18px",

        background:
          "rgba(24,31,50,0.96)",

        border:
          "1px solid rgba(255,255,255,0.12)",

        boxShadow:
          "0 15px 45px rgba(0,0,0,0.4)",

        backdropFilter:
          "blur(18px)",

        WebkitBackdropFilter:
          "blur(18px)",

        zIndex:
          "999999",

        opacity:
          "0",

        visibility:
          "hidden",

        transform:
          "translate(-50%,20px)",

        transition:
          "all 0.25s ease"

      }
    );


    document.body.appendChild(
      toast
    );

  }


  const titleElement =
    toast.querySelector(
      ".app-toast-title"
    );


  const messageElement =
    toast.querySelector(
      ".app-toast-message"
    );


  if (titleElement) {

    titleElement.textContent =
      title;

  }


  if (messageElement) {

    messageElement.textContent =
      message;

  }


  if (
    toast._timer
  ) {

    clearTimeout(
      toast._timer
    );

  }


  requestAnimationFrame(
    function() {

      toast.style.opacity =
        "1";

      toast.style.visibility =
        "visible";

      toast.style.transform =
        "translate(-50%,0)";

    }
  );


  toast._timer =
    setTimeout(
      function() {

        toast.style.opacity =
          "0";

        toast.style.visibility =
          "hidden";

        toast.style.transform =
          "translate(-50%,20px)";

      },
      3000
    );

}


// =========================================================
// NAVIGATION
// =========================================================

function showSection(
  section,
  element
) {

  document.querySelectorAll(".nav-item").forEach(function(item) {
    item.classList.remove("active");
  });

  if (element) element.classList.add("active");

  const sections = {
    alarms: $("alarmsSection"),
    schedule: $("scheduleSection"),
    settings: $("settingsSection")
  };

  Object.keys(sections).forEach(function(key) {
    const el = sections[key];
    if (el) {
      el.classList.toggle("active-section", key === section);
      el.classList.toggle("hidden-section", key !== section);
    }
  });

  const fab = document.querySelector(".fab-btn");
  if (fab) fab.style.display = section === "alarms" ? "block" : "none";

  if (section === "schedule") {
    renderSchedules();
    updateScheduleRepeatUI();
  }
}


// =========================================================
// FLOATING BUTTON
// =========================================================

function openAddAlarm() {

  const input =
    $("alarmTime");


  if (!input) {

    return;

  }


  input.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });


  setTimeout(
    function() {

      input.focus();

    },
    400
  );

}


// =========================================================
// INITIALIZE
// =========================================================

async function initializeApp() {

  createRingtoneUI();

  setupRingtoneSelect();

  renderAlarms();
  renderSchedules();
  updateScheduleRepeatUI();

  updateCountdowns();


  /*
    Load stored ringtone before
    alarms are used.
  */

  await loadCustomRingtone();


  if (
    customRingtoneFile
  ) {

    ensureCustomOption();


    const select =
      $("ringtoneSelect");


    if (
      select &&
      localStorage.getItem(
        "selectedRingtone"
      ) === "custom"
    ) {

      select.value =
        "custom";

    }

  }


  checkAlarms();

}


initializeApp();


// =========================================================
// TIMERS
// =========================================================
//
// Alarm checker runs every second,
// BUT NEVER rebuilds the alarm list.
//
// Countdown updates every second,
// BUT ONLY changes countdown text.
// =========================================================

setInterval(
  checkAlarms,
  1000
);


setInterval(
  updateCountdowns,
  1000
);



// =========================================================
// PWA SERVICE WORKER
// =========================================================

if ("serviceWorker" in navigator) {

  window.addEventListener(
    "load",
    function () {

      navigator.serviceWorker
        .register("./sw.js")
        .then(function (registration) {

          console.log(
            "PWA Service Worker registered:",
            registration.scope
          );

        })
        .catch(function (error) {

          console.error(
            "PWA Service Worker registration failed:",
            error
          );

        });

    }
  );

}

// ======================================================
// SMART ALARM - PWA INSTALL
// ======================================================

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {

    // Stop Chrome from showing its automatic prompt immediately
    event.preventDefault();

    deferredInstallPrompt = event;

    console.log("Smart Alarm is ready to install.");

    showInstallButton();
});


function showInstallButton() {

    let button = document.getElementById("installAppBtn");

    if (!button) {

        button = document.createElement("button");

        button.id = "installAppBtn";

        button.innerHTML = "📲 Install Smart Alarm";

        button.style.cssText = `
            position: fixed;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;

            border: none;
            border-radius: 14px;

            padding: 14px 22px;

            font-size: 16px;
            font-weight: 600;

            color: white;

            background: linear-gradient(
                135deg,
                #2563eb,
                #7c3aed
            );

            box-shadow:
                0 8px 25px rgba(0,0,0,0.35);

            cursor: pointer;
        `;

        document.body.appendChild(button);

        button.addEventListener("click", installSmartAlarm);
    }

    button.style.display = "block";
}


async function installSmartAlarm() {

    if (!deferredInstallPrompt) {

        alert(
            "Smart Alarm is not ready for installation yet. " +
            "Please open this page in Chrome and try again."
        );

        return;
    }

    deferredInstallPrompt.prompt();

    const result =
        await deferredInstallPrompt.userChoice;

    console.log(
        "Install result:",
        result.outcome
    );

    deferredInstallPrompt = null;

    const button =
        document.getElementById("installAppBtn");

    if (button) {
        button.remove();
    }
}


window.addEventListener("appinstalled", () => {

    console.log("Smart Alarm installed successfully.");

    deferredInstallPrompt = null;

    const button =
        document.getElementById("installAppBtn");

    if (button) {
        button.remove();
    }

});