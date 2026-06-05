// ================================
// Pay Module - Cashfree Integration
// ================================

// ── 1. Imports ──
import {
  db,
  serverTimestamp,
  Timestamp,
  getUserProfile,
  updateDoc,
  doc,
  createOrder
} from "./firebase.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── 2. Configuration ──
let currentTimer       = null;
let currentPackageData = null;

// Init EmailJS
if (typeof emailjs !== 'undefined') {
  emailjs.init("q7jXY0z5Uwry4IiZs");
}

// ── 3. Toast ──
export function showToast(message, type = 'success') {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

// ── 4. Check cooldown ──
async function canPlacePaidOrder(uid) {
  const q = query(
    collection(db, "paid_orders"),
    where("user_id", "==", uid),
    where("status", "==", "paid")
  );
  const snap = await getDocs(q);
  if (snap.empty) return true;
  const lastPaid = snap.docs[0].data().paid_at?.toDate?.() ?? new Date();
  const hoursSince = (Date.now() - lastPaid.getTime()) / (1000 * 60 * 60);
  return hoursSince >= 12;
}

// ── 5. Modal Handlers ──
window.closePaymentModal = function () {
  ['payment-success-modal', 'payment-cancel-modal', 'payment-confirm-modal']
    .forEach(id => document.getElementById(id)?.classList.remove('visible'));
};
window.cancelPaymentConfirm = function () {
  document.getElementById('payment-confirm-modal')?.classList.remove('visible');
};
window.proceedToCashfree = function () {
  document.getElementById('payment-confirm-modal')?.classList.remove('visible');
  document.getElementById('instagram-details-modal')?.classList.add('visible');
};
window.closeInstagramModal = function () {
  document.getElementById('instagram-details-modal')?.classList.remove('visible');
};

document.getElementById('how-link')?.addEventListener('click', () => openImageOverlay('drop.jpg'));

function openImageOverlay(src) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay-popup';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:99999;
    display:flex;align-items:center;justify-content:center;backdrop-filter:blur(12px);`;
  overlay.innerHTML = `
    <div style="position:relative;max-width:95%;max-height:92vh;">
      <img src="${src}" style="max-width:100%;max-height:92vh;border-radius:20px;box-shadow:0 15px 50px rgba(0,0,0,0.85);">
      <button onclick="this.closest('.overlay-popup').remove()"
        style="position:absolute;top:18px;right:18px;width:42px;height:42px;
               background:white;color:#111;border:none;border-radius:50%;
               font-size:24px;font-weight:bold;cursor:pointer;z-index:100000;">✕</button>
    </div>`;
  document.body.appendChild(overlay);
}

// ── 6. Payment Success Handler ──
async function handlePaymentSuccess(orderId, packageData) {
  // Guard: no orderId
  if (!orderId) { console.error("handlePaymentSuccess: no orderId"); return; }

  // Guard: already processed this session
  if (localStorage.getItem(`paid_${orderId}`)) {
    console.log("Already processed:", orderId); return;
  }

  const user = window.cashTreasureUser;
  if (!user) { console.error("handlePaymentSuccess: no user"); return; }

  try {
    console.log("🎯 Processing payment success:", orderId, packageData);

    // Create the tracked order (timer + progress bar)
    const orderResult = await createOrder(user.uid, {
      instagram_username: packageData.instagram_username || "Paid_Order",
      instagram_link:     packageData.instagram_link     || "",
      followers:          packageData.followers,
      credits_spent:      0,
      isPaidOrder:        true,
      paidAmount:         packageData.amount
    });

    console.log("📦 Order creation result:", orderResult);

    if (!orderResult.success) {
      console.error("❌ Order creation failed:", orderResult.message);
      showToast("Order creation failed: " + orderResult.message, "error");
      return;
    }

    // ✅ Also save to paid_orders collection for cooldown tracking
    try {
      const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const { db } = await import("./firebase.js");
      
      await addDoc(collection(db, "paid_orders"), {
        user_id: user.uid,
        order_id: orderId,
        followers: packageData.followers,
        amount: packageData.amount,
        instagram_username: packageData.instagram_username || "",
        instagram_link: packageData.instagram_link || "",
        status: "paid",
        paid_at: serverTimestamp()
      });
    } catch (paidOrderErr) {
      console.warn("paid_orders write failed (non-critical):", paidOrderErr);
    }

    // Mark processed in localStorage to prevent double-fire
    localStorage.setItem(`paid_${orderId}`, "1");

    // ✅ Show success modal
    const detailsEl = document.getElementById('success-details');
    if (detailsEl) {
      detailsEl.innerHTML = `
        THE ORDER OF <b>${packageData.followers}</b> FOLLOWERS FOR <b>₹${packageData.amount}</b><br><br>
        IS SUCCESSFULLY PLACED<br><br>
        PAYMENT RECEIVED SUCCESSFULLY<br><br>
        WE WILL DELIVER WITHIN 24 HOURS
      `;
    }
    document.getElementById('payment-success-modal')?.classList.add('visible');

    // ✅ Start countdown timer
    if (orderResult.completionTime) {
      const progressSection = document.getElementById("order-progress");
      if (progressSection) {
        progressSection.style.display = "block";
        progressSection.classList.add("visible");
      }
      if (typeof window.startCountdown === 'function') {
        window.startCountdown(orderResult.completionTime);
      }
    }

    // ✅ Send email (non-blocking)
    if (typeof emailjs !== 'undefined' && !localStorage.getItem(`mail_sent_${orderId}`)) {
      try {
        await emailjs.send("service_swt79ip", "template_urw0ymr", {
          user_email:     user.email,
          insta_username: packageData.instagram_username || "Paid Purchase",
          insta_link:     packageData.instagram_link     || "Real Money Order",
          credits:        `₹${packageData.amount} - ${packageData.followers} Followers`,
          time_left:      "Within 24 hours",
          order_time:     new Date().toLocaleString(),
          is_first_order: "Real Money Payment"
        });
        localStorage.setItem(`mail_sent_${orderId}`, "1");
        console.log("📧 Email sent successfully");
      } catch (mailErr) {
        console.error("EmailJS failed:", mailErr);
      }
    }

    console.log("✅ Payment fully processed:", orderId);

  } catch (err) {
    console.error("❌ handlePaymentSuccess error:", err);
    showToast("Payment recorded but order failed. Contact support with ID: " + orderId, "error");
  }
}


// ── 7. Polling Verification ──
// Track active polling intervals to prevent duplicates
const activePollingIntervals = new Set();

async function startPaymentVerification(orderId, packageData) {
  // Prevent duplicate polling for same order
  if (activePollingIntervals.has(orderId)) {
    console.log("Polling already active for:", orderId);
    return;
  }
  
  activePollingIntervals.add(orderId);
  let attempts = 0;
  console.log("🔄 Starting payment verification polling for:", orderId);

  const interval = setInterval(async () => {
    attempts++;
    if (attempts > 20) {  // 20 × 3s = 60 seconds max
      clearInterval(interval);
      activePollingIntervals.delete(orderId);
      console.warn("Polling timed out for:", orderId);
      
      // Show cancel modal if payment wasn't confirmed
      if (!localStorage.getItem(`paid_${orderId}`)) {
        document.getElementById('payment-cancel-modal')?.classList.add('visible');
      }
      return;
    }

    // Already processed? stop polling
    if (localStorage.getItem(`paid_${orderId}`)) {
      clearInterval(interval);
      activePollingIntervals.delete(orderId);
      return;
    }

    try {
      const res = await fetch(
        'https://payment-backend-production-0b8d.up.railway.app/verify-payment',
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId })
        }
      );
      const data = await res.json();
      console.log(`Poll attempt ${attempts}:`, data);

      if (data.success) {
        clearInterval(interval);
        activePollingIntervals.delete(orderId);
        await handlePaymentSuccess(orderId, packageData);
      }
    } catch (e) {
      console.warn("Poll error:", e);
    }
  }, 3000);
}

// ── 8. Main Payment Function ──
export async function buyWithCashfree(packageData) {
  const user = window.cashTreasureUser;
  if (!user) return showToast("Please login first", "error");

  const canOrder = await canPlacePaidOrder(user.uid);
  if (!canOrder) return showToast("You can only place one order every 12 hours", "error");

  const btn = document.getElementById('confirm-instagram-btn');
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Processing..."; }

  try {
    const res = await fetch(
      'https://payment-backend-production-0b8d.up.railway.app/create-order',
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount:    packageData.amount,
          userId:    user.uid,
          username:  user.username || "User",
          email:     user.email    || "user@example.com",
          followers: packageData.followers
        })
      }
    );

    const data = await res.json();
    console.log("Backend response:", data);

    if (!data.success || !data.payment_session_id) {
      return showToast(data.message || "Failed to create order", "error");
    }

    const orderId = data.orderId;  // e.g. "PF_1234567890"
    console.log("Order ID:", orderId);

    // Wait for Cashfree SDK to be ready
    if (typeof Cashfree === 'undefined') {
      return showToast("Payment SDK not loaded. Please refresh.", "error");
    }

    const cashfree = Cashfree({ mode: "production" });

    // Track if polling has already started to prevent duplicates
    let pollingStarted = false;
    
    function startPollingOnce() {
      if (pollingStarted || localStorage.getItem(`paid_${orderId}`)) return;
      pollingStarted = true;
      startPaymentVerification(orderId, packageData);
    }

    // Open payment modal
    cashfree.checkout({
      paymentSessionId: data.payment_session_id,
      redirectTarget:   "_modal"
    }).then(async (result) => {
      console.log("Cashfree checkout result:", result);
      
      // Check if payment was actually completed or user dismissed
      if (result && result.error) {
        // User cancelled or payment failed
        console.log("Payment cancelled/failed:", result.error);
        document.getElementById('payment-cancel-modal')?.classList.add('visible');
        return;
      }
      
      if (result && result.redirect) {
        // Payment might be processing — start polling
        startPollingOnce();
        return;
      }
      
      // Modal was closed — could be success or cancel
      // Start polling to check actual status, but also show cancel after timeout
      startPollingOnce();
      
      // If polling doesn't confirm payment within 30 seconds, show cancel
      setTimeout(() => {
        if (!localStorage.getItem(`paid_${orderId}`)) {
          document.getElementById('payment-cancel-modal')?.classList.add('visible');
        }
      }, 35000);
      
    }).catch(err => {
      console.error("Cashfree checkout error:", err);
      // Modal was closed/errored — show cancel modal
      document.getElementById('payment-cancel-modal')?.classList.add('visible');
      // Still poll once in case payment went through
      startPollingOnce();
    });

  } catch (err) {
    console.error("buyWithCashfree error:", err);
    showToast("Payment initialization failed. Try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "CONFIRM"; }
  }
}

// ── 9. Buy Page Initialization ──
export async function initBuyPage() {
  const user = window.cashTreasureUser;
  if (!user) return;

  let profile = await getUserProfile(user.uid);

  if (!profile?.limitedOfferExpiry) {
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
    await updateDoc(doc(db, "users", user.uid), {
      limitedOfferExpiry: Timestamp.fromDate(expiryDate)
    });
    profile.limitedOfferExpiry = Timestamp.fromDate(expiryDate);
  }

  const expiryTime    = profile.limitedOfferExpiry.toDate().getTime();
  const isOfferActive = Date.now() < expiryTime;

  const limitedCard = document.getElementById('limited-offer-card');
  if (limitedCard) limitedCard.style.display = isOfferActive ? "flex" : "none";
  if (isOfferActive) startLimitedTimer(expiryTime);

  document.querySelectorAll('.btn-pay').forEach(btn => {
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
  });

  document.querySelectorAll('.btn-pay').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.order-card');
      if (!card) return;
      const followers = parseInt(card.dataset.package, 10);
      const amount    = parseInt(card.dataset.amount,  10);
      currentPackageData = { followers, amount };

      const confirmText = document.getElementById('confirm-text');
      if (confirmText) {
        confirmText.innerHTML = `
          <b>YOU ARE GOING TO PAY ₹${amount} FOR ${followers} FOLLOWERS</b><br><br>
          <b>ARE YOU SURE YOU WANT TO PROCEED?</b>`;
      }
      document.getElementById('payment-confirm-modal')?.classList.add('visible');
    });
  });
}

function startLimitedTimer(expiryTime) {
  if (currentTimer) clearInterval(currentTimer);
  currentTimer = setInterval(() => {
    const remaining = Math.floor((expiryTime - Date.now()) / 1000);
    if (remaining <= 0) {
      clearInterval(currentTimer);
      document.getElementById('limited-offer-card')?.style.setProperty('display', 'none');
      return;
    }
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    const timerEl = document.getElementById('timer-100');
    if (timerEl) timerEl.textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }, 1000);
}

// ── 10. Instagram confirm button ──
document.getElementById('confirm-instagram-btn')?.addEventListener('click', () => {
  const username = document.getElementById('paid-ig-username')?.value.trim();
  const link     = document.getElementById('paid-ig-link')?.value.trim();

  if (!username) { showToast("Please enter Instagram username", "error"); return; }
  if (link && !link.startsWith('https://www.instagram.com')) {
    showToast("Link must start with https://www.instagram.com", "error"); return;
  }

  currentPackageData.instagram_username = username;
  currentPackageData.instagram_link     = link;

  closeInstagramModal();
  setTimeout(() => buyWithCashfree(currentPackageData), 200);
});

// ── 11. Pending payment recovery (called by script.js) ──
window.triggerPendingPaymentSuccess = async function(orderId, amount, followers) {
  if (!orderId || localStorage.getItem(`paid_${orderId}`)) return;
  await handlePaymentSuccess(orderId, {
    followers: followers || 0,
    amount:    amount    || 0,
    instagram_username: "Paid_Order",
    instagram_link:     ""
  });
};

// ── 12. Exports ──
window.initBuyPage     = initBuyPage;
window.buyWithCashfree = buyWithCashfree;