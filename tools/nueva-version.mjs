/* =========================================================
   tools/nueva-version.mjs

   Marca una versión nueva de la web. Ejecutar antes de cada
   commit que cambie algo visible:

       node tools/nueva-version.mjs

   Actualiza a la vez:
   - version.json            (lo que consulta el móvil)
   - VERSION_WEB en app.js   (la versión que tiene cargada)
   - ?v= en index.html       (para no usar estilos/código viejos)
   - CACHE_NAME del service worker
   ========================================================= */

import { readFile, writeFile } from "node:fs/promises";

const ahora = new Date();
const dos = n => String(n).padStart(2, "0");
const version =
    `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}` +
    `${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`;

const cambiar = async (ruta, cambios) => {
    let texto = await readFile(ruta, "utf8");
    for (const [patron, nuevo] of cambios) {
        if (!patron.test(texto)) {
            throw new Error(`No encuentro ${patron} en ${ruta}`);
        }
        texto = texto.replace(patron, nuevo);
    }
    await writeFile(ruta, texto);
};

await writeFile("version.json", JSON.stringify({ v: version }) + "\n");

await cambiar("js/app.js", [
    [/const VERSION_WEB = "\d+";/, `const VERSION_WEB = "${version}";`]
]);

await cambiar("index.html", [
    [/styles\.css\?v=\d+/, `styles.css?v=${version}`],
    [/app\.js\?v=\d+/, `app.js?v=${version}`]
]);

await cambiar("service-worker.js", [
    [/const CACHE_NAME = "[^"]+";/, `const CACHE_NAME = "un-plan-${version}";`]
]);

console.log(`✅ Versión ${version}`);
