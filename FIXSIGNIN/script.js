// ================================
// MOBILE DEVICE PROTECTION SYSTEM
// ================================

function isRealMobile() {

  const ua = navigator.userAgent || navigator.vendor || window.opera;

  const mobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

  const touchSupport =
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window;

  const coarsePointer =
    window.matchMedia("(pointer: coarse)").matches;

  const smallScreen =
    window.innerWidth <= 768 &&
    window.innerHeight <= 1024;

  return mobileUA && touchSupport && coarsePointer && smallScreen;
}



// ================================
// DEVTOOLS DETECTION
// ================================

function detectDevTools() {

  const threshold = 160;

  if (
    window.outerWidth - window.innerWidth > threshold ||
    window.outerHeight - window.innerHeight > threshold
  ) {
    return true;
  }

  return false;
}



// ================================
// MAIN SECURITY CHECK
// ================================

function enforceMobileOnly() {

  const overlay = document.getElementById("desktop-overlay");

  if (!overlay) return;

  const realMobile = isRealMobile();
  const devtoolsOpen = detectDevTools();

if (!realMobile)   {

    overlay.style.display = "flex";
    document.documentElement.style.overflow = "hidden";

  } else {

    overlay.style.display = "none";

  }

}



// Run checks
enforceMobileOnly();

window.addEventListener("resize", enforceMobileOnly);
window.addEventListener("orientationchange", enforceMobileOnly);


// Continuous devtools monitoring
setInterval(enforceMobileOnly, 1500);



// Disable right click
document.addEventListener("contextmenu", e => e.preventDefault());



// Block common devtools shortcuts
document.addEventListener("keydown", function(e) {

  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(e.key)) ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
  }

});

// ================================
// Professional Auth System
// Features: Firestore, Stay Logged In, Input Validation
// ================================

// Grab important DOM elements
const switchBtn = document.getElementById('switch-btn');
const switchText = document.getElementById('switch-text');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoImg = document.getElementById('site-logo');
const cashText = document.querySelector('.logo-box .footer-text');

// ================================
// Firebase Imports
// ================================
import { auth, db } from "../firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const provider = new GoogleAuthProvider();

// ================================
// FEATURE 1: STAY LOGGED IN (30 days)
// ================================
// Set persistence to LOCAL (stays logged in even after browser close)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("✅ Persistence set: Users stay logged in");
  })
  .catch((error) => {
    console.error("Persistence error:", error);
  });

// Check if user is already logged in on page load
onAuthStateChanged(auth, async (user) => {
if (user) {
    // User is logged in!
    console.log("✅ User already logged in:", user.email);
    
    // Update last login time in Firestore
    try {
  try {
  await updateDoc(doc(db, "users", user.uid), {
    last_login: serverTimestamp()
  });
} catch (e) {
  console.log("Skip last_login update");
}
    } catch (err) {
      console.log("Could not update last login");
    }
    
    // Optional: Auto-redirect to dashboard
    // Uncomment when ready:
    // window.location.href = "dashboard.html";
   } else {
    console.log("ℹ️ No user logged in");
  }
});

// ================================
// FEATURE 2: FIRESTORE - Save User Profile
// ================================
async function createUserProfile(user, username = null) {
  try {
    const userRef = doc(db, "users", user.uid);
    
    // Check if profile already exists
    const docSnap = await getDoc(userRef);
    
    if (!docSnap.exists()) {
      // Generate unique referral code
      const referralCode = "PRIME" + Math.floor(100000 + Math.random() * 900000).toString();

      // Create new profile with ALL fields matching firebase.js
      await setDoc(userRef, {
        uid: user.uid,
        avatar: "user1.jpg",
        email: user.email,
        username: username || user.displayName || user.email.split("@")[0],
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
        referralCode: referralCode,
        referredBy: "",
        referralCount: 0,
        referralCredited: false,
        primeViralBonusClaimed: false,
        referralCompletedUsers: [],
        total_checkins: 0,
        day3BonusClaimed: false,

        // Referral reward tracking
        referralReward1Claimed: false,
        referralReward2Claimed: false,
        referralReward3Shown: false,

        // Refer code entry tracking
        referCodeEntered: false,

        created_at: serverTimestamp(),
        last_login: serverTimestamp()
      });
      console.log("✅ User profile created in Firestore!");
    } else {
      // Update existing profile (last login)
      await updateDoc(userRef, {
        last_login: serverTimestamp()
      });
      console.log("✅ User profile updated!");
    }
  } catch (error) {
    console.error("❌ Firestore error:", error);
  }
}

// ================================
// FEATURE 3: INPUT VALIDATION
// ================================

// Email Validation
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password Strength Checker
function checkPasswordStrength(password) {
  let strength = 0;
  const feedback = [];
  
  // Length check (REQUIRED)
  if (password.length >= 6) {
    strength += 40;
  } else {
    feedback.push("At least 6 characters");
  }
  
  // Uppercase check (OPTIONAL - adds strength but not required)
  if (/[A-Z]/.test(password)) {
    strength += 20;
  }
  
  // Lowercase check (OPTIONAL)
  if (/[a-z]/.test(password)) {
    strength += 20;
  }
  
  // Number check (OPTIONAL)
  if (/[0-9]/.test(password)) {
    strength += 10;
  }
  
  // Special character check (OPTIONAL)
  if (/[^A-Za-z0-9]/.test(password)) {
    strength += 10;
  }
  
  return { strength, feedback };
}

// Username Validation
function validateUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// Apply validation to inputs
function setupInputValidation() {
  // Email validation (both forms)
  const emailInputs = [
    document.getElementById('login-email'),
    document.getElementById('register-email')
  ];
  
  emailInputs.forEach(input => {
    if (!input) return;
    
    input.addEventListener('input', (e) => {
      const email = e.target.value.trim();
      const parent = input.parentElement;
      
      // Remove existing validation classes
      parent.classList.remove('valid', 'invalid');
      
      if (email.length > 0) {
        if (validateEmail(email)) {
          parent.classList.add('valid');
        } else {
          parent.classList.add('invalid');
        }
      }
    });
  });
  
  // Username validation (register form)
  const usernameInput = document.getElementById('register-username');
  if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
      const username = e.target.value.trim();
      const parent = usernameInput.parentElement;
      
      parent.classList.remove('valid', 'invalid');
      
      if (username.length > 0) {
        if (validateUsername(username)) {
          parent.classList.add('valid');
        } else {
          parent.classList.add('invalid');
        }
      }
    });
  }
  
  // Password strength (register form)
  const registerPassword = document.getElementById('register-password');
  if (registerPassword) {
    // Create strength indicator
    const strengthBar = document.createElement('div');
    strengthBar.className = 'password-strength-bar';
    strengthBar.innerHTML = `
      <div class="strength-bar-fill"></div>
      <div class="strength-text">Password strength</div>
    `;
    
    // Insert AFTER the input-group div (below the password field)
    const inputGroup = registerPassword.closest('.input-group');
    if (inputGroup && inputGroup.parentNode) {
      inputGroup.parentNode.insertBefore(strengthBar, inputGroup.nextSibling);
    }
    
    registerPassword.addEventListener('input', (e) => {
      const password = e.target.value;
      const { strength, feedback } = checkPasswordStrength(password);
      
      const fill = strengthBar.querySelector('.strength-bar-fill');
      const text = strengthBar.querySelector('.strength-text');
      
      if (password.length === 0) {
        strengthBar.style.display = 'none';
        return;
      }
      
      strengthBar.style.display = 'block';
      fill.style.width = strength + '%';
      
      // Update color and text
      if (strength < 50) {
        fill.style.background = '#ff4444';
        text.textContent = 'Weak password';
        text.style.color = '#ff4444';
      } else if (strength < 75) {
        fill.style.background = '#ffaa00';
        text.textContent = 'Medium password';
        text.style.color = '#ffaa00';
      } else {
        fill.style.background = '#00cc66';
        text.textContent = 'Strong password!';
        text.style.color = '#00cc66';
      }
      
      // Show feedback
      if (feedback.length > 0) {
        text.textContent = 'Need: ' + feedback.join(', ');
        text.style.color = '#ff8800';
      }
    });
  }
}

// ================================
// PUZZLE LOADER ANIMATION SYSTEM
// ================================
function createPuzzleLoader() {
  const overlay = document.createElement('div');
  overlay.id = 'puzzle-loader-overlay';
  overlay.innerHTML = `
    <div class="puzzle-container">
      <div id="puzzle-box" class="puzzle-box puzzle-shadow"></div>
      <div class="puzzle-message-wrap">
        <div id="puzzle-message" class="puzzle-message">
          <span id="puzzle-line1" class="puzzle-line"></span>
          <span id="puzzle-line2" class="puzzle-line"></span>
        </div>
        <div id="puzzle-dots" class="puzzle-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

async function runPuzzleAnimation(username) {
  const ROWS = 3, COLS = 3;
  const SPIRAL = [0,1,2,5,8,7,6,3,4];
  const STAGGER = 300;
  const TILE_MOVE_DUR = 900;
  const PUZZLE_RISE_PIX = 60;
  const TYPE_TOTAL_MS = 1500;
  const MIN_CHAR_MS = 12;

  const puzzleBox = document.getElementById('puzzle-box');
  const messageEl = document.getElementById('puzzle-message');
  const line1El = document.getElementById('puzzle-line1');
  const line2El = document.getElementById('puzzle-line2');
  const dotsEl = document.getElementById('puzzle-dots');

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function createTiles() {
    puzzleBox.innerHTML = '';
    const tiles = [];

    for(let r = 0; r < ROWS; r++) {
      for(let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        tile.dataset.index = String(idx);

        tile.style.left = `calc(${c} * (100% / ${COLS}) - 0.5px)`;
        tile.style.top = `calc(${r} * (100% / ${ROWS}) - 0.5px)`;
        tile.style.backgroundPosition = `${(c * 100) / (COLS - 1)}% ${(r * 100) / (ROWS - 1)}%`;

        const rx = (Math.random() - 0.5) * (puzzleBox.clientWidth * 0.6);
        const ry = (Math.random() - 0.5) * (puzzleBox.clientHeight * 0.6);
        const rot = (Math.random() - 0.5) * 60;
        const scale = 0.6 + Math.random() * 0.6;
        tile.style.transform = `translate3d(${rx}px, ${ry}px, 0) rotateZ(${rot}deg) scale(${scale})`;

        puzzleBox.appendChild(tile);
        tiles.push(tile);
      }
    }

    if(tiles[8]) {
      tiles[8].style.clipPath = 'polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)';
    }

    return tiles;
  }

  async function assembleTiles(tiles) {
    tiles.forEach(t => {
      t.style.transition = `transform ${TILE_MOVE_DUR}ms cubic-bezier(.34,1.56,.64,1)`;
    });

    for(let step = 0; step < SPIRAL.length; step++) {
      const idx = SPIRAL[step];
      setTimeout(() => {
        tiles[idx].style.transform = 'translate3d(0,0,0) rotateZ(0deg) scale(1)';
      }, step * STAGGER);
    }

    const finalDelay = (SPIRAL.length - 1) * STAGGER + TILE_MOVE_DUR + 80;
    await wait(finalDelay);
  }

  async function typeInto(el, text, charInterval) {
    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'puzzle-cursor';
    el.appendChild(cursor);

    for(let i = 0; i < text.length; i++) {
      cursor.insertAdjacentText('beforebegin', text[i]);
      await wait(charInterval);
    }

    await wait(220);
    cursor.remove();
  }

  const tiles = createTiles();
  await wait(300);
  await assembleTiles(tiles);

  puzzleBox.style.transform = `translateY(-${PUZZLE_RISE_PIX}px)`;
  await wait(700);

  messageEl.style.opacity = '1';
  
  const L1 = `Welcome ${username}!`;
  const L2 = 'PRIME-FOLLOWER';
  const totalChars = Math.max(1, L1.length + L2.length);
  const baseInterval = Math.max(MIN_CHAR_MS, Math.floor(TYPE_TOTAL_MS / totalChars));

  await typeInto(line1El, L1, baseInterval);
  await wait(120);
  await typeInto(line2El, L2, baseInterval);

  dotsEl.classList.add('show');
  await wait(2000);
}

async function showPuzzleLoader(username) {
  const overlay = createPuzzleLoader();
  overlay.style.display = 'flex';

  await runPuzzleAnimation(username);

  // 🔐 AFTER EXACTLY 1 SECONDS → GO TO MAIN APP
  setTimeout(() => {
window.location.href = "../index.html";
  }, 1000);
}


// ================================
// Helper Functions
// ================================
function fadeLogoAndText() {
  if (!logoImg || !cashText) return;
  logoImg.classList.add('logo-fade');
  cashText.classList.add('logo-fade');
  setTimeout(() => {
    logoImg.classList.remove('logo-fade');
    cashText.classList.remove('logo-fade');
  }, 1000);
}

function clearInlineMessages() {
  ['login-msg','register-msg','forgot-msg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
      el.textContent = '';
      el.className = 'form-msg';
    }
  });
}

function showMessage(targetId, message, type = "success") {
  const msgEl = document.getElementById(targetId);
  if (!msgEl) return;
  msgEl.textContent = message;
  msgEl.className = `form-msg ${type}`;
  msgEl.style.display = "block";
  setTimeout(() => { msgEl.style.display = "none"; }, 3000);
}

function setupPasswordToggle(input, toggle) {
  if (!input || !toggle) return;

  input.addEventListener('input', () => {
    if (input.value.length > 0) {
      toggle.classList.add('visible');
    } else {
      toggle.classList.remove('visible');
      input.type = 'password';
      const eye = toggle.querySelector('i');
      if (eye) {
        eye.classList.remove('fa-eye-slash');
        eye.classList.add('fa-eye');
      }
    }
  });

  toggle.addEventListener('click', () => {
    const eyeIcon = toggle.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
    input.focus();
  });
}

async function setupGoBackButton() {
  const btn = document.getElementById('pc-warning-go-back');
  const overlay = document.getElementById('pc-warning');
  const note = document.getElementById('pc-warning-note');

  if (!btn || !overlay) return;

  btn.addEventListener('click', async (e) => {
    try {
      btn.disabled = true;
      btn.textContent = 'Signing out...';

      try {
        if (auth && typeof auth.signOut === 'function') {
          await auth.signOut();
          btn.textContent = 'Signed out — closing...';
        }
      } catch (signErr) {
        console.warn('Sign-out failed or auth not ready:', signErr);
      }

      try { localStorage.clear(); } catch (err) { /* ignore */ }
      try { sessionStorage.clear(); } catch (err) { /* ignore */ }

      overlay.style.display = 'none';
      document.documentElement.classList.remove('pc-warning-open');
      document.body.classList.remove('pc-warning-open');

      try {
        window.open('', '_self');
        window.close();
      } catch (closeErr) {
        console.warn('window.close() attempt failed:', closeErr);
      }

      setTimeout(() => {
        try {
          if (note) {
            note.style.display = 'block';
            note.textContent = 'If this tab did not close automatically, please close this tab now.';
          }
          window.location.replace('about:blank');
        } catch (redirErr) {
          console.warn('Fallback redirect failed:', redirErr);
        }
      }, 350);
    } finally {
      setTimeout(() => {
        if (btn && !btn.disabled) return;
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Go Back';
        }
      }, 1500);
    }
  });
}

// ================================
// DOM INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Initializing professional auth system...");

  // Set login as active by default
  if (loginForm && !loginForm.classList.contains('active') && !registerForm.classList.contains('active')) {
    loginForm.classList.add('active');
  }

  // Setup password toggles
  setupPasswordToggle(
    document.getElementById("login-password"),
    document.querySelector("#login-form .toggle-pass")
  );
  setupPasswordToggle(
    document.getElementById("register-password"),
    document.querySelector("#register-form .toggle-pass")
  );

  // Setup input validation
  setupInputValidation();

  // Setup go back button
  setupGoBackButton();

  // Switch button handler
  if (switchBtn && switchText && loginForm && registerForm) {
    switchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fadeLogoAndText();
      clearInlineMessages();

      if (loginForm.classList.contains('active')) {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        switchBtn.textContent = "Login";
        switchText.textContent = "Already have an account?";
        const firstReg = document.getElementById('register-username') || document.getElementById('register-email');
        if (firstReg) setTimeout(() => firstReg.focus(), 100);
      } else {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        switchBtn.textContent = "Register";
        switchText.textContent = "Don't have an account?";
        const firstLogin = document.getElementById('login-email');
        if (firstLogin) setTimeout(() => firstLogin.focus(), 100);
      }

      document.querySelectorAll('.toggle-pass').forEach(btn => {
        btn.classList.remove('visible');
        const eye = btn.querySelector('i');
        if (eye) { 
          eye.classList.remove('fa-eye-slash'); 
          eye.classList.add('fa-eye'); 
        }
      });
    });
  }

  // Keyboard accessibility
  if (switchBtn) {
    switchBtn.addEventListener('keyup', (e) => {
      if (e.key === "Enter" || e.key === " ") {
        switchBtn.click();
      }
    });
  }

  document.querySelectorAll('input[type="password"]').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const form = input.closest('form');
        if (form) form.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  });

  console.log("✅ Professional auth system initialized!");
});

// ================================
// Firebase Register
// ================================
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();

    // Validation
    if (!username || !email || !password) {
      showMessage("register-msg", "Please fill in all fields!", "error");
      return;
    }

    if (!validateUsername(username)) {
      showMessage("register-msg", "Username: 3-20 chars, letters/numbers/underscore only", "error");
      return;
    }

    if (!validateEmail(email)) {
      showMessage("register-msg", "Please enter a valid email address", "error");
      return;
    }

    if (password.length < 6) {
      showMessage("register-msg", "Password must be at least 6 characters", "error");
      return;
    }

    // Removed strength requirement check - any 6+ character password is accepted now

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: username
      });

      // Create user profile in Firestore FIRST (before sending verification)
      await createUserProfile(user, username);

      // Send verification email (but DON'T sign out - let them stay logged in)
      await sendEmailVerification(user);

      showMessage("register-msg", "✅ Account created! Logging you in...", "success");
      
      // Wait a moment then show puzzle loader and log them in
      setTimeout(() => {
        showPuzzleLoader(username);
      }, 800);

    } catch (err) {
      let errorMessage = "❌ Something went wrong. Please try again.";
      switch (err.code) {
        case "auth/invalid-email": errorMessage = "❌ Please enter a valid email."; break;
        case "auth/email-already-in-use": errorMessage = "❌ Email already registered. Try logging in!"; break;
        case "auth/weak-password": errorMessage = "❌ Password too weak."; break;
      }
      showMessage("register-msg", errorMessage, "error");
    }
  });
}

// ================================
// Firebase Login
// ================================
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
      showMessage("login-msg", "⚠ Please enter email and password.", "error");
      return;
    }

    if (!validateEmail(email)) {
      showMessage("login-msg", "❌ Invalid email format", "error");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // REMOVED email verification check - users can login even if not verified
      
      // Create/update user profile in Firestore
      await createUserProfile(user);

      const username = user.displayName || email.split("@")[0];
      showMessage("login-msg", `👋 Welcome back, ${username}!`, "success");
      
      setTimeout(() => {
        showPuzzleLoader(username);
      }, 500);

    } catch (err) {
      console.error("Login error:", err.code, err.message);

      let errorMessage = "❌ Something went wrong. Please try again.";
      switch (err.code) {
        case "auth/invalid-email":
          errorMessage = "❌ Invalid email format.";
          break;
        case "auth/user-not-found":
          errorMessage = "❌ No account found. Please register first!";
          break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
          errorMessage = "❌ Wrong password! Try again.";
          break;
        case "auth/too-many-requests":
          errorMessage = "❌ Too many failed attempts. Try again later.";
          break;
        case "auth/user-disabled":
          errorMessage = "❌ This account has been disabled.";
          break;
      }
      showMessage("login-msg", errorMessage, "error");
    }
  });
}

// ================================
// Google Sign-In/Register
// ================================
const googleSignInBtn = document.getElementById("google-signin-btn");
if (googleSignInBtn) {
  googleSignInBtn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create/update profile in Firestore
      await createUserProfile(user);
      
      const username = user.displayName || user.email.split("@")[0];
      showMessage("login-msg", `✅ Welcome ${username}!`, "success");
      
      setTimeout(() => {
        showPuzzleLoader(username);
      }, 500);
      
    } catch (err) {
      let errorMessage = "❌ Google Sign-In failed.";
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "❌ You closed the popup.";
      }
      showMessage("login-msg", errorMessage, "error");
    }
  });
}

// Google Register button
const googleRegisterBtns = document.querySelectorAll(".google-btn");
googleRegisterBtns.forEach((btn, index) => {
  if (index === 0) return; // Skip login form button
  
  btn.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create profile in Firestore
      await createUserProfile(user);
      
      const username = user.displayName || user.email.split("@")[0];
      showMessage("register-msg", `✅ Welcome ${username}!`, "success");
      
      setTimeout(() => {
        showPuzzleLoader(username);
      }, 500);
      
    } catch (err) {
      let errorMessage = "❌ Google Sign-Up failed.";
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "❌ You closed the popup.";
      }
      showMessage("register-msg", errorMessage, "error");
    }
  });
});

// ================================
// Forgot Password
// ================================
const forgotPassBtn = document.getElementById("forgot-pass");
if (forgotPassBtn) {
  forgotPassBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    
    if (!email) {
      showMessage("forgot-msg", "Please enter your email first.", "error");
      return;
    }
    
    if (!validateEmail(email)) {
      showMessage("forgot-msg", "Please enter a valid email address", "error");
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, email);
      showMessage("forgot-msg", "✅ Reset link sent! Check your email.", "success");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        showMessage("forgot-msg", "No account found with this email", "error");
      } else {
        showMessage("forgot-msg", "❌ " + err.message, "error");
      }
    }
  });
}

console.log("✅ Professional auth system loaded successfully!");