const BLOCK = 16;

function assertBytes(value, len, name) {
  if (!(value instanceof Uint8Array)) throw new TypeError(`${name}_bytes_required`);
  if (len !== undefined && value.length !== len) throw new Error(`${name}_length_invalid`);
  return value;
}

function xor(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

function leftShift(block) {
  const out = new Uint8Array(block.length);
  let carry = 0;
  for (let i = block.length - 1; i >= 0; i--) {
    const value = block[i];
    out[i] = ((value << 1) & 0xff) | carry;
    carry = (value & 0x80) ? 1 : 0;
  }
  return out;
}

async function importAesKey(key, usage) {
  return crypto.subtle.importKey(
    "raw",
    assertBytes(key, 16, "aes_key"),
    { name: "AES-CBC" },
    false,
    [usage],
  );
}

// WebCrypto AES-CBC adds PKCS#7 padding. For one raw AES block we use the
// first ciphertext block with a zero IV; a later padding block cannot affect it.
export async function aes128EncryptBlock(key, block) {
  assertBytes(block, 16, "aes_block");
  const imported = await importAesKey(key, "encrypt");
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: new Uint8Array(16) },
    imported,
    block,
  ));
  return encrypted.slice(0, 16);
}

// To obtain one raw AES decrypt block through padded WebCrypto AES-CBC, append
// a second ciphertext block that decrypts to valid 0x10 padding. WebCrypto then
// removes that second plaintext block and returns exactly D_K(C1).
export async function aes128DecryptBlock(key, block) {
  assertBytes(block, 16, "aes_block");
  const pad = new Uint8Array(16).fill(16);
  const second = await aes128EncryptBlock(key, xor(block, pad));
  const ciphertext = new Uint8Array(32);
  ciphertext.set(block, 0);
  ciphertext.set(second, 16);
  const imported = await importAesKey(key, "decrypt");
  const decrypted = new Uint8Array(await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: new Uint8Array(16) },
    imported,
    ciphertext,
  ));
  if (decrypted.length !== 16) throw new Error("aes_block_decrypt_length_invalid");
  return decrypted;
}

export async function aes128DecryptBlockWithIv(key, block, iv) {
  assertBytes(iv, 16, "aes_iv");
  return xor(await aes128DecryptBlock(key, block), iv);
}

async function subkeys(key) {
  const L = await aes128EncryptBlock(key, new Uint8Array(16));
  const k1 = leftShift(L);
  if (L[0] & 0x80) k1[15] ^= 0x87;
  const k2 = leftShift(k1);
  if (k1[0] & 0x80) k2[15] ^= 0x87;
  return { k1, k2 };
}

// NIST SP 800-38B AES-CMAC for AES-128.
export async function aesCmac(key, message = new Uint8Array(0)) {
  assertBytes(key, 16, "cmac_key");
  assertBytes(message, undefined, "cmac_message");
  const { k1, k2 } = await subkeys(key);
  let blocks = Math.ceil(message.length / BLOCK);
  if (blocks === 0) blocks = 1;
  const complete = message.length > 0 && message.length % BLOCK === 0;

  let last;
  if (complete) {
    last = xor(message.slice((blocks - 1) * BLOCK, blocks * BLOCK), k1);
  } else {
    const tail = message.slice((blocks - 1) * BLOCK);
    const padded = new Uint8Array(BLOCK);
    padded.set(tail);
    padded[tail.length] = 0x80;
    last = xor(padded, k2);
  }

  let state = new Uint8Array(BLOCK);
  for (let i = 0; i < blocks - 1; i++) {
    state = await aes128EncryptBlock(key, xor(state, message.slice(i * BLOCK, (i + 1) * BLOCK)));
  }
  return aes128EncryptBlock(key, xor(state, last));
}

// NXP MACt: retain odd-index bytes from the 16-byte CMAC.
export function nxpMacT(full) {
  assertBytes(full, 16, "cmac");
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++) out[i] = full[i * 2 + 1];
  return out;
}

export function hexToBytes(hex) {
  const clean = String(hex ?? "").trim();
  if (clean.length % 2 || !/^[0-9a-fA-F]*$/.test(clean)) throw new Error("hex_invalid");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes) {
  assertBytes(bytes, undefined, "bytes");
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function buildSdmSessionVector(prefix, uid, counter) {
  assertBytes(uid, 7, "uid");
  assertBytes(counter, 3, "sdm_counter");
  const vector = new Uint8Array(16);
  vector.set(prefix, 0);
  vector.set(uid, 6);
  vector.set(counter, 13);
  return vector;
}

export async function deriveSdmFileReadEncKey(staticKey, uid, counter) {
  assertBytes(staticKey, 16, "sdm_file_read_key");
  return aesCmac(staticKey, buildSdmSessionVector([0xc3, 0x3c, 0x00, 0x01, 0x00, 0x80], uid, counter));
}

export async function deriveSdmFileReadMacKey(staticKey, uid, counter) {
  assertBytes(staticKey, 16, "sdm_file_read_key");
  return aesCmac(staticKey, buildSdmSessionVector([0x3c, 0xc3, 0x00, 0x01, 0x00, 0x80], uid, counter));
}

export async function calculateSdmMac(staticKey, uid, counter, dynamicInput = new Uint8Array(0)) {
  const session = await deriveSdmFileReadMacKey(staticKey, uid, counter);
  return nxpMacT(await aesCmac(session, dynamicInput));
}

export function parsePiccData(block) {
  assertBytes(block, 16, "picc_data");
  const tag = block[0];
  if ((tag & 0xc0) !== 0xc0) throw new Error("picc_uid_counter_mirroring_required");
  const uidLength = tag & 0x0f;
  if (uidLength !== 7) throw new Error("picc_uid_length_unsupported");
  return {
    tag,
    uid: block.slice(1, 8),
    counter: block.slice(8, 11),
    padding: block.slice(11),
  };
}

export function counterLe24(counter) {
  assertBytes(counter, 3, "sdm_counter");
  return counter[0] | (counter[1] << 8) | (counter[2] << 16);
}

export async function decryptSdmEncFileData({ fileReadKey, uid, counter, encryptedData }) {
  const staticKey = assertBytes(fileReadKey, 16, "file_read_key");
  const encrypted = assertBytes(encryptedData, 16, "sdm_enc_file_data");
  const sessionKey = await deriveSdmFileReadEncKey(staticKey, uid, counter);
  const ivInput = new Uint8Array(16);
  ivInput.set(assertBytes(counter, 3, "sdm_counter"), 0);
  const iv = await aes128EncryptBlock(sessionKey, ivInput);
  const plaintext = await aes128DecryptBlockWithIv(sessionKey, encrypted, iv);
  return { plaintext, sessionKey, iv };
}

function decodeTtByte(value) {
  if (value === 0x43) return "CLOSE";
  if (value === 0x4f) return "OPEN";
  if (value === 0x49) return "INVALID";
  return "UNKNOWN";
}

export function parseTagTamperStatus(plaintext, offset = 0) {
  assertBytes(plaintext, undefined, "tag_tamper_plaintext");
  if (!Number.isInteger(offset) || offset < 0 || offset + 1 >= plaintext.length) throw new Error("tag_tamper_offset_invalid");
  const permanentStatus = decodeTtByte(plaintext[offset]);
  const currentStatus = decodeTtByte(plaintext[offset + 1]);
  let tamperState = "UNKNOWN";
  if (permanentStatus === "OPEN" || currentStatus === "OPEN") tamperState = "OPEN";
  else if (permanentStatus === "CLOSE" && currentStatus === "CLOSE") tamperState = "INTACT";
  return {
    permanentStatus,
    currentStatus,
    tamperState,
    verified: tamperState === "INTACT" || tamperState === "OPEN",
  };
}

export async function verifyNtag424Sun({
  metaReadKey,
  fileReadKey,
  piccEncData,
  sdmMac,
  dynamicInput = new Uint8Array(0),
}) {
  const piccData = await aes128DecryptBlock(
    assertBytes(metaReadKey, 16, "meta_read_key"),
    assertBytes(piccEncData, 16, "picc_enc_data"),
  );
  const parsed = parsePiccData(piccData);
  const expectedMac = await calculateSdmMac(
    assertBytes(fileReadKey, 16, "file_read_key"),
    parsed.uid,
    parsed.counter,
    assertBytes(dynamicInput, undefined, "dynamic_input"),
  );
  assertBytes(sdmMac, 8, "sdm_mac");
  let diff = 0;
  for (let i = 0; i < 8; i++) diff |= expectedMac[i] ^ sdmMac[i];
  return {
    valid: diff === 0,
    uid: parsed.uid,
    counterBytes: parsed.counter,
    counter: counterLe24(parsed.counter),
    expectedMac,
    piccData,
  };
}
