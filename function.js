// Import fungsi-fungsi yang diperlukan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    setDoc, 
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    increment,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// =================================================================================
// KONFIGURASI FIREBASE ANDA
// Ganti dengan konfigurasi dari proyek Firebase Anda
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "1:your-sender-id:web:your-app-id"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =================================================================================
// Referensi Elemen DOM
// =================================================================================
const authModal = document.getElementById('auth-modal');
const appWrapper = document.getElementById('app-wrapper');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const userSessionUI = document.getElementById('user-session-ui');
const navUsername = document.getElementById('nav-username');
const navUserAvatar = document.getElementById('nav-user-avatar');
const reelsContainer = document.getElementById('reels-container');
const uploadModal = document.getElementById('upload-modal');
const navUploadBtn = document.getElementById('nav-upload-btn');
const closeUploadModalBtn = document.getElementById('close-upload-modal-btn');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');
const chatSidebar = document.getElementById('chat-sidebar');
const navChatBtn = document.getElementById('nav-chat-btn');
const closeChatBtn = document.getElementById('close-chat-btn');

let currentUser = null;

// =================================================================================
// Logika Autentikasi & State Management
// =================================================================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUser.username = userData.username;
            currentUser.avatar = userData.avatar || `https://placehold.co/40x40/E2E8F0/4A5568?text=${userData.username.charAt(0).toUpperCase()}`;
        }
        
        console.log("User logged in:", currentUser);
        updateUIAfterLogin();
        loadGlobalReels();
    } else {
        // User is signed out
        currentUser = null;
        console.log("User logged out.");
        updateUIAfterLogout();
    }
});

function updateUIAfterLogin() {
    authModal.classList.add('hidden');
    appWrapper.classList.remove('hidden');
    userSessionUI.classList.remove('hidden');
    navUsername.textContent = currentUser.username;
    navUserAvatar.src = currentUser.avatar;
}

function updateUIAfterLogout() {
    authModal.classList.remove('hidden');
    reelsContainer.innerHTML = '<div class="text-center p-10 text-gray-500">Silakan login untuk melihat reels.</div>';
    userSessionUI.classList.add('hidden');
    chatSidebar.classList.add('hidden');
}

// Event Listeners untuk Form Auth
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authError.textContent = '';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authError.textContent = '';
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Simpan data tambahan user (username) di Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
            username: username,
            email: email,
            following: [],
            followers: []
        });
        registerForm.reset();
    } catch (error) {
        console.error("Error registering:", error);
        authError.textContent = error.message;
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
        authError.textContent = '';
    } catch (error) {
        console.error("Error logging in:", error);
        authError.textContent = "Email atau password salah.";
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});


// =================================================================================
// Logika Reels (FYP)
// =================================================================================
async function loadGlobalReels() {
    reelsContainer.innerHTML = '<div class="text-center p-10 text-gray-500">Memuat reels...</div>';
    try {
        const reelsCollection = collection(db, "reels");
        const querySnapshot = await getDocs(reelsCollection);
        reelsContainer.innerHTML = ''; // Kosongkan container
        if (querySnapshot.empty) {
            reelsContainer.innerHTML = '<div class="text-center p-10 text-gray-500">Belum ada reels. Jadilah yang pertama mengunggah!</div>';
            return;
        }
        querySnapshot.forEach(doc => {
            createReelElement(doc.id, doc.data());
        });
    } catch (error) {
        console.error("Error loading reels:", error);
        reelsContainer.innerHTML = '<div class="text-center p-10 text-red-500">Gagal memuat reels.</div>';
    }
}

function createReelElement(reelId, reelData) {
    const reelElement = document.createElement('div');
    reelElement.className = 'reel-item relative flex justify-center items-center bg-black';
    
    // Cek apakah user sudah like reel ini
    const isLiked = reelData.likes?.includes(currentUser.uid);
    // Cek apakah user sudah follow pembuat reel
    // Ini perlu query data user, untuk simplifikasi kita asumsikan belum follow
    // Implementasi follow yang lebih baik ada di fungsi followUser
    
    reelElement.innerHTML = `
        <video class="h-full w-full object-contain" src="${reelData.videoUrl}" loop autoplay muted playsinline></video>
        
        <!-- Video Overlay Info -->
        <div class="absolute bottom-0 left-0 p-4 text-white w-full bg-gradient-to-t from-black/50 to-transparent">
            <div class="flex items-center gap-2">
                <img src="${reelData.userAvatar || 'https://placehold.co/40x40'}" class="w-10 h-10 rounded-full border-2 border-white">
                <p class="font-bold">${reelData.username}</p>
            </div>
            <p class="text-sm mt-2">${reelData.caption}</p>
        </div>

        <!-- Action Buttons -->
        <div class="absolute right-4 bottom-24 flex flex-col items-center gap-6 text-white">
            <button class="action-btn like-btn" data-reel-id="${reelId}">
                <i data-lucide="heart" class="${isLiked ? 'fill-red-500 text-red-500' : ''}"></i>
                <span class="text-xs">${reelData.likeCount || 0}</span>
            </button>
            <button class="action-btn comment-btn" data-reel-id="${reelId}">
                <i data-lucide="message-circle"></i>
                <span class="text-xs">${reelData.commentCount || 0}</span>
            </button>
            ${reelData.userId !== currentUser.uid ? `
            <button class="action-btn follow-btn bg-white/30 p-2 rounded-full" data-user-id="${reelData.userId}">
                <i data-lucide="plus" class="text-white"></i>
            </button>
            ` : ''}
        </div>
    `;
    reelsContainer.appendChild(reelElement);
    lucide.createIcons(); // Re-initialize icons
}

// Event delegation untuk tombol-tombol di reels
reelsContainer.addEventListener('click', async (e) => {
    const target = e.target.closest('.action-btn');
    if (!target) return;

    if (!currentUser) {
        alert("Silakan login untuk berinteraksi.");
        return;
    }

    if (target.classList.contains('like-btn')) {
        const reelId = target.dataset.reelId;
        await likeReel(reelId, target);
    }
    if (target.classList.contains('comment-btn')) {
        const reelId = target.dataset.reelId;
        alert(`Fitur komentar untuk reel ${reelId} belum diimplementasikan.`);
    }
    if (target.classList.contains('follow-btn')) {
        const targetUserId = target.dataset.userId;
        await followUser(targetUserId, target);
    }
});

async function likeReel(reelId, buttonElement) {
    const reelRef = doc(db, "reels", reelId);
    const likeIcon = buttonElement.querySelector('i');
    const likeCountSpan = buttonElement.querySelector('span');
    
    try {
        const reelDoc = await getDoc(reelRef);
        const reelData = reelDoc.data();
        const isLiked = reelData.likes?.includes(currentUser.uid);

        if (isLiked) {
            // Unlike
            await updateDoc(reelRef, {
                likes: arrayRemove(currentUser.uid),
                likeCount: increment(-1)
            });
            likeIcon.classList.remove('fill-red-500', 'text-red-500');
            likeCountSpan.textContent = parseInt(likeCountSpan.textContent) - 1;
        } else {
            // Like
            await updateDoc(reelRef, {
                likes: arrayUnion(currentUser.uid),
                likeCount: increment(1)
            });
            likeIcon.classList.add('fill-red-500', 'text-red-500');
            likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;
        }
    } catch (error) {
        console.error("Error liking reel:", error);
        alert("Gagal menyukai reel.");
    }
}

async function followUser(targetUserId, buttonElement) {
    const currentUserRef = doc(db, "users", currentUser.uid);
    const targetUserRef = doc(db, "users", targetUserId);

    try {
        const currentUserDoc = await getDoc(currentUserRef);
        const isFollowing = currentUserDoc.data().following?.includes(targetUserId);

        if (isFollowing) {
            // Unfollow
            await updateDoc(currentUserRef, { following: arrayRemove(targetUserId) });
            await updateDoc(targetUserRef, { followers: arrayRemove(currentUser.uid) });
            alert(`Anda berhenti mengikuti user.`);
            buttonElement.innerHTML = `<i data-lucide="plus" class="text-white"></i>`;
        } else {
            // Follow
            await updateDoc(currentUserRef, { following: arrayUnion(targetUserId) });
            await updateDoc(targetUserRef, { followers: arrayUnion(currentUser.uid) });
            alert(`Anda sekarang mengikuti user.`);
            buttonElement.innerHTML = `<i data-lucide="check" class="text-white"></i>`;
        }
        lucide.createIcons();
    } catch (error) {
        console.error("Error following user:", error);
        alert("Gagal mengikuti user.");
    }
}

// =================================================================================
// Logika Upload
// =================================================================================
navUploadBtn.addEventListener('click', () => {
    if(currentUser) {
        uploadModal.classList.remove('hidden');
    } else {
        alert("Login untuk mengunggah video.");
    }
});

closeUploadModalBtn.addEventListener('click', () => {
    uploadModal.classList.add('hidden');
    uploadForm.reset();
    uploadStatus.textContent = '';
});

uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const videoFile = document.getElementById('upload-video').files[0];
    const caption = document.getElementById('upload-caption').value;

    if (!videoFile) {
        uploadStatus.textContent = "Pilih file video terlebih dahulu.";
        uploadStatus.className = "text-red-500 text-center mt-4";
        return;
    }
    
    uploadReel(videoFile, caption);
});

function uploadReel(videoFile, caption) {
    const storageRef = ref(storage, `reels/${currentUser.uid}/${Date.now()}_${videoFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, videoFile);

    uploadTask.on('state_changed', 
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadStatus.textContent = `Uploading: ${Math.round(progress)}%`;
            uploadStatus.className = "text-blue-500 text-center mt-4";
        }, 
        (error) => {
            console.error("Upload failed:", error);
            uploadStatus.textContent = "Upload Gagal!";
            uploadStatus.className = "text-red-500 text-center mt-4";
        }, 
        async () => {
            // Upload completed successfully, now get the download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save reel info to Firestore
            await addDoc(collection(db, "reels"), {
                userId: currentUser.uid,
                username: currentUser.username,
                userAvatar: currentUser.avatar,
                videoUrl: downloadURL,
                caption: caption,
                likeCount: 0,
                commentCount: 0,
                createdAt: new Date()
            });

            uploadStatus.textContent = "Upload Berhasil!";
            uploadStatus.className = "text-green-500 text-center mt-4";
            
            setTimeout(() => {
                closeUploadModalBtn.click();
                loadGlobalReels(); // Refresh reels
            }, 1500);
        }
    );
}

// =================================================================================
// Logika Chat (UI Sederhana)
// =================================================================================
navChatBtn.addEventListener('click', () => {
     if(currentUser) {
        chatSidebar.classList.toggle('hidden');
     } else {
        alert("Login untuk membuka chat.");
    }
});
closeChatBtn.addEventListener('click', () => chatSidebar.classList.add('hidden'));

// Implementasi chat lebih lanjut (loadChat, sendMessage) memerlukan struktur data
// dan listener real-time (onSnapshot) yang lebih kompleks, namun kerangka UI-nya sudah siap.

});
