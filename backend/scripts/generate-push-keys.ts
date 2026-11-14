import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
try {
  writeFileSync(resolve(import.meta.dirname, "../.env.push-keys"),
    `VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`, { flag: "wx", mode: 0o600 });
  console.info("Pasangan VAPID ditulis ke backend/.env.push-keys. Jangan commit atau bagikan private key.");
} catch {
  console.error("Tidak dapat membuat berkas kunci; periksa izin atau berkas yang sudah ada. Tidak ada kunci dicetak.");
  process.exitCode = 1;
}
