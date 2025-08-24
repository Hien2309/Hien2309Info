// DOM utility
const $ = s => document.querySelector(s);

// Popup
function showPopup() {
  $("#overlay").classList.add("show");
  $("#popup").classList.add("show");
}
function closePopup() {
  $("#overlay").classList.remove("show");
  $("#popup").classList.remove("show");
}
window.closePopup = closePopup;

// Visitor count
let count = +localStorage.getItem("visitorCount") || 0;
count++;
localStorage.setItem("visitorCount", count);
$("#visitorCount").textContent = `Bạn đã vào website ${count} lần.`;

// Cursor blob
const blob = $(".cursor-blob");
window.addEventListener("pointermove", e => {
  blob.style.left = e.clientX + "px";
  blob.style.top = e.clientY + "px";
});

// Typewriter
const lines = [
  "Sub to @Hien2309 on YTB",
  "Join dsc.gg/hienbot",
  "Hello, I'm Hien2309!"
];
let i = 0, ci = 0, typing = true;
function tick() {
  let text = lines[i];
  if (typing) {
    ci++;
    $("#typewriter").textContent = text.slice(0, ci);
    if (ci >= text.length) {
      typing = false;
      setTimeout(tick, 1000);
      return;
    }
  } else {
    ci--;
    $("#typewriter").textContent = text.slice(0, ci);
    if (ci <= 0) {
      typing = true;
      i = (i + 1) % lines.length;
    }
  }
  setTimeout(tick, typing ? 60 : 30);
}
tick();

// Time
setInterval(() => {
  $("#chipTime").textContent = "⏰ " + new Date().toLocaleTimeString();
}, 1000);

// IP
fetch("https://api.ipify.org?format=json")
  .then(r => r.json())
  .then(d => {
    $("#chipIP").textContent = "🌐 " + d.ip;
  });

// Location
if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    pos => $("#chipLocation").textContent = `📍 ${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`,
    () => $("#chipLocation").textContent = "📍 blocked"
  );
}

// Quotes
const quotes = [
  "Sub to Hien2309 on YTB!",
  "Join dsc.gg/hienbot"
];
$("#dynamicQuote").textContent = quotes[Math.floor(Math.random() * quotes.length)];

// Settings
let settings = {
  dark: false,
  particles: true,
  noise: true,
  tilt: true,
  ripple: true,
  cursorBlob: true,
  themeCustom: "#2e98dfff" // mặc định màu đỏ
};
const saved = localStorage.getItem("settings");
if (saved) settings = { ...settings, ...JSON.parse(saved) };

function applySettings() {
  document.documentElement.classList.toggle("dark", settings.dark);
  document.querySelector(".bg-1").style.display = settings.particles ? "" : "none";
  document.querySelector(".bg-2").style.display = settings.particles ? "" : "none";
  document.body.classList.toggle("with-noise", settings.noise);
  blob.style.display = settings.cursorBlob ? "" : "none";

  // Áp dụng màu đã chọn
  document.documentElement.style.setProperty("--accent", settings.themeCustom);

  // Cập nhật icon dark/light nếu có
  const themeIcon = $("#themeToggle i");
  if (themeIcon) {
    themeIcon.classList.toggle("fa-sun", settings.dark);
    themeIcon.classList.toggle("fa-moon", !settings.dark);
  }

  localStorage.setItem("settings", JSON.stringify(settings));
}
applySettings();

// Bind UI
$("#setDark").checked = settings.dark;
$("#setParticles").checked = settings.particles;
$("#setNoise").checked = settings.noise;
$("#setTilt").checked = settings.tilt;
$("#setRipple").checked = settings.ripple;
$("#setCursorBlob").checked = settings.cursorBlob;

// Color picker
if ($("#themeColorPicker")) {
  $("#themeColorPicker").value = settings.themeCustom;
  $("#themeColorPicker").addEventListener("input", e => {
    settings.themeCustom = e.target.value;
    applySettings();
  });
}

$("#setDark").addEventListener("change", e => { settings.dark = e.target.checked; applySettings(); });
$("#setParticles").addEventListener("change", e => { settings.particles = e.target.checked; applySettings(); });
$("#setNoise").addEventListener("change", e => { settings.noise = e.target.checked; applySettings(); });
$("#setTilt").addEventListener("change", e => { settings.tilt = e.target.checked; applySettings(); });
$("#setRipple").addEventListener("change", e => { settings.ripple = e.target.checked; applySettings(); });
$("#setCursorBlob").addEventListener("change", e => { settings.cursorBlob = e.target.checked; applySettings(); });

$("#themeToggle")?.addEventListener("click", () => {
  settings.dark = !settings.dark;
  applySettings();
});

// Search functionality (basic alert for demo)
$("#searchInput")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = $("#searchInput").value.trim();
    if (query) {
      alert(`Tìm kiếm: ${query}`);
      $("#searchInput").value = "";
    }
  }
});

// VanillaTilt
if (window.VanillaTilt) {
  VanillaTilt.init(document.querySelectorAll("[data-tilt]"), { 
    max: 15, speed: 400, glare: true, "max-glare": 0.2 
  });
}

// ===== Navbar scroll effect (nếu dùng navbar dạng sticky) =====
window.addEventListener("scroll", () => {
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  }
});
