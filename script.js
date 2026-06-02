// ================================
// Prime Follower - Main Application Script
// ================================

// ── 1. Imports ────────────────────────────────────────────────────────────────

import {
  auth, db,
  onAuthStateChanged,
  doc, updateDoc
} from "./firebase.js";

import {
  getUserProfile,
  createUserProfile,
  logTransaction
} from "./firebase.js";

import {
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  onSnapshot,
  increment,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { initReferPage } from "./refer.js";

// Force persistent login — prevents auto-logout on tab close / refresh
await setPersistence(auth, browserLocalPersistence);

// ── 2. Global Config & Constants ─────────────────────────────────────────────

const AVATAR_COUNT = 10;
const SITE_URL = window.location.href;
const ORDER_LOGOS = ["icons/insta.png", "icons/instagram.png"];

// Global user state — readable by other modules (pay.js, dailycheckin.js, etc.)
window.cashTreasureUser = null;
window.pendingRewardType = null;

// ── 3. Utility Functions ─────────────────────────────────────────────────────

/**
 * Displays a dismissing toast notification.
 * @param {string} message
 * @param {"success"|"error"} type
 */
function showToast(message, type = "success") {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Make showToast globally accessible for other modules
window.showToast = showToast;

/**
 * Returns true only on a genuine mobile device
 * (UA + touch + coarse pointer + small screen).
 */
function isRealMobile() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return (
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) &&
    (navigator.maxTouchPoints > 0 || "ontouchstart" in window) &&
    window.matchMedia("(pointer: coarse)").matches &&
    window.innerWidth <= 768 &&
    window.innerHeight <= 1024
  );
}

/**
 * Detects if browser DevTools are open via size heuristic.
 */
function detectDevTools() {
  const threshold = 160;
  return (
    window.outerWidth - window.innerWidth > threshold ||
    window.outerHeight - window.innerHeight > threshold
  );
}

/**
 * Probes Google Ad servers to detect Private DNS / ad-blocking.
 * Resolves true if blocked, false if reachable.
 */
function detectPrivateDNS() {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    const timer = setTimeout(() => resolve(true), 1400);
    img.onload = () => { clearTimeout(timer); resolve(false); };
    img.onerror = () => { clearTimeout(timer); resolve(true); };
  });
}

// ── 4. Security & Device Enforcement ─────────────────────────────────────────

/** Shows/hides the desktop-blocking overlay based on device detection. */
function enforceMobileOnly() {
  const overlay = document.getElementById("desktop-overlay");
  if (!overlay) return;
  overlay.style.display = isRealMobile() ? "none" : "flex";
  document.documentElement.style.overflow = isRealMobile() ? "" : "hidden";
}

// Run on load and whenever the viewport changes
enforceMobileOnly();
window.addEventListener("resize", enforceMobileOnly);
window.addEventListener("orientationchange", enforceMobileOnly);
setInterval(enforceMobileOnly, 1500);

// Disable right-click and common DevTools shortcuts
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("keydown", e => {
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
  }
});

/** Shows a DNS warning sheet if Private DNS / ad-blocking is detected. */
async function showDNSWarningIfNeeded() {
  const isBlocked = await detectPrivateDNS();
  if (!isBlocked) return;

  const overlay = document.getElementById("dns-warning-overlay");
  if (!overlay) return;

  overlay.style.display = "flex";

  document.getElementById("dns-disable-btn")?.addEventListener("click", () => {
    overlay.style.display = "none";
    if (window.Android?.closeApp) {
      Android.closeApp();
    } else {
      showToast("Please disable Private DNS and reopen the app.", "error");
    }
  }, { once: true });
}

// ── 5. UI Helpers ─────────────────────────────────────────────────────────────

/** Sets avatar src on both the floating button and the profile modal. */
function applyAvatar(avatarFilename) {
  const path = "avatars/" + (avatarFilename || "user1.jpg");
  const floatingAvatar = document.getElementById("user-avatar");
  const profileAvatar = document.getElementById("profile-avatar-img");
  if (floatingAvatar) floatingAvatar.src = path;
  if (profileAvatar) profileAvatar.src = path;
}

/** Renders the avatar picker grid and highlights the user's current avatar. */
async function loadAvatars() {
  const grid = document.getElementById("avatar-grid");
  if (!grid) return;

  let html = "";
  for (let i = 1; i <= AVATAR_COUNT; i++) {
    html += `<div class="avatar-item" data-avatar="user${i}.jpg">
               <img src="avatars/user${i}.jpg">
             </div>`;
  }
  grid.innerHTML = html;

  // Highlight the user's currently saved avatar
  const uid = window.cashTreasureUser?.uid;
  if (!uid) return;
  const profile = await getUserProfile(uid);
  grid.querySelectorAll(".avatar-item").forEach(el => {
    el.classList.toggle("active", el.dataset.avatar === profile.avatar);
  });
}

/** Initialises the QR code modal (lazy — generates QR only once). */
function initQRModal() {
  document.getElementById("qr-site-link").value = SITE_URL;

  document.getElementById("btn-show-qr").addEventListener("click", () => {
    const modal = document.getElementById("qr-modal");
    modal.classList.add("visible");

    const container = document.getElementById("qr-code-container");
    if (!container.hasChildNodes()) {
      new QRCode(container, {
        text: SITE_URL,
        width: 200,
        height: 200,
        colorDark: "#1a1a2e",
        colorLight: "#ffffff"
      });
    }
  });

  document.getElementById("qr-modal-close").addEventListener("click", () => {
    document.getElementById("qr-modal").classList.remove("visible");
  });

  document.getElementById("btn-copy-link").addEventListener("click", () => {
    navigator.clipboard.writeText(SITE_URL).then(() => {
      const btn = document.getElementById("btn-copy-link");
      btn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
    });
  });
}

/** Animates the order-page Instagram logo between two icons. */
function initOrderLogoAnimation() {
  const logo = document.getElementById("order-logo");
  if (!logo) return;
  let index = 0;
  setInterval(() => {
    index = (index + 1) % ORDER_LOGOS.length;
    logo.style.transform = "scale(1.15)";
    logo.src = ORDER_LOGOS[index];
    setTimeout(() => { logo.style.transform = "scale(1)"; }, 200);
  }, 1300);
}

// ── 6. Navigation System ─────────────────────────────────────────────────────

const navItems = document.querySelectorAll(".nav-item[data-page]");
const pageSections = document.querySelectorAll(".page-section");

/** Switches the visible page section and updates the bottom nav highlight. */
function navigateTo(pageId) {
  pageSections.forEach(s => s.classList.remove("active"));
  navItems.forEach(n => n.classList.remove("active"));

  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add("active");

  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add("active");

  // Restart PRIME VIRAL BONUS carousel when page opens
  if (pageId === "refer") {
    window.dispatchEvent(new CustomEvent("referPageOpened"));
  }
}

navItems.forEach(item => {
  item.addEventListener("click", async () => {
    const page = item.dataset.page;
    navigateTo(page);

    // Initialise Buy Followers page on first visit
    if (page === "buy" && typeof window.initBuyPage === "function") {
      await window.initBuyPage();
    }
  });
});

// Allow other modules/pages to trigger navigation
window.navigateTo = navigateTo;

// ── 7. Firebase Auth & User Management ───────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
  const logoutBtn = document.getElementById("btn-logout");

  // ── Guest / Signed-out State ──
  if (!user) {
    document.getElementById("profile-username").textContent = "Guest";
    document.getElementById("profile-email").textContent = "Please sign in to start earning credits";
    document.getElementById("profile-credits").textContent = "0";
    document.getElementById("profile-total-earned").textContent = "0";
    document.getElementById("profile-joined").textContent = "-";

    logoutBtn.innerHTML = '<span class="signin-text">🚀 SIGN IN</span>';
    logoutBtn.classList.add("signin-btn");
    logoutBtn.onclick = () => { window.location.href = "FIXSIGNIN/index.html"; };
    return;
  }

  // ── Signed-in State ──
  await createUserProfile(user.uid, { email: user.email, username: user.displayName || "" });
  const profile = await getUserProfile(user.uid);

  const credits = profile?.credits || 0;
  const username = profile?.username || user.displayName || "User";
  const email = user.email || "";

  // Populate UI
  applyAvatar(profile?.avatar);
  document.getElementById("credit-count").textContent = credits;
  document.getElementById("profile-username").textContent = username;
  document.getElementById("profile-email").textContent = email;
  document.getElementById("profile-credits").textContent = credits;
  document.getElementById("profile-total-earned").textContent = profile?.total_earned || 0;

  if (profile?.created_at) {
    document.getElementById("profile-joined").textContent =
      profile.created_at.toDate().toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric"
      });
  }

  // Populate global user state
  window.cashTreasureUser = {
    uid: user.uid,
    email,
    username,
    credits,
    avatar: profile?.avatar || "user1.jpg",
    total_followers_ordered: profile?.total_followers_ordered || 0
  };

  // Live Firestore sync — updates credits and ad count in real time
  onSnapshot(doc(db, "users", user.uid), (snap) => {
    const data = snap.data();
    if (!data) return;

    const liveCredits = data.credits || 0;
    document.getElementById("credit-count").textContent = liveCredits;
    document.getElementById("profile-credits")?.textContent !== undefined &&
      (document.getElementById("profile-credits").textContent = liveCredits);

    const adCountEl = document.getElementById("ad-count");
    if (adCountEl) adCountEl.textContent = `${data.daily_ads_watched || 0} / 20 ads today`;

    // Keep global state in sync
    window.cashTreasureUser.credits = liveCredits;
    window.cashTreasureUser.total_followers_ordered = data.total_followers_ordered || 0;
  });

// Notify other modules that user data is ready
window.dispatchEvent(
  new CustomEvent("userReady", {
    detail: window.cashTreasureUser
  })
);

// Init Refer Page
initReferPage(window.cashTreasureUser);
});

// ── 8. Event Listeners ───────────────────────────────────────────────────────

// ─ Avatar Selection ─
let selectedAvatar = null;

document.addEventListener("click", e => {
  const item = e.target.closest(".avatar-item");
  if (!item) return;
  selectedAvatar = item.dataset.avatar;
  document.querySelectorAll(".avatar-item").forEach(el => el.classList.remove("active"));
  item.classList.add("active");
});

document.getElementById("avatar-close-btn")?.addEventListener("click", () => {
  navigateTo("home");
});

document.getElementById("confirm-avatar-btn").addEventListener("click", async () => {
  if (!window.cashTreasureUser || !selectedAvatar) {
    showToast("Please select an avatar first", "error");
    return;
  }

  try {
    await updateDoc(doc(db, "users", window.cashTreasureUser.uid), { avatar: selectedAvatar });
    applyAvatar(selectedAvatar);
    window.cashTreasureUser.avatar = selectedAvatar;
    showToast("Avatar updated successfully", "success");
    navigateTo("home");
  } catch (err) {
    console.error(err);
    showToast("Error updating avatar", "error");
  }
});

document.getElementById("profile-avatar-click").addEventListener("click", () => {
  document.getElementById("profile-modal").classList.remove("visible");
  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.getElementById("page-avatar").classList.add("active");
  loadAvatars();
});

// ─ Profile Modal ─
document.getElementById("floating-profile").addEventListener("click", () => {
  document.getElementById("profile-modal").classList.add("visible");
});

document.getElementById("profile-close").addEventListener("click", () => {
  document.getElementById("profile-modal").classList.remove("visible");
});

document.getElementById("profile-modal").addEventListener("click", e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("visible");
});

// ─ Order Detail Modal ─
window.closeOrderDetails = function () {
  document.getElementById("order-detail-modal")?.classList.remove("visible");
};

// ─ Open Buy Page from Order Card ─
document.getElementById("btn-open-buy")?.addEventListener("click", async () => {
  navigateTo("buy");
  if (typeof window.initBuyPage === "function") await window.initBuyPage();
});

// ─ Rewarded Ad Callback (called by Android WebView after ad completes) ─
window.onAdRewarded = async function () {
  const user = window.cashTreasureUser;
  if (!user) return;

  if (window.pendingRewardType === "watch_ad") {
    const userRef = doc(db, "users", user.uid);

    await updateDoc(userRef, {
      credits: increment(1),
      daily_ads_watched: increment(1),
      daily_credits_earned: increment(1),
      total_earned: increment(1)
    });

    await logTransaction(user.uid, "Watch Ad Reward", 1);

    const freshSnap = await getDoc(userRef);
    const profile = freshSnap.data();
    user.credits = profile.credits || 0;

    document.getElementById("credit-count")?.textContent !== undefined &&
      (document.getElementById("credit-count").textContent = user.credits);

    const adCountEl = document.getElementById("ad-count");
    if (adCountEl) adCountEl.textContent = `${profile.daily_ads_watched || 0} / 20 ads today`;

    showToast("+1 Credit Added 🎉");

    window.renderCheckin?.(profile);
  }

  if (window.pendingRewardType === "daily_checkin") {
    await window.onDailyCheckinRewarded?.();
  }

  window.pendingRewardType = null;
};

// ─ Watch Ad Button → Android Ad ─
document.getElementById("btn-watch-ad")?.addEventListener("click", () => {
  if (window.Android) {
    window.pendingRewardType = "watch_ad";
    Android.showAd();
  }
});

// ── 9. Initialization ─────────────────────────────────────────────────────────

// Page loader fade-out
window.addEventListener("load", () => {
  const loader = document.getElementById("load2s-overlay");
  if (loader) {
    setTimeout(() => {
      loader.style.transition = "opacity 0.5s ease";
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 500);
    }, 2200);
  }

  // DNS check runs after loader clears
  setTimeout(showDNSWarningIfNeeded, 2600);
});

// Apply dark mode preference
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

// Restore home page after a reload-redirect
if (localStorage.getItem("goHomeAfterReload") === "true") {
  localStorage.removeItem("goHomeAfterReload");
  setTimeout(() => navigateTo("home"), 100);
}

// One-time module setup
initQRModal();
initOrderLogoAnimation();
loadAvatars();



// ================================
// PRIME AI DRAGGABLE FLOATING BUTTON (Bottom Right Default)
// ================================

const primeFloatBtn = document.getElementById('prime-ai-float-btn');

if (primeFloatBtn) {
  let isDragging = false;
  let startY = 0;
  let startX = 0;
  let currentBottom = 90;
  let currentRight = 20;
  let longPressTimer = null;

  // Load saved position
  const savedBottom = localStorage.getItem('primeBtnBottom');
  const savedRight = localStorage.getItem('primeBtnRight');

  if (savedBottom) primeFloatBtn.style.bottom = savedBottom;
  if (savedRight) primeFloatBtn.style.right = savedRight;

  // Long press to start dragging
  primeFloatBtn.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    currentBottom = parseFloat(primeFloatBtn.style.bottom) || 90;
    currentRight = parseFloat(primeFloatBtn.style.right) || 20;

    longPressTimer = setTimeout(() => {
      isDragging = true;
      primeFloatBtn.style.transition = 'none';
      primeFloatBtn.style.opacity = '0.85';
    }, 280);
  });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;

    const deltaY = startY - touchY;
    const deltaX = startX - touchX;

    let newBottom = currentBottom + deltaY;
    let newRight = currentRight + deltaX;

    // Keep button visible and prevent overlapping bottom nav
    newBottom = Math.max(20, Math.min(newBottom, window.innerHeight - 140));
    newRight = Math.max(10, Math.min(newRight, window.innerWidth - 80));

    primeFloatBtn.style.bottom = newBottom + 'px';
    primeFloatBtn.style.right = newRight + 'px';
  });

  document.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);

    if (isDragging) {
      isDragging = false;
      primeFloatBtn.style.transition = 'transform 0.2s, bottom 0.3s, right 0.3s';
      primeFloatBtn.style.opacity = '1';

      // Save position
      localStorage.setItem('primeBtnBottom', primeFloatBtn.style.bottom);
      localStorage.setItem('primeBtnRight', primeFloatBtn.style.right);
    }
  });

  // Click to open PRIME folder
  primeFloatBtn.addEventListener('click', (e) => {
    if (isDragging) {
      isDragging = false;
      return;
    }
    window.location.href = 'PRIME/index.html';
  });
}


console.log("✅ Prime Follower — Main script loaded.");