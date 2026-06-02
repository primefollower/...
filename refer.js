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
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Constants ──────────────────────────────────────────────────────────────────

const APP_DOMAIN =
  window.location.origin +
  "/Free-Followers-/download.html";
const MAX_REFERRALS = 3;
const REFERRAL_CREDITS = [0, 10, 25, 0]; // index = referral count (3 unlocks bonus, not credits)

// ── Carousel State ─────────────────────────────────────────────────────────────

let carouselIndex = 0;
let carouselTimer = null;
const CAROUSEL_IMAGES = ["image1.png", "image2.png", "image3.png", "image4.png"];
const CAROUSEL_INTERVAL = 3000;

// ── Module Init ────────────────────────────────────────────────────────────────

/**
 * Boot the entire refer page. Called once after DOM is ready.
 * Wires up carousel, FAQ accordion, referral block and claim form.
 */
export function initReferPage() {
  initCarousel();
  initFAQAccordion();
  wireReferCardClick();

  // Listen for auth state — populate referral data once user is known
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
    // Remove old "coming soon" overlay behaviour — navigate to real page
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

  // Build slides
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

  // Touch / swipe support
  let touchStartX = 0;
  let touchEndX = 0;
  track.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", e => {
    touchEndX = e.changedTouches[0].clientX;
    const delta = touchStartX - touchEndX;
    if (Math.abs(delta) > 40) {
      stopCarouselAuto();
      delta > 0 ? nextSlide() : prevSlide();
    }
  }, { passive: true });

  // Stop autoplay on image tap
  track.addEventListener("click", stopCarouselAuto);

  prevBtn.addEventListener("click", () => { stopCarouselAuto(); prevSlide(); });
  nextBtn.addEventListener("click", () => { stopCarouselAuto(); nextSlide(); });

  goToSlide(0);
  startCarouselAuto();

  window.addEventListener("referPageOpened", () => {
  startCarouselAuto?.();
});
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
function prevSlide()  { goToSlide(carouselIndex - 1); }

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

    // Close all
    document.querySelectorAll(".refer-faq-item.open").forEach(el => {
      el.classList.remove("open");
      el.querySelector(".refer-faq-body").style.maxHeight = "0";
    });

    // Toggle clicked
    if (!isOpen) {
      item.classList.add("open");
      body.style.maxHeight = body.scrollHeight + "px";
    }
  });
}

// ── 4. Load Referral State from Firestore ─────────────────────────────────────

async function loadReferralState(uid) {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const referralCount = data.referralCount || 0;
    const primeViralBonusClaimed = data.primeViralBonusClaimed || false;
    const referralExpired = referralCount >= MAX_REFERRALS;

    // Build referral link
    const referLink = `${APP_DOMAIN}?ref=${uid}`;
    const linkEl = document.getElementById("refer-link-value");
    if (linkEl) linkEl.value = referLink;

    // Update progress
    updateReferralProgress(referralCount, primeViralBonusClaimed);

    // Wire copy & share now that link is set
    wireCopyButton(referLink, referralExpired);
    wireShareButton(referLink, referralExpired);

    // Claim section
    if (referralCount >= MAX_REFERRALS) {
      showClaimSection(primeViralBonusClaimed);
    }

    // Wire claim form
    wireClaimForm(uid, primeViralBonusClaimed);

  } catch (err) {
    console.error("[refer.js] loadReferralState:", err);
  }
}

// ── 5. Progress UI ─────────────────────────────────────────────────────────────

function updateReferralProgress(count, claimed) {
  const countEl   = document.getElementById("refer-count-text");
  const barFill   = document.getElementById("refer-progress-fill");
  const statusEl  = document.getElementById("refer-status-text");

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

// ── 6. Copy Button ─────────────────────────────────────────────────────────────

function wireCopyButton(link, expired) {
  const btn = document.getElementById("refer-copy-btn");
  if (!btn) return;

  if (expired) {
    btn.textContent = "🔒 LINK EXPIRED";
    btn.disabled = true;
    return;
  }

  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(link).then(() => {
      window.showToast?.("LINK COPIED", "success");
    }).catch(() => {
      fallbackCopy(link);
    });
  });
}

// ── 7. Share Button ────────────────────────────────────────────────────────────

function wireShareButton(link, expired) {
  const btn = document.getElementById("refer-share-btn");
  if (!btn) return;

  if (expired) {
    btn.textContent = "🔒 REFERRAL COMPLETE";
    btn.disabled = true;
    return;
  }

  btn.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Prime Follower 🚀",
          text: "Get free Instagram followers! Use my referral link 👇",
          url: link
        });
      } catch (err) {
        if (err.name !== "AbortError") fallbackCopy(link);
      }
    } else {
      fallbackCopy(link);
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

// ── 8. Claim Section Toggle ────────────────────────────────────────────────────

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

// ── 9. Claim Form ──────────────────────────────────────────────────────────────

function wireClaimForm(uid, alreadyClaimed) {
  const submitBtn = document.getElementById("refer-claim-submit");
  if (!submitBtn || alreadyClaimed) return;

  submitBtn.addEventListener("click", async () => {
    const igUser = document.getElementById("refer-claim-username")?.value?.trim().toLowerCase();
    const igLink = document.getElementById("refer-claim-link")?.value?.trim().toLowerCase();

    if (!igUser || !igLink) {
      window.showToast?.("Please fill in all fields", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Checking...";

    try {
      // 1. Check user already claimed
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.data()?.primeViralBonusClaimed) {
        window.showToast?.("You have already claimed PRIME VIRAL BONUS", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "CLAIM BONUS 🎁";
        return;
      }

      // 2. Check referral count requirement
      const count = userSnap.data()?.referralCount || 0;
      if (count < MAX_REFERRALS) {
        window.showToast?.("You need 3 successful referrals first", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "CLAIM BONUS 🎁";
        return;
      }

      // 3. Check duplicate in prime_viral_bonus_claims (username OR link)
      const claimsRef = collection(db, "prime_viral_bonus_claims");

      const [byUser, byLink] = await Promise.all([
        getDocs(query(claimsRef, where("instagram_username", "==", igUser))),
        getDocs(query(claimsRef, where("instagram_profile_link", "==", igLink)))
      ]);

      if (!byUser.empty || !byLink.empty) {
        window.showToast?.("This Insta account already claimed the PRIME VIRAL BONUS", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "CLAIM BONUS 🎁";
        return;
      }

      // 4. Save claim
      const claimDocRef = doc(collection(db, "prime_viral_bonus_claims"));
      await setDoc(claimDocRef, {
        uid,
        instagram_username: igUser,
        instagram_profile_link: igLink,
        created_at: serverTimestamp(),
        status: "pending"
      });

      // 5. Mark claimed on user profile
      await updateDoc(doc(db, "users", uid), { primeViralBonusClaimed: true });

      // 6. Update UI
      window.showToast?.("PRIME VIRAL BONUS request submitted 🚀", "success");
      const form = document.getElementById("refer-claim-form");
      const done = document.getElementById("refer-claim-done");
      if (form) form.style.display = "none";
      if (done) done.style.display = "block";

    } catch (err) {
      console.error("[refer.js] claimBonus:", err);
      window.showToast?.("Something went wrong. Try again.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "CLAIM BONUS 🎁";
    }
  });
}

// ── 10. Incoming Referral Tracking ────────────────────────────────────────────

/**
 * Called once after sign-in. Reads ?ref=UID from URL and records
 * referredBy on the new user's profile — only once and never overwritten.
 */
async function checkIncomingReferral(uid) {
  try {
    const params = new URLSearchParams(window.location.search);
    const inviterUid =
  params.get("ref") ||
  localStorage.getItem("primeReferralCode");
    if (!inviterUid || inviterUid === uid) return;

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    // Only save once — never overwrite
    if (data.referredBy) return;

    await updateDoc(userRef, { referredBy: inviterUid });

    // Clean URL silently
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

  } catch (err) {
    console.error("[refer.js] checkIncomingReferral:", err);
  }
}

// ── 11. Daily Check-In Hook — Called from dailycheckin.js after each check-in ─

/**
 * Call this from dailycheckin.js when the user completes a check-in.
 * It checks if the referred user now has ≥3 check-ins and rewards the inviter.
 * Usage: import { onCheckinComplete } from "./refer.js"; then call it.
 */
export async function onCheckinComplete(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const checkinCount = data.total_checkins || 0;
    const referredBy = data.referredBy;
    const referralCredited = data.referralCredited || false;

    // Must have an inviter, not already credited, and have ≥3 check-ins
    if (!referredBy || referralCredited || checkinCount < 3) return;

    // Fetch inviter
    const inviterRef = doc(db, "users", referredBy);
    const inviterSnap = await getDoc(inviterRef);
    if (!inviterSnap.exists()) return;

    const inviterData = inviterSnap.data();
    const currentCount = inviterData.referralCount || 0;

    // Inviter already at max
    if (currentCount >= MAX_REFERRALS) return;

    const newCount = currentCount + 1;
    const creditReward = REFERRAL_CREDITS[newCount] || 0;

    // Update inviter
    const inviterUpdate = {
      referralCount: increment(1)
    };
    if (creditReward > 0) {
      inviterUpdate.credits = increment(creditReward);
      inviterUpdate.total_earned = increment(creditReward);
    }
    await updateDoc(inviterRef, inviterUpdate);

    // Mark this user as credited so it can't count again
    await updateDoc(userRef, { referralCredited: true });

    // Log credit transaction for inviter if applicable
    if (creditReward > 0 && typeof window.logTransaction === "function") {
      await window.logTransaction(referredBy, `Referral Bonus (${newCount}/3)`, creditReward);
    }

  } catch (err) {
    console.error("[refer.js] onCheckinComplete:", err);
  }
}