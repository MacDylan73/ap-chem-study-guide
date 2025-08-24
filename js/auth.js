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
  onAuthStateChanged(auth, user => {
    isSignedIn = !!user;
    currentUser = user || null;
    window.isSignedIn = isSignedIn; // <-- ADD THIS LINE
    window.currentUser = currentUser; // (optional, for debugging)
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
      window.isSignedIn = isSignedIn; // <-- ADD THIS LINE
      window.currentUser = currentUser; // (optional)
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
  console.log("isSignedIn:", isSignedIn, "currentUser:", currentUser);
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

  // Tab switching logic
  tabSignIn.onclick = () => {
    isRegister = false;
    tabSignIn.classList.add('active');
    tabRegister.classList.remove('active');
    if (usernameGroup) usernameGroup.style.display = 'none';
    submitAuthBtn.textContent = 'Sign In';
    authModalTitle.textContent = 'Sign In to Your Account';
    if (authError) authError.textContent = '';
  };
  tabRegister.onclick = () => {
    isRegister = true;
    tabRegister.classList.add('active');
    tabSignIn.classList.remove('active');
    if (usernameGroup) usernameGroup.style.display = 'block';
    submitAuthBtn.textContent = 'Register';
    authModalTitle.textContent = 'Register a New Account';
    if (authError) authError.textContent = '';
  };

  closeSignInModal.onclick = () => {
    signInModal.style.display = 'none';
    if (authError) authError.textContent = '';
    if (authForm) authForm.reset();
    tabSignIn.onclick(); // Reset to sign-in tab
  };

  // Google sign-in
  if (googleSignInBtn) {
    googleSignInBtn.onclick = async () => {
      if (authError) authError.textContent = '';
      try {
        await signInWithPopup(auth, provider);
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
    if (isRegister) {
  const username = authUsername.value.trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    if (authError) authError.textContent = "Username must be 3–20 letters/numbers/underscores.";
    return;
  }
  if (await isUsernameTaken(username)) {
    if (authError) authError.textContent = "Username already taken.";
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });

    // Wait for Auth state to update before writing to Firestore
    await new Promise(resolve => {
      const unsub = onAuthStateChanged(auth, user => {
        if (user && user.uid === cred.user.uid) {
          unsub();
          resolve();
        }
      });
    });

    await setDoc(doc(db, "users", cred.user.uid), { username }, { merge: true });
    signInModal.style.display = "none";
  } catch (err) {
    if (authError) authError.textContent = err.message;
  }
} else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
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
      window.isSignedIn = false; // <-- ADD THIS LINE
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
    changeUsernameBtn.onclick = async () => {
  document.getElementById("usernameModal").style.display = "block";
  const input = document.getElementById("usernameInput");
  if (input) {
    // Fetch and set the current username
    const username = await getUsername();
    input.value = username || "";
    input.focus();
  }
};
    leftDiv.appendChild(changeUsernameBtn);
  } else {
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
