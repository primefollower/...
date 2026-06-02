// ================================
// Prime-Follower - Contact Page Module
// Support form with 5-word validation + EmailJS integration
// ================================

import { submitContactMessage } from './firebase.js';

// ── Toast helper ──
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}



// ── Enable textarea when subject is selected ──
const subjectSelect = document.getElementById('contact-subject');
const messageArea = document.getElementById('contact-message');

subjectSelect.addEventListener('change', () => {
  if (subjectSelect.value) {
    messageArea.placeholder = 'Describe your issue in detail (minimum 5 words)...';
  }
});

// ── Send message ──
document.getElementById('btn-send-message').addEventListener('click', async () => {
  const user = window.cashTreasureUser;
  if (!user) {
    showToast('Please log in first.', 'error');
    return;
  }

  const subject = subjectSelect.value;
  const message = messageArea.value.trim();

  if (!subject) {
    showToast('Please select a subject.', 'error');
    return;
  }

  if (!message) {
    showToast('Please describe your issue.', 'error');
    return;
  }

  // ── 5-word minimum validation ──
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount < 5) {
    showToast('Please describe your issue using at least 5 words.', 'error');
    return;
  }

  const btn = document.getElementById('btn-send-message');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    // Save to Firestore
    await submitContactMessage(user.uid, { subject, message });

    // ── Send email via EmailJS ──
    // Replace [ADD_SERVICE_ID] and [ADD_TEMPLATE_ID] with your actual EmailJS IDs
 
    showToast('Your message has been sent successfully.');

    // Reset form
    subjectSelect.value = '';
    messageArea.value = '';
    messageArea.disabled = true;
    messageArea.placeholder = 'Select a subject first...';
  } catch (err) {
    console.error('Contact error:', err);
    showToast('Failed to send message. Try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
  }
});


// Show alert if user clicks textarea before selecting subject
messageArea.addEventListener("focus", () => {
  if (!subjectSelect.value) {
    showToast("Please select a subject first.", "error");
    messageArea.blur(); // 🔥 prevent typing
  }
});

console.log('✅ Contact module loaded.');
