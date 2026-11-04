/* =========================================================
   tools/cifrar.mjs

   Cifra (o descifra) los datos de la sorpresa con la
   palabra secreta. El navegador los descifra con el mismo
   algoritmo (Web Crypto: PBKDF2-SHA256 + AES-GCM).

   Uso (Node 18+):

     PALABRA="..." node tools/cifrar.mjs cifrar
        lee  privado/viaje.json + privado/hero.jpg
             + las fotos de privado/hotel/ que cite viaje.json
        crea data/sorpresa.json   (este sí se sube a GitHub)

     PALABRA="..." node tools/cifrar.mjs descifrar
        lee  data/sorpresa.json
        crea privado/viaje.json + privado/hero.jpg + privado/hotel/

   La carpeta privado/ está en .gitignore: nunca se sube.
   La palabra no se guarda en ningún archivo.
   ========================================================= */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename } from "node:path";
import { webcrypto as crypto } from "node:crypto";

const ITERACIONES = 600000;

const RUTA_CIFRADO = "data/sorpresa.json";
const RUTA_DATOS = "privado/viaje.json";
const RUTA_IMAGEN = "privado/hero.jpg";


/*
 * Igual que en app.js: sin mayúsculas, tildes ni espacios
 * de sobra, para que "Justiciera " y "justiciera" valgan.
 */
function normalizarPalabra(palabra) {

    return String(palabra || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


async function derivarClave(palabra, sal, iteraciones) {

    const base = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(normalizarPalabra(palabra)),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteraciones },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}


const aBase64 = bytes => Buffer.from(bytes).toString("base64");
const deBase64 = texto => new Uint8Array(Buffer.from(texto, "base64"));


async function cifrar(palabra) {

    const datos = JSON.parse(await readFile(RUTA_DATOS, "utf8"));
    const imagen = await readFile(RUTA_IMAGEN);

    datos.imagen_hero =
        "data:image/jpeg;base64," + imagen.toString("base64");

    // Fotos del hotel: { "archivo": "privado/hotel/x.jpg" } -> { "src": "data:..." }
    for (const foto of datos.hotel_detalle?.fotos || []) {

        if (foto.archivo) {
            const bytes = await readFile(foto.archivo);
            foto.src = "data:image/jpeg;base64," + bytes.toString("base64");
            delete foto.archivo;
        }
    }

    const sal = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const clave = await derivarClave(palabra, sal, ITERACIONES);

    const cifrado = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        clave,
        new TextEncoder().encode(JSON.stringify(datos))
    );

    const paquete = {
        v: 1,
        iteraciones: ITERACIONES,
        sal: aBase64(sal),
        iv: aBase64(iv),
        datos: aBase64(new Uint8Array(cifrado))
    };

    await mkdir("data", { recursive: true });
    await writeFile(RUTA_CIFRADO, JSON.stringify(paquete) + "\n");

    console.log(`✅ ${RUTA_CIFRADO} creado (${Math.round(paquete.datos.length / 1024)} KB)`);
}


async function descifrar(palabra) {

    const paquete = JSON.parse(await readFile(RUTA_CIFRADO, "utf8"));

    const clave = await derivarClave(
        palabra,
        deBase64(paquete.sal),
        paquete.iteraciones
    );

    let texto;

    try {
        texto = new TextDecoder().decode(
            await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: deBase64(paquete.iv) },
                clave,
                deBase64(paquete.datos)
            )
        );
    } catch {
        console.error("❌ Palabra incorrecta.");
        process.exit(1);
    }

    const datos = JSON.parse(texto);
    const imagen = datos.imagen_hero;
    delete datos.imagen_hero;

    await mkdir("privado/hotel", { recursive: true });

    for (const [indice, foto] of (datos.hotel_detalle?.fotos || []).entries()) {

        if (foto.src?.startsWith("data:")) {
            const nombre = foto.nombre || `foto-${indice + 1}.jpg`;
            const ruta = `privado/hotel/${basename(nombre)}`;
            await writeFile(ruta, Buffer.from(foto.src.split(",")[1], "base64"));
            foto.archivo = ruta;
            delete foto.src;
        }
    }

    await writeFile(RUTA_DATOS, JSON.stringify(datos, null, 4) + "\n");

    if (imagen) {
        await writeFile(
            RUTA_IMAGEN,
            Buffer.from(imagen.split(",")[1], "base64")
        );
    }

    console.log(`✅ ${RUTA_DATOS} y ${RUTA_IMAGEN} recuperados`);
}


const modo = process.argv[2];
const palabra = process.env.PALABRA;

if (!palabra || !["cifrar", "descifrar"].includes(modo)) {
    console.log('Uso: PALABRA="..." node tools/cifrar.mjs cifrar|descifrar');
    process.exit(1);
}

await (modo === "cifrar" ? cifrar(palabra) : descifrar(palabra));
