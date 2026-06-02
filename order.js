// ================================
// Prime Follower - Order Page Module
// Order flow, progress bar, countdown timer
// ================================

// ── 1. Imports ────────────────────────────────────────────────────────────────

import { auth, getUserProfile, createOrder, getActiveOrders } from "./firebase.js";

// ── 2. Utility Functions ──────────────────────────────────────────────────────

/** Bumps the floating credits display with a brief CSS animation. */
function updateCreditsDisplay(credits) {
  const el = document.getElementById("credit-count");
  const container = document.getElementById("floating-credits");
  if (!el || !container) return;
  el.textContent = credits;
  container.classList.add("credit-bump");
  setTimeout(() => container.classList.remove("credit-bump"), 500);
}

// ── 3. State ──────────────────────────────────────────────────────────────────

/** Holds the currently selected order until confirmed or cancelled. */
let selectedOrder = null;

/** Reference to the active countdown interval so it can be cleared. */
let countdownInterval = null;

// ── 4. First Free Order Logic ─────────────────────────────────────────────────

const firstFreeCard = document.getElementById("first-free-card");
const firstOrderBtn = document.getElementById("first-order-btn");
const firstCostText = document.getElementById("first-cost-text");

/**
 * Shows or hides the "first order free" card based on the user's order history.
 * Safe to call multiple times — always reflects current state.
 */
function updateFirstOrderUI() {
  const user = window.cashTreasureUser;
  if (!user || !firstFreeCard) return;

  const hasUsedFree = (user.total_followers_ordered || 0) > 0;

  if (hasUsedFree) {
    firstFreeCard.style.display = "none";
  } else {
    firstFreeCard.style.display = "flex";
    if (firstOrderBtn) {
      firstOrderBtn.textContent = "FREE";
      firstOrderBtn.style.background = "#22c55e";
      firstOrderBtn.style.color = "white";
      firstOrderBtn.style.border = "none";
    }
    if (firstCostText) {
      firstCostText.innerHTML = `Cost: <span style="text-decoration:line-through;color:#999;">5 Credits</span>`;
    }
  }
}

/** Resets the first-order button back to its default (non-free) visual state. */
function resetFirstOrderBtn() {
  if (!firstOrderBtn || !firstCostText) return;
  firstOrderBtn.textContent = "ORDER";
  firstOrderBtn.style.background = "";
  firstOrderBtn.style.color = "";
  firstOrderBtn.style.border = "";
  firstCostText.innerHTML = "Cost: 5 Credits";
}

// Run as soon as user data is available
window.addEventListener("userReady", updateFirstOrderUI);
if (window.cashTreasureUser) updateFirstOrderUI();

firstOrderBtn?.addEventListener("click", () => {
  const user = window.cashTreasureUser;
  if (!user) return window.showToast?.("Please login first.", "error");
  if ((user.total_followers_ordered || 0) > 0) {
    return window.showToast?.("Free order already used!", "error");
  }
  selectedOrder = { followers: 3, credits_spent: 0, isFirstOrderFree: true };
  document.getElementById("rules-modal").classList.add("visible");
});

// ── 5. Order Selection & Rules Modal ─────────────────────────────────────────

// Rules checkbox — gate the NEXT button until the user ticks it
const rulesCheckbox = document.getElementById("rules-agree");
const rulesNextBtn = document.getElementById("rules-agree-btn");

if (rulesCheckbox && rulesNextBtn) {
  rulesNextBtn.disabled = true;
  rulesNextBtn.style.opacity = "0.6";

  rulesCheckbox.addEventListener("change", () => {
    const checked = rulesCheckbox.checked;
    rulesNextBtn.disabled = !checked;
    rulesNextBtn.style.opacity = checked ? "1" : "0.6";
  });
}

// All standard order cards (skip first-free and the premium buy card)
document.querySelectorAll(".order-card .btn-order").forEach(btn => {
  if (btn.id === "first-order-btn" || btn.id === "btn-open-buy") return;

  btn.addEventListener("click", (e) => {
    const card = e.target.closest(".order-card");
    const followers = parseInt(card.dataset.followers);
    const cost = parseInt(card.dataset.cost);
    const user = window.cashTreasureUser;

    if (!user) return window.showToast?.("Please login first.", "error");
    if (user.credits < cost) return window.showToast?.("❌ Not enough credits!", "error");

    selectedOrder = { followers, credits_spent: cost, isFirstOrderFree: false };
    document.getElementById("rules-modal").classList.add("visible");
  });
});

// Rules → advance to Instagram details modal
rulesNextBtn?.addEventListener("click", () => {
  document.getElementById("rules-modal").classList.remove("visible");
  document.getElementById("order-ig-username").value = "";
  document.getElementById("order-ig-link").value = "";
  document.getElementById("username-modal").classList.add("visible");
});

// Backdrop dismissal for both modals
document.getElementById("rules-modal")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove("visible");
    selectedOrder = null;
  }
});

document.getElementById("username-modal")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove("visible");
    selectedOrder = null;
  }
});

// Cancel from the Instagram details modal
document.getElementById("cancel-order-btn")?.addEventListener("click", () => {
  document.getElementById("username-modal").classList.remove("visible");
  selectedOrder = null;
});

// ── 6. Instagram Details Modal & Validation ───────────────────────────────────

/** Validates the Instagram username and optional link fields. Returns an error string or null. */
function validateIGFields(username, link) {
  if (!username) return "Please enter your Instagram username.";
  if (link && !link.startsWith("https://www.instagram.com")) {
    return "Instagram link must start with https://www.instagram.com";
  }
  return null;
}

// ── 7. Order Creation & Processing ───────────────────────────────────────────

/** Sends an order confirmation email via EmailJS (fire-and-forget — never blocks UX). */
async function sendOrderEmail(user, igUsername, igLink, order) {
  if (typeof emailjs === "undefined") return;
  try {
    await emailjs.send("service_swt79ip", "template_urw0ymr", {
      user_email: user.email,
      insta_username: igUsername,
      insta_link: igLink || "Not provided",
      credits: order.isFirstOrderFree ? "FREE (First Order)" : order.credits_spent,
      time_left: "Within 24 hours delivery",
      order_time: new Date().toLocaleString(),
      is_first_order: order.isFirstOrderFree ? "Yes - First Order Free" : "No"
    });
  } catch (err) {
    console.warn("[Order] Email failed:", err);
  }
}

/** Appends a single transaction entry to the transaction list on the order page. */
function appendTransactionEntry(creditsSpent) {
  const list = document.getElementById("transaction-list");
  if (!list || creditsSpent == null) return;
  list.innerHTML = `
    <div class="transaction-item">
      <div class="tx-info">
        <div class="tx-action">Followers Order</div>
        <div class="tx-date">${new Date().toLocaleString()}</div>
      </div>
      <div class="tx-amount negative">-${creditsSpent}</div>
    </div>`;
}

document.getElementById("confirm-order-btn")?.addEventListener("click", async () => {
  const user = window.cashTreasureUser;

  if (!user || !selectedOrder || typeof selectedOrder.credits_spent === "undefined") {
    return window.showToast?.("Please select an order first.", "error");
  }

  const igUsername = document.getElementById("order-ig-username").value.trim();
  const igLink = document.getElementById("order-ig-link").value.trim();
  const validationError = validateIGFields(igUsername, igLink);

  if (validationError) return window.showToast?.(validationError, "error");

  if (user.credits < selectedOrder.credits_spent) {
    return window.showToast?.("Insufficient Credits😅!", "error");
  }

  const btn = document.getElementById("confirm-order-btn");
  btn.disabled = true;
  btn.textContent = "⏳ Processing...";

  // Snapshot credits_spent before selectedOrder is cleared in finally
  const spentCredits = selectedOrder.credits_spent;
  const orderSnapshot = { ...selectedOrder };

  try {
    const result = await createOrder(user.uid, {
      instagram_username: igUsername,
      instagram_link: igLink,
      followers: selectedOrder.followers,
      credits_spent: selectedOrder.credits_spent
    });

    if (!result.success) {
      return window.showToast?.(result.message, "error");
    }

    window.showToast?.(`✅ Order placed! ${orderSnapshot.followers} followers incoming!`);

    // Non-blocking email notification
    sendOrderEmail(user, igUsername, igLink, orderSnapshot);

    document.getElementById("username-modal").classList.remove("visible");

    // Optimistic credit deduction, then confirmed sync from Firestore
    window.cashTreasureUser.credits -= spentCredits;
    updateCreditsDisplay(window.cashTreasureUser.credits);

    const profile = await getUserProfile(user.uid);
    if (profile) {
      updateCreditsDisplay(profile.credits);
      window.cashTreasureUser.credits = profile.credits;
      window.cashTreasureUser.total_followers_ordered = profile.total_followers_ordered || 0;
    }

    updateFirstOrderUI();
    appendTransactionEntry(spentCredits);

    if (result.completionTime) {
      startCountdown(result.completionTime);
    } else {
      console.warn("[Order] No completionTime received");
    }

  } catch (err) {
    console.error("[Order] Confirm error:", err);
    window.showToast?.("Error — please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "CONFIRM ORDER";
    resetFirstOrderBtn();
    updateFirstOrderUI();
    selectedOrder = null;
  }
});

// ── 8. Active Orders & Countdown System ──────────────────────────────────────

/** Fetches any in-progress orders and starts the countdown, or shows celebration if done. */
async function checkActiveOrders(uid) {
  try {
    const orders = await getActiveOrders(uid);
    if (orders.length === 0) return;

    const latest = orders[0];
    const seenKey = `celebration_seen_${latest.id}`;
    const completionTime = latest.completion_time?.toDate
      ? latest.completion_time.toDate()
      : new Date(latest.completion_time);

    if (completionTime > new Date()) {
      startCountdown(completionTime);
    } else if (!localStorage.getItem(seenKey)) {
      showCelebration();
      localStorage.setItem(seenKey, "true");
    }
  } catch (err) {
    console.error("[Order] Active orders error:", err);
  }
}

/**
 * Starts a live countdown against a target completion time.
 * Updates the progress bar and timer every second.
 */
function startCountdown(completionTime) {
  const progressSection = document.getElementById("order-progress");
  const timerEl = document.getElementById("countdown-timer");
  const barFill = document.getElementById("progress-bar-fill");
  if (!progressSection || !timerEl || !barFill) return;

  progressSection.classList.add("visible");

  const endTime = completionTime instanceof Date ? completionTime : new Date(completionTime);
  const TOTAL_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const remaining = endTime.getTime() - Date.now();

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      timerEl.textContent = "00:00:00";
      barFill.style.width = "100%";
      setTimeout(showCelebration, 500);
      return;
    }

    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    const s = Math.floor((remaining % 60_000) / 1_000);

    timerEl.textContent =
      String(h).padStart(2, "0") + ":" +
      String(m).padStart(2, "0") + ":" +
      String(s).padStart(2, "0");

    const elapsed = TOTAL_DURATION - remaining;
    barFill.style.width = `${Math.min((elapsed / TOTAL_DURATION) * 100, 100)}%`;
  }, 1000);
}

// ── 9. Celebration Popup ──────────────────────────────────────────────────────

function showCelebration() {
  document.getElementById("celebration-overlay")?.classList.add("visible");
  document.getElementById("order-progress")?.classList.remove("visible");
  if (countdownInterval) clearInterval(countdownInterval);
}

document.getElementById("celebration-close")?.addEventListener("click", () => {
  document.getElementById("celebration-overlay").classList.remove("visible");
});

// ── 10. Initialization ────────────────────────────────────────────────────────

window.addEventListener("userReady", async (e) => {
  await checkActiveOrders(e.detail.uid);
});

// Global helper for external callers (kept for backward compatibility)
window.sendOrderEmail = function (data) {
  if (typeof emailjs === "undefined") return;
  emailjs.send("service_swt79ip", "template_urw0ymr", {
    user_email: data.email,
    insta_username: data.username,
    insta_link: data.link,
    credits: data.credits,
    time_left: data.time,
    order_time: new Date().toLocaleString()
  })
    .then(() => console.log("[Order] Email sent"))
    .catch(err => console.error("[Order] Email error:", err));
};

console.log("✅ Order module loaded.");