import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { GoogleAuthProvider, getAuth, type Auth } from 'firebase/auth'
// import { getDatabase } from 'firebase/database'
import { getAnalytics } from 'firebase/analytics'
import { /* getFirestore, */ initializeFirestore, persistentLocalCache } from 'firebase/firestore'


let app: FirebaseApp
let provider: GoogleAuthProvider
let auth: Auth
export function firebaseSDKInit(firebaseConfig?: FirebaseOptions) {
	if (firebaseConfig && !app) {
		app = initializeApp(firebaseConfig)
		provider = new GoogleAuthProvider()
		provider.addScope('https://www.googleapis.com/auth/contacts.readonly')
		auth = getAuth()
		// const database = getDatabase(app)
		initializeFirestore(app, { localCache: persistentLocalCache(/*settings*/ {}) })
		// const firestore = getFirestore(app)
		// const analytics = getAnalytics(app)
		getAnalytics(app)
	}
	/**
	 * Firebase SDK utilities.
	 * @module firebaseSDK
	 */
	return { app, auth, provider /* database, firestore,  analytics */ }
	// return { app, auth, provider /* database, firestore,  analytics */, onMessage, getToken }
}
