import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
const target = new URL('../.env.local', import.meta.url);
if (existsSync(target)) throw new Error('.env.local ya existe. Editalo manualmente para no reemplazar credenciales.');
const rl = createInterface({ input: process.stdin, output: process.stdout });
const username = (await rl.question('Usuario administrador [admin]: ')).trim() || 'admin';
rl.close();
if (!/^[a-zA-Z0-9_.@-]{1,80}$/.test(username)) throw new Error('El usuario contiene caracteres inválidos.');
const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16).toString('hex');
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
let managementKey = '';
const serverEnv = new URL('../../server/.env', import.meta.url);
if (existsSync(serverEnv)) {
  const match = readFileSync(serverEnv, 'utf8').match(/^MANAGEMENT_API_KEY\s*=\s*(.+)$/m);
  managementKey = match?.[1].trim().replace(/^['"]|['"]$/g, '') ?? '';
}
writeFileSync(target, `API_BASE_URL=http://localhost:4000/api\nAPP_ORIGIN=http://localhost:3001\nMANAGEMENT_API_KEY=${managementKey}\nADMIN_USERNAME=${username}\nADMIN_PASSWORD_HASH=${passwordHash}\nSESSION_SECRET=${randomBytes(48).toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
console.log(`Configuración local creada. Guardá estas credenciales en un gestor de contraseñas.\nUsuario: ${username}\nContraseña: ${password}`);
console.log(managementKey ? 'Clave de gestión importada desde server/.env sin mostrarla.' : 'Completá MANAGEMENT_API_KEY en .env.local con la misma clave de la API.');
