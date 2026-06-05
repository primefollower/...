// ================================
// Prime Follower - Daily Check-in System
// ================================

// ── 1. Imports ────────────────────────────────────────────────────────────────

import { getUserProfile, claimDailyCheckin } from "./firebase.js";
import { onCheckinComplete } from "./refer.js";
import {
  db,
  addDoc,
  collection,
  Timestamp,
  serverTimestamp
} from "./firebase.js";

// ── 2. Constants & Reward Mapping ─────────────────────────────────────────────

const DAY_REWARDS = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 0, 6: 1, 7: 5 };
const ADS_REQUIRED = { 4: 5, 7: 10 };

let isClaiming = false;

// ── 3. Helper Functions ───────────────────────────────────────────────────────

function getTodayAds(profile) {
  const today = new Date().toISOString().split("T")[0];
  const adsDate = profile.daily_ads_date
    ? profile.daily_ads_date.toDate().toISOString().split("T")[0]
    : null;
  return adsDate === today ? (profile.daily_ads_watched || 0) : 0;
}

function isClaimedToday(profile) {
  if (!profile?.lastCheckinDate?.toDate) return false;
  try {
    const last = profile.lastCheckinDate.toDate().toISOString().split("T")[0];
    return last === new Date().toISOString().split("T")[0];
  } catch {
    return false;
  }
}

function getNextDay(profile) {
  const next = (profile.checkinDay || 0) + 1;
  return next > 7 ? 1 : next;
}

function isDayUnlocked(day, adsWatched) {
  const required = ADS_REQUIRED[day];
  return required === undefined || adsWatched >= required;
}

// ── 4. Render Functions ───────────────────────────────────────────────────────

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
      if (day <= currentDay) {
        el.classList.add("completed");
        circle.textContent = "✓";
        if (day === 3) {
          rewardEl.textContent = "🎁50";
        } else {
          rewardEl.textContent = DAY_REWARDS[day] ? `+${DAY_REWARDS[day]}` : "+0";
        }
      } else {
        el.classList.add("locked");
        circle.textContent = "🔒";
        rewardEl.textContent = "+?";
      }
      return;
    }

    if (day < nextDay) {
      el.classList.add("completed");
      circle.textContent = "✓";
      if (day === 3) {
        rewardEl.textContent = "🎁50";
      } else {
        rewardEl.textContent = DAY_REWARDS[day] ? `+${DAY_REWARDS[day]}` : "+0";
      }
      return;
    }

    if (day === nextDay) {
      if (!isDayUnlocked(day, adsToday)) {
        el.classList.add("locked");
        circle.textContent = "🔒";
        rewardEl.textContent = "+?";
        return;
      }
      el.classList.add("current");
      if (day === 3) {
        circle.textContent = "🎁";
        rewardEl.textContent = "50 Free";
      } else if (day === 7) {
        circle.textContent = "🎁";
        rewardEl.textContent = "+?";
      } else {
        circle.textContent = "";
        rewardEl.textContent = "+?";
      }
      return;
    }

    el.classList.add("locked");
    circle.textContent = "🔒";
    rewardEl.textContent = "+?";
  });

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

// ── 5. 50 Free Followers Overlay (Day 3 Reward) ──────────────────────────────

function showDay3FreeFollowersOverlay(uid) {
  document.querySelectorAll('.day3-reward-overlay').forEach(el => el.remove());

  const overlay = document.createElement("div");
  overlay.className = "day3-reward-overlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex;
    align-items:center; justify-content:center; z-index:99999;
    backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  `;

  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e1b4b,#1e3a8a); border-radius:24px;
                padding:32px 24px; text-align:center; max-width:350px; width:92%;
                box-shadow:0 0 50px rgba(79,172,254,0.3),0 20px 60px rgba(0,0,0,0.5);
                border:2px solid rgba(79,172,254,0.4); position:relative; overflow:hidden;">
      <div style="position:absolute;top:-50%;left:-150%;width:60%;height:300%;
                  background:linear-gradient(120deg,transparent,rgba(255,255,255,0.1),transparent);
                  transform:skewX(-25deg); animation:shine 2.5s linear infinite;"></div>
      <div style="font-size:55px; margin-bottom:10px;">🎉</div>
      <h2 style="color:#60a5fa; font-size:22px; font-weight:900; margin-bottom:6px;">
        DAY 3 BONUS UNLOCKED!
      </h2>
      <div style="font-size:40px; margin:8px 0;">🎊</div>
      <p style="color:#FFD700; font-size:24px; font-weight:900; margin-bottom:6px;
                text-shadow:0 0 15px rgba(255,215,0,0.5);">YOU WON</p>
      <p style="color:#fff; font-size:20px; font-weight:800; margin-bottom:4px;">
        50 FREE INSTAGRAM FOLLOWERS
      </p>
      <p style="color:rgba(255,255,255,0.7); font-size:13px; margin-bottom:20px;">
        Enter your Instagram details to receive them!
      </p>
      <button id="day3-claim-btn" style="
        width:100%; padding:16px; border:none; border-radius:50px; font-size:18px;
        font-weight:900; cursor:pointer; color:#fff; position:relative; overflow:hidden;
        background:linear-gradient(135deg,#4facfe,#00f2fe);
        box-shadow:0 8px 25px rgba(79,172,254,0.5);
        letter-spacing:0.5px;
      ">🎁 CLAIM 50 FOLLOWERS</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("day3-claim-btn").addEventListener("click", () => {
    overlay.remove();
    showDay3InstagramForm(uid);
  });
}

function showDay3InstagramForm(uid) {
  document.querySelectorAll('.day3-ig-overlay').forEach(el => el.remove());

  const overlay = document.createElement("div");
  overlay.className = "day3-ig-overlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex;
    align-items:center; justify-content:center; z-index:99999;
    backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  `;

  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:24px;
                padding:28px 20px; text-align:center; max-width:360px; width:92%;
                box-shadow:0 20px 60px rgba(0,0,0,0.5); border:2px solid rgba(79,172,254,0.3);">
      <img src="insta.jpeg" style="width:70px; height:70px; border-radius:16px; margin-bottom:14px;">
      <h3 style="color:#fff; font-size:20px; font-weight:800; margin-bottom:16px;">
        Enter Instagram Details
      </h3>
      <input id="day3-ig-username" type="text" placeholder="Instagram Username (e.g. @yourname)"
             style="width:100%; padding:14px 16px; border-radius:14px; border:1.5px solid rgba(79,172,254,0.3);
                    background:rgba(255,255,255,0.08); color:#fff; font-size:14px; margin-bottom:12px; outline:none;">
      <input id="day3-ig-link" type="url" placeholder="Instagram Profile Link"
             style="width:100%; padding:14px 16px; border-radius:14px; border:1.5px solid rgba(79,172,254,0.3);
                    background:rgba(255,255,255,0.08); color:#fff; font-size:14px; margin-bottom:18px; outline:none;">
      <button id="day3-confirm-btn" style="
        width:100%; padding:16px; border:none; border-radius:50px; font-size:17px;
        font-weight:800; cursor:pointer; color:#fff;
        background:linear-gradient(135deg,#22c55e,#16a34a);
        box-shadow:0 8px 25px rgba(34,197,94,0.4);
      ">CONFIRM</button>
      <button id="day3-cancel-btn" style="
        width:100%; padding:12px; border:none; border-radius:50px; font-size:14px;
        font-weight:600; cursor:pointer; color:#94a3b8; background:transparent; margin-top:10px;
      ">Cancel</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("day3-cancel-btn").addEventListener("click", () => {
    overlay.remove();
  });

  document.getElementById("day3-confirm-btn").addEventListener("click", async () => {
    const username = document.getElementById("day3-ig-username")?.value?.trim();
    const link = document.getElementById("day3-ig-link")?.value?.trim();

    if (!username) {
      window.showToast?.("Please enter your Instagram username", "error");
      return;
    }
    if (link && !link.startsWith("https://www.instagram.com")) {
      window.showToast?.("Link must start with https://www.instagram.com", "error");
      return;
    }

    const btn = document.getElementById("day3-confirm-btn");
    btn.disabled = true;
    btn.textContent = "⏳ Processing...";

    try {
      // Create order
      await addDoc(collection(db, "orders"), {
        user_id: uid,
        instagram_username: username,
        instagram_link: link || "",
        followers: 50,
        credits_spent: 0,
        order_time: Timestamp.now(),
        completion_time: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        status: "processing",
        isPaidOrder: false,
        isDay3Bonus: true
      });

      // Log transaction
      try {
        const { logTransaction } = await import("./firebase.js");
        await logTransaction(uid, "Day 3 Bonus - 50 Free Followers", 0);
      } catch (e) { console.warn(e); }

      // Mark as claimed
      try {
        const { doc: docRef, updateDoc } = await import("./firebase.js");
        await updateDoc(docRef(db, "users", uid), { day3BonusClaimed: true });
      } catch (e) { console.warn(e); }

      // Send email notification via EmailJS
      if (typeof emailjs !== 'undefined') {
        try {
          const user = window.cashTreasureUser;
          await emailjs.send("service_swt79ip", "template_urw0ymr", {
            user_email: user?.email || "unknown",
            insta_username: username,
            insta_link: link || "Not provided",
            credits: "Day 3 Bonus - 50 Free Followers",
            time_left: "Within 24 hours",
            order_time: new Date().toLocaleString(),
            is_first_order: "Day 3 Check-in Bonus (50 Free Followers via Prime Viral Bonus)"
          });
        } catch (mailErr) {
          console.warn("Day3 email failed:", mailErr);
        }
      }

      overlay.remove();
      window.showToast?.("50 Free Followers order placed! 🎉", "success");

    } catch (err) {
      console.error("[Day3] Order error:", err);
      btn.disabled = false;
      btn.textContent = "CONFIRM";
      window.showToast?.("Something went wrong. Try again.", "error");
    }
  });
}

// ── 6. Event Listeners & Claim Logic ─────────────────────────────────────────

window.addEventListener("userReady", async (e) => {
  const profile = await getUserProfile(e.detail.uid);
  if (profile) renderCheckin(profile);
});

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

// ── 7. Rewarded Ad Callback ───────────────────────────────────────────────────

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

    // Refresh profile and re-render
    const profile = await getUserProfile(user.uid);
    renderCheckin(profile);

    if (window.cashTreasureUser) {
      window.cashTreasureUser.credits = profile.credits;
    }
    const creditEl = document.getElementById("credit-count");
    if (creditEl) creditEl.textContent = profile.credits;

    // Day 3 → Show 50 free followers overlay
    if (result.day === 3 && !profile.day3BonusClaimed) {
      showDay3FreeFollowersOverlay(user.uid);
    } else if (result.isOops) {
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