import assert from 'node:assert/strict';
import {
  aes128DecryptBlock,
  bytesToHex,
  calculateSdmMac,
  decryptSdmEncFileData,
  deriveSdmFileReadEncKey,
  deriveSdmFileReadMacKey,
  hexToBytes,
  parseTagTamperStatus,
  verifyNtag424Sun,
} from '../supabase/functions/_shared/evo-aes-cmac.mjs';

const h = hexToBytes;
const x = bytesToHex;
const ZERO = h('00000000000000000000000000000000');

// NXP AN12196 Rev 2.0, Table 4 / SDMMAC example.
const piccEnc = h('EF963FF7828658A599F3041510671E88');
const decrypted = await aes128DecryptBlock(ZERO, piccEnc);
assert.equal(x(decrypted), 'C704DE5F1EACC0403D0000DA5CF60941', 'PICCData decrypt must match NXP reference');

const uid = h('04DE5F1EACC040');
const counter = h('3D0000');
const session = await deriveSdmFileReadMacKey(ZERO, uid, counter);
assert.equal(x(session), '3FB5F6E3A807A03D5E3570ACE393776F', 'SDM session MAC key must match NXP reference');

const zeroLengthMac = await calculateSdmMac(ZERO, uid, counter);
assert.equal(x(zeroLengthMac), '94EED9EE65337086', 'zero-length SDMMAC must match NXP reference');

const verified = await verifyNtag424Sun({
  metaReadKey: ZERO,
  fileReadKey: ZERO,
  piccEncData: piccEnc,
  sdmMac: h('94EED9EE65337086'),
});
assert.equal(verified.valid, true, 'complete SUN verification must accept the official reference vector');
assert.equal(x(verified.uid), '04DE5F1EACC040');
assert.equal(verified.counter, 61, '3D0000 is little-endian counter 61');

const tamperedMac = h('94EED9EE65337087');
const rejected = await verifyNtag424Sun({
  metaReadKey: ZERO,
  fileReadKey: ZERO,
  piccEncData: piccEnc,
  sdmMac: tamperedMac,
});
assert.equal(rejected.valid, false, 'one-byte MAC modification must be rejected');

// NXP AN12196 Rev 2.0, Table 5 / non-empty dynamic input example.
const uid2 = h('04958CAA5C5E80');
const counter2 = h('080000');
const session2 = await deriveSdmFileReadMacKey(ZERO, uid2, counter2);
assert.equal(x(session2), '3ED0920E5E6A0320D823D5987FEAFBB1');
const dynamicInput = new TextEncoder().encode('CEE9A53E3E463EF1F459635736738962&cmac=');
const mac2 = await calculateSdmMac(ZERO, uid2, counter2, dynamicInput);
assert.equal(x(mac2), 'ECC1E7F6C6C73BF6', 'dynamic-input SDMMAC must match NXP reference');

const verifiedDynamic = await verifyNtag424Sun({
  metaReadKey: ZERO,
  fileReadKey: ZERO,
  piccEncData: h('FD91EC264309878BE6345CBE53BADF40'),
  sdmMac: h('ECC1E7F6C6C73BF6'),
  dynamicInput,
});
assert.equal(verifiedDynamic.valid, true, 'complete dynamic-input SUN verification must accept NXP Table 5');
assert.equal(x(verifiedDynamic.uid), '04958CAA5C5E80');
assert.equal(verifiedDynamic.counter, 8);

// NXP AN12196 Rev 2.0, Table 3 / SDMENCFileData decryption example.
const uid3 = h('04958CAA5C5E80');
const counter3 = h('010000');
const encSession = await deriveSdmFileReadEncKey(ZERO, uid3, counter3);
assert.equal(x(encSession), '8097D73344D53F963B09E23E03B62336', 'SDM session ENC key must match NXP reference');
const encResult = await decryptSdmEncFileData({
  fileReadKey: ZERO,
  uid: uid3,
  counter: counter3,
  encryptedData: h('94592FDE69FA06E8E3B6CA686A22842B'),
});
assert.equal(x(encResult.iv), '7B3F3CFC39D3B7FF5868636E38AF7C3A', 'SDM encrypted-data IV must match NXP reference');
assert.equal(x(encResult.plaintext), '78787878787878787878787878787878', 'SDMENCFileData decrypt must match NXP reference');

// NXP NT4H2421Tx data sheet 10.2 defines C/O/I as Close/Open/Invalid.
const intact = parseTagTamperStatus(h('43430000000000000000000000000000'), 0);
assert.deepEqual(intact, { permanentStatus: 'CLOSE', currentStatus: 'CLOSE', tamperState: 'INTACT', verified: true });
const opened = parseTagTamperStatus(h('4F4F0000000000000000000000000000'), 0);
assert.equal(opened.tamperState, 'OPEN');
assert.equal(opened.verified, true);
const invalid = parseTagTamperStatus(h('49490000000000000000000000000000'), 0);
assert.equal(invalid.tamperState, 'UNKNOWN');
assert.equal(invalid.verified, false);

console.log('EVO V4.6 NTAG 424 DNA SDM + TagTamper cryptographic vectors passed');
