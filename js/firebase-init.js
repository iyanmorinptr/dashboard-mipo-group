/* ===========================================================
   MIPO GROUP DASHBOARD — Firebase initialization
   apiKey dkk di bawah ini AMAN untuk publik (bukan secret) —
   keamanan data diatur lewat Firestore Rules & Authentication,
   bukan dengan menyembunyikan config ini.
   =========================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAy9S7G2LDps0csT0v8yvbEfD1k_1MM_Zk",
  authDomain: "mipo-group-dashboard.firebaseapp.com",
  projectId: "mipo-group-dashboard",
  storageBucket: "mipo-group-dashboard.firebasestorage.app",
  messagingSenderId: "907821958058",
  appId: "1:907821958058:web:08cffcae11dccc1b50e1d3",
  measurementId: "G-Z4PT4EXJKC",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const firestore = firebase.firestore();
