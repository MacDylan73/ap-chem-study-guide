// auth.js -- Centralized Firebase Authentication & Username Logic for AP Chem Study Guide
// ------------------------------------------------------------------------
// This file should be loaded as a module (type="module") on every page.
// It handles Firebase initialization, sign-in/out, username modal, and user state management.

// ---- Firebase Imports ----
// If you use <script type="module"> in your HTML, these imports will work directly.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
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
// !! Replace with your actual config values !!
// You can keep this block as-is for all pages.
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
// Call this on page load to update UI and state everywhere.
export function onAuthChange(callback) {
  onAuthStateChanged(auth, user => {
    isSignedIn = !!user;
    currentUser = user || null;
    if (callback) callback(user);
    // You can also dispatch a custom event for other scripts
    document.dispatchEvent(new CustomEvent("authstatechanged", { detail: { user } }));
  });
}

// ---- Sign In Handler ----
export function signInHandler() {
  return signInWithPopup(auth, provider)
    .then(result => {
      isSignedIn = true;
      currentUser = result.user;
      return result.user;
    })
    .catch(error => {
      alert("Sign-in failed: " + error.message);
      throw error;
    });
}

// ---- Sign Out Handler ----
export function signOutHandler() {
  return signOut(auth).then(() => {
    isSignedIn = false;
    currentUser = null;
    location.reload();
  });
}

// ---- Username Modal Logic ----
// Call showUsernameModal() to display, and saveUsername(newName) to save.
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
// Checks if username is taken
export async function isUsernameTaken(username) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", username));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Saves username to Firestore for the current user
export async function saveUsername(newUsername) {
  if (!isSignedIn || !currentUser || !newUsername) throw new Error("Not signed in or invalid username");
  const valid = /^[a-zA-Z0-9_]{3,20}$/.test(newUsername);
  if (!valid) throw new Error("Username must be 3–20 characters, letters/numbers/underscores only.");
  if (await isUsernameTaken(newUsername)) throw new Error("Username already taken.");
  const userRef = doc(db, "users", currentUser.uid);
  await setDoc(userRef, { username: newUsername }, { merge: true });
  hideUsernameModal();
}

// Get username for current user
export async function getUsername() {
  if (!isSignedIn || !currentUser) return null;
  const userRef = doc(db, "users", currentUser.uid);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? snapshot.data().username : null;
}

// ---- Modal Event Setup ----
// Call setupUsernameModal() on page load to wire up modal events.
export function setupUsernameModal() {
  const modal = document.getElementById('usernameModal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.close') || document.getElementById('closeUsernameModal');
  if (closeBtn) {
    closeBtn.onclick = hideUsernameModal;
  }

  const saveBtn = modal.querySelector('button') || document.getElementById('saveUsernameBtn') || document.getElementById('submitUsernameBtn');
  const input = modal.querySelector('input') || document.getElementById('usernameInput');
  if (saveBtn && input) {
    saveBtn.onclick = async () => {
      const entered = input.value.trim();
      try {
        await saveUsername(entered);
        hideUsernameModal();
      } catch (e) {
        alert(e.message);
        input.focus();
      }
    };
  }
}

// ---- Utility: Ensure Username on Login ----
// Call ensureUsernameOnLogin() after sign-in or auth state change.
// Shows modal if username missing.
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

    const changeUsernameBtn = document.createElement("button");
    changeUsernameBtn.textContent = "Change Username";
    changeUsernameBtn.onclick = () => {
      document.getElementById("usernameModal").style.display = "block";
      document.getElementById("usernameInput").focus();
    };
    leftDiv.appendChild(changeUsernameBtn);
  } else {
    const signUpBtn = document.createElement("button");
    signUpBtn.textContent = "Sign Up";
    signUpBtn.onclick = () => {
      signInWithPopup(auth, provider)
        .then(result => {
          window.isSignedIn = true;
          updateIndexBarAuthButtons();
          ensureUsernameOnLogin();
        })
        .catch(error => {
          alert("Sign-in failed!");
        });
    };
    leftDiv.appendChild(signUpBtn);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateIndexBarAuthButtons();
});
// ---- Example Usage (in your HTML page) ----
/*
<script type="module">
  import {
    onAuthChange, signInHandler, signOutHandler, setupUsernameModal, ensureUsernameOnLogin
  } from './auth.js';

  // Set up modal events on page load
  setupUsernameModal();

  // Listen for auth state changes (update UI, etc)
  onAuthChange(async user => {
    await ensureUsernameOnLogin();
    // Update UI, bottom bar, etc.
  });

  // Attach sign-in/out handlers to buttons
  document.getElementById("sidebarSignInBtn").onclick = signInHandler;
  document.getElementById("signOutBtn").onclick = signOutHandler;
</script>
*/

// ---- End of auth.js ----
