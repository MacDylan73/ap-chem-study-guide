// auth.js -- Centralized Firebase Authentication & Username Logic for AP Chem Study Guide
// ------------------------------------------------------------------------
// This file should be loaded as a module (type="module") on every page.
// It handles Firebase initialization, sign-in/out, username modal, and user state management.

// ---- Firebase Imports ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: "AIzaSyAErba8GYZi2DeP0i0aE-39ZCwZQvlskQw",
  authDomain: "ap-chem-course-guide.firebaseapp.com",
  projectId: "ap-chem-course-guide",
  storageBucket: "ap-chem-course-guide.appspot.com",
  messagingSenderId: "601341546125",
  appId: "1:601341546125:web:152f1fb623c69351c81cc4",
  measurementId: "G-X2H058B7KT"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ---- Provider Setup ----
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// ---- Global State Helpers ----
export let isSignedIn = false;
export let currentUser = null;

// ---- Auth State Listener ----
export function onAuthChange(callback) {
  console.log("[AUTH] onAuthChange setup"); // Add this!
  onAuthStateChanged(auth, user => {
    console.log("[AUTH] onAuthStateChanged", user); // Add this!
    isSignedIn = !!user;
    currentUser = user || null;
    window.isSignedIn = isSignedIn;
    window.currentUser = currentUser;
    if (callback) callback(user);
    document.dispatchEvent(new CustomEvent("authstatechanged", { detail: { user } }));
  });
}

// ---- Google Sign In Handler ----
export function signInHandler() {
  return signInWithPopup(auth, provider)
    .then(result => {
      isSignedIn = true;
      currentUser = result.user;
      window.isSignedIn = isSignedIn;
      window.currentUser = currentUser;
      window.dispatchEvent(new CustomEvent('user-signed-in'));
      return result.user;
    })
    .catch(error => {
      alert("Sign-in failed: " + error.message);
      throw error;
    });
}

// ---- Username Modal Logic ----
export function showUsernameModal() {
  const modal = document.getElementById("usernameModal");
  if (modal) {
    modal.style.display = "block";
    const input = modal.querySelector("input, #usernameInput");
    if (input) input.focus();
  }
}
export function hideUsernameModal() {
  const modal = document.getElementById("usernameModal");
  if (modal) modal.style.display = "none";
}

// ---- Firestore Username Utilities ----
export async function isUsernameTaken(username) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function saveUsername(newUsername) {
  if (!isSignedIn || !currentUser || !newUsername) throw new Error("Not signed in or invalid username");
  const valid = /^[a-zA-Z0-9_]{3,20}$/.test(newUsername);
  if (!valid) throw new Error("Username must be 3–20 characters, letters/numbers/underscores only.");
  if (await isUsernameTaken(newUsername)) throw new Error("Username already taken.");
  const userRef = doc(db, "users", currentUser.uid);
  await setDoc(userRef, { username: newUsername }, { merge: true });
  hideUsernameModal();
}

export async function getUsername() {
  if (!isSignedIn || !currentUser) return null;
  const userRef = doc(db, "users", currentUser.uid);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? snapshot.data().username : null;
}

// ---- Modal Event Setup ----
export function setupAuthModalEvents() {
  const tabSignIn = document.getElementById('tabSignIn');
  const tabRegister = document.getElementById('tabRegister');
  const authForm = document.getElementById('authForm');
  const usernameGroup = document.getElementById('usernameGroup');
  const authUsername = document.getElementById('authUsername');
  const submitAuthBtn = document.getElementById('submitAuthBtn');
  const authModalTitle = document.getElementById('authModalTitle');
  const authError = document.getElementById('authError');
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  const signInModal = document.getElementById('signInModal');
  const closeSignInModal = document.getElementById('closeSignInModal');

  let isRegister = false;
  const RESEND_COOLDOWN_MINUTES = 5;

  function canResendVerification(email) {
    const lastSent = localStorage.getItem("lastVerificationResend_" + email);
    if (!lastSent) return true;
    const minutesPassed = (Date.now() - parseInt(lastSent, 10)) / 1000 / 60;
    return minutesPassed >= RESEND_COOLDOWN_MINUTES;
  }

  async function handleResendVerification(user, email, errorElem, resendBtn) {
    if (!canResendVerification(email)) {
      if (errorElem)
        errorElem.textContent =
          "Verification emails can only be requested every 5 minutes. Please check your spam/junk folder as well.";
      resendBtn.disabled = true;
      return;
    }
    await sendEmailVerification(user);
    localStorage.setItem("lastVerificationResend_" + email, Date.now().toString());
    if (errorElem)
      errorElem.textContent =
        "Verification email resent! Check your inbox and your spam/junk folder.";
    resendBtn.disabled = true;
    setTimeout(() => {
      resendBtn.disabled = !canResendVerification(email);
    }, 1000);
  }

  // Tab switching logic
  tabSignIn.onclick = () => {
    isRegister = false;
    tabSignIn.classList.add('active');
    tabRegister.classList.remove('active');
    if (usernameGroup) usernameGroup.style.display = 'none';
    submitAuthBtn.textContent = 'Sign In';
    authModalTitle.textContent = 'Sign In to Your Account';
    if (authError) authError.textContent = '';
    // Hide resend button if it exists
    let resendBtn = document.getElementById("resendVerificationBtn");
    if (resendBtn) resendBtn.style.display = "none";
  };
  tabRegister.onclick = () => {
    isRegister = true;
    tabRegister.classList.add('active');
    tabSignIn.classList.remove('active');
    if (usernameGroup) usernameGroup.style.display = 'block';
    submitAuthBtn.textContent = 'Register';
    authModalTitle.textContent = 'Register a New Account';
    if (authError) authError.textContent = '';
    // Hide resend button if it exists
    let resendBtn = document.getElementById("resendVerificationBtn");
    if (resendBtn) resendBtn.style.display = "none";
  };

  closeSignInModal.onclick = () => {
    signInModal.style.display = 'none';
    if (authError) authError.textContent = '';
    if (authForm) authForm.reset();
    tabSignIn.onclick(); // Reset to sign-in tab
    // Hide resend button if it exists
    let resendBtn = document.getElementById("resendVerificationBtn");
    if (resendBtn) resendBtn.style.display = "none";
  };

  // Google sign-in
  if (googleSignInBtn) {
    googleSignInBtn.onclick = async () => {
      if (authError) authError.textContent = '';
      try {
        await signInWithPopup(auth, provider);
        await ensureUsernameOnLogin(); // Only for Google sign-in
        signInModal.style.display = "none";
      } catch (err) {
        if (authError) authError.textContent = err.message;
      }
    };
  }

  // Email/Password form submit
  if (authForm) {
    authForm.onsubmit = async (e) => {
      e.preventDefault();
      if (authError) authError.textContent = '';
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      let resendBtn = document.getElementById("resendVerificationBtn");
      if (resendBtn) resendBtn.style.display = "none";

      if (isRegister) {
        const username = authUsername.value.trim();
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          if (authError) authError.textContent = "Username must be 3–20 Letters/Numbers/Underscores.";
          return;
        }
        if (await isUsernameTaken(username)) {
          if (authError) authError.textContent = "Username Already Taken.";
          return;
        }
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: username });
          await sendEmailVerification(cred.user);
          await setDoc(doc(db, "users", cred.user.uid), { username }, { merge: true });
          await signOut(auth); // Immediately sign out after sending verification

          // Switch to login tab and show verification message on login tab
          if (tabSignIn) tabSignIn.onclick();
          if (authError) {
            authError.textContent =
              "Account created! Please verify your email before logging in. " +
              "A verification link has been sent to your inbox. " +
              "If you do not see the email, please check your spam or junk folder.";
          }
          // Modal stays open, user can log in after verifying
        } catch (err) {
          if (authError) authError.textContent = err.message;
        }
      } else {
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          if (!cred.user.emailVerified) {
            if (authError)
              authError.textContent =
                "Your email is not verified. Please check your inbox for the verification link. " +
                "Check your spam/junk folder if you don't see it.";

            let resendBtn = document.getElementById("resendVerificationBtn");
            if (!resendBtn) {
              resendBtn = document.createElement("button");
              resendBtn.id = "resendVerificationBtn";
              resendBtn.textContent = "Resend Verification Email";
              resendBtn.style.marginTop = "10px";
              authError.parentNode.appendChild(resendBtn);
            }
            resendBtn.style.display = "inline-block";
            resendBtn.disabled = !canResendVerification(email);
            resendBtn.onclick = () => handleResendVerification(cred.user, email, authError, resendBtn);

            await signOut(auth); // Immediately sign out
            return;
          }
          await ensureUsernameOnLogin(); // If somehow username not set, prompt (shouldn't happen for email/pass)
          signInModal.style.display = "none";
        } catch (err) {
          if (authError) authError.textContent = err.message;
        }
      }
    };
  }
}

export function signOutHandler() {
  return signOut(auth)
    .then(() => {
      isSignedIn = false;
      currentUser = null;
      window.isSignedIn = false;
      window.currentUser = null;
      document.dispatchEvent(new CustomEvent("authstatechanged", { detail: { user: null } }));
    })
    .catch(error => {
      alert("Sign-out failed: " + error.message);
      throw error;
    });
}

// ---- Utility: Ensure Username on Login ----
export async function ensureUsernameOnLogin() {
  if (!isSignedIn || !currentUser) return;
  const username = await getUsername();
  if (!username) showUsernameModal();
  else hideUsernameModal();
}

//INDEX PAGE ONLY: SETUP BOTTOM BAR
export function updateIndexBarAuthButtons() {
  const leftDiv = document.getElementById("bottomBarLeft");
  leftDiv.innerHTML = "";
  if (window.isSignedIn) {
    // Sign Out button
    const signOutBtn = document.createElement("button");
    signOutBtn.textContent = "Sign Out";
    signOutBtn.onclick = () => {
      signOut(auth).then(() => {
        window.isSignedIn = false;
        updateIndexBarAuthButtons();
        location.reload();
      });
    };
    leftDiv.appendChild(signOutBtn);

    // --- Account button with SVG icon ---
    const accountBtn = document.createElement("button");
accountBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="21" height="21" style="vertical-align:middle; margin-right:6px; fill:none;stroke:currentColor;stroke-width:2;">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6"/>
  </svg>
  Account
`;
accountBtn.onclick = () => {
  if (typeof showAccountModal === "function") {
    showAccountModal();
  } else {
    alert("Account modal not loaded. Try refreshing.");
  }
};
leftDiv.appendChild(accountBtn);

  } else {
    // Sign In button
    const signUpBtn = document.createElement("button");
    signUpBtn.textContent = "Sign In";
    signUpBtn.onclick = () => {
      const modal = document.getElementById("signInModal");
      if (modal) {
        modal.style.display = "block";
        const tabSignIn = document.getElementById('tabSignIn');
        if (tabSignIn) tabSignIn.onclick(); // Always launch modal on sign-in tab
      }
    };
    leftDiv.appendChild(signUpBtn);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateIndexBarAuthButtons();
});


// --- Dynamic Bottom Bar for Units Pages ---
export function updateUnitBottomBarAuthButtons() {
  const bottomBarLeft = document.getElementById("bottomBarLeft");
  const signInModal = document.getElementById("signInModal"); // use correct modal ID
  const usernameModal = document.getElementById("usernameModal");
  const usernameInput = document.getElementById("usernameInput");

  bottomBarLeft.innerHTML = "";

  if (window.isSignedIn) {
    // Sign Out button
    const signOutBtn = document.createElement("button");
    signOutBtn.textContent = "Sign Out";
    signOutBtn.onclick = async () => {
      await signOutHandler();
      updateUnitBottomBarAuthButtons();
      location.reload();
    };
    bottomBarLeft.appendChild(signOutBtn);

    // --- Account button with SVG icon ---
    const accountBtn = document.createElement("button");
accountBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="21" height="21" style="vertical-align:middle; margin-right:6px; fill:none;stroke:currentColor;stroke-width:2;">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6"/>
  </svg>
  Account
`;
accountBtn.onclick = () => {
  if (typeof showAccountModal === "function") {
    showAccountModal();
  } else {
    alert("Account modal not loaded. Try refreshing.");
  }
};
leftDiv.appendChild(accountBtn);

  } else {
    // Sign In button
    const signInBtn = document.createElement("button");
    signInBtn.textContent = "Sign In";
    signInBtn.onclick = () => {
      if (signInModal) signInModal.style.display = "block";
      else console.warn("Sign-in modal not found");
    };
    bottomBarLeft.appendChild(signInBtn);
  }
}

// Sets up navigation for bottom bar buttons on unit pages
export function setupUnitBottomBarButtons() {
  const returnHomeBtn = document.getElementById("returnHomeBtn");
  if (returnHomeBtn) returnHomeBtn.onclick = () => window.location.href = "/ap-chem-study-guide/";
  // const nextUnitBtn = document.getElementById("nextUnitBtn");
  // if (nextUnitBtn) nextUnitBtn.onclick = () => window.location.href = "/unit-2-compound-structure-and-properties.html";
}

// Keeps bottom bar in sync with auth state on unit pages
export function setupUnitBottomBarAuthSync() {
  setInterval(updateUnitBottomBarAuthButtons, 1000);
}

export function getUser() {
  return currentUser;
}
