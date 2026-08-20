document.getElementById('save').addEventListener('click', () => {
  const url = document.getElementById('url').value.replace(/\/$/, ''); // Remove trailing slash
  const pat = document.getElementById('pat').value;

  chrome.storage.local.set({ gitlabUrl: url, gitlabPat: pat }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Configuration saved successfully!';
    setTimeout(() => { status.textContent = ''; }, 3000);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['gitlabUrl', 'gitlabPat'], (data) => {
    if (data.gitlabUrl) document.getElementById('url').value = data.gitlabUrl;
    if (data.gitlabPat) document.getElementById('pat').value = data.gitlabPat;
  });
});