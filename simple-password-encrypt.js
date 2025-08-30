import bcrypt from 'bcryptjs';

const rawPass = "admin123";

// Hash function
const result = await bcrypt.hash(rawPass, 10);

console.log("Password asli:", rawPass);
console.log("Password terenkripsi:", result);
