// ================================
// Prime Follower - Daily Check-in System
// ================================

// ── 1. Imports ────────────────────────────────────────────────────────────────

import { getUserProfile, claimDailyCheckin } from "./firebase.js";
import { onCheckinComplete } from "./refer.js";

// ── 2. Constants & Reward Mapping ─────────────────────────────────────────────

/** Base rewards per day (Day 7 is weighted-random in firebase.js; shown as +? here). */
const DAY_REWARDS = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 0, 6: 1, 7: 5 };

/** Ads required to unlock gated days. */
const ADS_REQUIRED = { 4: 5, 7: 10 };

// Module-level claim guard — prevents double-submit
let isClaiming = false;

// ── 3. Helper Functions ───────────────────────────────────────────────────────

/**
 * Returns the number of ads the user has watched today,
 * based on the Firestore timestamp in their profile.
 * Returns 0 if `daily_ads_date` is not today.
 */
function getTodayAds(profile) {
  const today = new Date().toISOString().split("T")[0];
  const adsDate = profile.daily_ads_date
    ? profile.daily_ads_date.toDate().toISOString().split("T")[0]
    : null;
  return adsDate === today ? (profile.daily_ads_watched || 0) : 0;
}

/**
 * Returns true if the user has already claimed their check-in today.
 */
function isClaimedToday(profile) {
  if (!profile?.lastCheckinDate?.toDate) return false;
  try {
    const last = profile.lastCheckinDate.toDate().toISOString().split("T")[0];
    return last === new Date().toISOString().split("T")[0];
  } catch {
    return false;
  }
}

/**
 * Returns the next day the user needs to claim (wraps at 7).
 */
function getNextDay(profile) {
  const next = (profile.checkinDay || 0) + 1;
  return next > 7 ? 1 : next;
}

/**
 * Returns true if a gated day is unlocked given today's ad count.
 */
function isDayUnlocked(day, adsWatched) {
  const required = ADS_REQUIRED[day];
  return required === undefined || adsWatched >= required;
}

// ── 4. Render Functions ───────────────────────────────────────────────────────

/**
 * Renders the 7-day check-in strip and claim button based on the user's profile.
 * Exported so home.js and script.js can call it after an ad reward.
 */
export function renderCheckin(profile) {
  const claimed = isClaimedToday(profile);
  const currentDay = profile.checkinDay || 0;
  const nextDay = getNextDay(profile);
  const adsToday = getTodayAds(profile);

  document.querySelectorAll(".checkin-day").forEach(el => {
    const day = Number(el.dataset.day);
    const circle = el.querySelector(".day-circle");
    const rewardEl = el.querySelector(".day-reward");

    el.classList.remove("completed", "current", "locked");

    if (claimed) {
      // Freeze the strip — show what was earned, lock future days
      if (day <= currentDay) {
        el.classList.add("completed");
        circle.textContent = "✓";
        rewardEl.textContent = DAY_REWARDS[day] ? `+${DAY_REWARDS[day]}` : "+0";
      } else {
        el.classList.add("locked");
        circle.textContent = "🔒";
        rewardEl.textContent = "+?";
      }
      return;
    }

    if (day < nextDay) {
      // Already completed in a previous day
      el.classList.add("completed");
      circle.textContent = "✓";
      rewardEl.textContent = DAY_REWARDS[day] ? `+${DAY_REWARDS[day]}` : "+0";
      return;
    }

    if (day === nextDay) {
      // Today's claimable day — check ad gate
      if (!isDayUnlocked(day, adsToday)) {
        el.classList.add("locked");
        circle.textContent = "🔒";
        rewardEl.textContent = "+?";
        return;
      }
      el.classList.add("current");
      circle.textContent = day === 7 ? "🎁" : "";
      rewardEl.textContent = "+?";
      return;
    }

    // Future days
    el.classList.add("locked");
    circle.textContent = "🔒";
    rewardEl.textContent = "+?";
  });

  // Update the claim button state
  const btn = document.getElementById("btn-checkin");
  if (btn) {
    if (claimed) {
      btn.disabled = false;
      btn.innerHTML = "✅ Claimed!";
      btn.classList.add("claimed");
    } else {
      btn.disabled = false;
      btn.innerHTML = "🎁 CLAIM";
      btn.classList.remove("claimed");
    }
  }

  updateAdProgress(profile, nextDay);
}

/**
 * Shows/hides the ad progress bar.
 * Only visible on Day 4 (needs 5 ads) and Day 7 (needs 10 ads).
 * Exported so home.js can call it after an ad is watched.
 */
export function updateAdProgress(profile, nextDay) {
  const container = document.querySelector(".ad-progress-container");
  const fill = document.getElementById("ad-progress-fill");
  const text = document.getElementById("ad-progress-text");
  if (!container || !fill || !text) return;

  const required = ADS_REQUIRED[nextDay] || 0;

  if (required === 0) {
    container.style.display = "none";
    fill.style.width = "0%";
    text.textContent = "Watch ads to unlock rewards";
    return;
  }

  container.style.display = "block";
  const ads = getTodayAds(profile);
  fill.style.width = `${Math.min((ads / required) * 100, 100)}%`;
  text.textContent = `${ads}/${required} ads`;
}

// ── 5. Event Listeners & Claim Logic ─────────────────────────────────────────

/**
 * Listen for the userReady event (fired by script.js after auth).
 * Initial render only — no extra profile fetch needed as data comes via event.
 */
window.addEventListener("userReady", async (e) => {
  const profile = await getUserProfile(e.detail.uid);
  if (profile) renderCheckin(profile);
});

/**
 * Claim button click — shows a rewarded ad then delegates to onDailyCheckinRewarded.
 * Uses event delegation so it works regardless of when the DOM is ready.
 */
document.addEventListener("click", async (e) => {
  if (!e.target.closest("#btn-checkin")) return;
  if (isClaiming) return;

  const user = window.cashTreasureUser;
  if (!user) {
    window.showToast?.("Login required", "error");
    return;
  }

  isClaiming = true;
  const btn = document.getElementById("btn-checkin");
  btn.disabled = true;
  btn.innerHTML = "Loading...";

  try {
    window.pendingRewardType = "daily_checkin";
    window.pendingCheckinUser = user;

    if (window.Android?.showAd) {
      Android.showAd();
    } else {
      window.showToast?.("Ads not available", "error");
      btn.disabled = false;
      btn.innerHTML = "🎁 CLAIM";
      isClaiming = false;
    }
  } catch (err) {
    console.error("[Check-in] Claim error:", err);
    window.showToast?.("Something went wrong", "error");
    btn.disabled = false;
    btn.innerHTML = "🎁 CLAIM";
    isClaiming = false;
  }
});

// ── 6. Rewarded Ad Callback ───────────────────────────────────────────────────

/**
 * Called by window.onAdRewarded (script.js) after the user finishes a check-in ad.
 * Guards claimDailyCheckin with window.__ALLOW_CHECKIN__ as required by firebase.js.
 */
window.onDailyCheckinRewarded = async function () {
  const user = window.pendingCheckinUser;
  if (!user) return;

  const btn = document.getElementById("btn-checkin");

  try {
    window.__ALLOW_CHECKIN__ = true;
    let result;
    try {
      result = await claimDailyCheckin(user.uid);
    } finally {
      window.__ALLOW_CHECKIN__ = false;
    }

    if (!result.success) {
      window.showToast?.(result.message, "error");
      btn.innerHTML = "🎁 CLAIM";
      btn.disabled = false;
      return;
    }


    await onCheckinComplete(user.uid);

    
    // Refresh profile and re-render with latest data
    const profile = await getUserProfile(user.uid);
    renderCheckin(profile);

    // Sync global credits
    if (window.cashTreasureUser) {
      window.cashTreasureUser.credits = profile.credits;
    }
    const creditEl = document.getElementById("credit-count");
    if (creditEl) creditEl.textContent = profile.credits;

    // Show contextual toast
    if (result.isOops) {
      window.showToast?.("😅 Oops Day! No Credit Today");
    } else if (result.reward > 0) {
      window.showToast?.(`+${result.reward} Credits Added 🎉`);
    }

  } catch (err) {
    console.error("[Check-in] Reward error:", err);
    window.showToast?.("Something went wrong", "error");
  } finally {
    isClaiming = false;
    window.pendingCheckinUser = null;
  }
};

console.log("✅ Daily Check-in module loaded.");