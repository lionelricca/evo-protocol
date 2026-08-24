'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const review=fs.readFileSync(path.join(__dirname,'..','v1','seal-review-v400.js'),'utf8');
const session=fs.readFileSync(path.join(__dirname,'..','v1','wallet-session-v277.js'),'utf8');

assert.match(review,/form\.addEventListener\('submit',[\s\S]*true\);/,'Seal review must intercept submit in capture phase before the signing handler');
assert.match(review,/event\.preventDefault\(\);[\s\S]*event\.stopImmediatePropagation\(\)/,'unreviewed submission must be stopped before signature/registration');
assert.match(review,/normalizeForm\(\)/,'public fields must be normalized before review');
assert.match(review,/replace\(\/\^\[\\s:;\|·\]\+\//,'title normalization must remove accidental leading separators');
assert.match(review,/crypto\.subtle\.digest\('SHA-256'/,'preview must calculate the exact local file hash');
assert.match(review,/Confirmo que estos datos son correctos y pueden quedar visibles públicamente/,'review must require explicit public-data confirmation');
assert.match(review,/disabled>Confirmar y firmar/,'signature confirmation must start disabled');
assert.match(review,/form\.dataset\.evoReviewApproved='1'/,'only an approved review may release the original submit flow');
assert.match(review,/suspiciousDescription/,'pasted workflow/instruction-like descriptions must be flagged for review');

assert.match(session,/seal-review-v400\.css\?v=20260823-v400-review/,'RC loader must load review CSS');
assert.match(session,/seal-review-v400\.js\?v=20260823-v400-review/,'RC loader must load mandatory review logic');

console.log('EVO V4 mandatory Seal review regression checks passed');
