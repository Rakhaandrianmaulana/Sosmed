/**
 * Instagram Clone Logic
 * All data is stored in localStorage to simulate a backend.
 * This script handles:
 * - User Authentication (Login/Register) with special user case
 * - View/Pane Management
 * - Post Creation and Display
 * - User Interactions (Like, Comment, Follow)
 * - Profile Management (View, Edit)
 * - Search
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        loggedInUser: null, // Stores the logged-in user object
        currentView: 'login', // 'login', 'register', 'app'
        currentPane: 'feed', // 'feed', 'search', 'profile', 'edit-profile', 'notifications'
        viewingProfileId: null, // The ID of the user whose profile is being viewed
        activeModal: null, // 'upload', 'comment', 'follow-list'
        commentingPostId: null, // The ID of the post being commented on
        followList: {
            type: null, // 'followers' or 'following'
            userId: null
        }
    };

    // --- DATABASE (localStorage) ABSTRACTION ---
    const db = {
        // Fetches data from localStorage, initializing if it doesn't exist
        get: (key) => {
            const data = localStorage.getItem(key);
            if (!data) {
                if (key === 'users') return [];
                if (key === 'posts') return [];
                return null;
            }
            return JSON.parse(data);
        },
        // Saves data to localStorage
        set: (key, value) => {
            localStorage.setItem(key, JSON.stringify(value));
        },
        // Gets the ID of the currently logged-in user
        getLoggedInUserId: () => {
            return localStorage.getItem('loggedInUserId');
        },
        // Sets the ID of the logged-in user
        setLoggedInUserId: (id) => {
            if (id) {
                localStorage.setItem('loggedInUserId', id);
            } else {
                localStorage.removeItem('loggedInUserId');
            }
        }
    };

    // --- UTILITY FUNCTIONS ---
    const utils = {
        // Finds a user by their ID
        getUserById: (id) => db.get('users').find(user => user.id === id),
        // Finds a user by their email
        getUserByEmail: (email) => db.get('users').find(user => user.email && user.email.toLowerCase() === email.toLowerCase()),
        // Finds a user by their name (case-insensitive)
        getUserByName: (name) => db.get('users').find(user => user.name.toLowerCase() === name.toLowerCase()),
        // Finds a post by its ID
        getPostById: (id) => db.get('posts').find(post => post.id === id),
        // Generates a unique ID
        generateId: () => '_' + Math.random().toString(36).substr(2, 9),
        // Converts a file to a Base64 string for storage
        fileToBase64: (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        }),
        // Displays an alert message (custom styling could be added later)
        showAlert: (message) => alert(message),
    };

    // --- RENDER FUNCTIONS (UI Generation) ---
    const render = {
        // Main render function, decides what to show based on state
        app: () => {
            const loggedInId = db.getLoggedInUserId();
            if (loggedInId) {
                state.loggedInUser = utils.getUserById(loggedInId);
                if (state.loggedInUser) {
                    state.currentView = 'app';
                    DOMElements.authContainer.classList.add('hidden');
                    DOMElements.mainAppView.classList.remove('hidden');
                    render.navigation();
                    render.pane();
                } else {
                    // Data inconsistency, log out
                    auth.logout();
                }
            } else {
                state.currentView = 'login';
                DOMElements.mainAppView.classList.add('hidden');
                DOMElements.authContainer.classList.remove('hidden');
                render.authView();
            }
        },

        // Toggles between Login and Register views
        authView: () => {
            if (state.currentView === 'login') {
                DOMElements.loginView.classList.remove('hidden');
                DOMElements.registerView.classList.add('hidden');
            } else if (state.currentView === 'register') {
                DOMElements.loginView.classList.add('hidden');
                DOMElements.registerView.classList.remove('hidden');
            }
        },

        // Renders the correct content pane (Feed, Profile, etc.)
        pane: () => {
            DOMElements.contentContainer.innerHTML = ''; // Clear previous content
            let template;
            switch (state.currentPane) {
                case 'profile':
                    template = document.getElementById('profile-pane-template').content.cloneNode(true);
                    DOMElements.contentContainer.appendChild(template);
                    render.profile(state.viewingProfileId || state.loggedInUser.id);
                    break;
                case 'edit-profile':
                    template = document.getElementById('edit-profile-pane-template').content.cloneNode(true);
                    DOMElements.contentContainer.appendChild(template);
                    render.editProfile();
                    break;
                case 'search':
                    template = document.getElementById('search-pane-template').content.cloneNode(true);
                    DOMElements.contentContainer.appendChild(template);
                    render.search();
                    break;
                 case 'notifications':
                    template = document.getElementById('notifications-pane-template').content.cloneNode(true);
                    DOMElements.contentContainer.appendChild(template);
                    render.notifications();
                    break;
                case 'feed':
                default:
                    template = document.getElementById('feed-pane-template').content.cloneNode(true);
                    DOMElements.contentContainer.appendChild(template);
                    render.feed();
                    break;
            }
             // Re-attach event listeners for dynamically added content
            attachDynamicEventListeners();
        },

        // Renders the main post feed
        feed: () => {
            const feedPane = document.getElementById('feed-pane');
            if (!feedPane) return;
            
            const posts = db.get('posts').sort((a, b) => b.timestamp - a.timestamp);
            if (posts.length === 0) {
                feedPane.innerHTML = `<p class="text-center text-zinc-500">Tidak ada kiriman. Ikuti pengguna lain atau buat kiriman pertama Anda!</p>`;
                return;
            }

            feedPane.innerHTML = posts.map(post => {
                const author = utils.getUserById(post.userId);
                if (!author) return ''; // Skip posts from deleted users

                const isLiked = post.likes.includes(state.loggedInUser.id);
                const verifiedBadge = author.isVerified ? '<i class="ph-fill ph-seal-check text-blue-500 text-base ml-1"></i>' : '';
                
                return `
                    <div class="bg-black border border-zinc-800 rounded-lg mb-6">
                        <!-- Post Header -->
                        <div class="flex items-center p-3">
                            <img src="${author.profilePic || 'https://placehold.co/40x40/2d3748/ffffff?text=U'}" alt="${author.name}" class="w-8 h-8 rounded-full object-cover mr-3 cursor-pointer profile-link" data-user-id="${author.id}">
                            <span class="font-bold text-sm cursor-pointer profile-link" data-user-id="${author.id}">${author.name}</span>
                            ${verifiedBadge}
                        </div>
                        <!-- Post Image -->
                        <img src="${post.imageUrl}" alt="Kiriman oleh ${author.name}" class="w-full object-cover">
                        <!-- Post Actions -->
                        <div class="p-3">
                            <div class="flex space-x-4 mb-2">
                                <button class="like-btn" data-post-id="${post.id}">
                                    <i class="ph-${isLiked ? 'fill' : 'bold'} ph-heart text-2xl ${isLiked ? 'text-red-500' : ''}"></i>
                                </button>
                                <button class="comment-btn" data-post-id="${post.id}">
                                    <i class="ph-bold ph-chat-circle text-2xl"></i>
                                </button>
                            </div>
                            <!-- Likes and Caption -->
                            <p class="font-bold text-sm mb-1">${post.likes.length.toLocaleString('id-ID')} suka</p>
                            <p class="text-sm"><span class="font-bold cursor-pointer profile-link" data-user-id="${author.id}">${author.name}</span> ${post.caption}</p>
                            <!-- Comments -->
                            <p class="text-zinc-500 text-sm mt-2 cursor-pointer comment-btn" data-post-id="${post.id}">Lihat semua ${post.comments.length} komentar</p>
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        // Renders a user's profile page
        profile: (userId) => {
            const user = utils.getUserById(userId);
            if (!user) {
                DOMElements.contentContainer.innerHTML = `<p class="text-center text-red-500">Pengguna tidak ditemukan.</p>`;
                return;
            }
            
            const verifiedBadge = user.isVerified ? '<i class="ph-fill ph-seal-check text-blue-500 text-2xl ml-2"></i>' : '';
            const totalFollowers = (user.baseFollowers || 0) + user.followers.length;


            // Populate profile info
            document.getElementById('profile-pic').src = user.profilePic || 'https://placehold.co/150x150/2d3748/ffffff?text=U';
            document.getElementById('profile-username').innerHTML = `${user.name} ${verifiedBadge}`;
            document.getElementById('profile-name').textContent = user.name;
            document.getElementById('profile-bio').textContent = user.bio || 'Tidak ada bio.';
            
            const userPosts = db.get('posts').filter(p => p.userId === userId);
            document.getElementById('post-count').textContent = userPosts.length.toLocaleString('id-ID');
            document.getElementById('follower-count').textContent = totalFollowers.toLocaleString('id-ID');
            document.getElementById('following-count').textContent = ((user.baseFollowing || 0) + user.following.length).toLocaleString('id-ID');

            // Setup action button (Edit Profile or Follow/Unfollow)
            const actionBtn = document.getElementById('profile-action-btn');
            actionBtn.dataset.userId = userId;
            if (userId === state.loggedInUser.id) {
                actionBtn.textContent = 'Edit Profil';
                actionBtn.classList.remove('follow-btn', 'unfollow-btn', 'bg-blue-600');
                actionBtn.classList.add('edit-profile-btn', 'bg-zinc-700');
            } else {
                const isFollowing = state.loggedInUser.following.includes(userId);
                actionBtn.textContent = isFollowing ? 'Diikuti' : 'Ikuti';
                actionBtn.classList.remove('edit-profile-btn', 'bg-zinc-700');
                actionBtn.classList.add('follow-btn');
                if (isFollowing) {
                    actionBtn.classList.add('unfollow-btn');
                    actionBtn.classList.remove('bg-blue-600');
                } else {
                    actionBtn.classList.remove('unfollow-btn');
                    actionBtn.classList.add('bg-blue-600');
                }
            }

            // Populate posts grid
            const postsGrid = document.getElementById('profile-posts-grid');
            postsGrid.innerHTML = userPosts.sort((a,b) => b.timestamp - a.timestamp).map(post => `
                <div class="aspect-square bg-zinc-800">
                    <img src="${post.imageUrl}" class="w-full h-full object-cover">
                </div>
            `).join('');
            
            // Add event listeners for followers/following links
            document.querySelector('.followers-link').onclick = () => interactions.showFollowList('followers', userId);
            document.querySelector('.following-link').onclick = () => interactions.showFollowList('following', userId);
        },
        
        // Renders the edit profile form
        editProfile: () => {
            const user = state.loggedInUser;
            document.getElementById('edit-profile-pic-preview').src = user.profilePic || 'https://placehold.co/100x100/2d3748/ffffff?text=U';
            document.getElementById('edit-profile-username').textContent = user.name;
            document.getElementById('edit-name').value = user.name;
            document.getElementById('edit-bio').value = user.bio || '';
        },
        
        // Renders the navigation menus
        navigation: () => {
            const navItems = [
                { id: 'feed', icon: 'house', text: 'Beranda' },
                { id: 'search', icon: 'magnifying-glass', text: 'Cari' },
                { id: 'upload', icon: 'plus-square', text: 'Buat' },
                { id: 'notifications', icon: 'heart', text: 'Notifikasi' },
                { id: 'profile', icon: 'user-circle', text: 'Profil' }
            ];

            const generateNavItem = (item, isMobile) => {
                const isActive = state.currentPane === item.id;
                const iconWeight = isActive ? 'fill' : 'bold';
                const actionClass = item.id === 'upload' ? 'upload-btn' : 'nav-link';
                const dataId = item.id === 'profile' ? state.loggedInUser.id : item.id;

                if (isMobile) {
                    return `
                        <button class="${actionClass}" data-pane="${dataId}">
                            <i class="ph-${iconWeight} ph-${item.icon} text-2xl"></i>
                        </button>
                    `;
                }
                return `
                    <button class="${actionClass} w-full flex items-center space-x-3 p-3 rounded-lg ${isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800'} transition-colors" data-pane="${dataId}">
                        <i class="ph-${iconWeight} ph-${item.icon} text-2xl"></i>
                        <span class="${isActive ? 'font-bold' : ''}">${item.text}</span>
                    </button>
                `;
            };

            DOMElements.desktopNav.innerHTML = navItems.map(item => generateNavItem(item, false)).join('');
            DOMElements.mobileNav.innerHTML = navItems.map(item => generateNavItem(item, true)).join('');
        },

        // Renders the comment modal with comments for a specific post
        commentModal: (postId) => {
            const post = utils.getPostById(postId);
            if (!post) return;
            
            const commenterIsVerified = (user) => user.isVerified ? '<i class="ph-fill ph-seal-check text-blue-500 text-sm ml-1"></i>' : '';

            const contentDiv = document.getElementById('comment-modal-content');
            contentDiv.innerHTML = post.comments.sort((a,b) => a.timestamp - b.timestamp).map(comment => {
                const commenter = utils.getUserById(comment.userId);
                return `
                    <div class="flex items-start space-x-3 mb-4">
                        <img src="${commenter.profilePic || 'https://placehold.co/40x40/2d3748/ffffff?text=U'}" class="w-8 h-8 rounded-full object-cover cursor-pointer profile-link" data-user-id="${commenter.id}">
                        <div>
                            <p class="text-sm">
                                <span class="font-bold cursor-pointer profile-link" data-user-id="${commenter.id}">${commenter.name}</span>
                                ${commenterIsVerified(commenter)}
                                ${comment.text}
                            </p>
                            <p class="text-xs text-zinc-500">${new Date(comment.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                `;
            }).join('');
        },
        
        // Renders the search results
        search: () => {
            const searchInput = document.getElementById('search-input');
            const resultsContainer = document.getElementById('search-results');
            
            const renderResults = (query) => {
                const users = db.get('users');
                const filteredUsers = query 
                    ? users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()) && u.id !== state.loggedInUser.id)
                    : [];

                if (filteredUsers.length > 0) {
                    resultsContainer.innerHTML = filteredUsers.map(user => {
                        const verifiedBadge = user.isVerified ? '<i class="ph-fill ph-seal-check text-blue-500 text-base ml-1"></i>' : '';
                        const totalFollowers = (user.baseFollowers || 0) + user.followers.length;
                        return `
                        <div class="bg-zinc-800 p-4 rounded-lg flex flex-col items-center text-center profile-link cursor-pointer" data-user-id="${user.id}">
                            <img src="${user.profilePic || 'https://placehold.co/80x80/2d3748/ffffff?text=U'}" class="w-20 h-20 rounded-full object-cover mb-3">
                            <p class="font-bold flex items-center">${user.name} ${verifiedBadge}</p>
                            <p class="text-sm text-zinc-400">${totalFollowers.toLocaleString('id-ID')} pengikut</p>
                        </div>
                    `}).join('');
                } else {
                    resultsContainer.innerHTML = `<p class="text-zinc-500 col-span-full text-center">Tidak ada hasil untuk "${query}"</p>`;
                }
            };
            
            searchInput.addEventListener('input', (e) => renderResults(e.target.value));
            renderResults(''); // Initial empty state
        },

        // Renders the list of followers or following users
        followList: (type, userId) => {
            const user = utils.getUserById(userId);
            if (!user) return;

            document.getElementById('follow-list-title').textContent = type === 'followers' ? 'Pengikut' : 'Diikuti';
            const list = type === 'followers' ? user.followers : user.following;
            const contentDiv = document.getElementById('follow-list-content');

            if (list.length === 0 && !(type === 'followers' && user.baseFollowers > 0)) {
                contentDiv.innerHTML = `<p class="text-zinc-500 text-center">Tidak ada pengguna untuk ditampilkan.</p>`;
                return;
            }
            
            // Note: We only show REAL followers in this list, not the base count.
            contentDiv.innerHTML = list.map(id => {
                const listUser = utils.getUserById(id);
                if (!listUser) return '';
                
                const isFollowing = state.loggedInUser.following.includes(id);
                const isCurrentUser = id === state.loggedInUser.id;
                const verifiedBadge = listUser.isVerified ? '<i class="ph-fill ph-seal-check text-blue-500 text-base ml-1"></i>' : '';

                let buttonHtml = '';
                if (!isCurrentUser) {
                    buttonHtml = `<button class="follow-btn ${isFollowing ? 'unfollow-btn bg-zinc-700' : 'bg-blue-600'} text-white font-bold px-4 py-1 rounded-md text-sm ml-auto" data-user-id="${id}">
                        ${isFollowing ? 'Diikuti' : 'Ikuti'}
                    </button>`;
                }

                return `
                    <div class="flex items-center space-x-3 mb-4">
                        <img src="${listUser.profilePic || 'https://placehold.co/40x40/2d3748/ffffff?text=U'}" class="w-10 h-10 rounded-full object-cover cursor-pointer profile-link" data-user-id="${id}">
                        <div>
                            <p class="font-bold cursor-pointer profile-link flex items-center" data-user-id="${id}">${listUser.name} ${verifiedBadge}</p>
                        </div>
                        ${buttonHtml}
                    </div>
                `;
            }).join('');
        },
        
        notifications: () => {
             const listEl = document.getElementById('notifications-list');
             // This is a placeholder. A real implementation would store notifications in the DB.
             // For this demo, we'll generate some dummy notifications based on user's posts.
             const myPosts = db.get('posts').filter(p => p.userId === state.loggedInUser.id);
             let notificationsHtml = '';

             myPosts.forEach(post => {
                 post.likes.forEach(userId => {
                     if (userId === state.loggedInUser.id) return;
                     const liker = utils.getUserById(userId);
                     if(liker) {
                        notificationsHtml += `
                         <div class="flex items-center space-x-3">
                            <img src="${liker.profilePic || 'https://placehold.co/40x40/2d3748/ffffff?text=U'}" class="w-10 h-10 rounded-full object-cover">
                            <p class="text-sm flex-1"><span class="font-bold">${liker.name}</span> menyukai kiriman Anda.</p>
                            <img src="${post.imageUrl}" class="w-10 h-10 object-cover rounded-md">
                         </div>
                        `;
                     }
                 });
                 post.comments.forEach(comment => {
                     if (comment.userId === state.loggedInUser.id) return;
                     const commenter = utils.getUserById(comment.userId);
                     if(commenter) {
                         notificationsHtml += `
                         <div class="flex items-center space-x-3">
                            <img src="${commenter.profilePic || 'https://placehold.co/40x40/2d3748/ffffff?text=U'}" class="w-10 h-10 rounded-full object-cover">
                            <p class="text-sm flex-1"><span class="font-bold">${commenter.name}</span> mengomentari: "${comment.text.substring(0, 20)}..."</p>
                            <img src="${post.imageUrl}" class="w-10 h-10 object-cover rounded-md">
                         </div>
                        `;
                     }
                 });
             });

            if (notificationsHtml) {
                listEl.innerHTML = notificationsHtml;
            } else {
                listEl.innerHTML = `<p class="text-zinc-500">Tidak ada notifikasi baru.</p>`;
            }
        }
    };

    // --- LOGIC FUNCTIONS (Actions & Interactions) ---
    const auth = {
        register: async (e) => {
            e.preventDefault();
            const name = DOMElements.registerName.value.trim();
            const email = DOMElements.registerEmail.value.trim();
            const password = DOMElements.registerPassword.value;
            const confirmPassword = DOMElements.registerConfirmPassword.value;

            if (!name || !email || !password) {
                return utils.showAlert('Semua kolom wajib diisi.');
            }
            // Allow special user emails, but require @gmail.com for others
            if (!email.endsWith('@gmail.com') && !email.endsWith('@special.user')) {
                return utils.showAlert('Harap gunakan alamat email Gmail yang valid.');
            }
            if (password !== confirmPassword) {
                return utils.showAlert('Password dan konfirmasi password tidak cocok.');
            }
            if (utils.getUserByEmail(email) || utils.getUserByName(name)) {
                return utils.showAlert('Email atau Nama Pengguna ini sudah terdaftar.');
            }

            const newUser = {
                id: utils.generateId(),
                name,
                email,
                password, // In a real app, this would be hashed!
                profilePic: null,
                bio: '',
                followers: [],
                following: [],
                isVerified: false, // Default user is not verified
                baseFollowers: 0
            };

            const users = db.get('users');
            users.push(newUser);
            db.set('users', users);
            utils.showAlert('Pendaftaran berhasil! Silakan masuk.');
            
            // Switch to login view
            state.currentView = 'login';
            render.app();
            DOMElements.registerForm.reset();
        },

        login: (e) => {
            e.preventDefault();
            const identifier = DOMElements.loginEmail.value.trim();
            const password = DOMElements.loginPassword.value;
            let user;

            // Check if logging in with special name 'Lana' or her special email
            if (identifier.toLowerCase() === 'lana' || identifier.toLowerCase() === 'lana@special.user') {
                user = utils.getUserByName('Lana');
            } else {
                // Normal email login
                user = utils.getUserByEmail(identifier);
            }

            if (!user || user.password !== password) {
                return utils.showAlert('Nama pengguna/email atau password salah.');
            }

            db.setLoggedInUserId(user.id);
            state.loggedInUser = user;
            state.currentView = 'app';
            state.currentPane = 'feed';
            render.app();
            DOMElements.loginForm.reset();
        },

        logout: () => {
            db.setLoggedInUserId(null);
            state.loggedInUser = null;
            state.currentView = 'login';
            DOMElements.contentContainer.innerHTML = '';
            render.app();
        }
    };
    
    const interactions = {
        // Handles creating a new post
        createPost: async (e) => {
            e.preventDefault();
            const caption = DOMElements.captionInput.value.trim();
            const file = DOMElements.fileInput.files[0];

            if (!file) {
                return utils.showAlert('Harap pilih file gambar atau video.');
            }

            try {
                const imageUrl = await utils.fileToBase64(file);
                const newPost = {
                    id: utils.generateId(),
                    userId: state.loggedInUser.id,
                    imageUrl,
                    caption,
                    timestamp: Date.now(),
                    likes: [],
                    comments: []
                };

                const posts = db.get('posts');
                posts.push(newPost);
                db.set('posts', posts);
                
                interactions.closeModal();
                DOMElements.uploadForm.reset();
                DOMElements.imagePreview.classList.add('hidden');
                DOMElements.imagePreviewContainer.querySelector('label').classList.remove('hidden');

                state.currentPane = 'feed';
                render.app();
            } catch (error) {
                console.error('Error creating post:', error);
                utils.showAlert('Gagal membuat kiriman.');
            }
        },

        // Handles liking or unliking a post
        toggleLike: (postId) => {
            const posts = db.get('posts');
            const post = posts.find(p => p.id === postId);
            if (!post) return;

            const likeIndex = post.likes.indexOf(state.loggedInUser.id);
            if (likeIndex > -1) {
                post.likes.splice(likeIndex, 1); // Unlike
            } else {
                post.likes.push(state.loggedInUser.id); // Like
            }

            db.set('posts', posts);
            render.pane(); // Re-render the current pane to update UI
        },
        
        // Handles adding a comment to a post
        addComment: (e) => {
            e.preventDefault();
            if (!state.commentingPostId) return;
            
            const commentInput = document.getElementById('comment-input-modal');
            const text = commentInput.value.trim();
            if (!text) return;

            const posts = db.get('posts');
            const post = posts.find(p => p.id === state.commentingPostId);
            if (!post) return;

            post.comments.push({
                userId: state.loggedInUser.id,
                text,
                timestamp: Date.now()
            });

            db.set('posts', posts);
            render.commentModal(state.commentingPostId); // Re-render comments in modal
            commentInput.value = '';
        },
        
        // Handles following or unfollowing a user
        toggleFollow: (targetUserId) => {
            if (targetUserId === state.loggedInUser.id) return;

            const users = db.get('users');
            const currentUser = users.find(u => u.id === state.loggedInUser.id);
            const targetUser = users.find(u => u.id === targetUserId);
            if (!currentUser || !targetUser) return;

            const followingIndex = currentUser.following.indexOf(targetUserId);
            if (followingIndex > -1) {
                // Unfollow
                currentUser.following.splice(followingIndex, 1);
                const followerIndex = targetUser.followers.indexOf(currentUser.id);
                if (followerIndex > -1) {
                    targetUser.followers.splice(followerIndex, 1);
                }
            } else {
                // Follow
                currentUser.following.push(targetUserId);
                targetUser.followers.push(currentUser.id);
            }

            db.set('users', users);
            state.loggedInUser = currentUser; // Update state
            
            // Re-render based on context
            if (state.currentPane === 'profile') {
                render.profile(targetUserId);
            } else if (state.activeModal === 'follow-list') {
                render.followList(state.followList.type, state.followList.userId);
            }
        },
        
        // Handles saving profile edits
        saveProfile: async (e) => {
            e.preventDefault();
            const newName = document.getElementById('edit-name').value.trim();
            const newBio = document.getElementById('edit-bio').value.trim();
            const newPicFile = document.getElementById('edit-profile-pic-input').files[0];

            if (!newName) {
                return utils.showAlert('Nama tidak boleh kosong.');
            }

            const users = db.get('users');
            const user = users.find(u => u.id === state.loggedInUser.id);
            if (!user) return;

            user.name = newName;
            user.bio = newBio;
            
            if (newPicFile) {
                try {
                    user.profilePic = await utils.fileToBase64(newPicFile);
                } catch (error) {
                    console.error('Error updating profile picture:', error);
                    utils.showAlert('Gagal mengubah foto profil.');
                }
            }

            db.set('users', users);
            state.loggedInUser = user;
            utils.showAlert('Profil berhasil diperbarui.');
            
            // Go back to profile view
            state.currentPane = 'profile';
            state.viewingProfileId = user.id;
            render.app();
        },

        // --- MODAL & PANE MANAGEMENT ---
        openModal: (modalType, data) => {
            state.activeModal = modalType;
            switch(modalType) {
                case 'upload':
                    DOMElements.uploadModal.classList.remove('hidden');
                    break;
                case 'comment':
                    state.commentingPostId = data.postId;
                    render.commentModal(data.postId);
                    DOMElements.commentModal.classList.remove('hidden');
                    break;
                case 'follow-list':
                    state.followList.type = data.type;
                    state.followList.userId = data.userId;
                    render.followList(data.type, data.userId);
                    DOMElements.followListModal.classList.remove('hidden');
                    break;
            }
        },

        closeModal: () => {
            if (state.activeModal) {
                const modalEl = DOMElements[state.activeModal + 'Modal'];
                if (modalEl) modalEl.classList.add('hidden');
                
                state.activeModal = null;
                state.commentingPostId = null;
                state.followList = { type: null, userId: null };
            }
        },
        
        switchPane: (paneId, userId = null) => {
            if (paneId === 'profile') {
                state.viewingProfileId = userId;
            }
            state.currentPane = paneId;
            render.app();
        },
        
        showFollowList: (type, userId) => {
            interactions.openModal('follow-list', { type, userId });
        }
    };

    // --- DOM ELEMENT SELECTORS ---
    // Moved to bottom for cleaner code structure, as it's only used after functions are defined
    const DOMElements = {
        authContainer: document.getElementById('auth-container'),
        loginView: document.getElementById('login-view'),
        registerView: document.getElementById('register-view'),
        mainAppView: document.getElementById('main-app-view'),
        contentContainer: document.getElementById('content-container'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        uploadForm: document.getElementById('upload-form'),
        commentForm: document.getElementById('comment-form'),
        editProfileForm: document.getElementById('edit-profile-form'),
        showRegisterLink: document.getElementById('show-register-link'),
        showLoginLink: document.getElementById('show-login-link'),
        closeUploadModalBtn: document.getElementById('close-upload-modal'),
        closeCommentModalBtn: document.getElementById('close-comment-modal'),
        closeFollowListModalBtn: document.getElementById('close-follow-list-modal'),
        uploadModal: document.getElementById('upload-modal'),
        commentModal: document.getElementById('comment-modal'),
        followListModal: document.getElementById('follow-list-modal'),
        loginEmail: document.getElementById('login-email'),
        loginPassword: document.getElementById('login-password'),
        registerName: document.getElementById('register-name'),
        registerEmail: document.getElementById('register-email'),
        registerPassword: document.getElementById('register-password'),
        registerConfirmPassword: document.getElementById('register-confirm-password'),
        fileInput: document.getElementById('file-input'),
        captionInput: document.getElementById('caption-input'),
        imagePreview: document.getElementById('image-preview'),
        imagePreviewContainer: document.getElementById('image-preview-container'),
        searchInput: document.getElementById('search-input'),
        desktopNav: document.getElementById('desktop-nav'),
        mobileNav: document.getElementById('mobile-nav'),
    };

    // --- EVENT LISTENERS ---
    
    // Static listeners (for elements always in the DOM)
    const attachStaticEventListeners = () => {
        DOMElements.showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            state.currentView = 'register';
            render.authView();
        });

        DOMElements.showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            state.currentView = 'login';
            render.authView();
        });

        DOMElements.loginForm.addEventListener('submit', auth.login);
        DOMElements.registerForm.addEventListener('submit', auth.register);
        DOMElements.uploadForm.addEventListener('submit', interactions.createPost);
        DOMElements.commentForm.addEventListener('submit', interactions.addComment);
        
        DOMElements.closeUploadModalBtn.addEventListener('click', interactions.closeModal);
        DOMElements.closeCommentModalBtn.addEventListener('click', interactions.closeModal);
        DOMElements.closeFollowListModalBtn.addEventListener('click', interactions.closeModal);

        DOMElements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                DOMElements.imagePreview.src = URL.createObjectURL(file);
                DOMElements.imagePreview.classList.remove('hidden');
                DOMElements.imagePreviewContainer.querySelector('label').classList.add('hidden');
            }
        });
        
        // Logout button on desktop
        document.getElementById('logout-btn-desktop').addEventListener('click', auth.logout);
    };

    // Dynamic listeners (for content injected into the DOM)
    const attachDynamicEventListeners = () => {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const pane = e.currentTarget.dataset.pane;
                let userId = null;
                if (pane === state.loggedInUser.id) {
                    interactions.switchPane('profile', state.loggedInUser.id);
                } else {
                    interactions.switchPane(pane);
                }
            });
        });

        document.querySelectorAll('.upload-btn').forEach(btn => {
            btn.addEventListener('click', () => interactions.openModal('upload'));
        });

        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => interactions.toggleLike(e.currentTarget.dataset.postId));
        });

        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => interactions.openModal('comment', { postId: e.currentTarget.dataset.postId }));
        });

        document.querySelectorAll('.profile-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.userId;
                interactions.switchPane('profile', userId);
                // If inside a modal, close it first
                if(state.activeModal) interactions.closeModal();
            });
        });
        
        const editProfileBtn = document.querySelector('.edit-profile-btn');
        if(editProfileBtn) {
            editProfileBtn.addEventListener('click', () => interactions.switchPane('edit-profile'));
        }
        
        const followBtn = document.querySelectorAll('.follow-btn');
        if(followBtn) {
            followBtn.forEach(btn => {
                btn.addEventListener('click', (e) => interactions.toggleFollow(e.currentTarget.dataset.userId));
            });
        }
        
        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) {
            editProfileForm.addEventListener('submit', interactions.saveProfile);
        }
        
        const editProfilePicInput = document.getElementById('edit-profile-pic-input');
        if (editProfilePicInput) {
            editProfilePicInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    document.getElementById('edit-profile-pic-preview').src = URL.createObjectURL(file);
                }
            });
        }
    };
    
    // --- INITIALIZATION ---
    const seedSpecialUser = () => {
        const users = db.get('users');
        const lanaExists = users.some(u => u.id === 'special_user_lana');

        if (!lanaExists) {
            const lanaUser = {
                id: 'special_user_lana',
                name: 'Lana',
                email: 'lana@special.user', // FIX: Added special email
                password: '123456',
                isVerified: true,
                baseFollowers: 10373020,
                baseFollowing: 150, // Added for realism
                profilePic: 'https://images.unsplash.com/photo-1544005313-94ddf0286de2?q=80&w=1974&auto=format&fit=crop',
                bio: 'Akun resmi.',
                followers: [], // Real followers will be added here
                following: []
            };
            users.push(lanaUser);
            db.set('users', users);
            console.log('Special user "Lana" has been created.');
        }
    };
    
    const init = () => {
        seedSpecialUser(); // Create the special user if she doesn't exist
        attachStaticEventListeners();
        render.app();
    };

    init();
});
