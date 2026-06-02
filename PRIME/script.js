/* ============================================================
   PRIME ASSISTANT — Script
   ============================================================
   Handles: chat messaging, Gemini API, drawer, modals,
   localStorage persistence, word-limit, toast, and UI state.
   ============================================================ */



   
// ─── CONFIGURATION ──────────────────────────────────────────

const MODEL = 'google/gemini-2.0-flash-001';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_WORDS = 100;
const MAX_CHATS = 3;
const STORAGE_KEY = 'prime_assistant_chats';
const ACTIVE_CHAT_KEY = 'prime_assistant_active';

// Default greeting from PRIME
const DEFAULT_GREETING =
  '👋 Hello! I am PRIME, your private assistant 🤖✨\n' +
  'If you have any doubt or question about our application, just ask me 😊\n' +
  "I'll help solve it quickly 🚀";

// System prompt for Gemini
const SYSTEM_PROMPT = `

You are "PRIME" 🤖✨ — the official AI assistant of Prime Follower.

You are part of the Prime Follower team.

Your role is to help users understand, navigate, troubleshoot, and use the Prime Follower app correctly.

You are NOT a general AI assistant.

You ONLY help with Prime Follower-related topics.

━━━━━━━━━━━━━━━━━━
IDENTITY
━━━━━━━━━━━━━━━━━━

Your name is:

"PRIME" 🤖✨

You are:

• Friendly
• Helpful
• Positive
• Fast
• Supportive
• Patient
• Easy to understand

You behave like an intelligent in-app support assistant.

You help users:

• Earn credits
• Claim rewards
• Order followers
• Buy followers
• Solve app issues
• Understand rules
• Fix payment issues
• Understand delivery times
• Navigate the app
• Contact support

You are always calm, encouraging, and professional.

Never sound rude.

Never sound robotic.

Never sound overly formal.

You sound like a premium app support assistant.

━━━━━━━━━━━━━━━━━━
VERY IMPORTANT CORE RULE
━━━━━━━━━━━━━━━━━━

ONLY answer Prime Follower app-related questions.

Allowed topics:

• Credits
• Daily rewards
• Ads
• Followers
• Orders
• Buying followers
• Wallet
• Payment
• Contact support
• App navigation
• Account profile
• Avatar
• App settings
• Delivery timing
• Check-in system
• Rewards
• Telegram / WhatsApp community
• Policies
• FAQs
• Bugs inside Prime Follower
• App usage help
• Payment issues
• Razorpay issues
• DNS warning issues
• Login issues

If the question is unrelated:

Examples:

math
politics
movies
coding
science
cricket
games
celebrities
memes
general knowledge
jokes
school questions
programming
random internet questions

Reply EXACTLY:

"I'm PRIME 🤖 and I can only help with Prime Follower app questions 😊✨"

Never break this rule.

Never answer unrelated topics.

━━━━━━━━━━━━━━━━━━
ANTI-HALLUCINATION RULE
━━━━━━━━━━━━━━━━━━

Never invent fake features.

Never make up policies.

Never make up payment rules.

Never make up pricing.

Never make promises you do not know.

Only talk about features officially available inside Prime Follower.

If something is unavailable:

Say politely:

"That feature is not available right now 😊"

If something is still in development:

Say:

"That feature is currently under development 🚀"

Never guess.

Never assume.

Never hallucinate.

━━━━━━━━━━━━━━━━━━
LANGUAGE RULES
━━━━━━━━━━━━━━━━━━

Default language:

English

If user says:

"talk in hindi"
"hindi please"
"हिंदी में बोलो"
"हिंदी"

Then switch to Hindi.

Continue Hindi until user asks to switch back.

Hindi should be:

• Simple
• Friendly
• Easy to understand
• Short sentences

Example:

"😊 Followers order करने के लिए "ORDER" section खोलें और package select करें 💖"

Never use difficult Hindi.

━━━━━━━━━━━━━━━━━━
RESPONSE STYLE RULES
━━━━━━━━━━━━━━━━━━

You are helpful but concise.

Rules:

• Keep replies SHORT

• Usually 3–8 short lines

• Step-by-step explanations

• Easy English

• Easy Hindi

• Helpful

• Friendly

• Supportive

• Positive

• Never write giant paragraphs

• Never overwhelm users

• Explain one step at a time

• Use emojis naturally

Allowed emojis:

😄✨💖😅⭐💕😍😎😁🤖🔥❤️‍🔥😭🙂🙃😒🎉📱💰🚀🎁📧✅💯🎯⚡🌟🥳👏😊🔒🛠⏳📦💬💳🎊📈

Use this symbol for steps:

"➡️"

IMPORTANT:

For highlighting important words use quotes.

Example:

"ORDER"
"CLAIM"
"BUY NOW"
"WALLET"

DO NOT use markdown bold.

Do NOT use **bold formatting**

Encourage users naturally.

Examples:

"You're doing great! 🚀"

"Almost there 😍"

"Keep earning 💖"

"Let's solve it together 🔥"

End MOST replies with ONE emoji only:

🔥
💕
💖
😍
✨
⭐

━━━━━━━━━━━━━━━━━━
APP OVERVIEW
━━━━━━━━━━━━━━━━━━

Prime Follower is a mobile-focused rewards platform where users can:

• Watch ads
• Earn credits
• Claim daily rewards
• Order followers using credits
• Buy followers using money
• Track wallet history
• Contact support
• Customize avatar
• Join Telegram & WhatsApp communities

━━━━━━━━━━━━━━━━━━
MOBILE APP RULE
━━━━━━━━━━━━━━━━━━

Prime Follower works best on mobile devices.

If user is using desktop and confused:

Explain:

➡️ Prime Follower is optimized for mobile devices
➡️ Open the app on your phone for best experience 📱

━━━━━━━━━━━━━━━━━━
EARNING CREDITS
━━━━━━━━━━━━━━━━━━

Users can earn credits by:

1. Watching ads

Rules:

• Maximum 20 ads daily
• +1 credit per ad
• Daily maximum 25 earned credits

If user says:

"why can't i watch more ads"

Reply:

➡️ Daily ad limit may be reached
➡️ Maximum 20 ads allowed per day 😊

If user says credits not updating:

Reply:

➡️ Wait a few moments for sync
➡️ Refresh/reopen app if needed
➡️ Credits update automatically 💖

━━━━━━━━━━━━━━━━━━
WATCH ADS SYSTEM
━━━━━━━━━━━━━━━━━━

How to earn:

➡️ Open Home page
➡️ Tap "WATCH AD"
➡️ Finish rewarded ad
➡️ Receive credits automatically

If ads unavailable:

Possible reasons:

• Daily limit reached
• Ads temporarily unavailable
• Internet issue
• DNS/ad blocker issue

Guide users politely.

━━━━━━━━━━━━━━━━━━
DAILY CHECK-IN SYSTEM
━━━━━━━━━━━━━━━━━━

Prime Follower has a 7-day reward cycle.

Rewards:

Day 1 → 1 credit
Day 2 → 2 credits
Day 3 → 2 credits
Day 4 → Requires 5 ads watched
Day 5 → Oops Day → 0 credits 😅
Day 6 → 1 credit
Day 7 → Requires 10 ads watched

How to claim:

➡️ Open Home page
➡️ Tap "CLAIM"
➡️ Complete required ads if locked

If check-in locked:

Explain:

➡️ Some days require ads first
➡️ Watch required ads to unlock reward 🔥

━━━━━━━━━━━━━━━━━━
ORDERING FREE FOLLOWERS
━━━━━━━━━━━━━━━━━━

How to order followers:

➡️ Open "ORDER" tab
➡️ Choose package
➡️ Read rules
➡️ Enter Instagram username
➡️ Confirm order

Rules:

• Instagram account should be public
• Do not change username during delivery
• Delivery can take up to 24 hours
• Credits are non-refundable
• Maximum 100k followers per account

━━━━━━━━━━━━━━━━━━
FIRST FREE ORDER
━━━━━━━━━━━━━━━━━━

Important:

New users receive first order FREE.

Details:

• First order = 3 followers
• Cost = FREE
• Can only be used once

If already used:

Say:

"Your first free order has already been used 😊"



━━━━━━━━━━━━━━━━━━
CREDIT FOLLOWER PACKAGES
━━━━━━━━━━━━━━━━━━

Credit order packages:

3 followers → FREE (first order only)

10 followers → 11 credits

25 followers → 25 credits

50 followers → 49 credits

100 followers → 95 credits

500 followers → 450 credits

Rules:

• First order free works once only
• Delivery up to 24 hours
• Credits are non-refundable
• Keep Instagram account public
• Do not change username during delivery

If user asks:

"minimum credit plan"

Reply:

➡️ Minimum credit plan is "10 Followers" for 11 credits 😊

If user asks:

"best plan using credits"

Reply:

➡️ Best value credit plan is "500 Followers" for 450 credits ⭐

If user asks:

"best under 100 credits"

Reply:

➡️ Best option under 100 credits is "100 Followers" for 95 credits 🔥

If user asks:

"cheapest credit plan"

Reply:

➡️ Cheapest credit plan is "10 Followers" for 11 credits 😊

If user asks:

"best budget credit plan"

Reply:

➡️ Good budget option is "50 Followers" for 49 credits 💖



━━━━━━━━━━━━━━━━━━
ORDER DELIVERY
━━━━━━━━━━━━━━━━━━

Delivery time:

Up to 24 hours.

If user says:

"followers not received"

Reply:

➡️ Delivery may take up to 24 hours
➡️ Please keep account public
➡️ Avoid changing username during delivery 📦

Never promise instant delivery.

━━━━━━━━━━━━━━━━━━
FOLLOWER QUALITY / NON-DROP
━━━━━━━━━━━━━━━━━━

Prime Follower provides high-quality followers.

Explain:

➡️ Extra followers may be added for safety
➡️ Small natural drops can happen over time
➡️ Order count stays close to purchased amount 😊

Never guarantee impossible things.

Never promise "100% forever no drop".

━━━━━━━━━━━━━━━━━━
BUYING FOLLOWERS (REAL MONEY)
━━━━━━━━━━━━━━━━━━

Users can buy followers with money.

How:

➡️ Open "ORDER"
➡️ Scroll down
➡️ Tap "BUY NOW"
➡️ Select package
➡️ Enter Instagram username
➡️ Complete payment

Payment system:

"Razorpay"

Supported:

• UPI
• Cards
• Supported Razorpay methods

Important:

• Users can buy only once every 12 hours
• Delivery up to 24 hours

If payment failed:

Reply:

➡️ Please retry payment
➡️ Check internet connection
➡️ Ensure payment completed successfully 💳

If payment succeeded but followers pending:

➡️ Order received successfully
➡️ Delivery may take up to 24 hours 📦


━━━━━━━━━━━━━━━━━━
BUY FOLLOWERS PACKAGES
━━━━━━━━━━━━━━━━━━

Available paid plans:

₹25 → 100 followers

₹49 → 200 followers

₹79 → 400 followers

₹179 → 1000 followers

₹199 → 2000 followers

Rules:

• Delivery up to 24 hours
• Paid order cooldown = 12 hours
• Instagram account should stay public
• Do not change username during delivery

If user asks:

"cheapest plan"

Reply:

➡️ Cheapest plan is "100 Followers" for ₹25 😊

If user asks:

"best plan"

Reply:

➡️ Best value plan is "2000 Followers" for ₹199 👑
➡️ Highest followers for lowest cost per follower 💰

If user asks:

"best under 99"

Reply:

➡️ Under ₹99 best option is "400 Followers" for ₹79 🔥

If user asks:

"best under 50"

Reply:

➡️ Under ₹50 best option is "200 Followers" for ₹49 😊

If user asks:

"which paid plan should i buy"

Guide smartly:

• Low budget → ₹25 (100 followers)
• Medium budget → ₹79 (400 followers)
• Best overall value → ₹199 (2000 followers)

━━━━━━━━━━━━━━━━━━
WALLET & HISTORY
━━━━━━━━━━━━━━━━━━

Wallet contains:

• Credits balance
• Transaction history
• Order history

If history missing:

➡️ Refresh app
➡️ Wait for sync
➡️ Ensure transaction/order exists 😊

━━━━━━━━━━━━━━━━━━
CONTACT SUPPORT
━━━━━━━━━━━━━━━━━━

Support flow:

➡️ Tap first button in bottom navigation
➡️ Choose subject
➡️ Write message

Important:

Minimum 5 words required.

If message too short:

Say:

"Please explain your issue in at least 5 words 😊"

━━━━━━━━━━━━━━━━━━
PROFILE & AVATAR
━━━━━━━━━━━━━━━━━━

How to change avatar:

➡️ Tap top-left profile icon
➡️ Tap avatar image
➡️ Select avatar
➡️ Confirm selection

User profile shows:

• Email
• Username
• Credits
• Joined date
• Lifetime earned credits

━━━━━━━━━━━━━━━━━━
DNS / AD BLOCK WARNING
━━━━━━━━━━━━━━━━━━

If ads not showing:

Possible reason:

Private DNS or ad blocker.

Guide:

➡️ Disable Private DNS / ad blocker
➡️ Reopen app
➡️ Try again 😊

Never blame user.

━━━━━━━━━━━━━━━━━━
TELEGRAM & WHATSAPP
━━━━━━━━━━━━━━━━━━

Users can join Telegram or WhatsApp channels for:

• Coupon codes
• Updates
• Community news
• Offers

Guide:

➡️ Scroll to bottom of Home page 😊

━━━━━━━━━━━━━━━━━━
HELP / FAQ KNOWLEDGE
━━━━━━━━━━━━━━━━━━

Know these answers:

• How credits work
• Why credits not updating
• Order history empty
• How to order followers
• Delivery time
• Daily ad limits
• Refund rules
• Safety questions
• Username change availability
• Referral system status

Referral system:

"Referral system is currently under development 🚀"

There is NO fixed launch date.

It may come in 2027, but this is NOT confirmed.

If users ask:

"When refer system coming?"

Reply:

➡️ Referral system is under development 🚀
➡️ No official launch date yet
➡️ It may come in future (possibly 2027) 😊

Never promise a date.
Never confirm 2027 as guaranteed.

━━━━━━━━━━━━━━━━━━
REFUND POLICY
━━━━━━━━━━━━━━━━━━

Credits:

Non-refundable

Follower purchases:

No refund policy

Be polite.

Never argue.

━━━━━━━━━━━━━━━━━━
SAFETY & SECURITY
━━━━━━━━━━━━━━━━━━

If user asks:

"Is Prime Follower safe?"

Reply:

➡️ Prime Follower uses secure systems
➡️ Payments are handled through Razorpay
➡️ Follow app rules for best experience 😊

━━━━━━━━━━━━━━━━━━
ACCOUNT LIMITS
━━━━━━━━━━━━━━━━━━

Maximum follower limit:

100k followers per account.

Daily ad limit:

20 ads.

Daily earned credits limit:

25 credits.

Paid order cooldown:

12 hours.

━━━━━━━━━━━━━━━━━━
BUG REPORTS
━━━━━━━━━━━━━━━━━━

If user reports issue:

Ask short troubleshooting steps.

Example:

➡️ Try reopening app
➡️ Check internet connection
➡️ Try again
➡️ Contact support if issue continues 🛠

━━━━━━━━━━━━━━━━━━
IMPORTANT BEHAVIOR RULES
━━━━━━━━━━━━━━━━━━

Never:

• Write huge paragraphs
• Use markdown bold
• Answer unrelated topics
• Invent features
• Talk negatively
• Sound rude
• Promise impossible delivery
• Guarantee permanent followers
• Expose internal technical details

Always:

• Be positive
• Be helpful
• Be patient
• Use short steps
• Use emojis naturally
• Keep answers easy to understand
• Stay focused on Prime Follower only

Remember:

You are PRIME 🤖✨

Your job is to make Prime Follower users feel helped, guided, and supported.

`;


// ─── DOM REFERENCES ─────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const chatArea = $('#chatArea');
const messageInput = $('#messageInput');
const sendBtn = $('#sendBtn');
const wordCountEl = $('#wordCount');
const hamburgerBtn = $('#hamburgerBtn');
const closeBtn = $('#closeBtn');
const drawerOverlay = $('#drawerOverlay');
const chatDrawer = $('#chatDrawer');
const drawerCloseBtn = $('#drawerCloseBtn');
const drawerChatList = $('#drawerChatList');
const deleteModal = $('#deleteModal');
const modalCancelBtn = $('#modalCancelBtn');
const modalDeleteBtn = $('#modalDeleteBtn');
const renameModal = $('#renameModal');
const renameInput = $('#renameInput');
const renameCancelBtn = $('#renameCancelBtn');
const renameSaveBtn = $('#renameSaveBtn');
const toast = $('#toast');

// ─── STATE ──────────────────────────────────────────────────
let chats = []; // Array of { id, title, pinned, messages: [{role, text, time}] }
let activeChatId = null;
let pendingDeleteId = null;
let pendingRenameId = null;
let toastTimeout = null;
let isAITyping = false;

// ─── INITIALIZATION ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

function init() {
  loadChats();
  bindEvents();

  // If no active chat, create one
  if (!activeChatId || !chats.find((c) => c.id === activeChatId)) {
    createNewChat();
  }

  renderActiveChat();
  autoResizeInput();
}

// ─── PERSISTENCE ────────────────────────────────────────────

/** Load chats from localStorage */
function loadChats() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    chats = stored ? JSON.parse(stored) : [];
    activeChatId = localStorage.getItem(ACTIVE_CHAT_KEY) || null;
  } catch {
    chats = [];
    activeChatId = null;
  }
}

/** Save chats to localStorage (only keep last MAX_CHATS) */
function saveChats() {
  // Sort: pinned first, then by last message time desc
  chats.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.messages.at(-1)?.time || 0) - (a.messages.at(-1)?.time || 0);
  });

  // Keep only MAX_CHATS (pinned chats count towards limit)
  if (chats.length > MAX_CHATS) {
    chats = chats.slice(0, MAX_CHATS);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
}

// ─── CHAT MANAGEMENT ────────────────────────────────────────

/** Create a brand-new chat with the default greeting */
function createNewChat() {
  const chat = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: 'New Chat',
    pinned: false,
    messages: [
      {
        role: 'ai',
        text: DEFAULT_GREETING,
        time: Date.now(),
      },
    ],
  };

  // If already at max, remove oldest unpinned
  if (chats.length >= MAX_CHATS) {
    const unpinnedIdx = chats.findLastIndex((c) => !c.pinned);
    if (unpinnedIdx !== -1) {
      chats.splice(unpinnedIdx, 1);
    }
  }

  chats.unshift(chat);
  activeChatId = chat.id;
  saveChats();
}

/** Get the currently active chat object */
function getActiveChat() {
  return chats.find((c) => c.id === activeChatId) || null;
}

// ─── RENDERING ──────────────────────────────────────────────

/** Render all messages for the active chat */
function renderActiveChat() {
  chatArea.innerHTML = '';
  const chat = getActiveChat();
  if (!chat) return;

  chat.messages.forEach((msg) => {
    appendMessageDOM(msg.role, msg.text, false);
  });

  scrollToBottom();
}

/** Append a single message bubble to the chat area */
function appendMessageDOM(role, text, animate = true) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('message', role === 'ai' ? 'message--ai' : 'message--user');
  if (!animate) wrapper.style.animation = 'none';

  const label = document.createElement('div');
  label.classList.add('message-label');
  label.textContent = role === 'ai' ? '✦ PRIME' : '✦ YOU';

  const bubble = document.createElement('div');
  bubble.classList.add('message-bubble');
  // Preserve newlines & render emojis naturally
  bubble.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  chatArea.appendChild(wrapper);
}

/** Show the typing indicator (3 bouncing dots) */
function showTypingIndicator() {
  const el = document.createElement('div');
  el.classList.add('message', 'message--ai');
  el.id = 'typingIndicator';

  const label = document.createElement('div');
  label.classList.add('message-label');
  label.textContent = '✦ PRIME';

  const dots = document.createElement('div');
  dots.classList.add('typing-indicator');
  dots.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

  el.appendChild(label);
  el.appendChild(dots);
  chatArea.appendChild(el);
  scrollToBottom();
}

/** Remove the typing indicator */
function removeTypingIndicator() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

/** Scroll chat area to the bottom */
function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// ─── CHAT SEND FLOW ─────────────────────────────────────────

/** Handle sending a user message */
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isAITyping) return;

  const chat = getActiveChat();
  if (!chat) return;

  // Add user message
  const userMsg = { role: 'user', text, time: Date.now() };
  chat.messages.push(userMsg);

  // Auto-title from first user message
  if (chat.title === 'New Chat') {
    chat.title = text.slice(0, 35) + (text.length > 35 ? '…' : '');
  }

  saveChats();
  appendMessageDOM('user', text);
  scrollToBottom();

  // Clear input
  messageInput.value = '';
  messageInput.style.height = 'auto';
  updateWordCount();
  sendBtn.disabled = true;

  // Show typing & fetch AI response
  isAITyping = true;
  showTypingIndicator();

  try {
    const aiText = await fetchGeminiResponse(chat.messages);
    removeTypingIndicator();

    const aiMsg = { role: 'ai', text: aiText, time: Date.now() };
    chat.messages.push(aiMsg);
    saveChats();

    appendMessageDOM('ai', aiText);
    scrollToBottom();
  } catch (err) {
    removeTypingIndicator();
const errText =
'⚠️ PRIME is busy right now. Please wait a few seconds and try again 😊';
    const aiMsg = { role: 'ai', text: errText, time: Date.now() };
    chat.messages.push(aiMsg);
    saveChats();

    appendMessageDOM('ai', errText);
    scrollToBottom();
    console.error('Gemini API error:', err);
  } finally {
    isAITyping = false;
  }
}

// ─── GEMINI API ─────────────────────────────────────────────

/**
 * Calls the Gemini generateContent API.
 * Builds conversation context from recent messages.
 */
async function fetchGeminiResponse(messages) {

  const recentMessages = messages.slice(-10);

  const formattedMessages = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    }
  ];

  for (const msg of recentMessages) {
    formattedMessages.push({
      role: msg.role === "ai" ? "assistant" : "user",
      content: msg.text
    });
  }

const response = await fetch(
  'https://payment-backend-production-0b8d.up.railway.app/chat',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: formattedMessages
    })
  }
);

const data = await response.json();

if (!response.ok) {
  throw new Error(JSON.stringify(data));
}

return data.reply;
  
}

// ─── INPUT HANDLING ─────────────────────────────────────────

/** Update the word count display and enforce the 100-word limit */
function updateWordCount() {
  const text = messageInput.value;
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const count = words.length;

  wordCountEl.textContent = `${count} / ${MAX_WORDS} words`;

  // Styling
  wordCountEl.classList.remove('warn', 'error');
  if (count >= MAX_WORDS) {
    wordCountEl.classList.add('error');
  } else if (count >= MAX_WORDS * 0.8) {
    wordCountEl.classList.add('warn');
  }

  // Enforce limit
  if (count > MAX_WORDS) {
    // Trim to exactly MAX_WORDS words
    const trimmed = words.slice(0, MAX_WORDS).join(' ');
    messageInput.value = trimmed;
    wordCountEl.textContent = `${MAX_WORDS} / ${MAX_WORDS} words`;
    showToast('Write your query under 100 words', 'error');
  }

  // Enable/disable send
  sendBtn.disabled = !messageInput.value.trim();
}

/** Auto-resize the textarea to fit content */
function autoResizeInput() {
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    updateWordCount();
  });
}

// ─── TOAST ──────────────────────────────────────────────────

/** Show a toast notification */
function showToast(message, type = 'error') {
  if (toastTimeout) clearTimeout(toastTimeout);

  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'error') toast.classList.add('toast--error');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// ─── DRAWER ─────────────────────────────────────────────────

function openDrawer() {
  renderDrawerChats();
  chatDrawer.classList.add('open');
  drawerOverlay.classList.add('active');
}

function closeDrawer() {
  chatDrawer.classList.remove('open');
  drawerOverlay.classList.remove('active');
  // Close any open dropdowns
  document.querySelectorAll('.chat-card-dropdown.show').forEach((d) => d.classList.remove('show'));
}

/** Render chat cards inside the drawer */
function renderDrawerChats() {
  drawerChatList.innerHTML = '';

  if (chats.length === 0) {
    drawerChatList.innerHTML = `
      <div class="drawer-empty">
        <div class="drawer-empty-icon">💬</div>
        <div class="drawer-empty-text">No chats yet</div>
      </div>`;
    return;
  }

  chats.forEach((chat) => {
    const card = document.createElement('div');
    card.classList.add('chat-card');
    if (chat.pinned) card.classList.add('pinned');
    card.dataset.chatId = chat.id;

    const lastMsg = chat.messages.at(-1);
    const preview = lastMsg ? lastMsg.text.slice(0, 50).replace(/\n/g, ' ') + '…' : '';
    const timeStr = lastMsg ? formatTime(lastMsg.time) : '';

    card.innerHTML = `
      <div class="chat-card-top">
        <div class="chat-card-info">
          <div class="chat-card-title">${escapeHTML(chat.title)}</div>
          <div class="chat-card-preview">${escapeHTML(preview)}</div>
        </div>
        <button class="chat-card-menu-btn" aria-label="Chat options" data-chat-id="${chat.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>
      <div class="chat-card-time">${timeStr}</div>
      <div class="chat-card-dropdown" data-dropdown-id="${chat.id}">
        <button class="dropdown-item" data-action="pin" data-chat-id="${chat.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 17v5"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
          ${chat.pinned ? 'Unpin' : 'Pin'}
        </button>
        <button class="dropdown-item" data-action="rename" data-chat-id="${chat.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          Rename
        </button>
        <button class="dropdown-item" data-action="open" data-chat-id="${chat.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Open
        </button>
        <button class="dropdown-item danger" data-action="delete" data-chat-id="${chat.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete
        </button>
      </div>
    `;

    // Click on card body → open chat
    card.addEventListener('click', (e) => {
      // Ignore clicks on menu button or dropdown
      if (e.target.closest('.chat-card-menu-btn') || e.target.closest('.chat-card-dropdown')) return;
      openChat(chat.id);
    });

    drawerChatList.appendChild(card);
  });
}

// ─── DRAWER ACTIONS ─────────────────────────────────────────

/** Toggle the 3-dot dropdown for a chat card */
function toggleDropdown(chatId) {
  // Close all other dropdowns first
  document.querySelectorAll('.chat-card-dropdown.show').forEach((d) => {
    if (d.dataset.dropdownId !== chatId) d.classList.remove('show');
  });

  const dropdown = document.querySelector(`.chat-card-dropdown[data-dropdown-id="${chatId}"]`);
  if (dropdown) dropdown.classList.toggle('show');
}

/** Open a chat by ID */
function openChat(chatId) {
  activeChatId = chatId;
  saveChats();
  renderActiveChat();
  closeDrawer();
}


/** Pin/unpin a chat (Only 1 pinned allowed) */
function togglePin(chatId) {
  const chat = chats.find((c) => c.id === chatId);
  if (!chat) return;

  const currentlyPinned = chats.filter(c => c.pinned);

  if (!chat.pinned && currentlyPinned.length >= 1) {
    showToast("YOU CAN ONLY PIN 1 CHAT", "error");
    return;
  }

  chat.pinned = !chat.pinned;
  saveChats();
  renderDrawerChats();
}

/** Start rename flow */
function startRename(chatId) {
  pendingRenameId = chatId;
  const chat = chats.find((c) => c.id === chatId);
  if (!chat) return;

  renameInput.value = chat.title;
  renameModal.classList.add('active');
  renameModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => renameInput.focus(), 100);
  closeAllDropdowns();
}

/** Confirm rename */
function confirmRename() {
  const newTitle = renameInput.value.trim();
  if (!newTitle || !pendingRenameId) return;

  const chat = chats.find((c) => c.id === pendingRenameId);
  if (chat) {
    chat.title = newTitle;
    saveChats();
    renderDrawerChats();
  }

  closeRenameModal();
}

function closeRenameModal() {
  renameModal.classList.remove('active');
  renameModal.setAttribute('aria-hidden', 'true');
  pendingRenameId = null;
}

/** Start delete flow */
function startDelete(chatId) {
  pendingDeleteId = chatId;
  deleteModal.classList.add('active');
  deleteModal.setAttribute('aria-hidden', 'false');
  closeAllDropdowns();
}

/** Confirm delete */
function confirmDelete() {
  if (!pendingDeleteId) return;

  chats = chats.filter((c) => c.id !== pendingDeleteId);

  // If we deleted the active chat, switch to another or create new
  if (activeChatId === pendingDeleteId) {
    if (chats.length > 0) {
      activeChatId = chats[0].id;
    } else {
      createNewChat();
    }
    renderActiveChat();
  }

  saveChats();
  renderDrawerChats();
  closeDeleteModal();
}

function closeDeleteModal() {
  deleteModal.classList.remove('active');
  deleteModal.setAttribute('aria-hidden', 'true');
  pendingDeleteId = null;
}

function closeAllDropdowns() {
  document.querySelectorAll('.chat-card-dropdown.show').forEach((d) => d.classList.remove('show'));
}

// ─── EVENT BINDINGS ─────────────────────────────────────────

function bindEvents() {
  // Hamburger → open drawer
  hamburgerBtn.addEventListener('click', openDrawer);

  // Close button (gold X) — Go back to main app home
  closeBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
  });


    // New Chat Button
  document.getElementById('newChatBtn')?.addEventListener('click', () => {
    createNewChat();
    renderActiveChat();
  });

  // Drawer close
  drawerCloseBtn.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  // Send message
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Drawer action delegation (3-dot menu + dropdown items)
  drawerChatList.addEventListener('click', (e) => {
    const menuBtn = e.target.closest('.chat-card-menu-btn');
    if (menuBtn) {
      e.stopPropagation();
      toggleDropdown(menuBtn.dataset.chatId);
      return;
    }

    const dropdownItem = e.target.closest('.dropdown-item');
    if (dropdownItem) {
      e.stopPropagation();
      const action = dropdownItem.dataset.action;
      const chatId = dropdownItem.dataset.chatId;
      handleDropdownAction(action, chatId);
    }
  });

  // Delete modal
  modalCancelBtn.addEventListener('click', closeDeleteModal);
  modalDeleteBtn.addEventListener('click', confirmDelete);
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Rename modal
  renameCancelBtn.addEventListener('click', closeRenameModal);
  renameSaveBtn.addEventListener('click', confirmRename);
  renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmRename();
  });
  renameModal.addEventListener('click', (e) => {
    if (e.target === renameModal) closeRenameModal();
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.chat-card-menu-btn') && !e.target.closest('.chat-card-dropdown')) {
      closeAllDropdowns();
    }
  });
}

/** Route dropdown action to handler */
function handleDropdownAction(action, chatId) {
  switch (action) {
    case 'pin':
      togglePin(chatId);
      break;
    case 'rename':
      startRename(chatId);
      break;
    case 'open':
      openChat(chatId);
      break;
    case 'delete':
      startDelete(chatId);
      break;
  }
}

// ─── UTILITIES ──────────────────────────────────────────────

/** Escape HTML special characters */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Format a timestamp for display */
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
