/**
 * auth.js — Aammii Tharcharbu Santhai
 * Firebase Authentication · Email/Password · Google · GitHub · Phone OTP
 *
 * Requires: Firebase SDK (loaded in index.html) + firebase-config.js
 * Exposes window._currentUser for the rest of the app to read.
 */

/* ─── State ──────────────────────────────────────────────────── */
let firebaseApp, firebaseAuth;
let confirmResult = null;
let authMode = "login";
let authTab  = "email";

/* ─── Bootstrap ──────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (!window.FIREBASE_READY) {
    const btn = document.getElementById("userBtn");
    if (btn) btn.onclick = () => (typeof showToast === "function")
      ? showToast("Firebase not configured — see firebase-config.js")
      : alert("Firebase not configured — see firebase-config.js");
    return;
  }
  try {
    firebaseApp  = firebase.initializeApp(window.firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseAuth.onAuthStateChanged(onAuthStateChange);
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(
      "recaptcha-container", { size: "invisible" }
    );
  } catch (e) { console.error("[Aammii Auth]", e); }
});

/* ─── Auth state listener ────────────────────────────────────── */
function onAuthStateChange(user) {
  const userName   = document.getElementById("userName");
  const userAvatar = document.getElementById("userAvatar");

  if (user) {
    window._currentUser = user;
    const name = user.displayName || user.email?.split("@")[0] || "User";
    if (userName)   userName.textContent = name.length > 14 ? name.slice(0, 12) + "…" : name;
    if (userAvatar) {
      if (user.photoURL) {
        userAvatar.innerHTML = `<img src="${user.photoURL}" class="user-avatar-img" alt="${name}" referrerpolicy="no-referrer"/>`;
      } else {
        userAvatar.textContent = name.charAt(0).toUpperCase();
      }
    }
    closeAuth();
    if (typeof showToast === "function") showToast(`✓ Welcome, ${name}!`);
  } else {
    window._currentUser = null;
    if (userName)   userName.textContent = "Sign in";
    if (userAvatar) userAvatar.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>`;
  }
}

/* ─── Open / Close modal ─────────────────────────────────────── */
function openAuth(tab = "email") {
  authTab = tab;
  document.getElementById("authBackdrop")?.classList.add("visible");
  document.getElementById("authModal")?.classList.add("open");
  document.body.style.overflow = "hidden";
  switchAuthTab(tab);
  clearAuthError();
}
function closeAuth() {
  document.getElementById("authBackdrop")?.classList.remove("visible");
  document.getElementById("authModal")?.classList.remove("open");
  document.body.style.overflow = "";
  clearAuthError();
}
function switchAuthTab(tab) {
  authTab = tab;
  document.querySelectorAll("[data-tab]").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === tab));
  document.getElementById("paneEmail")?.classList.toggle("hidden", tab !== "email");
  document.getElementById("panePhone")?.classList.toggle("hidden", tab !== "phone");
}
function switchAuthMode(mode) {
  authMode = mode;
  document.getElementById("btnLogin")?.classList.toggle("active",  mode === "login");
  document.getElementById("btnSignup")?.classList.toggle("active", mode === "signup");
  document.getElementById("authNameRow")?.classList.toggle("hidden", mode !== "signup");
  const btn = document.getElementById("authSubmitBtn");
  if (btn) btn.textContent = mode === "login" ? "Sign In" : "Create Account";
  clearAuthError();
}

/* ─── Email / Password ───────────────────────────────────────── */
async function doEmailAuth() {
  if (!firebaseAuth) { showAuthError("Firebase not configured."); return; }
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const name = document.getElementById("authName")?.value.trim();
  if (!email || !password) return showAuthError("Please enter email and password.");

  setAuthLoading(true);
  try {
    if (authMode === "signup") {
      if (!name) { showAuthError("Please enter your name."); setAuthLoading(false); return; }
      const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      onAuthStateChange(cred.user);
    } else {
      await firebaseAuth.signInWithEmailAndPassword(email, password);
    }
  } catch (e) {
    showAuthError(friendlyError(e.code));
  } finally { setAuthLoading(false); }
}

/* ─── Google ─────────────────────────────────────────────────── */
async function doGoogle() {
  if (!firebaseAuth) return;
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope("profile"); provider.addScope("email");
    await firebaseAuth.signInWithPopup(provider);
  } catch (e) { showAuthError(friendlyError(e.code)); }
}

/* ─── GitHub ─────────────────────────────────────────────────── */
async function doGitHub() {
  if (!firebaseAuth) return;
  try {
    await firebaseAuth.signInWithPopup(new firebase.auth.GithubAuthProvider());
  } catch (e) { showAuthError(friendlyError(e.code)); }
}

/* ─── Phone OTP ──────────────────────────────────────────────── */
async function sendOTP() {
  if (!firebaseAuth) return;
  const phone = document.getElementById("authPhone").value.trim();
  if (!phone) return showAuthError("Enter your phone with country code (+91…)");
  setAuthLoading(true);
  try {
    confirmResult = await firebaseAuth.signInWithPhoneNumber(phone, window.recaptchaVerifier);
    document.getElementById("otpRow")?.classList.remove("hidden");
    document.getElementById("sendOtpBtn")?.classList.add("hidden");
    showAuthError("✓ OTP sent! Check your SMS.", "success");
  } catch (e) {
    showAuthError(friendlyError(e.code));
    window.recaptchaVerifier?.render().then(id => grecaptcha.reset(id));
  } finally { setAuthLoading(false); }
}
async function verifyOTP() {
  if (!confirmResult) return;
  const code = document.getElementById("authOTP").value.trim();
  if (!code) return showAuthError("Enter the OTP code.");
  setAuthLoading(true);
  try { await confirmResult.confirm(code); }
  catch (e) { showAuthError(friendlyError(e.code)); }
  finally { setAuthLoading(false); }
}

/* ─── Sign out ───────────────────────────────────────────────── */
async function doSignOut() {
  if (!firebaseAuth) return;
  try {
    await firebaseAuth.signOut();
    closeUserMenu();
    if (typeof showToast === "function") showToast("👋 Signed out. See you soon!");
  } catch (e) { console.error(e); }
}

/* ─── User menu ──────────────────────────────────────────────── */
function toggleUserMenu() {
  if (!window._currentUser) { openAuth("email"); return; }
  const menu = document.getElementById("userMenu");
  const open = menu?.classList.toggle("open");
  if (open) {
    const em = document.getElementById("userMenuEmail");
    if (em) em.textContent = window._currentUser.email || window._currentUser.phoneNumber || "";
    setTimeout(() => document.addEventListener("click", closeUserMenuOutside, { once: true }), 0);
  }
}
function closeUserMenu() { document.getElementById("userMenu")?.classList.remove("open"); }
function closeUserMenuOutside(e) {
  if (!e.target.closest("#userBtn") && !e.target.closest("#userMenu")) closeUserMenu();
}

/* ─── Helpers ────────────────────────────────────────────────── */
function setAuthLoading(on) {
  const btn = document.getElementById("authSubmitBtn");
  if (!btn) return;
  btn.disabled = on;
  btn.textContent = on ? "Please wait…" : (authMode === "login" ? "Sign In" : "Create Account");
}
function showAuthError(msg, type = "error") {
  const el = document.getElementById("authError");
  if (!el) return;
  el.textContent = msg;
  el.className = "alert" + (type === "success" ? " success" : "");
  el.classList.remove("hidden");
}
function clearAuthError() {
  const el = document.getElementById("authError");
  if (el) { el.textContent = ""; el.classList.add("hidden"); }
}
function friendlyError(code) {
  const map = {
    "auth/user-not-found":            "No account found. Please sign up.",
    "auth/wrong-password":            "Incorrect password. Try again.",
    "auth/email-already-in-use":      "Email already registered. Please sign in.",
    "auth/weak-password":             "Password must be at least 6 characters.",
    "auth/invalid-email":             "Please enter a valid email.",
    "auth/too-many-requests":         "Too many attempts. Try again in a few minutes.",
    "auth/popup-closed-by-user":      "Sign-in was cancelled.",
    "auth/network-request-failed":    "Network error. Check your connection.",
    "auth/invalid-verification-code": "Wrong OTP. Please try again.",
    "auth/code-expired":              "OTP expired. Request a new one.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

/* ─── Expose to HTML onclick handlers ────────────────────────── */
window.openAuth       = openAuth;
window.closeAuth      = closeAuth;
window.switchAuthTab  = switchAuthTab;
window.switchAuthMode = switchAuthMode;
window.doEmailAuth    = doEmailAuth;
window.doGoogle       = doGoogle;
window.doGitHub       = doGitHub;
window.sendOTP        = sendOTP;
window.verifyOTP      = verifyOTP;
window.doSignOut      = doSignOut;
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenu  = closeUserMenu;
