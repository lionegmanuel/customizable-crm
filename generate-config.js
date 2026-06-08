const fs = require("fs");

const config = `const firebaseConfig = {
  apiKey:            "${process.env.FIREBASE_API_KEY}",
  authDomain:        "${process.env.FIREBASE_AUTH_DOMAIN}",
  projectId:         "${process.env.FIREBASE_PROJECT_ID}",
  storageBucket:     "${process.env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_ID}",
  appId:             "${process.env.FIREBASE_APP_ID}",
};

firebase.initializeApp(firebaseConfig);
const Auth = firebase.auth();
const DB   = firebase.firestore();
Auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
`;

fs.writeFileSync("js/firebase-config.js", config);
console.log("firebase-config.js generado desde variables de entorno");
