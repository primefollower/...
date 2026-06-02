// ================================
// Wallet Module
// ================================

// ── 1. Imports ──
import {
  auth,
  getUserProfile,
  getTransactions
} from './firebase.js';

import { showToast } from './pay.js';


// ── 2. State Management ──
let allTransactions = [];
let currentTab      = 'redeem';


// ── 3. Utility Functions ──

/** Format a Firestore Timestamp (or any Date-like) into a readable string. */
function formatDate(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date();
  return date.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric'
  });
}

/**
 * Determine the delivery status label and color based on how long ago the order was placed.
 * < 1 hour  → Pending  (red)
 * < 24 hours → Working  (orange)
 * ≥ 24 hours → Delivered Successfully (green)
 */
function getOrderStatus(txDate) {
  const diffHours = (Date.now() - txDate.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1)  return { text: "Pending",               color: "red"    };
  if (diffHours < 24) return { text: "Working",               color: "orange" };
  return               { text: "Delivered Successfully",       color: "green"  };
}


// ── 4. Wallet Loading & Rendering ──

async function loadWallet(uid) {
  try {
    const profile = await getUserProfile(uid);
    if (profile) {
      const balanceEl = document.getElementById('wallet-balance');
      if (balanceEl) {
        balanceEl.innerHTML = `${profile.credits || 0}<span class="balance-unit">Credits</span>`;
      }
    }

    allTransactions = await getTransactions(uid);
    renderTransactions();

  } catch (err) {
    console.error('Wallet load error:', err);
  }
}

function renderTransactions() {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;

  // Filter based on active tab
  // "redeem" tab → orders (amount ≤ 0 or action contains "order")
  // "earn"   tab → credits earned (amount > 0)
  const filtered = currentTab === 'redeem'
    ? allTransactions.filter(tx => {
        const amount = Number(tx.amount || 0);
        return amount <= 0 || tx.action?.toLowerCase().includes("order");
      })
    : allTransactions.filter(tx => Number(tx.amount || 0) > 0);

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-receipt"></i>
        <p>No ${currentTab === 'redeem' ? 'order' : 'credit'} history yet</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(tx => {
    const amount     = Number(tx.amount);
    const amountStr  = amount > 0 ? `+${amount}` : `${amount}`;
    const amountClass = amount > 0 ? 'positive' : 'negative';
    const rawDate    = tx.date?.toDate ? tx.date.toDate() : new Date();

    return `
      <div class="transaction-item order-item"
           data-action="${tx.action}"
           data-amount="${tx.amount}"
           data-date="${rawDate.toISOString()}">

        <div class="tx-info">
          <div class="tx-action">${tx.action || 'Transaction'}</div>
          <div class="tx-date">${formatDate(tx.date)}</div>
        </div>

        <div class="tx-amount ${amountClass}">${amountStr}</div>
      </div>
    `;
  }).join('');
}


// ── 5. Tab Switching Logic ──
document.querySelectorAll('.wallet-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderTransactions();
  });
});


// ── 6. Transaction Detail Modal ──
document.addEventListener('click', (e) => {
  const item = e.target.closest('.order-item');
  if (!item || !item.dataset.action?.includes("Order")) return;

  const txDate  = new Date(item.dataset.date || Date.now());
  const status  = getOrderStatus(txDate);
  const statusEl = document.getElementById('detail-status');

  document.getElementById('detail-credit-used').textContent = item.dataset.amount;
  document.getElementById('detail-followers').textContent   = item.dataset.action.replace(/\D/g, "");
  document.getElementById('detail-date').textContent        = txDate.toLocaleDateString();
  document.getElementById('detail-time').textContent        = txDate.toLocaleTimeString();

  if (statusEl) {
    statusEl.textContent  = status.text;
    statusEl.style.color  = status.color;
  }

  document.getElementById('order-detail-modal')?.classList.add('visible');
});


// ── 7. Event Listeners & Auto-refresh ──

window.addEventListener('userReady', async (e) => {
  const { uid } = e.detail;
  await loadWallet(uid);

  // Refresh wallet data whenever the wallet tab is re-opened
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', async () => {
      if (item.dataset.page === 'wallet') {
        const user = window.cashTreasureUser;
        if (user) await loadWallet(user.uid);
      }
    });
  });

  // Live auto-refresh every 5 seconds while the wallet page is active
  setInterval(async () => {
    const walletPage = document.getElementById('page-wallet');
    if (walletPage?.classList.contains('active')) {
      const user = window.cashTreasureUser;
      if (user) await loadWallet(user.uid);
    }
  }, 5000);
});
