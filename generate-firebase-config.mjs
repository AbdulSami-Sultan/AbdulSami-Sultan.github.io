import { writeFileSync } from "node:fs";
import { loadEnvFile } from "node:process";

loadEnvFile(new URL(".env", import.meta.url));

const config = {
    apiKey: process.env.FIREBASE_API_KEY ?? "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.FIREBASE_APP_ID ?? "",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID ?? "",
};

writeFileSync(
    new URL("firebase-config.generated.js", import.meta.url),
    `export default ${JSON.stringify(config, null, 4)};\n`,
);
