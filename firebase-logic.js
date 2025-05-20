const firebaseConfig = {
  apiKey: "AIzaSyD0v1y2BkzRCafscq6veyeyrWvdZuwjCzU",
  authDomain: "salon-booking-72406.firebaseapp.com",
  databaseURL: "https://salon-booking-7a936-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "salon-booking-72406",
  storageBucket: "salon-booking-72406.appspot.com",
  messagingSenderId: "114588418117",
  appId: "1:114588418117:web-edf1057e94fbf22ba422f1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Set data (handles lists and single objects)
async function setData(path, value) {
  // Ensure value is JSON-serializable
  const serializedValue = JSON.parse(JSON.stringify(value));
  
  try {
    await firebase.database().ref(path).set(serializedValue);
    console.log("Data saved");
  } catch (err) {
    console.error("Error:", err);
    throw err; // Re-throw to allow caller to handle
  }
}

// Get data (handles lists and single objects)
async function getData(path) {
  try {
    const snapshot = await firebase.database().ref(path).once('value');
    const data = snapshot.val();
    
    if (data === null) {
      return null;
      // throw new Error(`No data found at path: ${path}`);
    }

    // Convert Firebase object with keys to array for lists
    const result = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).every(key => !isNaN(key))
      ? Object.values(data) // Treat as list if keys are numeric
      : data; // Return as-is for single objects or arrays

    return result;
  } catch (error) {
    console.error(`Error fetching data from ${path}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}
/*
const messaging = firebase.messaging();
function requestNotificationPermission() {
  messaging.requestPermission()
    .then(() => messaging.getToken())
    .then((token) => {
      console.log("Token: ", token);
      // You can send this token to your server
    })
    .catch(err => console.error("Permission error", err));
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('firebase-messaging-sw.js')
    .then((reg) => {
      messaging.useServiceWorker(reg);
      console.log("Service Worker registered!");
    });
}

function listenForMessages() {
  messaging.onMessage((payload) => {
    console.log("Foreground message: ", payload);
    alert(payload.notification.title + "\n" + payload.notification.body);
  });
}

listenForMessages();
*/