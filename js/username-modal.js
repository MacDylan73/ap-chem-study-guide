import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { db, isSignedIn, currentUser, isUsernameTaken } from './auth.js'; 

export function setupUsernameModal() {
  const usernameModal = document.getElementById('usernameModal');
  const closeUsernameModal = document.getElementById('closeUsernameModal');
  const saveUsernameBtn = document.getElementById('saveUsernameBtn');
  const usernameInput = document.getElementById('usernameInput');

  // Create (or select) error message element below the input
  let errorMsg = document.getElementById('usernameErrorMsg');
  if (!errorMsg) {
    errorMsg = document.createElement('div');
    errorMsg.id = 'usernameErrorMsg';
    errorMsg.style.color = '#c00';
    errorMsg.style.fontSize = '0.97em';
    errorMsg.style.marginTop = '6px';
    errorMsg.style.minHeight = '1.2em';
    // Insert just after input
    usernameInput.parentNode.insertBefore(errorMsg, saveUsernameBtn);
  }

  closeUsernameModal.onclick = () => { 
    usernameModal.style.display = 'none'; 
    errorMsg.textContent = '';
  };

  saveUsernameBtn.onclick = async () => {
    errorMsg.textContent = ''; // Clear previous errors
    const newUsername = usernameInput.value.trim();
    if (!isSignedIn || !currentUser) {
      errorMsg.textContent = "Please sign in first!";
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(newUsername)) {
      errorMsg.textContent = "Username must be 3–20 characters, letters/numbers/underscores only.";
      return;
    }
    try {
      if (await isUsernameTaken(newUsername)) {
        errorMsg.textContent = "Username already taken. Please choose another.";
        return;
      }
      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, { username: newUsername }, { merge: true });
      usernameModal.style.display = 'none';
      errorMsg.textContent = '';
    } catch (e) {
      errorMsg.textContent = "Could not save username.";
    }
  };
}

// Check if a User has a Username
export async function checkUsername(user) {
  const usernameModal = document.getElementById('usernameModal');
  const usernameInput = document.getElementById('usernameInput');
  if (!user || !user.uid) {
    usernameModal.style.display = 'none';
    return;
  }
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists() || !snapshot.data().username) {
    usernameModal.style.display = 'block';
    usernameInput.focus();
  } else {
    usernameModal.style.display = 'none';
  }
}
