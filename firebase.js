// ================================
// Prime Follower - Firebase Module
// ================================

// ── 1. Firebase Initialization & Config ──────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLlnJt8cdlf6s6nfVSdwW3AexieZe9q6I",
  authDomain: "prime-follower.firebaseapp.com",
  projectId: "prime-follower",
  storageBucket: "prime-follower.firebasestorage.app",
  messagingSenderId: "407872287170",
  appId: "1:407872287170:web:3cb424d204914bd50d265b",
  measurementId: "G-765QSVVHTJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── 2. Exports ────────────────────────────────────────────────────────────────

export {
  auth, db,
  onAuthStateChanged, signOut,
  Timestamp, serverTimestamp, increment,
  doc, getDoc, setDoc, updateDoc,
  addDoc, collection, query, where, orderBy, limit, getDocs
};

// ── 3. User Profile Management ───────────────────────────────────────────────

/**
 * Fetches the user profile. Auto-creates it if it doesn't exist yet.
 */
export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return snap.data();

  // Profile missing — create with defaults
  await createUserProfile(uid, {});
  const newSnap = await getDoc(userRef);
  return newSnap.data();
}

/**
 * Creates a new user profile document with safe defaults.
 * If the profile already exists, only updates last_login.
 */
export async function createUserProfile(uid, data) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
  await setDoc(userRef, {
  uid,
  avatar: "user1.jpg",
  email: data.email || "",
  username: data.username || "",
  credits: 0,
  total_earned: 0,
  daily_ads_watched: 0,
  daily_ads_date: null,
  daily_credits_earned: 0,

  // Daily checkin
  lastCheckinDate: null,
  checkinDay: 0,
  checkinCycle: 0,
  last_checkin: null,
  checkin_streak: 0,

  // Followers
  total_followers_ordered: 0,

  // PRIME VIRAL BONUS SYSTEM
  referredBy: "",
  referralCount: 0,
  referralCredited: false,
  primeViralBonusClaimed: false,
  referralCompletedUsers: [],
  total_checkins: 0,

  created_at: serverTimestamp(),
  last_login: serverTimestamp()
});
  } else {
    await updateDoc(userRef, { last_login: serverTimestamp() });
  }
}

// ── 4. Order & Transaction Helpers ───────────────────────────────────────────

/**
 * Logs a credit/debit entry to the transactions collection.
 */
export async function logTransaction(uid, action, amount) {
  await addDoc(collection(db, "transactions"), {
    user_id: uid,
    action,
    amount,
    date: serverTimestamp()
  });
}

/**
 * Returns how many ads the user has watched today.
 * Resets the counter if the calendar day has changed.
 */
export async function getDailyAdsCount(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return 0;

  const data = snap.data();
  const today = new Date().toISOString().split("T")[0];
  const adsDate = data.daily_ads_date
    ? data.daily_ads_date.toDate().toISOString().split("T")[0]
    : null;

  if (adsDate !== today) {
    await updateDoc(userRef, {
      daily_ads_watched: 0,
      daily_credits_earned: 0,
      daily_ads_date: Timestamp.now()
    });
    return 0;
  }

  return data.daily_ads_watched || 0;
}

/**
 * Places a follower order, deducts credits, and logs the transaction.
 */
export async function createOrder(uid, orderData) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return { success: false, message: "User not found" };

  const data = snap.data();
  const currentCredits = data.credits || 0;
  const totalOrdered = data.total_followers_ordered || 0;
  const cost = Number(orderData.credits_spent);

  if (currentCredits < cost) {
    return { success: false, message: "Not enough credits!" };
  }

  if (totalOrdered + orderData.followers >= 1000) {
    return { success: false, message: "Maximum 1000 followers per account reached!" };
  }

  const orderTime = Timestamp.now();
  const completionTime = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const orderRef = await addDoc(collection(db, "orders"), {
    user_id: uid,
    instagram_username: orderData.instagram_username,
    instagram_link: orderData.instagram_link || "",
    followers: orderData.followers,
    credits_spent: cost,
    order_time: orderTime,
    completion_time: completionTime,
    status: "processing"
  });

  await updateDoc(userRef, {
    uid,
    credits: increment(-cost),
    total_followers_ordered: increment(orderData.followers)
  });

  await logTransaction(uid, `Order ${orderData.followers} followers`, -cost);

  return { success: true, orderId: orderRef.id, completionTime };
}

/**
 * Fetches the most recent transactions for the user (default: 50).
 */
export async function getTransactions(uid, limitCount = 50) {
  const q = query(
    collection(db, "transactions"),
    where("user_id", "==", uid),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Fetches all currently-processing orders for the user.
 */
export async function getActiveOrders(uid) {
  const q = query(
    collection(db, "orders"),
    where("user_id", "==", uid),
    where("status", "==", "processing"),
    orderBy("order_time", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Submits a contact/support message from the user.
 */
export async function submitContactMessage(uid, data) {
  await addDoc(collection(db, "contact_messages"), {
    user_id: uid,
    subject: data.subject,
    message: data.message,
    date: serverTimestamp(),
    status: "pending"
  });
  return { success: true };
}

// ── 5. Daily Check-in System ─────────────────────────────────────────────────

/**
 * Weighted random selector.
 * @param {Array<{value: *, weight: number}>} weights
 */
function weightedRandom(weights) {
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let rand = Math.random() * total;
  for (const w of weights) {
    rand -= w.weight;
    if (rand <= 0) return w.value;
  }
  return weights[weights.length - 1].value;
}

/**
 * Claims the daily check-in reward for a 7-day repeating cycle.
 * Day 4 requires 5 ads watched; Day 7 requires 10 ads watched.
 * Must be triggered by user action (guarded by window.__ALLOW_CHECKIN__).
 */
export async function claimDailyCheckin(uid) {
  if (!window.__ALLOW_CHECKIN__) {
    console.warn("Blocked unauthorized check-in call");
    return { success: false, message: "Unauthorized trigger" };
  }

  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return { success: false, message: "User not found" };

  const data = snap.data();
  const today = new Date().toISOString().split("T")[0];

  // Prevent double claim on the same calendar day
  if (data.lastCheckinDate) {
    const lastDate = data.lastCheckinDate.toDate().toISOString().split("T")[0];
    if (lastDate === today) {
      return { success: false, message: "Already claimed today😅!" };
    }
  }

  // Determine ads watched today
  const adsDate = data.daily_ads_date
    ? data.daily_ads_date.toDate().toISOString().split("T")[0]
    : null;
  const adsWatchedToday = adsDate === today ? (data.daily_ads_watched || 0) : 0;

  // Advance the day counter (wraps at 7)
  let checkinDay = (data.checkinDay || 0) + 1;
  let checkinCycle = data.checkinCycle || 0;

  if (checkinDay > 7) {
    checkinDay = 1;
    checkinCycle += 1;
  }

  // Ad requirements for gated days
  if (checkinDay === 4 && adsWatchedToday < 5) {
    return { success: false, message: `Watch ${5 - adsWatchedToday} more ads to unlock Day 4` };
  }
  if (checkinDay === 7 && adsWatchedToday < 10) {
    return { success: false, message: `Watch ${10 - adsWatchedToday} more ads to unlock Day 7` };
  }

  // Determine reward
  let reward = 0;
  let isOops = false;
  let isGift = false;

  switch (checkinDay) {
    case 1: reward = 1; break;
    case 2: reward = 2; break;
    case 3: reward = 2; break;
    case 4: reward = checkinCycle === 0 ? 3 : 2; break;
    case 5: reward = 0; isOops = true; break;
    case 6: reward = 1; break;
    case 7:
      isGift = true;
      reward = checkinCycle === 0
        ? 5
        : weightedRandom([
            { value: 5, weight: 5 },
            { value: 3, weight: 60 },
            { value: 4, weight: 35 }
          ]);
      break;
  }

  // On day 7 completion, increment cycle
  const newCycle = checkinDay === 7 ? checkinCycle + 1 : checkinCycle;

 const updateData = {
  lastCheckinDate: Timestamp.now(),
  last_checkin: Timestamp.now(),
  checkinDay,
  checkinCycle: newCycle,
  checkin_streak: checkinDay,

  // PRIME VIRAL BONUS
  total_checkins: increment(1)
};

  if (reward > 0) {
    updateData.credits = increment(reward);
    updateData.total_earned = increment(reward);
  }

  await updateDoc(userRef, updateData);

  if (reward > 0) {
    await logTransaction(uid, `Daily Check-In (Day ${checkinDay})`, reward);
  }

  return { success: true, reward, day: checkinDay, cycle: newCycle, isOops, isGift };
}

console.log("✅ Firebase module loaded.");