// uses crypto-js for AES encryption with a simple IV - good enough for this project.
// In production, use a KMS and robust storage.
const CryptoJS = require("crypto-js");

const keyStr = process.env.ENCRYPTION_KEY || "please_set_a_long_secret_in_env";
if (!process.env.ENCRYPTION_KEY) {
  console.warn("Warning: ENCRYPTION_KEY not set; using default (insecure).");
}

function encrypt(text) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.enc.Utf8.parse(keyStr.slice(0, 32));
  const encrypted = CryptoJS.AES.encrypt(text, key, { iv });
  return {
    ciphertext: encrypted.toString(), // base64
    iv: iv.toString(CryptoJS.enc.Hex)
  };
}

function decrypt({ ciphertext, iv }) {
  const key = CryptoJS.enc.Utf8.parse(keyStr.slice(0, 32));
  const ivWA = CryptoJS.enc.Hex.parse(iv);
  const dec = CryptoJS.AES.decrypt(ciphertext, key, { iv: ivWA });
  return dec.toString(CryptoJS.enc.Utf8);
}

module.exports = { encrypt, decrypt };
