document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('project-title');
    const descEl = document.getElementById('project-desc');
    const avatarEl = document.getElementById('project-avatar');
    const topicsEl = document.getElementById('project-topics');
    const starBtn = document.getElementById('star-btn');
    const openBtn = document.getElementById('open-btn');
    const setupMsg = document.getElementById('setup-msg');
    const mainUI = document.getElementById('main-ui');
    const optionsLink = document.getElementById('open-options');

    optionsLink.onclick = () => {
        chrome.runtime.openOptionsPage();
    };

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    chrome.storage.local.get(['gitlabUrl', 'gitlabPat', 'projectCache', 'currentPage', 'currentIndex'], async (data) => {
        const gitlabUrl = data.gitlabUrl || 'https://gitlab.com';
        const gitlabPat = data.gitlabPat;
        let cache = data.projectCache || [];
        let page = data.currentPage || 1;
        let index = data.currentIndex || 0;

        if (!gitlabPat) {
            setupMsg.style.display = 'block';
            return;
        }

        mainUI.style.display = 'block';

        async function fetchAPI(targetPage) {
            const res = await fetch(`${gitlabUrl}/api/v4/projects?order_by=star_count&sort=desc&per_page=100&page=${targetPage}`, {
                headers: { 'PRIVATE-TOKEN': gitlabPat }
            });
            if (!res.ok) throw new Error('Failed to fetch data.');
            return res.json();
        }

        if (cache.length === 0 || index >= cache.length) {
            try {
                let projects = await fetchAPI(page);
                
                if (projects.length === 0) {
                    page = 1;
                    projects = await fetchAPI(page);
                }
                
                cache = shuffle(projects);
                index = 0;
                page++;
                await chrome.storage.local.set({ projectCache: cache, currentPage: page, currentIndex: index });
            } catch (e) {
                titleEl.innerText = "Connection Error";
                descEl.innerText = "Ensure your Personal Access Token is valid and the Instance URL is reachable.";
                return;
            }
        }

        const currentProject = cache[index];
        titleEl.innerText = currentProject.name;
        descEl.innerText = currentProject.description || "No description provided for this repository.";
        
        // Updated stat targeting
        document.getElementById('stat-stars').innerText = currentProject.star_count;
        document.getElementById('stat-forks').innerText = currentProject.forks_count;
        
        // Handle Avatar
        if (currentProject.avatar_url) {
            let avatarUrl = currentProject.avatar_url;
            if (avatarUrl.startsWith('/')) {
                avatarUrl = gitlabUrl + avatarUrl;
            }
            avatarEl.src = avatarUrl;
            avatarEl.style.display = 'inline-block';
        } else {
            avatarEl.style.display = 'none';
        }

        // Handle Topics / Tags
        const topics = currentProject.topics || currentProject.tag_list || [];
        topicsEl.innerHTML = ''; 
        if (topics.length > 0) {
            topics.forEach(topic => {
                const span = document.createElement('span');
                span.className = 'topic-badge';
                span.innerText = topic;
                topicsEl.appendChild(span);
            });
        }
        
        openBtn.onclick = () => {
            window.open(currentProject.web_url, '_blank');
        };

        starBtn.onclick = async () => {
            try {
                starBtn.innerText = "Starring...";
                const res = await fetch(`${gitlabUrl}/api/v4/projects/${currentProject.id}/star`, {
                    method: 'POST',
                    headers: { 'PRIVATE-TOKEN': gitlabPat }
                });
                
                if (res.status === 304) {
                    starBtn.innerText = "Already Starred";
                } else if (res.ok) {
                    starBtn.innerText = "Starred!";
                    // Updated single stat update
                    document.getElementById('stat-stars').innerText = currentProject.star_count + 1;
                } else {
                    starBtn.innerText = "Failed to Star";
                }
            } catch (e) {
                starBtn.innerText = "Failed to Star";
            }
        };

        let nextIndex = index + 1;

        if (cache.length - nextIndex < 10) {
            fetchAPI(page).then(newProjects => {
                if (newProjects.length > 0) {
                    let newCache = cache.concat(shuffle(newProjects));
                    chrome.storage.local.set({ projectCache: newCache, currentPage: page + 1, currentIndex: nextIndex });
                } else {
                    chrome.storage.local.set({ currentPage: 1, currentIndex: nextIndex });
                }
            }).catch(() => {
                chrome.storage.local.set({ currentIndex: nextIndex });
            });
        } else {
            chrome.storage.local.set({ currentIndex: nextIndex });
        }
    });
});