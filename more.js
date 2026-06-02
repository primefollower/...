// ================================
// Prime Follower - More Page Module
// About, Privacy, Terms, Help/FAQ, Settings, Logout
// ================================

// ── 1. Imports ────────────────────────────────────────────────────────────────

import { auth, signOut } from "./firebase.js";

// ── 2. Page Content ───────────────────────────────────────────────────────────

/**
 * Static content for each detail overlay page.
 * Keys match the `data-page` attribute on `.more-item` elements.
 */
const pageContent = {

  about: {
    title: "About Us",
    body: `
      <p><b>About Us – Prime Follower</b></p>

      <p>Welcome to <b>Prime Follower 🚀</b>, a platform built to help creators grow their presence while keeping the experience simple, fair, and rewarding.</p>

      <p>At Prime Follower, we believe every creator deserves the opportunity to grow and be seen. Whether you're just starting out or building your online brand, our mission is to provide a smooth and engaging way for users to expand their social reach.</p>

      <p><b>🌟 Our Mission</b></p>
      <p>Our goal is simple: help users grow their social presence in a fun and rewarding way. Prime Follower was created to give users a system where they can earn credits, participate daily, and unlock follower rewards through consistent engagement.</p>

      <p><b>💡 What Makes Prime Follower Different</b></p>
      <p>
        🎯 User-First Experience – Every feature is designed to be simple and enjoyable.<br>
        🔒 Respect for Users – We value your time and participation.<br>
        ⚡ Simple Reward System – Earn credits and use them for follower orders.<br>
        🎁 Daily Rewards – Stay active and unlock bonuses.<br>
        📱 Mobile-Focused Design – Built to feel like a modern mobile app.
      </p>

      <p><b>🤝 Our Commitment</b></p>
      <p>
        💬 Listening to user feedback<br>
        🛠 Continuously improving the platform<br>
        ⚖ Keeping the system fair and transparent<br>
        🔐 Protecting user privacy and data
      </p>

      <p><b>🚀 Our Vision</b></p>
      <p>We want Prime Follower to become a platform where creators feel motivated, rewarded, and supported.</p>

      <p><b>❤️ Thank You</b></p>
      <p>Thank you for being part of Prime Follower. Your support helps us continue building and improving the platform.</p>
      <p>— Team Prime Follower</p>
    `
  },

  privacy: {
    title: "Privacy Policy",
    body: `
      <p><b>🔒 Privacy Policy – Prime Follower</b></p>

      <p>At Prime Follower, your privacy is extremely important to us. We believe every user deserves a safe and respectful environment while using our platform. This Privacy Policy explains how we collect, use, and protect your information when you use Prime Follower.</p>

      <div class="policy-section">
        <div class="policy-title">📌 Info We Collect</div>
        <div class="policy-item"><span class="policy-icon">📧</span><div>Email Address – Used for account creation and login.</div></div>
        <div class="policy-item"><span class="policy-icon">👤</span><div>Username – Used to identify your account within the platform.</div></div>
        <div class="policy-item"><span class="policy-icon">📱</span><div>Device Information – Helps improve security and performance.</div></div>
        <div class="policy-item"><span class="policy-icon">📊</span><div>Usage Data – Helps us improve the platform experience.</div></div>
      </div>

      <p>We do not collect unnecessary personal data.</p>

      <p><b>🎯 How We Use Your Information</b></p>
      <p>
        ⚙️ Provide and maintain our services<br>
        🔐 Secure user accounts<br>
        📈 Improve features and user experience<br>
        🛠 Fix bugs and improve performance<br>
        💬 Respond to user support requests
      </p>

      <p><b>🔒 Data Protection</b></p>
      <p>
        🛡 Secure authentication systems<br>
        🔐 Protected databases<br>
        ⚙️ Trusted backend services
      </p>
      <p>We continuously work to keep Prime Follower safe and secure for everyone.</p>

      <p><b>🤝 Sharing of Information</b></p>
      <p>We respect our users and do not sell or trade personal information. Your information may only be shared when required by law, necessary to operate the platform, or when using trusted third-party services that help run the app.</p>

      <p><b>📱 Third-Party Services</b></p>
      <p>
        ☁ Firebase for authentication and database<br>
        📧 Email services for support messages<br>
        📊 Analytics tools to improve the platform
      </p>

      <p><b>🔄 Updates to This Policy</b></p>
      <p>We may update this Privacy Policy from time to time. Updates will always be reflected on this page.</p>

      <p><b>📩 Contact Us</b></p>
      <p>If you have any questions, you can contact us through the Contact Us section inside Prime Follower.</p>
      <p>Thank you for trusting Prime Follower. 💙</p>
    `
  },

  terms: {
    title: "Terms & Conditions",
    body: `
      <p><b>📜 Terms & Conditions – Prime Follower</b></p>

      <p>Welcome to Prime Follower. By accessing or using our platform, you agree to follow these terms and conditions.</p>

      <p><b>✅ Acceptance of Terms</b></p>
      <p>
        📌 Follow these Terms & Conditions<br>
        📌 Use the platform responsibly<br>
        📌 Respect other users and the system
      </p>

      <p><b>👤 User Accounts</b></p>
      <p>
        🔐 Keeping login details secure<br>
        📧 Providing accurate information<br>
        ⚠ Not sharing their account with others
      </p>

      <p><b>🎯 Platform Usage</b></p>
      <p>Prime Follower allows users to earn credits and use them for follower orders. Users must use the platform fairly, follow system rules, and respect platform limits.</p>

      <p><b>🚫 Prohibited Activities</b></p>
      <p>
        ❌ Creating multiple accounts to exploit rewards<br>
        ❌ Using bots or automated tools<br>
        ❌ Attempting to hack or damage the platform<br>
        ❌ Any activity that disrupts the system
      </p>
      <p>Accounts violating these rules may be restricted or permanently removed.</p>

      <p><b>📊 Rewards & Credits</b></p>
      <p>
        💠 Credits have no real-world monetary value<br>
        💠 Credits are used only within the platform<br>
        💠 Reward systems may change as the platform evolves
      </p>

      <p><b>🔄 Updates</b></p>
      <p>We may update these terms as the platform grows. Continued use means you accept the updated terms.</p>

      <p><b>📩 Contact</b></p>
      <p>If you have questions, please contact us through the Contact section inside the platform. Thank you for using Prime Follower.</p>
    `
  },

  help: {
    title: "Help / FAQ",
    body: buildFAQHTML([
      ["1. ❓ How do I earn credits?",                                "➡️ Watch ads or claim daily check-in rewards."],
      ["2. ❓ Why credits not updating?",                             "➡️ Refresh app or wait for real-time sync."],
      ["3. ❓ Why order history empty?",                              "➡️ No transactions yet or filter tab selected."],
      ["4. ❓ How to order followers?",                               "➡️ Go to ORDER, enter username, confirm order."],
      ["5. ❓ When will followers arrive?",                           "➡️ Within 24 hours after placing order."],
      ["6. ❓ Why check-in locked today?",                            "➡️ Watch required ads to unlock that day."],
      ["7. ❓ What is daily ad limit?",                               "➡️ You can watch up to 20 ads daily."],
      ["8. ❓ Can I get refund credits?",                             "➡️ No, credits used are non-refundable."],
      ["9. ❓ Why insufficient credits error?",                       "➡️ Your balance is lower than order cost."],
      ["10. ❓ Is my account safe here?",                             "➡️ Yes, but avoid misuse or rule breaking."],
      ["11. ❓ Can I get refund of followers bought with money?",     "➡️ No refund according to our policy."],
      ["12. ❓ Is this safe to pay money on this app?",               "➡️ Yes, 100% safe with Razorpay payment system."],
      ["13. ❓ Is there any limit of getting followers in an account?","➡️ Yes, limit of 100k / 1 lakh followers per account."],
      ["14. ❓ How can I contact Prime Follower?",                    "➡️ Tap the first button (Contact) in the bottom navigation."],
      ["15. ❓ What is the best plan to get followers?",              "➡️ The best plan is 1000 followers for ₹99."],
      ["16. ❓ What is the benefit of joining Telegram & WhatsApp?",  "➡️ You will get coupon codes for exclusive offers."],
      ["17. ❓ How to join Telegram group / WhatsApp channel?",       "➡️ Scroll to bottom on Home page. You will see both options."],
      ["18. ❓ How can I change my avatar?",                          "➡️ Click on the top left user icon → then tap on your current avatar."],
      ["19. ❓ Can I change my username and Gmail address?",          "➡️ This option is not available right now but will come soon."],
      ["20. ❓ When will the Refer Friends option come?",             "➡️ It is under development. Expected soon."]
    ])
  }
};

// ── 3. FAQ HTML Builder ───────────────────────────────────────────────────────

/**
 * Generates the FAQ accordion HTML from a 2D array of [question, answer] pairs.
 * Extracted so the pageContent object stays declarative and easy to edit.
 * @param {Array<[string, string]>} items
 * @returns {string}
 */
function buildFAQHTML(items) {
  const rows = items.map((item, i) => `
    <div class="faq-item">
      <div class="faq-question" data-index="${i}">${item[0]}</div>
      <div class="faq-answer">${item[1]}</div>
    </div>`).join("");
  return `<div class="faq-container">${rows}</div>`;
}

// ── 4. Navigation & Detail Overlay Logic ─────────────────────────────────────

document.querySelectorAll(".more-item[data-page]").forEach(item => {
  item.addEventListener("click", () => {
    const content = pageContent[item.dataset.page];
    if (!content) return;

    // Hide the close button for overlay pages (back arrow is used instead)
    const closeBtn = document.getElementById("detail-close");
    if (closeBtn) closeBtn.style.display = "none";

    document.getElementById("detail-title").textContent = content.title;
    document.getElementById("detail-body").innerHTML = content.body;
    document.getElementById("detail-overlay").classList.add("visible");
    document.getElementById("bottom-nav").style.display = "none";
  });
});

document.getElementById("detail-back")?.addEventListener("click", () => {
  document.getElementById("detail-overlay").classList.remove("visible");
  document.getElementById("bottom-nav").style.display = "flex";
});

// ── 5. FAQ Accordion Handler ──────────────────────────────────────────────────

// Event delegation handles clicks on dynamically-rendered FAQ items
document.addEventListener("click", (e) => {
  const question = e.target.closest(".faq-question");
  if (!question) return;

  const answer = question.nextElementSibling;
  if (!answer) return;

  // Collapse any other open answer
  document.querySelectorAll(".faq-answer").forEach(a => {
    if (a !== answer) a.classList.remove("active");
  });

  answer.classList.toggle("active");
});

// ── 6. Logout with Confirmation Modal ────────────────────────────────────────

document.getElementById("btn-logout")?.addEventListener("click", () => {
  // Not logged in — redirect straight to sign-in page
  if (!auth.currentUser) {
    window.location.href = "../FIXSIGNIN/index.html";
    return;
  }
  document.getElementById("logout-modal").classList.add("visible");
});

document.getElementById("logout-cancel")?.addEventListener("click", () => {
  document.getElementById("logout-modal").classList.remove("visible");
});

document.getElementById("logout-yes")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.showToast?.("Logged out successfully.");
    document.getElementById("logout-modal").classList.remove("visible");
    setTimeout(() => { window.location.href = "index.html"; }, 500);
  } catch (err) {
    console.error("[More] Logout error:", err);
    window.showToast?.("Failed to logout. Try again.", "error");
    document.getElementById("logout-modal").classList.remove("visible");
  }
});

document.getElementById("logout-modal")?.addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("visible");
});

console.log("✅ More module loaded.");