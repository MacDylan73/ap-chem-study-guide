import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Username Modal Builder
export function setupUsernameModal(auth, db) {
  const usernameModal = document.getElementById('usernameModal');
  const closeUsernameModal = document.getElementById('closeUsernameModal');
  const saveUsernameBtn = document.getElementById('saveUsernameBtn');
  const usernameInput = document.getElementById('usernameInput');

  closeUsernameModal.onclick = () => { usernameModal.style.display = 'none'; };

  saveUsernameBtn.onclick = async () => {
    const newUsername = usernameInput.value.trim();
    // Username uniqueness check (optional, if you have isUsernameTaken)
    // if (await isUsernameTaken(newUsername)) {
    //   alert("Username already taken.");
    //   return;
    // }
    if (newUsername && window.isSignedIn && auth.currentUser) {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await setDoc(userRef, { username: newUsername }, { merge: true });
        usernameModal.style.display = 'none';
      } catch (e) {
        alert("Could not save username.");
      }
    } else {
      alert("Please sign in first!");
    }
  };
}

// Check if a User has a Username
export async function checkUsername(user, db) {
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
