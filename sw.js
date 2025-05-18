self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  clients.claim();
});

self.addEventListener('sync', event => {
  if (event.tag === 'check-notification') {
    event.waitUntil(checkForUpdates());
  }
});

// ---- IndexedDB setup ----
const dbName = 'notiDB';
const storeName = 'meta';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      db.createObjectStore(storeName);
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = reject;
  });
}

async function getLastId() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get('lastId');
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => resolve(0);
  });
}

async function setLastId(id) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(id, 'lastId');
    tx.oncomplete = resolve;
  });
}

// ---- Notification Fetch & Show ----
async function checkForUpdates() {
  try {
    const response = await fetch('https://ravindu2355.github.io/SubToV/notifications.json');
    const allNotifications = await response.json(); // must be an array

    const lastId = await getLastId();
    let maxId = lastId;

    for (const item of allNotifications) {
      if (item.id > lastId) {
        const title = item.title || 'New Notification';
        const options = {
          body: item.message || '',
          icon: item.icon || '/icon-192.png',
          tag: 'notif-' + item.id
        };
        self.registration.showNotification(title, options);
        if (item.id > maxId) maxId = item.id;
      }
    }

    if (maxId > lastId) {
      await setLastId(maxId);
    }
  } catch (e) {
    console.error('Notification check failed:', e);
  }
      }
