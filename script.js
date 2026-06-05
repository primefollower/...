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
  getDoc,
  query,
  collection,
  where,
  getDocs
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
  
  const isMobile = isRealMobile();
  overlay.style.display = isMobile ? "none" : "flex";
  document.documentElement.style.overflow = isMobile ? "" : "hidden";
  
  // On desktop, immediately hide the loader so desktop overlay is visible
  if (!isMobile) {
    const loader = document.getElementById("load2s-overlay");
    if (loader) {
      loader.style.display = "none";
      loader.classList.add("hide");
    }
  }
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

  // Scroll to top when any page opens
  window.scrollTo(0, 0);
  document.getElementById("app-container")?.scrollTo(0, 0);
  if (target) target.scrollTo(0, 0);

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

    // Referral code generation is now handled by firebase.js createUserProfile migration
    // Re-fetch profile to get any migrated fields
    if (profile && !profile.referralCode) {
      const freshProfile = await getUserProfile(user.uid);
      if (freshProfile) {
        Object.assign(profile, freshProfile);
      }
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

    // Show "Enter Refer Code" overlay ONLY for brand new signups (account created within last 60 seconds)
    try {
      if (profile && !profile.referCodeEntered && !profile.referredBy) {
        const createdAt = profile.created_at?.toDate?.();
        const isNewUser = createdAt && (Date.now() - createdAt.getTime()) < 60000;
        if (isNewUser) {
          showReferCodeEntryOverlay(user.uid);
        } else {
          // Old user — silently mark as entered so they never see it
          await updateDoc(doc(db, "users", user.uid), { referCodeEntered: true });
        }
      }
    } catch (referErr) {
      console.warn("[ReferCode] Non-critical error:", referErr);
    }
});

// ── Refer Code Entry Overlay ─────────────────────────────────────────────────

function showReferCodeEntryOverlay(uid) {
  document.querySelectorAll('.refer-code-entry-overlay').forEach(el => el.remove());

  const overlay = document.createElement("div");
  overlay.className = "refer-code-entry-overlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex;
    align-items:center; justify-content:center; z-index:99999;
    backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  `;

  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:24px;
                padding:32px 24px; text-align:center; max-width:360px; width:92%;
                box-shadow:0 20px 60px rgba(0,0,0,0.5); border:2px solid rgba(79,172,254,0.3);">
      <div style="font-size:45px; margin-bottom:10px;">🎁</div>
      <h2 style="color:#fff; font-size:22px; font-weight:900; margin-bottom:6px;">
        Refer & Earn
      </h2>
      <p style="color:rgba(255,255,255,0.7); font-size:14px; margin-bottom:20px;">
        Do you have a referral code?
      </p>
      <div style="position:relative; margin-bottom:18px;">
        <input id="refer-code-input" type="text" maxlength="11"
               style="width:100%; padding:16px 18px; border-radius:14px;
                      border:2px solid rgba(79,172,254,0.3); background:rgba(255,255,255,0.08);
                      color:#fff; font-size:16px; font-weight:700; text-align:center;
                      letter-spacing:2px; outline:none; text-transform:uppercase;"
               placeholder="">
        <span id="refer-code-placeholder" style="position:absolute; top:50%; left:50%;
              transform:translate(-50%,-50%); color:rgba(255,255,255,0.3); font-size:14px;
              font-weight:600; pointer-events:none;">Optional</span>
      </div>
      <button id="refer-code-confirm-btn" style="
        width:100%; padding:16px; border:none; border-radius:50px; font-size:17px;
        font-weight:800; cursor:pointer; color:#fff;
        background:linear-gradient(135deg,#ff6b81,#ff4466);
        box-shadow:0 8px 25px rgba(255,68,102,0.4); margin-bottom:12px;
      ">Confirm</button>
      <button id="refer-code-skip-btn" style="
        width:100%; padding:14px; border:none; border-radius:50px; font-size:14px;
        font-weight:600; cursor:pointer; color:#94a3b8; background:rgba(255,255,255,0.08);
      ">I don't have a refer code</button>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = document.getElementById("refer-code-input");
  const placeholder = document.getElementById("refer-code-placeholder");
  const confirmBtn = document.getElementById("refer-code-confirm-btn");
  const skipBtn = document.getElementById("refer-code-skip-btn");

  // Remove placeholder on focus
  input.addEventListener("focus", () => { placeholder.style.display = "none"; });
  input.addEventListener("blur", () => {
    if (!input.value.trim()) placeholder.style.display = "block";
  });

  // Skip button — close overlay, mark as entered
  skipBtn.addEventListener("click", async () => {
    try {
      await updateDoc(doc(db, "users", uid), { referCodeEntered: true });
    } catch (e) { console.warn(e); }
    overlay.remove();
  });

  // Confirm button — verify code
  confirmBtn.addEventListener("click", async () => {
    const code = input.value.trim().toUpperCase();

    if (!code) {
      showToast("Please enter a referral code", "error");
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Verifying...";
    confirmBtn.style.opacity = "0.6";

    try {
      // Search for user with this referral code
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("referralCode", "==", code));
      const snap = await getDocs(q);

      if (snap.empty) {
        showToast("Invalid code", "error");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm";
        confirmBtn.style.opacity = "1";
        return;
      }

      const inviterDoc = snap.docs[0];
      const inviterUid = inviterDoc.id;

      // Can't refer yourself
      if (inviterUid === uid) {
        showToast("You can't use your own code", "error");
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm";
        confirmBtn.style.opacity = "1";
        return;
      }

      // Save referral
      await updateDoc(doc(db, "users", uid), {
        referredBy: inviterUid,
        referCodeEntered: true
      });

      // Show success after 3 seconds
      confirmBtn.textContent = "Verifying...";
      setTimeout(() => {
        showToast("Successful", "success");
        overlay.remove();
      }, 3000);

    } catch (err) {
      console.error("[ReferCode] Error:", err);
      showToast("Something went wrong. Try again.", "error");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirm";
      confirmBtn.style.opacity = "1";
    }
  });
}



// Listen for completed payments even if user closed app
async function checkPendingPayments(uid) {
  try {
    const q = query(
      collection(db, "payment_events"),
      where("userId", "==", uid),
      where("processed", "==", false)
    );
    const snap = await getDocs(q);

    for (const payDoc of snap.docs) {
      const data = payDoc.data();
      // Mark as processed first to prevent double-firing
      await updateDoc(payDoc.ref, { processed: true });
      // Delegate to pay.js handler via polling trigger
      if (window.triggerPendingPaymentSuccess) {
        await window.triggerPendingPaymentSuccess(data.orderId, data.amount, data.followers || 0);
      }
    }
  } catch (err) {
    console.error("[checkPendingPayments] Error:", err);
  }
}

// Call it after userReady
window.addEventListener("userReady", (e) => {
  const uid = e.detail?.uid || e.detail;
  if (uid) checkPendingPayments(uid);
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

// Force Loader Hide - Multiple strategies to prevent stuck black screen
function hideLoader() {
  const loader = document.getElementById("load2s-overlay");
  if (!loader || loader.dataset.hidden === "true") return;
  loader.dataset.hidden = "true";
  
  loader.style.transition = "opacity 0.5s ease";
  loader.style.opacity = "0";
  
  setTimeout(() => {
    loader.style.display = "none";
    loader.classList.add("hide");
  }, 500);
}

// Strategy 1: On window load
window.addEventListener("load", () => {
  setTimeout(hideLoader, 2500);
  setTimeout(() => {
    const loader = document.getElementById("load2s-overlay");
    if (loader && loader.style.display !== "none") {
      loader.style.display = "none";
      loader.classList.add("hide");
    }
  }, 3500);
  showDNSWarningIfNeeded();
});

// Strategy 2: On DOMContentLoaded (fires earlier than load)
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(hideLoader, 3000);
});

// Strategy 3: Absolute emergency fallback — runs no matter what
setTimeout(hideLoader, 4000);
setTimeout(() => {
  const loader = document.getElementById("load2s-overlay");
  if (loader) {
    loader.style.display = "none";
    loader.classList.add("hide");
  }
}, 5000);

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