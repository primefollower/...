// ================================
// refer.js — PRIME VIRAL BONUS
// Refer & Earn Feature Module
// ================================

import {
  db,
  auth,
  onAuthStateChanged
} from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Constants ──────────────────────────────────────────────────────────────────

const APK_DOWNLOAD_LINK =
  "https://github.com/primefollower/---/releases/download/v1.2/Primefollower.apk";
const MAX_REFERRALS = 3;
const REFERRAL_CREDITS = [0, 10, 25, 0]; // index = referral count

// ── Carousel State ─────────────────────────────────────────────────────────────

let carouselIndex = 0;
let carouselTimer = null;
const CAROUSEL_IMAGES = ["image1.png", "image2.png", "image3.png", "image4.png"];
const CAROUSEL_INTERVAL = 3000;

// ── Module Init ────────────────────────────────────────────────────────────────

export function initReferPage() {
  initCarousel();
  initFAQAccordion();
  wireReferCardClick();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await loadReferralState(user.uid);
      checkIncomingReferral(user.uid);
    }
  });
}

// ── 1. Wire Home Card Click ────────────────────────────────────────────────────

function wireReferCardClick() {
  const referCard = document.getElementById("refer-card");
  if (!referCard) return;
  referCard.addEventListener("click", () => {
    const overlay = document.getElementById("coming-soon-overlay");
    if (overlay) overlay.style.display = "none";
    window.navigateTo("refer");
  });
}

// ── 2. Carousel ────────────────────────────────────────────────────────────────

function initCarousel() {
  const track = document.getElementById("refer-carousel-track");
  const dotsContainer = document.getElementById("refer-carousel-dots");
  const prevBtn = document.getElementById("refer-carousel-prev");
  const nextBtn = document.getElementById("refer-carousel-next");
  if (!track || !dotsContainer || !prevBtn || !nextBtn) return;

  track.innerHTML = "";
  dotsContainer.innerHTML = "";

  CAROUSEL_IMAGES.forEach((src, i) => {
    const slide = document.createElement("div");
    slide.className = "refer-carousel-slide";
    slide.innerHTML = `<img src="${src}" alt="How refer works step ${i + 1}" loading="lazy">`;
    track.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = "refer-carousel-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Slide ${i + 1}`);
    dot.addEventListener("click", () => {
      goToSlide(i);
      stopCarouselAuto();
    });
    dotsContainer.appendChild(dot);
  });

  let touchStartX = 0;
  track.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", e => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      stopCarouselAuto();
      delta > 0 ? nextSlide() : prevSlide();
    }
  }, { passive: true });

  track.addEventListener("click", stopCarouselAuto);
  prevBtn.addEventListener("click", () => { stopCarouselAuto(); prevSlide(); });
  nextBtn.addEventListener("click", () => { stopCarouselAuto(); nextSlide(); });

  goToSlide(0);
  startCarouselAuto();

  window.removeEventListener("referPageOpened", startCarouselAuto);
  window.addEventListener("referPageOpened", startCarouselAuto);
}

function goToSlide(index) {
  const slides = document.querySelectorAll(".refer-carousel-slide");
  const dots = document.querySelectorAll(".refer-carousel-dot");
  if (!slides.length) return;
  carouselIndex = ((index % slides.length) + slides.length) % slides.length;
  const track = document.getElementById("refer-carousel-track");
  if (track) track.style.transform = `translateX(-${carouselIndex * 100}%)`;
  dots.forEach((d, i) => d.classList.toggle("active", i === carouselIndex));
}

function nextSlide() { goToSlide(carouselIndex + 1); }
function prevSlide() { goToSlide(carouselIndex - 1); }

function startCarouselAuto() {
  stopCarouselAuto();
  carouselTimer = setInterval(nextSlide, CAROUSEL_INTERVAL);
}

function stopCarouselAuto() {
  clearInterval(carouselTimer);
  carouselTimer = null;
}

// ── 3. FAQ Accordion ───────────────────────────────────────────────────────────

function initFAQAccordion() {
  document.addEventListener("click", e => {
    const trigger = e.target.closest(".refer-faq-trigger");
    if (!trigger) return;
    const item = trigger.closest(".refer-faq-item");
    if (!item) return;
    const body = item.querySelector(".refer-faq-body");
    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".refer-faq-item.open").forEach(el => {
      el.classList.remove("open");
      el.querySelector(".refer-faq-body").style.maxHeight = "0";
    });
    if (!isOpen) {
      item.classList.add("open");
      body.style.maxHeight = body.scrollHeight + "px";
    }
  });
}

// ── 4. Load Referral State ─────────────────────────────────────────────────────

async function loadReferralState(uid) {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const referralCount = data.referralCount || 0;
    const primeViralBonusClaimed = data.primeViralBonusClaimed || false;
    const referralExpired = primeViralBonusClaimed;
    const referralCode = data.referralCode || "PRIME000000";

    // Show referral code instead of link
    const linkEl = document.getElementById("refer-link-value");
    if (linkEl) linkEl.value = referralCode;

    updateReferralProgress(referralCount, primeViralBonusClaimed);

    wireCopyButton(referralCode, referralExpired);
    wireShareButton(referralCode, referralExpired);

    if (referralCount >= MAX_REFERRALS) {
      showClaimSection(primeViralBonusClaimed);
    }

    wireClaimForm(uid, primeViralBonusClaimed);

    // Check for unclaimed referral rewards
    checkPendingReferralRewards(uid, data);

    // Load friends list
    loadFriendsList(uid);

  } catch (err) {
    console.error("[refer.js] loadReferralState:", err);
  }
}

// ── 5. Check for unclaimed referral reward overlays ────────────────────────────

async function checkPendingReferralRewards(uid, data) {
  const referralCount = data.referralCount || 0;
  const reward1Claimed = data.referralReward1Claimed || false;
  const reward2Claimed = data.referralReward2Claimed || false;
  const reward3Shown = data.referralReward3Shown || false;
  const primeViralBonusClaimed = data.primeViralBonusClaimed || false;

  // 1st referral — 10 credits
  if (referralCount >= 1 && !reward1Claimed) {
    showReferralRewardOverlay(uid, 1, 10);
    return;
  }

  // 2nd referral — 25 credits
  if (referralCount >= 2 && !reward2Claimed) {
    showReferralRewardOverlay(uid, 2, 25);
    return;
  }

  // 3rd referral — PRIME VIRAL BONUS unlock
  if (referralCount >= 3 && !reward3Shown && !primeViralBonusClaimed) {
    showPrimeViralBonusOverlay(uid);
    return;
  }
}

// ── 6. Referral Reward Overlay (1st & 2nd) ────────────────────────────────────

function showReferralRewardOverlay(uid, referralNumber, credits) {
  document.querySelectorAll('.referral-reward-overlay').forEach(el => el.remove());

  const overlay = document.createElement("div");
  overlay.className = "referral-reward-overlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex;
    align-items:center; justify-content:center; z-index:99999;
    backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
  `;

  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b); border-radius:24px;
                padding:32px 24px; text-align:center; max-width:340px; width:90%;
                box-shadow:0 20px 60px rgba(0,0,0,0.5); border:2px solid rgba(255,215,0,0.3);">
      <div style="font-size:60px; margin-bottom:12px;">🎉</div>
      <h2 style="color:#FFD700; font-size:22px; font-weight:900; margin-bottom:8px;">
        ${referralNumber}${referralNumber===1?'st':'nd'} REFERRAL COMPLETED!
      </h2>
      <p style="color:#e2e8f0; font-size:15px; line-height:1.5; margin-bottom:8px;">
        Your friend completed 3 daily check-ins!
      </p>
      <div style="background:rgba(255,215,0,0.15); border-radius:16px; padding:16px;
                  margin:16px 0; border:1px solid rgba(255,215,0,0.3);">
        <p style="color:#FFD700; font-size:28px; font-weight:900;">+${credits} Credits</p>
      </div>
      <button id="claim-referral-reward-btn" style="
        width:100%; padding:16px; border:none; border-radius:50px; font-size:18px;
        font-weight:800; cursor:pointer; color:#1a1a2e;
        background:linear-gradient(135deg,#FFD700,#FFA500);
        box-shadow:0 8px 25px rgba(255,215,0,0.4);
      ">🎁 CLAIM ${credits} CREDITS</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("claim-referral-reward-btn").addEventListener("click", async () => {
    const btn = document.getElementById("claim-referral-reward-btn");
    btn.disabled = true;
    btn.textContent = "⏳ Claiming...";

    try {
      const userRef = doc(db, "users", uid);
      const updateData = {};
      updateData[`referralReward${referralNumber}Claimed`] = true;
      updateData.credits = increment(credits);
      updateData.total_earned = increment(credits);

      // Add credits NOW when inviter clicks CLAIM (correct permissions)
      await updateDoc(userRef, updateData);

      // Log transaction
      try {
        const { logTransaction } = await import("./firebase.js");
        await logTransaction(uid, `Referral Bonus (${referralNumber}/3)`, credits);
      } catch (e) { console.warn(e); }

      overlay.remove();
      window.showToast?.(`+${credits} Credits Added! 🎉`, "success");

      // Refresh state
      const freshSnap = await getDoc(userRef);
      if (freshSnap.exists()) {
        checkPendingReferralRewards(uid, freshSnap.data());
      }

    } catch (err) {
      console.error("[refer.js] claim reward error:", err);
      btn.disabled = false;
      btn.textContent = `🎁 CLAIM ${credits} CREDITS`;
      window.showToast?.("Failed to claim. Try again.", "error");
    }
  });
}

// ── 7. PRIME VIRAL BONUS Overlay (3rd referral) ───────────────────────────────

function showPrimeViralBonusOverlay(uid) {
  document.querySelectorAll('.referral-reward-overlay').forEach(el => el.remove());

  const overlay = document.createElement("div");
  overlay.className = "referral-reward-overlay";
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex;
    align-items:center; justify-content:center; z-index:99999;
    backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  `;

  overlay.innerHTML = `
    <div style="background:linear-gradient(135deg,#1a1000,#2d1f00,#1a1000); border-radius:24px;
                padding:32px 24px; text-align:center; max-width:360px; width:92%;
                box-shadow:0 0 60px rgba(255,215,0,0.4),0 20px 60px rgba(0,0,0,0.6);
                border:3px solid rgba(255,215,0,0.6); position:relative; overflow:hidden;">
      <div style="position:absolute;top:-50%;left:-150%;width:60%;height:300%;
                  background:linear-gradient(120deg,transparent,rgba(255,255,255,0.15),transparent);
                  transform:skewX(-25deg); animation:shine 2.5s linear infinite;"></div>
      <div style="font-size:50px; margin-bottom:8px;">👑</div>
      <h2 style="color:#FFD700; font-size:24px; font-weight:900; margin-bottom:6px;
                 text-shadow:0 0 20px rgba(255,215,0,0.6);">
        YOU UNLOCKED THE<br>PRIME VIRAL BONUS
      </h2>
      <div style="font-size:36px; margin:10px 0;">🎊</div>
      <p style="color:#FFD700; font-size:20px; font-weight:800; margin-bottom:6px;">CONGRATS!!</p>
      <p style="color:#e2e8f0; font-size:15px; line-height:1.6; margin-bottom:20px;">
        YOU WILL GET <b style="color:#FFD700;">500 FREE FOLLOWERS</b><br>
        IN YOUR INSTAGRAM ACCOUNT<br>PLS ENTER DETAILS
      </p>
      <button id="pvb-claim-btn" style="
        width:100%; padding:18px; border:none; border-radius:50px; font-size:20px;
        font-weight:900; cursor:pointer; color:#1a1a2e; position:relative; overflow:hidden;
        background:linear-gradient(135deg,#FFD700,#ffed4e,#FFA500);
        box-shadow:0 0 30px rgba(255,215,0,0.5),0 8px 25px rgba(255,165,0,0.4);
        animation:btnGlow 2s ease-in-out infinite; letter-spacing:1px;
      ">🎁 CLAIM NOW</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("pvb-claim-btn").addEventListener("click", async () => {
    try {
      await updateDoc(doc(db, "users", uid), { referralReward3Shown: true });
    } catch (e) { console.warn(e); }
    overlay.remove();

    // Show the claim section on the refer page
    showClaimSection(false);
    window.navigateTo("refer");

    // Scroll to claim section
    setTimeout(() => {
      document.getElementById("refer-claim-section")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  });
}




// ── 7B. Load & Render Referred Friends List ───────────────────────────────────

async function loadFriendsList(uid) {
  const listEl = document.getElementById("refer-friends-list");
  if (!listEl) return;

  try {
    // Find users who have this user as referredBy
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referredBy", "==", uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = `
        <p style="color:#9ca3af; opacity:0.7; text-align:center; font-size:14px; font-weight:600; padding:20px 0;">
          YOU HAVEN'T REFER ANY FRIEND YET
        </p>`;
      return;
    }

    // Get up to 5 most recent referred friends
    const friends = [];
    snap.docs.forEach(d => {
      const data = d.data();
      friends.push({
        username: data.username || data.email?.split("@")[0] || "User",
        totalCheckins: data.total_checkins || 0,
        referralCredited: data.referralCredited || false,
        createdAt: data.created_at?.toDate?.() || new Date()
      });
    });

    // Sort by creation date (newest first) and limit to 5
    friends.sort((a, b) => b.createdAt - a.createdAt);
    const display = friends.slice(0, 5);

    let html = "";
    display.forEach((friend, i) => {
      const checkins = Math.min(friend.totalCheckins, 3);
      const progressPct = Math.min((checkins / 3) * 100, 100);
      const isComplete = checkins >= 3;

      const barColor = isComplete
        ? "linear-gradient(90deg, #FFD700, #FFA500)"
        : "linear-gradient(90deg, #93c5fd, #a78bfa)";

      const statusText = isComplete
        ? '<span style="color:#FFD700; font-weight:800;">✅ Completed</span>'
        : `<span style="color:#9ca3af; font-size:12px;">${checkins}/3 check-ins</span>`;

      html += `
        <div style="display:flex; align-items:center; gap:12px; padding:14px 0;
                    ${i < display.length - 1 ? 'border-bottom:1px solid rgba(79,172,254,0.1);' : ''}">
          <div style="width:36px; height:36px; border-radius:50%;
                      background:linear-gradient(135deg,#4facfe,#a78bfa);
                      display:flex; align-items:center; justify-content:center;
                      color:#fff; font-weight:800; font-size:14px; flex-shrink:0;">
            ${(i + 1)}
          </div>
          <div style="flex:1; min-width:0;">
            <p style="font-size:14px; font-weight:700; color:#1e3a8a; margin-bottom:6px;
                      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${friend.username}
            </p>
            <div style="width:100%; height:6px; background:rgba(79,172,254,0.12);
                        border-radius:10px; overflow:hidden;">
              <div style="height:100%; width:${progressPct}%; background:${barColor};
                          border-radius:10px; transition:width 0.8s ease;"></div>
            </div>
          </div>
          <div style="flex-shrink:0; text-align:right;">
            ${statusText}
          </div>
        </div>`;
    });

    if (friends.length > 5) {
      html += `<p style="text-align:center; color:#9ca3af; font-size:12px; padding-top:10px;">
        Showing latest 5 of ${friends.length} friends
      </p>`;
    }

    listEl.innerHTML = html;

  } catch (err) {
    console.error("[refer.js] loadFriendsList error:", err);
  }
}




// ── 8. Progress UI ─────────────────────────────────────────────────────────────

function updateReferralProgress(count, claimed) {
  const countEl = document.getElementById("refer-count-text");
  const barFill = document.getElementById("refer-progress-fill");
  const statusEl = document.getElementById("refer-status-text");

  if (countEl) countEl.textContent = `${Math.min(count, MAX_REFERRALS)} / ${MAX_REFERRALS} referrals complete`;

  const pct = Math.min((count / MAX_REFERRALS) * 100, 100);
  if (barFill) barFill.style.width = pct + "%";

  if (statusEl) {
    if (count >= MAX_REFERRALS) {
      statusEl.innerHTML = claimed
        ? `✅ PRIME VIRAL BONUS CLAIMED`
        : `🎉 PRIME VIRAL BONUS UNLOCKED`;
      statusEl.className = "refer-status-text unlocked";
    } else {
      statusEl.innerHTML = `Invite ${MAX_REFERRALS - count} more friend${MAX_REFERRALS - count !== 1 ? "s" : ""} to unlock the bonus`;
      statusEl.className = "refer-status-text";
    }
  }
}

// ── 9. Copy Button ─────────────────────────────────────────────────────────────

function wireCopyButton(code, expired) {
  const btn = document.getElementById("refer-copy-btn");
  if (!btn) return;

  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);

  if (expired) {
    fresh.innerHTML = '<i class="fas fa-lock"></i>';
    fresh.disabled = true;
    return;
  }

  fresh.addEventListener("click", () => {
    navigator.clipboard.writeText(code).then(() => {
      window.showToast?.("CODE COPIED", "success");
    }).catch(() => {
      fallbackCopy(code);
    });
  });
}

// ── 10. Share Button ───────────────────────────────────────────────────────────

function wireShareButton(code, expired) {
  const btn = document.getElementById("refer-share-btn");
  if (!btn) return;

  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);

  if (expired) {
    fresh.innerHTML = '<i class="fas fa-lock"></i>&nbsp; REFERRAL COMPLETE';
    fresh.disabled = true;
    fresh.addEventListener("click", () => {
      window.showToast?.("PRIME VIRAL BONUS is once per lifetime.", "error");
    });
    return;
  }

  fresh.addEventListener("click", async () => {
    const shareText = `🚀 Get FREE Instagram Followers!\n\n` +
      `Download Prime Follower & use my referral code: ${code}\n\n` +
      `👉 Download: ${APK_DOWNLOAD_LINK}\n\n` +
      `You'll get 50 FREE followers after 3 daily check-ins! 🎁`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Prime Follower 🚀",
          text: shareText
        });
      } catch (err) {
        if (err.name !== "AbortError") fallbackCopy(code);
      }
    } else {
      fallbackCopy(code);
    }
  });
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  ta.remove();
  window.showToast?.("LINK COPIED", "success");
}

// ── 11. Claim Section Toggle ───────────────────────────────────────────────────

function showClaimSection(alreadyClaimed) {
  const claimSection = document.getElementById("refer-claim-section");
  if (!claimSection) return;
  claimSection.style.display = "block";
  claimSection.classList.add("visible");

  if (alreadyClaimed) {
    const form = document.getElementById("refer-claim-form");
    const done = document.getElementById("refer-claim-done");
    if (form) form.style.display = "none";
    if (done) done.style.display = "block";
  }
}

// ── 12. Claim Form ─────────────────────────────────────────────────────────────

function wireClaimForm(uid, alreadyClaimed) {
  const submitBtn = document.getElementById("refer-claim-submit");
  if (!submitBtn || alreadyClaimed) return;

  // Remove old listeners
  const fresh = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(fresh, submitBtn);

  fresh.addEventListener("click", async () => {
    const igUser = document.getElementById("refer-claim-username")?.value?.trim().toLowerCase();
    const igLink = document.getElementById("refer-claim-link")?.value?.trim().toLowerCase();

    if (!igUser || !igLink) {
      window.showToast?.("Please fill in all fields", "error");
      return;
    }

    if (igLink && !igLink.startsWith("https://www.instagram.com")) {
      window.showToast?.("Link must start with https://www.instagram.com", "error");
      return;
    }

    fresh.disabled = true;
    fresh.textContent = "⏳ Processing...";

    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.data()?.primeViralBonusClaimed) {
        window.showToast?.("You have already claimed PRIME VIRAL BONUS", "error");
        fresh.disabled = false;
        fresh.textContent = "CLAIM BONUS 🎁";
        return;
      }

      const count = userSnap.data()?.referralCount || 0;
      if (count < MAX_REFERRALS) {
        window.showToast?.("You need 3 successful referrals first", "error");
        fresh.disabled = false;
        fresh.textContent = "CLAIM BONUS 🎁";
        return;
      }

      // Check duplicate claims
      const claimsRef = collection(db, "prime_viral_bonus_claims");
      const [byUser, byLink] = await Promise.all([
        getDocs(query(claimsRef, where("instagram_username", "==", igUser))),
        getDocs(query(claimsRef, where("instagram_profile_link", "==", igLink)))
      ]);

      if (!byUser.empty || !byLink.empty) {
        window.showToast?.("This Instagram account already claimed the PRIME VIRAL BONUS", "error");
        fresh.disabled = false;
        fresh.textContent = "CLAIM BONUS 🎁";
        return;
      }

      // Save claim document
      await addDoc(collection(db, "prime_viral_bonus_claims"), {
        uid,
        instagram_username: igUser,
        instagram_profile_link: igLink,
        created_at: serverTimestamp(),
        status: "pending"
      });

      // Mark claimed on user profile
      await updateDoc(doc(db, "users", uid), { primeViralBonusClaimed: true });

      // Log transaction for wallet history
      try {
        const { logTransaction } = await import("./firebase.js");
        await logTransaction(uid, "PRIME VIRAL BONUS - 500 followers", 0);
      } catch (e) { console.warn(e); }

      // Create order in orders collection
      try {
        await addDoc(collection(db, "orders"), {
          user_id: uid,
          instagram_username: igUser,
          instagram_link: igLink,
          followers: 500,
          credits_spent: 0,
          order_time: Timestamp.now(),
          completion_time: Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000)),
          status: "processing",
          isPaidOrder: false,
          isViralBonus: true
        });
      } catch (e) { console.warn("Order creation failed:", e); }

      // Update UI
      window.showToast?.("PRIME VIRAL BONUS claimed! 500 followers incoming 🚀", "success");
      const form = document.getElementById("refer-claim-form");
      const done = document.getElementById("refer-claim-done");
      if (form) form.style.display = "none";
      if (done) done.style.display = "block";

    } catch (err) {
      console.error("[refer.js] claimBonus:", err);
      window.showToast?.("Something went wrong. Try again.", "error");
      fresh.disabled = false;
      fresh.textContent = "CLAIM BONUS 🎁";
    }
  });
}

// ── 13. Incoming Referral Tracking ────────────────────────────────────────────

async function checkIncomingReferral(uid) {
  // Referral is now handled via code entry overlay in script.js
  // This function is kept for backward compatibility but does nothing
  return;
}

// ── 14. Daily Check-In Hook ───────────────────────────────────────────────────

export async function onCheckinComplete(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const checkinCount = data.total_checkins || 0;
    const referredBy = data.referredBy;
    const referralCredited = data.referralCredited || false;

    if (!referredBy || referralCredited || checkinCount < 3) return;

    const inviterRef = doc(db, "users", referredBy);
    const inviterSnap = await getDoc(inviterRef);
    if (!inviterSnap.exists()) return;

    const inviterData = inviterSnap.data();
    const currentCount = inviterData.referralCount || 0;

    const newCount = currentCount + 1;
    // Only give credit rewards for first 3 referrals
    const creditReward = newCount <= MAX_REFERRALS ? (REFERRAL_CREDITS[newCount] || 0) : 0;

    // Only increment referralCount here — credits will be added when inviter clicks CLAIM
    const inviterUpdate = {
      referralCount: increment(1)
    };
    await updateDoc(inviterRef, inviterUpdate);

    await updateDoc(userRef, { referralCredited: true });

    // Credits and transaction logging handled when inviter clicks CLAIM overlay

    console.log(`✅ Referral ${newCount}/3 credited to inviter ${referredBy}`);

  } catch (err) {
    console.error("[refer.js] onCheckinComplete:", err);
  }
}

console.log("✅ Refer module loaded.");