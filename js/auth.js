import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

export function checkAuth(required = true) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (required && !user) {
        window.location.href = 'login.html';
        resolve(null);
      } else {
        resolve(user);
      }
    });
  });
}

export async function loginAdmin(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, message: getAuthErrorMessage(error.code) };
  }
}

export async function logoutAdmin() {
  try {
    await signOut(auth);
    window.location.href = 'index.html';
    return { success: true };
  } catch (error) {
    return { success: false, message: 'Gagal logout' };
  }
}

function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Format email tidak valid',
    'auth/user-disabled': 'Akun ini telah dinonaktifkan',
    'auth/user-not-found': 'Email tidak terdaftar',
    'auth/wrong-password': 'Password salah',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan coba nanti',
  };
  return messages[code] || 'Terjadi kesalahan. Silakan coba lagi.';
}
