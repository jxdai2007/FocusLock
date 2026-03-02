import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, remove, update, push, get } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyAk4le6q6CoxQNNdgrmY-IR64_msg4FQvI',
  authDomain: 'focuslock-c9faf.firebaseapp.com',
  databaseURL: 'https://focuslock-c9faf-default-rtdb.firebaseio.com',
  projectId: 'focuslock-c9faf',
  storageBucket: 'focuslock-c9faf.firebasestorage.app',
  messagingSenderId: '427508525709',
  appId: '1:427508525709:web:e4f15206bb2a54032690c4',
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export { database, ref, set, onValue, remove, update, push, get }
