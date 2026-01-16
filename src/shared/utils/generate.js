import { randomBytes } from 'crypto';

// Opsi 1: Menggunakan heksadesimal
const accessTokenSecret = randomBytes(32).toString('hex');
const refreshTokenSecret = randomBytes(32).toString('hex');

// Opsi 2: Menggunakan Base64
// Base64 string sedikit lebih pendek untuk panjang byte yang sama, karena setiap 3 byte diubah menjadi 4 karakter.
const accessTokenSecretBase64 = randomBytes(32).toString('base64');
const refreshTokenSecretBase64 = randomBytes(32).toString('base64');

console.log('Access Token Secret (Hex):', accessTokenSecret);
console.log('Refresh Token Secret (Hex):', refreshTokenSecret);
console.log('------------------------------------');
console.log('Access Token Secret (Base64):', accessTokenSecretBase64);
console.log('Refresh Token Secret (Base64):', refreshTokenSecretBase64);