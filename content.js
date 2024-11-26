let videoId = '';
let notes = [];
let isNotePanelVisible = false;

function injectNotePanel() {
  // Remove any existing panel first
  const existingPanel = document.getElementById('yt-notes-panel');
  if (existingPanel) {
    existingPanel.remove();
    isNotePanelVisible = false;
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'yt-notes-panel';
  panel.innerHTML = `
    <h3>Video Notes</h3>
    <div id="notes-list"></div>
    <div id="add-note">
      <input type="text" id="note-input" placeholder="Add a note...">
      <button id="add-note-btn">Add</button>
    </div>
  `;
  document.body.appendChild(panel);
  isNotePanelVisible = true;

  // Add event listeners after the panel is added to DOM
  const addNoteBtn = document.getElementById('add-note-btn');
  const noteInput = document.getElementById('note-input');
  
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', addNote);
  }
  
  if (noteInput) {
    noteInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addNote();
      }
    });
  }
  
  updateNotesList();
}

function addNote() {
  const input = document.getElementById('note-input');
  if (!input) return;

  const noteText = input.value.trim();
  if (noteText) {
    const video = document.querySelector('video');
    if (!video) return;

    const timestamp = video.currentTime;
    notes.push({ text: noteText, timestamp });
    notes.sort((a, b) => a.timestamp - b.timestamp);
    chrome.storage.sync.set({ [videoId]: notes }, () => {
      console.log('Note saved');
      input.value = '';
      updateNotesList();
    });
  }
}

function removeNote(index) {
  notes.splice(index, 1);
  chrome.storage.sync.set({ [videoId]: notes }, () => {
    console.log('Note removed');
    updateNotesList();
  });
}

function updateNotesList() {
  const notesList = document.getElementById('notes-list');
  if (!notesList) return;

  notesList.innerHTML = '';
  notes.forEach((note, index) => {
    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';
    noteElement.style.display = 'flex';
    noteElement.style.justifyContent = 'space-between';
    noteElement.style.alignItems = 'center';
    
    const contentDiv = document.createElement('div');
    contentDiv.style.display = 'flex';
    contentDiv.style.alignItems = 'center';
    contentDiv.style.gap = '8px';
    contentDiv.innerHTML = `
      <span>${formatTime(note.timestamp)}</span>
      <span>${note.text}</span>
    `;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-note-btn';
    removeBtn.innerHTML = '×';
    removeBtn.style.backgroundColor = '#fee2e2';
    removeBtn.style.color = '#dc2626';
    removeBtn.style.border = 'none';
    removeBtn.style.borderRadius = '50%';
    removeBtn.style.width = '24px';
    removeBtn.style.height = '24px';
    removeBtn.style.display = 'flex';
    removeBtn.style.alignItems = 'center';
    removeBtn.style.justifyContent = 'center';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.fontSize = '18px';
    removeBtn.style.padding = '0';
    removeBtn.style.marginLeft = '8px';

    noteElement.appendChild(contentDiv);
    noteElement.appendChild(removeBtn);
    
    // Add click handler for jumping to timestamp
    contentDiv.addEventListener('click', () => {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = note.timestamp;
        video.play();
        // Hide panel when playing video
        const panel = document.getElementById('yt-notes-panel');
        if (panel) {
          panel.remove();
          isNotePanelVisible = false;
        }
      }
    });

    // Add click handler for remove button
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeNote(index);
    });

    notesList.appendChild(noteElement);
  });
}

function formatTime(seconds) {
  const date = new Date(null);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8);
}

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const newVideoId = urlParams.get('v');
  
  // Only reinitialize if video ID changed
  if (newVideoId && newVideoId !== videoId) {
    videoId = newVideoId;
    chrome.storage.sync.get(videoId, (result) => {
      notes = result[videoId] || [];
      injectNotePanel();
    });
  }

  // Add video play/pause event listeners
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('play', () => {
      const panel = document.getElementById('yt-notes-panel');
      if (panel) {
        panel.remove();
        isNotePanelVisible = false;
      }
    });

    video.addEventListener('pause', () => {
      if (!isNotePanelVisible) {
        injectNotePanel();
      }
    });
  }
}

// Observe for video element changes (e.g., when navigating between videos)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        init();
        observer.disconnect();
      }
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });

// Call init() when the content script is first injected
init();
