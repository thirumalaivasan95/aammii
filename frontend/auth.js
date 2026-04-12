/**
 * auth.js — Aammii Tharcharbu Santhai
 * Handles: Email/Password · Google · GitHub · Phone OTP
 * Requires: Firebase SDK (loaded in index.html) + firebase-config.js
 */

/* ─── State ──────────────────────────────────────────────────── */
let firebaseApp  = null;
let firebaseAuth = null;
let confirmResult = null;   // for phone OTP
let authMode     = "login"; // "login" | "signup"
let authTab      = "email"; // "email" | "phone"

/* ─── Bootstrap ──────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.FIREBASE_READY) {
    // Hide auth UI but keep the rest of the site working
    document.getElementById("userBtn")?.remove();
    return;
  }

  try {
    firebaseApp  = firebase.initializeApp(window.firebaseConfig);
    firebaseAuth = firebase.auth();

    // Auth state listener — runs on every page load
    firebaseAuth.onAuthStateChanged(onAuthStateChange);

    // reCAPTCHA for phone OTP (invisible)
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      "recaptcha-container",
      { size: "invisible" }
    );
  } catch (e) {
    console.error("[Aammii Auth]", e);
  }
});

/* ─── Auth State ──────────────────────────────────────────────── */
function onAuthStateChange(user) {
  const userBtn    = document.getElementById("userBtn");
  const userName   = document.getElementById("userName");
  const userAvatar = document.getElementById("userAvatar");

  if (user) {
    // Signed in
    const name = user.displayName || user.email?.split("@")[0] || "User";
    if (userName)   { userName.textContent = name; userName.classList.remove("hidden"); }
    if (userAvatar) {
      if (user.photoURL) {
        userAvatar.innerHTML = `<img src="${user.photoURL}" class="user-avatar-img" alt="${name}" referrerpolicy="no-referrer">`;
      } else {
        userAvatar.textContent = name.charAt(0).toUpperCase();
      }
    }
    if (userBtn) userBtn.title = name;
    closeAuth();
    window._currentUser = user;
    showToast(`✅ Welcome, ${name}!`);
  } else {
    // Signed out
    if (userName)   { userName.textContent = ""; userName.classList.add("hidden"); }
    if (userAvatar) userAvatar.textContent = "👤";
    window._currentUser = null;
  }
}

/* ─── Open / Close Auth Modal ────────────────────────────────── */
function openAuth(tab = "email") {
  authTab = tab;
  document.getElementById("authModal").classList.add("open");
  document.getElementById("authBackdrop").classList.add("visible");
  document.body.style.overflow = "hidden";
  switchAuthTab(tab);
  clearAuthError();
}

function closeAuth() {
  document.getElementById("authModal")?.classList.remove("open");
  document.getElementById("authBackdrop")?.classList.remove("visible");
  document.body.style.overflow = "";
  clearAuthError();
}

function switchAuthTab(tab) {
  authTab = tab;
  document.querySelectorAll(".auth-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === tab)
  );
  document.querySelectorAll(".auth-pane").forEach(p =>
    p.classList.toggle("hidden", p.id !== `pane${cap(tab)}`)
  );
}

function switchAuthMode(mode) {
  authMode = mode;
  document.getElementById("btnLogin").classList.toggle("active",  mode === "login");
  document.getElementById("btnSignup").classList.toggle("active", mode === "signup");
  document.getElementById("authNameRow").classList.toggle("hidden", mode !== "signup");
  document.getElementById("authSubmitBtn").textContent = mode === "login" ? "Login" : "Create Account";
  clearAuthError();
}

/* ─── Email / Password Auth ──────────────────────────────────── */
async function doEmailAuth() {
  if (!firebaseAuth) return;
  const email    = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const name     = document.getElementById("authName")?.value.trim();

  if (!email || !password) { showAuthError("Please enter email and password."); return; }

  setAuthLoading(true);
  clearAuthError();

  try {
    if (authMode === "signup") {
      if (!name) { showAuthError("Please enter your name."); setAuthLoading(false); return; }
      const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      // Re-trigger state change so name is picked up
      onAuthStateChange(cred.user);
    } else {
      await firebaseAuth.signInWithEmailAndPassword(email, password);
    }
  } catch (e) {
    showAuthError(friendlyError(e.code));
  } finally {
    setAuthLoading(false);
  }
}

/* ─── Google Sign-In ─────────────────────────────────────────── */
async function doGoogle() {
  if (!firebaseAuth) return;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    await firebaseAuth.signInWithPopup(provider);
  } catch (e) {
    showAuthError(friendlyError(e.code));
  }
}

/* ─── GitHub Sign-In ─────────────────────────────────────────── */
async function doGitHub() {
  if (!firebaseAuth) return;
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    await firebaseAuth.signInWithPopup(provider);
  } catch (e) {
    showAuthError(friendlyError(e.code));
  }
}

/* ─── Phone OTP ──────────────────────────────────────────────── */
async function sendOTP() {
  if (!firebaseAuth) return;
  const phone = document.getElementById("authPhone").value.trim();
  if (!phone) { showAuthError("Enter a valid phone number with country code (+91...)"); return; }

  setAuthLoading(true);
  clearAuthError();
  try {
    confirmResult = await firebaseAuth.signInWithPhoneNumber(phone, window.recaptchaVerifier);
    document.getElementById("otpRow").classList.remove("hidden");
    document.getElementById("sendOtpBtn").classList.add("hidden");
    showAuthError("✅ OTP sent! Check your SMS.", "success");
  } catch (e) {
    showAuthError(friendlyError(e.code));
    window.recaptchaVerifier?.render().then(id => grecaptcha.reset(id));
  } finally {
    setAuthLoading(false);
  }
}

async function verifyOTP() {
  if (!confirmResult) return;
  const code = document.getElementById("authOTP").value.trim();
  if (!code) { showAuthError("Enter the OTP code."); return; }

  setAuthLoading(true);
  clearAuthError();
  try {
    await confirmResult.confirm(code);
  } catch (e) {
    showAuthError(friendlyError(e.code));
  } finally {
    setAuthLoading(false);
  }
}

/* ─── Sign Out ────────────────────────────────────────────────── */
async function doSignOut() {
  if (!firebaseAuth) return;
  try {
    await firebaseAuth.signOut();
    showToast("👋 Signed out. See you soon!");
    closeUserMenu();
  } catch (e) {
    console.error(e);
  }
}

/* ─── User Menu ───────────────────────────────────────────────── */
function toggleUserMenu() {
  if (!window._currentUser) { openAuth("email"); return; }
  const menu = document.getElementById("userMenu");
  const isOpen = menu.classList.toggle("open");
  if (isOpen) {
    document.getElementById("userMenuEmail").textContent =
      window._currentUser.email || window._currentUser.phoneNumber || "";
  }
  if (isOpen) {
    setTimeout(() => document.addEventListener("click", closeUserMenuOutside, { once: true }), 0);
  }
}

function closeUserMenu() {
  document.getElementById("userMenu")?.classList.remove("open");
}

function closeUserMenuOutside(e) {
  if (!e.target.closest("#userBtn") && !e.target.closest("#userMenu")) {
    closeUserMenu();
  }
}

/* ─── Helpers ─────────────────────────────────────────────────── */
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function setAuthLoading(on) {
  const btn = document.getElementById("authSubmitBtn");
  if (btn) { btn.disabled = on; btn.textContent = on ? "Please wait…" : (authMode === "login" ? "Login" : "Create Account"); }
}

function showAuthError(msg, type = "error") {
  const el = document.getElementById("authError");
  if (!el) return;
  el.textContent = msg;
  el.className = `auth-error ${type}`;
  el.classList.remove("hidden");
}

function clearAuthError() {
  const el = document.getElementById("authError");
  if (el) { el.textContent = ""; el.classList.add("hidden"); }
}

function friendlyError(code) {
  const map = {
    "auth/user-not-found":        "No account found. Please sign up.",
    "auth/wrong-password":        "Incorrect password. Try again.",
    "auth/email-already-in-use":  "Email already registered. Please login.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/invalid-email":         "Please enter a valid email address.",
    "auth/too-many-requests":     "Too many attempts. Try again in a few minutes.",
    "auth/popup-closed-by-user":  "Sign-in was cancelled.",
    "auth/network-request-failed":"Network error. Check your connection.",
    "auth/invalid-verification-code": "Wrong OTP code. Please try again.",
    "auth/code-expired":          "OTP expired. Request a new one.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

/* Expose to HTML onclick handlers */
window.openAuth      = openAuth;
window.closeAuth     = closeAuth;
window.switchAuthTab = switchAuthTab;
window.switchAuthMode= switchAuthMode;
window.doEmailAuth   = doEmailAuth;
window.doGoogle      = doGoogle;
window.doGitHub      = doGitHub;
window.sendOTP       = sendOTP;
window.verifyOTP     = verifyOTP;
window.doSignOut     = doSignOut;
window.toggleUserMenu= toggleUserMenu;
