// ================================
// Prime Follower - Home Page Module
// ================================

// ── 1. Imports ────────────────────────────────────────────────────────────────

import { getUserProfile, getDailyAdsCount, logTransaction } from "./firebase.js";
import { renderCheckin } from "./dailycheckin.js";

// ── 2. Utility Functions ──────────────────────────────────────────────────────

/**
 * Bumps the credits display with a brief CSS animation.
 * @param {number} credits
 */
function updateCreditsDisplay(credits) {
  const el = document.getElementById("credit-count");
  const container = document.getElementById("floating-credits");
  if (!el || !container) return;

  el.textContent = credits;
  container.classList.add("credit-bump");
  setTimeout(() => container.classList.remove("credit-bump"), 400);
}

/**
 * Returns today's ad count from a profile object without an extra Firestore read.
 * @param {Object} profile
 * @returns {number}
 */
function getTodayAds(profile) {
  const today = new Date().toISOString().split("T")[0];
  const adsDate = profile.daily_ads_date
    ? profile.daily_ads_date.toDate().toISOString().split("T")[0]
    : null;
  return adsDate === today ? (profile.daily_ads_watched || 0) : 0;
}

// ── 3. Initialization ─────────────────────────────────────────────────────────

/**
 * Fired once by script.js after the Firebase user and profile are ready.
 * Calls getDailyAdsCount first to trigger any midnight-reset logic in Firestore,
 * then fetches a fresh profile and renders the home page UI.
 */
window.addEventListener("userReady", async (e) => {
  const { uid } = e.detail;

  // Trigger server-side daily reset if the calendar day has rolled over
  const resetCount = await getDailyAdsCount(uid);

  const profile = await getUserProfile(uid);
  if (!profile) return;

  // Override stale ad count with the post-reset value
  profile.daily_ads_watched = resetCount;

  updateAdCount(profile);
  renderCheckin(profile);
});

// ── 4. Ad Watching Logic ──────────────────────────────────────────────────────

const watchBtn = document.getElementById("btn-watch-ad");

if (watchBtn) {
  watchBtn.addEventListener("click", async () => {
    const user = window.cashTreasureUser;
    if (!user) return window.showToast?.("Login first", "error");

    // Debounce — prevents double-tap triggering two ads
    if (watchBtn.dataset.locked === "true") return;
    watchBtn.disabled = true;
    watchBtn.dataset.locked = "true";
    watchBtn.textContent = "⏳ Watching...";

    try {
      // Refresh counts before checking limits (handles midnight rollovers)
      await getDailyAdsCount(user.uid);
      const profile = await getUserProfile(user.uid);

      if ((profile.daily_credits_earned || 0) >= 25) {
        window.showToast?.("You can't earn more than 25 credits in a day", "error");
        return;
      }

      if ((profile.daily_ads_watched || 0) >= 20) {
        window.showToast?.("Daily ad limit reached (20)", "error");
        return;
      }

      // All checks passed — request a rewarded ad from Android
      window.pendingRewardType = "watch_ad";
      if (window.Android?.showAd) {
        Android.showAd();
      } else {
        window.showToast?.("Ads not available", "error");
      }

    } catch (err) {
      console.error("[Home] Watch ad error:", err);
      window.showToast?.("Something went wrong", "error");
    } finally {
      // Re-enable button after a short cooldown regardless of outcome
      setTimeout(() => {
        watchBtn.disabled = false;
        watchBtn.dataset.locked = "false";
        watchBtn.textContent = "▶ WATCH AD";
      }, 5000);
    }
  });
}

// ── 5. UI Update Functions ────────────────────────────────────────────────────

/**
 * Updates the ad counter text and disables the Watch Ad button if the daily
 * limit of 20 has been reached.
 * @param {Object} profile
 */
function updateAdCount(profile) {
  const count = getTodayAds(profile);
  const el = document.getElementById("ad-count");
  const btn = document.getElementById("btn-watch-ad");
  if (!el || !btn) return;

  el.textContent = `${count} / 20 ads today`;

  if (count >= 20) {
    btn.disabled = true;
    btn.textContent = "🚫 Limit Reached";
  } else {
    btn.disabled = false;
    btn.textContent = "▶ WATCH AD";
  }
}

// Expose for external callers (e.g. script.js onAdRewarded)
window.renderCheckin = renderCheckin;

// ── 6. Event Listeners ────────────────────────────────────────────────────────

// Refer card click is handled by refer.js — wireReferCardClick()
// Coming soon close button kept for safety
document.getElementById("coming-soon-close")?.addEventListener("click", () => {
  document.getElementById("coming-soon-overlay")?.classList.remove("visible");
});


// === SPIN COMING SOON POPUP ===
document.getElementById("btn-spin-now")?.addEventListener("click", showSpinComingSoon);

function showSpinComingSoon() {
  // Remove any existing popup first
  document.querySelectorAll('.spin-coming-soon').forEach(el => el.remove());

  const overlay = document.createElement("div");
  overlay.className = "spin-coming-soon";
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; backdrop-filter: blur(10px);
  `;

  overlay.innerHTML = `
    <div style="background: white; border-radius: 24px; padding: 32px 28px; text-align: center; 
                max-width: 340px; box-shadow: 0 15px 40px rgba(0,0,0,0.25);">
      
      <div style="font-size: 58px; margin-bottom: 16px;">🚀</div>
      
      <h3 style="font-size: 23px; font-weight: 800; color: #1a1a2e; margin: 0 0 12px 0;">
        Coming Soon
      </h3>
      
      <p style="color: #444; line-height: 1.55; font-size: 15.5px; margin-bottom: 20px;">
        The spin and earn feature is under development.<br>
        We were adding free followers on it so stay tuned!<br>
        <strong>[Expected in 2027]</strong>
      </p>

      <button id="spin-got-it-btn" 
              style="background: linear-gradient(135deg, #ff6b81, #ff4466); color: white; 
                     border: none; padding: 15px 50px; border-radius: 50px; font-weight: 700; 
                     font-size: 16.5px; cursor: pointer; width: 100%;">
        Got It
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close on "Got It" click
  document.getElementById("spin-got-it-btn").addEventListener("click", () => {
    overlay.remove();
  });

  // Also close if user taps outside the card
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

console.log("✅ Home module loaded.");