'use strict';

// Se ejecuta antes de cualquier test de integración (setupFiles en jest.config.js).
// override:true garantiza que las variables de .env.test sobreescriban cualquier
// .env que el propio app.js pueda cargar internamente.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.test'), override: true });
