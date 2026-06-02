// ================================
// Pay Module - Razorpay Integration
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
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ── 2. Configuration ──

let currentTimer      = null;
let currentPackageData = null;


// ── 3. Helper Functions ──

/**
 * Show a brief toast notification.
 * Exported so wallet.js can import it instead of re-defining.
 */
export function showToast(message, type = 'success') {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

/**
 * Returns true if the user has not placed a paid order in the last 12 hours.
 */
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


// ── 4. Modal Handlers ──

/** Close all payment-related modals. */
window.closePaymentModal = function () {
  ['payment-success-modal', 'payment-cancel-modal', 'payment-confirm-modal']
    .forEach(id => document.getElementById(id)?.classList.remove('visible'));
};

/** Close only the confirmation modal (user pressed Cancel). */
window.cancelPaymentConfirm = function () {
  document.getElementById('payment-confirm-modal')?.classList.remove('visible');
};

/** Move from confirmation modal → Instagram details modal. */
window.proceedToCashfree = function () {
  document.getElementById('payment-confirm-modal')?.classList.remove('visible');
  document.getElementById('instagram-details-modal')?.classList.add('visible');
};

/** Close the Instagram details modal. */
window.closeInstagramModal = function () {
  document.getElementById('instagram-details-modal')?.classList.remove('visible');
};

// "HOW?" image popup
document.getElementById('how-link')?.addEventListener('click', () => {
  openImageOverlay('drop.jpg');
});

// "BUY NOW" image popup
document.getElementById('btn-open-buy')?.addEventListener('click', () => {
  openImageOverlay('buy.jpg');
});

/** Creates a full-screen image overlay and appends it to the body. */
function openImageOverlay(src) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay-popup';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(12px);
  `;
  overlay.innerHTML = `
    <div style="position: relative; max-width: 95%; max-height: 92vh;">
      <img src="${src}" style="max-width: 100%; max-height: 92vh; border-radius: 20px; box-shadow: 0 15px 50px rgba(0,0,0,0.85);">
      <button
        onclick="this.closest('.overlay-popup').remove()"
        style="position: absolute; top: 18px; right: 18px; width: 42px; height: 42px;
               background: white; color: #111; border: none; border-radius: 50%;
               font-size: 24px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
               display: flex; align-items: center; justify-content: center;
               cursor: pointer; z-index: 100000;">✕</button>
    </div>
  `;
  document.body.appendChild(overlay);
}


// ── 5. Payment Success Handler ──

async function handlePaymentSuccess(orderId, response, packageData) {
  try {
    const user = window.cashTreasureUser;
    if (!user) return;

    // Mark the paid_order document as paid
    await updateDoc(doc(db, "paid_orders", orderId), {
      status:     "paid",
      payment_id: response.razorpay_payment_id,
      paid_at:    serverTimestamp(),
      signature:  response.razorpay_signature
    });

    // Create a tracked order for countdown + progress bar
    const orderResult = await createOrder(user.uid, {
      instagram_username: packageData.instagram_username || "Paid_Order",
      instagram_link:     packageData.instagram_link     || "",
      followers:          packageData.followers,
      credits_spent:      0,
      isPaidOrder:        true,
      paidAmount:         packageData.amount
    });

    if (orderResult.success) {
      // Populate and show success modal
      const detailsEl = document.getElementById('success-details');
      if (detailsEl) {
        detailsEl.innerHTML = `
          THE ORDER OF <b>${packageData.followers}</b> FOLLOWERS FOR <b>₹${packageData.amount}</b><br><br>
          IS SUCCESSFULLY PLACED<br><br>
          WE RECIEVED YOUR PAYMENT SUCCESSFULLY<br><br>
          WELL DELIVER FOLLOWERS WITHIN THE 24 HOURS FROM NOW
        `;
      }
      document.getElementById('payment-success-modal')?.classList.add('visible');

      // Send confirmation email if EmailJS is available
      if (typeof emailjs !== 'undefined') {
        emailjs.send("service_swt79ip", "template_urw0ymr", {
          user_email:     user.email,
          insta_username: "Paid Purchase",
          insta_link:     "Real Money Order",
          credits:        `₹${packageData.amount} - ${packageData.followers} Followers`,
          time_left:      "Within 24 hours delivery",
          order_time:     new Date().toLocaleString(),
          is_first_order: "Real Money Payment"
        });
      }
    }

  } catch (err) {
    console.error("Payment success handler error:", err);
    showToast("Payment Successful. We will deliver soon.", "success");
  }
}


// ── 6. Main Payment Function ──

// ── 6. Main Payment Function ──
export async function buyWithCashfree(packageData) {
  const user = window.cashTreasureUser;
  if (!user) return showToast("Please login first", "error");

  const canOrder = await canPlacePaidOrder(user.uid);
  if (!canOrder) return showToast("You can only order once every 12 hours", "error");

  const btn = document.querySelector('#confirm-instagram-btn');
  if (btn) btn.disabled = true;

  try {
    // ←←← UPDATE THIS URL WITH YOUR RAILWAY URL ←←←
    const backendUrl = "https://payment-backend-production-0b8d.up.railway.app";

    const res = await fetch(`${backendUrl}/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: packageData.amount,
        userId: user.uid,
        username: user.username || "User",
        email: user.email || "user@example.com",
        followers: packageData.followers
      })
    });

    const data = await res.json();

    if (!data.success || !data.payment_session_id) {
      console.error("Backend error:", data);
      return showToast(data.message || "Failed to create payment session", "error");
    }

    const cashfree = Cashfree({
      mode: "production"   // Change to "production" when you go live
    });

    cashfree.checkout({
      paymentSessionId: data.payment_session_id,
      redirectTarget: "_self"   // Better for mobile
    }).then(async (result) => {
      console.log("Payment Success:", result);
      showToast("Payment Successful! 🎉", "success");
      document.getElementById('payment-success-modal')?.classList.add('visible');
    }).catch(err => {
      console.error("Cashfree Error:", err);
      document.getElementById('payment-cancel-modal')?.classList.add('visible');
    });

  } catch (err) {
    console.error("Fetch Error:", err);
    showToast("Payment initialization failed. Try again.", "error");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── 7. Buy Page Initialization + Limited Offer Timer ──

export async function initBuyPage() {
  const user = window.cashTreasureUser;
  if (!user) return;

  let profile = await getUserProfile(user.uid);

  // Create a 60-minute offer window for new users
  if (!profile?.limitedOfferExpiry) {
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
    await updateDoc(doc(db, "users", user.uid), {
      limitedOfferExpiry: Timestamp.fromDate(expiryDate)
    });
    profile.limitedOfferExpiry = Timestamp.fromDate(expiryDate);
  }

  const expiryTime    = profile.limitedOfferExpiry.toDate().getTime();
  const isOfferActive = Date.now() < expiryTime;

  // Show / hide the limited-offer golden card
  const limitedCard = document.getElementById('limited-offer-card');
  if (limitedCard) {
    limitedCard.style.display = isOfferActive ? "flex" : "none";
  }

  if (isOfferActive) startLimitedTimer(expiryTime);

  // Attach pay button listeners (clone to remove any stale listeners first)
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
          <b>ARE YOU SURE YOU WANT TO PROCEED?</b>
        `;
      }
      document.getElementById('payment-confirm-modal')?.classList.add('visible');
    });
  });
}

/** Starts the countdown timer for the limited-offer card. */
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

// Confirm Instagram details → trigger Razorpay
document.getElementById('confirm-instagram-btn')?.addEventListener('click', () => {
  const username = document.getElementById('paid-ig-username').value.trim();
  const link     = document.getElementById('paid-ig-link').value.trim();

  if (!username) {
    showToast("Please enter Instagram username", "error");
    return;
  }

  if (link && !link.startsWith('https://www.instagram.com')) {
    showToast("Your Instagram link must start with https://www.instagram.com", "error");
    return;
  }

  currentPackageData.instagram_username = username;
  currentPackageData.instagram_link     = link;

  closeInstagramModal();
  setTimeout(() => buyWithCashfree(currentPackageData), 200);
});


// ── 8. Global Exports ──
window.initBuyPage    = initBuyPage;
window.buyWithCashfree = buyWithCashfree;
