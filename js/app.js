/* =========================================================
   UN PLAN
   app.js
   ========================================================= */

const CONFIG = {

    // Momento en que se puede abrir el regalo (hora de España).
    fechaApertura: "2026-12-10T19:00:00+01:00",

    // Datos del plan, cifrados con la palabra secreta.
    archivoSorpresa: "./data/sorpresa.json",

    storage: {
        llave: "plan_llave",
        checklist: "plan_checklist",
        pistasVistas: "plan_pistasVistas",
        simular: "plan_simularApertura"
    },

    /*
     * Una pista cada miércoles a las 19:00.
     * El texto va en base64 para que no se lea de un
     * vistazo en el código fuente antes de tiempo.
     */
    pistas: [
        { fecha: "2026-11-04T19:00:00+01:00", icono: "📸", texto: "UHJpbWVyYSBwaXN0YSwganVzdGljaWVyYTogaGF6IGh1ZWNvIGVuIGVsIG3Ds3ZpbC4gVmFzIGEgaGFjZXIgbXVjaGFzIGZvdG9zLg==" },
        { fecha: "2026-11-11T19:00:00+01:00", icono: "🧳", texto: "RW4gbGEgbWFsZXRhOiBhbGdvIGPDs21vZG8gcGFyYSBlbCBkw61hIHkgYWxnbyBib25pdG8gcGFyYSB1bmEgY2VuYSBlc3BlY2lhbC4=" },
        { fecha: "2026-11-18T19:00:00+01:00", icono: "🧣", texto: "SGFyw6EgZnLDrW8uIEJ1ZmFuZGEsIHPDrS4gQmlraW5pLCBuby4=" },
        { fecha: "2026-11-25T19:00:00+01:00", icono: "🍷", texto: "UGlzdGEgbsK6IDQ6IGVsIHZpYWplIGluY2x1eWUgdmluby4gTXVjaG8gdmluby4gVHUgw7puaWNhIG1pc2nDs24sIGp1c3RpY2llcmE6IGVsZWdpciBsYSBtZWpvciBjZXBhLg==" },
        { fecha: "2026-12-02T19:00:00+01:00", icono: "🎨", texto: "SGFicsOhIGFydGUuIERlbCBxdWUgc2FsZSBlbiBsb3MgbGlicm9zIGRlbCBjb2xlLg==" },
        { fecha: "2026-12-09T19:00:00+01:00", icono: "🪜", texto: "w5psdGltYSBwaXN0YSwganVzdGljaWVyYTogaGFicsOhIGVzY2Fsb25lcy4gTXVjaG9zLiBNdWNow61zaW1vcy4gUGVybyB0ZSBwcm9tZXRvIHF1ZSBsYXMgdmlzdGFzIGRlIGFycmliYSBsbyBjb21wZW5zYW4u" }
    ]
};


/*
 * Diferencia entre la hora del servidor y la del móvil.
 * Así adelantar el reloj del móvil no abre el regalo.
 */
let desfaseReloj = 0;

function ahora() {
    return new Date(Date.now() + desfaseReloj);
}

async function sincronizarHora() {

    // Si la red tarda, no hacemos esperar más de 2,5 s
    const control =
        new AbortController();

    const limite =
        setTimeout(() => control.abort(), 2500);

    try {

        const respuesta =
            await fetch(window.location.pathname, {
                method: "HEAD",
                cache: "no-store",
                signal: control.signal
            });

        const fechaServidor =
            new Date(respuesta.headers.get("Date") || "");

        if (!Number.isNaN(fechaServidor.getTime())) {
            desfaseReloj = fechaServidor.getTime() - Date.now();
        }

    } catch (error) {
        // Sin conexión o muy lenta: usamos la hora del dispositivo.
    } finally {
        clearTimeout(limite);
    }
}


let datosViaje = null;
let restaurantesCompletos = [];
let filtroRestauranteActual = "todos";
let intervaloCuentaAtras = null;


/* =========================================================
   INICIO
   ========================================================= */

document.addEventListener("DOMContentLoaded", iniciarApp);

async function iniciarApp() {

    configurarEventosGlobales();

    registrarServiceWorker();

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const modoDev =
        parametros.get("dev") === "true";

    if (modoDev) {

        console.log(
            "🔧 MODO DESARROLLADOR ACTIVADO"
        );

        sessionStorage.setItem(
            CONFIG.storage.simular,
            "true"
        );

        // Olvidamos la llave para probar la sorpresa desde cero.
        localStorage.removeItem(
            CONFIG.storage.llave
        );
    }

    /*
     * Si ya abrió el regalo en este móvil, la llave está
     * guardada y entramos directamente al plan.
     */
    const abierto =
        await abrirConLlaveGuardada();

    if (abierto) {
        return;
    }

    // No había llave (o no sirvió): ahora sí, pantalla de espera
    document.documentElement.classList.remove("con-llave");

    await sincronizarHora();

    mostrarPantallaSorpresa();

    renderizarPistas();

    iniciarCuentaAtras();
}


/* =========================================================
   EVENTOS GLOBALES
   ========================================================= */

function configurarEventosGlobales() {

    document.addEventListener(
        "keydown",
        manejarTeclasDesarrollo
    );

    const botonAbrirRegalo =
        document.getElementById("open-gift");

    if (botonAbrirRegalo) {
        botonAbrirRegalo.addEventListener(
            "click",
            abrirRegalo
        );
    }

    const enlacesNavegacion =
        document.querySelectorAll(
            ".main-nav a"
        );

    enlacesNavegacion.forEach(enlace => {

        enlace.addEventListener(
            "click",
            manejarNavegacion
        );

    });
}


/* =========================================================
   MODO DESARROLLO
   ========================================================= */

function manejarTeclasDesarrollo(event) {

    /*
     * Ctrl + Shift + G
     * Simula que hoy es el cumpleaños.
     */
    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "g"
    ) {

        event.preventDefault();

        console.log(
            "🎂 Modo cumpleaños activado"
        );

        sessionStorage.setItem(
            CONFIG.storage.simular,
            "true"
        );

        activarModoCumpleanos();
    }


    /*
     * Ctrl + Shift + R
     * Reinicia completamente la sorpresa.
     */
    if (
        event.ctrlKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "r"
    ) {

        event.preventDefault();

        console.log(
            "🔄 Reiniciando regalo"
        );

        localStorage.removeItem(
            CONFIG.storage.llave
        );

        localStorage.removeItem(
            CONFIG.storage.checklist
        );

        localStorage.removeItem(
            CONFIG.storage.pistasVistas
        );

        sessionStorage.removeItem(
            CONFIG.storage.simular
        );

        window.location.reload();
    }
}


/* =========================================================
   ESTADO DEL VIAJE
   ========================================================= */

function comprobarViajeDesbloqueado() {

    return Boolean(
        localStorage.getItem(
            CONFIG.storage.llave
        )
    );
}


/* =========================================================
   PANTALLA DE ESPERA
   ========================================================= */

function mostrarPantallaSorpresa() {


    document.body.classList.remove(
        "viaje-desbloqueado"
    );

    const waitingScreen =
        document.getElementById(
            "waiting-screen"
        );

    const content =
        document.getElementById(
            "content"
        );

    const loading =
        document.getElementById(
            "loading"
        );

    if (waitingScreen) {
        waitingScreen.hidden = false;
    }

    if (content) {
        content.hidden = true;
    }

    if (loading) {
        loading.hidden = true;
    }

    ocultarNavegacion();

    actualizarHeroEspera();

    comprobarFechaReal();
}


/* =========================================================
   HERO - ESPERA
   ========================================================= */

function actualizarHeroEspera() {

    const eyebrow =
        document.querySelector(
            ".hero-eyebrow"
        );

    const titulo =
        document.querySelector(
            ".hero-title"
        );

    const subtitulo =
        document.querySelector(
            ".hero-subtitle"
        );

    if (eyebrow) {
        eyebrow.textContent =
            "🎁 Tic tac, justiciera";
    }

    if (titulo) {
        titulo.textContent =
            "Hay un plan esperándote";
    }

    if (subtitulo) {
        subtitulo.textContent =
            "Se abre el 10 de diciembre a las 19:00";
    }

    const boton =
        document.getElementById(
            "open-gift"
        );

    if (boton) {
        boton.hidden = true;
    }
}


/* =========================================================
   CUENTA ATRÁS
   ========================================================= */

function iniciarCuentaAtras() {

    actualizarCuentaAtras();

    if (intervaloCuentaAtras) {
        clearInterval(
            intervaloCuentaAtras
        );
    }

    intervaloCuentaAtras =
        setInterval(
            actualizarCuentaAtras,
            1000
        );
}


function actualizarCuentaAtras() {

    const simulandoApertura =
        sessionStorage.getItem(
            CONFIG.storage.simular
        ) === "true";

    if (simulandoApertura) {

        activarModoCumpleanos();
        return;
    }

    const diferencia =
        new Date(CONFIG.fechaApertura) - ahora();

    if (diferencia <= 0) {

        activarModoCumpleanos();
        return;
    }

    const dias =
        Math.floor(diferencia / 86400000);

    const horas =
        Math.floor((diferencia / 3600000) % 24);

    const minutos =
        Math.floor((diferencia / 60000) % 60);

    const segundos =
        Math.floor((diferencia / 1000) % 60);

    actualizarElemento("countdown-days", formatearNumero(dias));
    actualizarElemento("countdown-hours", formatearNumero(horas));
    actualizarElemento("countdown-minutes", formatearNumero(minutos));
    actualizarElemento("countdown-seconds", formatearNumero(segundos));

    document.getElementById("countdown")?.classList.add("listo");

    refrescarPistasSiToca();
}


/*
 * Si se desbloquea una pista (o cambia el día) con la web
 * abierta, las volvemos a pintar sin tener que recargar.
 */
let estadoPistas = "";

function refrescarPistasSiToca() {

    const momento =
        ahora();

    const disponibles =
        CONFIG.pistas.filter(pista => momento >= new Date(pista.fecha)).length;

    const dia =
        momento.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

    const estado =
        `${disponibles}|${dia}`;

    if (estadoPistas && estado !== estadoPistas) {
        renderizarPistas();
    }

    estadoPistas = estado;
}


function actualizarElemento(
    id,
    valor
) {

    const elemento =
        document.getElementById(id);

    if (!elemento || elemento.textContent.trim() === String(valor)) {
        return;
    }

    elemento.textContent =
        valor;

    // Pequeño "tic" visual cada vez que cambia el número.
    elemento.classList.remove("tick");
    void elemento.offsetWidth;
    elemento.classList.add("tick");
}


function formatearNumero(numero) {

    return String(numero)
        .padStart(2, "0");
}


/* =========================================================
   CUMPLEAÑOS
   ========================================================= */

function comprobarFechaReal() {

    if (ahora() >= new Date(CONFIG.fechaApertura)) {
        activarModoCumpleanos();
    }
}


let modoCumpleanosActivo = false;

function activarModoCumpleanos() {

    if (modoCumpleanosActivo) {
        return;
    }

    /*
     * Si el viaje ya está desbloqueado, el hero muestra
     * el destino: no volvemos a la pantalla del regalo.
     */
    if (
        document.body.classList.contains(
            "viaje-desbloqueado"
        )
    ) {

        if (intervaloCuentaAtras) {
            clearInterval(intervaloCuentaAtras);
            intervaloCuentaAtras = null;
        }

        return;
    }

    const waitingScreen =
        document.getElementById(
            "waiting-screen"
        );

    const eyebrow =
        document.querySelector(
            ".hero-eyebrow"
        );

    const titulo =
        document.querySelector(
            ".hero-title"
        );

    const subtitulo =
        document.querySelector(
            ".hero-subtitle"
        );

    if (waitingScreen) {
        waitingScreen.hidden = false;
    }

    if (eyebrow) {
        eyebrow.textContent =
            "🎂 Ya es la hora";
    }

    if (titulo) {
        titulo.textContent =
            "Felices 30";
    }

    if (subtitulo) {
        subtitulo.textContent =
            "Tu regalo te está esperando, justiciera";
    }

    const boton =
        document.getElementById(
            "open-gift"
        );

    if (boton) {

        boton.hidden = false;

        boton.textContent =
            "🎁 Abrir mi regalo";

        /*
         * Añadimos una pequeña animación
         * si existe en CSS.
         */
        boton.classList.add(
            "gift-ready"
        );
    }

    // ¿Estaba la cuenta atrás en marcha delante de ella? Entonces lo celebramos
    const enDirecto =
        document.getElementById("countdown")?.classList.contains("listo") &&
        !document.getElementById("countdown")?.hidden;

    modoCumpleanosActivo = true;

    actualizarCuentaAtrasCumpleanos();

    document.body.classList.add("modo-apertura");

    if (enDirecto) {

        const contenidoHero =
            document.querySelector(".hero-content");

        contenidoHero?.classList.remove("reaparece");
        void contenidoHero?.offsetWidth;
        contenidoHero?.classList.add("reaparece");

        lanzarConfeti();
    }

    // A esta hora ya se ven todas las pistas.
    renderizarPistas();

    if (intervaloCuentaAtras) {

        clearInterval(
            intervaloCuentaAtras
        );

        intervaloCuentaAtras = null;
    }
}


function actualizarCuentaAtrasCumpleanos() {

    /*
     * El día del cumpleaños la cuenta atrás ya ha
     * terminado: en lugar de cuatro "00" la ocultamos
     * y el protagonista es el botón del regalo.
     */
    const countdown =
        document.getElementById(
            "countdown"
        );

    if (countdown) {
        countdown.hidden = true;
    }

    actualizarElemento(
        "countdown-days",
        "00"
    );

    actualizarElemento(
        "countdown-hours",
        "00"
    );

    actualizarElemento(
        "countdown-minutes",
        "00"
    );

    actualizarElemento(
        "countdown-seconds",
        "00"
    );
}


/* =========================================================
   PISTAS SEMANALES
   ========================================================= */

function obtenerPistasVistas() {

    try {
        return JSON.parse(
            localStorage.getItem(CONFIG.storage.pistasVistas) || "[]"
        );
    } catch (error) {
        return [];
    }
}


function guardarPistaVista(indice) {

    const vistas =
        new Set(obtenerPistasVistas());

    vistas.add(indice);

    try {
        localStorage.setItem(
            CONFIG.storage.pistasVistas,
            JSON.stringify([...vistas])
        );
    } catch (error) {
        // Sin almacenamiento: la carta se vuelve a tapar al recargar.
    }
}


function textoCuandoAbre(fecha) {

    const opciones = {
        timeZone: "Europe/Madrid"
    };

    const dia = fecha.toLocaleDateString("es-ES", {
        ...opciones,
        weekday: "long",
        day: "numeric",
        month: "short"
    }).replace(".", "");

    return `${dia} · 19:00`;
}


function textoCuantoFalta(fecha) {

    /*
     * Contamos días de calendario en hora de España:
     * "hoy", "mañana" o "en N días".
     */
    const diaEnEspana = momento => {

        const [anio, mes, dia] =
            momento
                .toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
                .split("-")
                .map(Number);

        return Date.UTC(anio, mes - 1, dia);
    };

    const dias =
        Math.round((diaEnEspana(fecha) - diaEnEspana(ahora())) / 86400000);

    if (dias <= 0) {
        return "hoy a las 19:00";
    }

    if (dias === 1) {
        return "mañana";
    }

    return `en ${dias} días`;
}


function renderizarPistas() {

    const seccion =
        document.getElementById("pistas");

    const lista =
        document.getElementById("pistas-lista");

    if (!seccion || !lista || comprobarViajeDesbloqueado()) {
        return;
    }

    const momento =
        ahora();

    const simulando =
        sessionStorage.getItem(CONFIG.storage.simular) === "true";

    const vistas =
        obtenerPistasVistas();

    let siguienteMarcada =
        false;

    let abiertas =
        0;

    // Las capas del sobre, comunes a todos
    const capas = `
        <span class="sobre-fondo" aria-hidden="true"></span>
        <span class="sobre-bolsillo" aria-hidden="true"></span>
        <span class="sobre-sombra" aria-hidden="true"></span>
        <span class="sobre-solapa" aria-hidden="true"></span>
    `;

    lista.innerHTML =
        CONFIG.pistas
            .map((pista, indice) => {

                const fecha =
                    new Date(pista.fecha);

                const numero =
                    indice + 1;

                const disponible =
                    simulando || momento >= fecha;

                // ---------- Sobre cerrado con fecha ----------
                if (!disponible) {

                    const esSiguiente =
                        !siguienteMarcada;

                    siguienteMarcada = true;

                    return `
                        <li class="pista">
                            <div class="sobre bloqueado${esSiguiente ? " siguiente" : ""}">
                                ${capas}
                                <span class="sobre-sello" aria-hidden="true">🔒</span>
                                <span class="sobre-pie">
                                    <span class="sobre-numero">Pista nº ${numero}</span>
                                    <span class="sobre-fecha">${escaparHTML(textoCuandoAbre(fecha))}</span>
                                    ${
                                        esSiguiente
                                            ? `<span class="sobre-falta">${escaparHTML(textoCuantoFalta(fecha))}</span>`
                                            : ""
                                    }
                                </span>
                            </div>
                        </li>
                    `;
                }

                abiertas++;

                const abierta =
                    vistas.includes(indice);

                // ---------- Sobre disponible ----------
                return `
                    <li class="pista">
                        <button
                            type="button"
                            class="sobre${abierta ? " abierto" : " nuevo"}"
                            data-pista="${indice}"
                            aria-expanded="${abierta}"
                            aria-label="Pista ${numero}"
                        >
                            <span class="sobre-fondo" aria-hidden="true"></span>

                            <span class="sobre-carta">
                                <span class="sobre-carta-etiqueta">Pista nº ${numero}</span>
                                <span class="sobre-carta-icono" aria-hidden="true">${pista.icono}</span>
                                <span class="sobre-carta-texto">${escaparHTML(textoDeBase64(pista.texto))}</span>
                            </span>

                            <span class="sobre-bolsillo" aria-hidden="true"></span>
                            <span class="sobre-sombra" aria-hidden="true"></span>
                            <span class="sobre-solapa" aria-hidden="true"></span>
                            <span class="sobre-sello" aria-hidden="true">✦</span>

                            <span class="sobre-pie" aria-hidden="true">
                                <span class="sobre-numero">Pista nº ${numero}</span>
                                <span class="sobre-instruccion">Toca para abrir</span>
                            </span>

                            ${abierta ? "" : `<span class="sobre-nueva">Nueva</span>`}
                        </button>
                    </li>
                `;
            })
            .join("");


    const contador =
        document.getElementById("pistas-contador");

    if (contador) {
        contador.textContent =
            `${abiertas} de ${CONFIG.pistas.length}`;
    }

    seccion.hidden = false;

    const enlaceBajar =
        document.querySelector("[data-hero-scroll]");

    if (enlaceBajar) {
        enlaceBajar.hidden = false;
    }


    const reducir =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    lista
        .querySelectorAll("button.sobre")
        .forEach(sobre => {

            sobre.addEventListener("click", () => {

                // Una vez abierto, se queda abierto
                if (sobre.classList.contains("abierto") || sobre.classList.contains("abriendo")) {
                    return;
                }

                sobre.classList.remove("nuevo");
                sobre.querySelector(".sobre-nueva")?.remove();
                sobre.setAttribute("aria-expanded", "true");

                guardarPistaVista(Number(sobre.dataset.pista));

                if (reducir) {
                    sobre.classList.add("abierto");
                    return;
                }

                sobre.classList.add("abriendo");

                setTimeout(() => {
                    sobre.classList.remove("abriendo");
                    sobre.classList.add("abierto");
                }, 1700);
            });
        });
}


/* =========================================================
   REGALO
   ========================================================= */

/* =========================================================
   ESCENAS ILUSTRADAS DEL REGALO
   Dibujos propios en SVG; nada que dé pistas del destino.
   ========================================================= */

const CHISPAS = `
    <g class="escena-chispas" fill="#ffe9c7">
        <path class="chispa" style="--d:0s" d="M14 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
        <path class="chispa" style="--d:.7s" d="M104 16 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" />
        <path class="chispa" style="--d:1.3s" d="M100 70 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4z" />
        <path class="chispa" style="--d:.4s" d="M10 78 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" />
    </g>
`;

const ESCENAS = {

    regalo: `
        <svg viewBox="0 0 120 110" aria-hidden="true">
            ${CHISPAS}
            <g class="regalo-caja">
                <rect x="24" y="50" width="72" height="54" rx="6" fill="#c9765b" />
                <rect x="24" y="50" width="72" height="10" fill="#000" opacity=".12" />
                <rect x="55" y="50" width="10" height="54" fill="#f3d27a" />
            </g>
            <g class="regalo-tapa">
                <rect x="18" y="36" width="84" height="17" rx="5" fill="#dc8e70" />
                <rect x="55" y="36" width="10" height="17" fill="#f6dc8e" />
                <path d="M60 36 C 46 14, 26 20, 38 33 C 44 38, 54 37, 60 36 Z" fill="#f3d27a" />
                <path d="M60 36 C 74 14, 94 20, 82 33 C 76 38, 66 37, 60 36 Z" fill="#e6b955" />
                <circle cx="60" cy="35" r="5.5" fill="#d9a441" />
            </g>
        </svg>
    `,

    maleta: `
        <svg viewBox="0 0 120 110" aria-hidden="true">
            ${CHISPAS}
            <g class="maleta">
                <path d="M47 32 V22 a7 7 0 0 1 7 -7 h12 a7 7 0 0 1 7 7 V32" fill="none" stroke="#e9dcc7" stroke-width="5" stroke-linecap="round" />
                <rect x="18" y="30" width="84" height="64" rx="11" fill="#c9765b" />
                <rect x="18" y="30" width="84" height="64" rx="11" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2" />
                <rect x="34" y="30" width="8" height="64" fill="#8f4f3a" />
                <rect x="78" y="30" width="8" height="64" fill="#8f4f3a" />
                <circle cx="60" cy="52" r="12" fill="#ffe9c7" />
                <text x="60" y="56.5" text-anchor="middle" font-family="Georgia, serif" font-size="12" font-weight="700" fill="#8f4f3a">30</text>
                <rect x="47" y="70" width="18" height="14" rx="3" fill="#f3d27a" transform="rotate(-8 56 77)" />
                <text x="56" y="81" text-anchor="middle" font-size="10" fill="#8f4f3a" transform="rotate(-8 56 77)">✦</text>
                <circle cx="94" cy="80" r="6" fill="#ffe9c7" />
                <text x="94" y="83.5" text-anchor="middle" font-size="8" fill="#c0392b">♥</text>
                <circle cx="30" cy="99" r="4" fill="#2a2048" />
                <circle cx="90" cy="99" r="4" fill="#2a2048" />
            </g>
        </svg>
    `,

    candado: `
        <svg viewBox="0 0 120 110" aria-hidden="true">
            <defs>
                <linearGradient id="oro-candado" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#f6dc8e" />
                    <stop offset=".55" stop-color="#e6b955" />
                    <stop offset="1" stop-color="#b8862f" />
                </linearGradient>
            </defs>
            ${CHISPAS}
            <circle class="candado-halo" cx="60" cy="66" r="34" fill="#ffe9c7" opacity=".12" />
            <g class="candado">
                <path class="candado-arco" d="M41 54 V38 a19 19 0 0 1 38 0 V54" fill="none" stroke="#e6c06a" stroke-width="9" stroke-linecap="round" />
                <rect x="28" y="50" width="64" height="50" rx="11" fill="url(#oro-candado)" />
                <rect x="28" y="50" width="64" height="50" rx="11" fill="none" stroke="#fff6e8" stroke-opacity=".35" stroke-width="1.5" />
                <circle cx="60" cy="70" r="6.5" fill="#6f3828" />
                <path d="M57 72 h6 l2 15 h-10 z" fill="#6f3828" />
            </g>
        </svg>
    `
};


function crearEscena(nombre, extra = "") {

    return `
        <div class="paso-escena escena-${nombre}">
            ${ESCENAS[nombre] || ""}
            ${extra}
        </div>
    `;
}


function abrirRegalo() {

    console.log(
        "🎁 Abriendo regalo..."
    );

    const boton =
        document.getElementById(
            "open-gift"
        );

    if (boton) {
        boton.classList.add(
            "gift-opening"
        );

        boton.hidden = true;
    }

    crearModalRegalo();

    /*
     * MUY IMPORTANTE:
     * El CSS comienza con visibility:hidden.
     * Por eso tenemos que añadir .visible.
     */
    requestAnimationFrame(() => {

        const modal =
            document.getElementById(
                "gift-modal"
            );

        if (modal) {
            modal.classList.add(
                "visible"
            );
        }

    });

    mostrarPasoRegalo(1);

    document.body.classList.add(
        "gift-open"
    );
}


/* =========================================================
   CREAR MODAL
   ========================================================= */

function crearModalRegalo() {

    const modalExistente =
        document.getElementById("gift-modal");

    if (modalExistente) {
        modalExistente.remove();
    }

    const modal =
        document.createElement("div");

    modal.id = "gift-modal";
    modal.className = "gift-modal";

    /*
     * Los pasos 1 a 3 no dicen nada del destino.
     * El paso 4 se rellena después de descifrar el plan
     * con la palabra secreta.
     */
    modal.innerHTML = `

        <div class="gift-modal-overlay" data-gift-close></div>

        <div
            class="gift-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-title"
        >

            <div class="gift-progress" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
            </div>


            <div class="gift-step con-escena" data-step="1">

                ${crearEscena("regalo")}

                <p class="gift-small">Hoy toca celebrar</p>

                <h2 id="gift-title">30 años, justiciera</h2>

                <p>
                    Y como no se cumplen todos los días,
                    he preparado algo solo para nosotros.
                </p>

                <button type="button" class="gift-main-button" data-gift-next="2">
                    Sigue <span aria-hidden="true">→</span>
                </button>

            </div>


            <div class="gift-step con-escena" data-step="2" hidden>

                ${crearEscena("maleta")}

                <p class="gift-small">Una pista más</p>

                <h2>Nos vamos unos días</h2>

                <p>
                    Del 18 al 21 de diciembre, tú y yo.
                    Solo falta saber adónde…
                </p>

                <button type="button" class="gift-main-button" data-gift-next="3">
                    ¿Adónde? <span aria-hidden="true">→</span>
                </button>

            </div>


            <form class="gift-step gift-password con-escena" data-step="3" hidden novalidate>

                ${crearEscena("candado")}

                <p class="gift-small">La última puerta</p>

                <h2>Dime la palabra secreta</h2>

                <p>Te la susurro yo. 😉</p>

                <label class="visually-hidden" for="gift-password-input">
                    Palabra secreta
                </label>

                <input
                    id="gift-password-input"
                    class="gift-password-input"
                    type="text"
                    autocomplete="off"
                    autocapitalize="none"
                    spellcheck="false"
                    placeholder="Escríbela aquí"
                    required
                >

                <p class="gift-password-error" role="alert" aria-live="assertive"></p>

                <button type="submit" class="gift-main-button">
                    Abrir
                </button>

            </form>


            <div class="gift-step gift-reveal con-escena" data-step="4" hidden></div>


            <div class="gift-step gift-ticket" data-step="5" hidden></div>

        </div>
    `;

    document.body.appendChild(modal);


    modal
        .querySelectorAll("[data-gift-next]")
        .forEach(boton => {

            boton.addEventListener("click", () => {

                const paso =
                    Number(boton.dataset.giftNext);

                mostrarPasoRegalo(paso);

                if (paso === 3) {
                    setTimeout(
                        () => document.getElementById("gift-password-input")?.focus(),
                        350
                    );
                }
            });
        });


    modal
        .querySelector(".gift-password")
        .addEventListener("submit", comprobarPalabraSecreta);


    /*
     * Cerrar tocando fuera o con Escape (salvo al final).
     */
    modal
        .querySelector("[data-gift-close]")
        .addEventListener("click", () => {
            if (sePuedeCerrarRegalo()) {
                cerrarModalRegalo();
            }
        });

    document.addEventListener("keydown", manejarEscapeModal);
}


/* =========================================================
   PASOS DEL REGALO
   ========================================================= */

let colaPasos = Promise.resolve();

/*
 * Los cambios de paso van en cola: si se toca dos veces
 * seguidas, el segundo espera a que termine el primero.
 */
function mostrarPasoRegalo(numeroPaso) {

    colaPasos =
        colaPasos.then(() => cambiarPasoRegalo(numeroPaso));

    return colaPasos;
}


function cambiarPasoRegalo(
    numeroPaso
) {

    const pasos =
        [...document.querySelectorAll("#gift-modal .gift-step")];

    const contenido =
        document.querySelector("#gift-modal .gift-modal-content");

    const actual =
        pasos.find(paso => !paso.hidden);

    const reducir =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mostrar = () => {

        pasos.forEach(paso => {

            const activo =
                Number(paso.dataset.step) === numeroPaso;

            paso.hidden = !activo;
            paso.classList.remove("saliendo");

            if (activo) {
                // Reiniciamos la animación de entrada del paso
                paso.classList.remove("entrando");
                void paso.offsetWidth;
                paso.classList.add("entrando");
            }
        });

        contenido?.setAttribute("data-paso", String(numeroPaso));

        document
            .querySelectorAll("#gift-modal .gift-progress span")
            .forEach((punto, indice) => {
                punto.classList.toggle("activo", indice < numeroPaso);
            });
    };

    // Ya estamos en ese paso: nada que hacer
    if (actual && Number(actual.dataset.step) === numeroPaso) {
        return Promise.resolve();
    }

    // El paso actual sale hacia la izquierda y entra el siguiente
    if (actual && !reducir) {

        actual.classList.add("saliendo");

        return new Promise(resolver =>
            setTimeout(() => {
                mostrar();
                resolver();
            }, 240)
        );
    }

    mostrar();

    return Promise.resolve();
}


/* =========================================================
   CERRAR MODAL
   ========================================================= */

/*
 * El regalo solo se puede cerrar antes de escribir la palabra:
 * después, cerrar la dejaría sin botón y sin plan.
 */
function sePuedeCerrarRegalo() {

    const comprobando =
        document.querySelector("#gift-modal .gift-password button:disabled");

    return !datosViaje && !comprobando;
}


function manejarEscapeModal(event) {

    if (event.key !== "Escape" || !sePuedeCerrarRegalo()) {
        return;
    }

    cerrarModalRegalo();
}


function cerrarModalRegalo() {

    const modal =
        document.getElementById(
            "gift-modal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "visible"
    );

    document.body.classList.remove(
        "gift-open"
    );

    const boton =
        document.getElementById(
            "open-gift"
        );

    if (
        boton &&
        !comprobarViajeDesbloqueado()
    ) {

        boton.hidden = false;

        boton.classList.remove(
            "gift-opening"
        );
    }

    setTimeout(() => {

        if (modal) {
            modal.remove();
        }

    }, 350);

    document.removeEventListener(
        "keydown",
        manejarEscapeModal
    );
}


/* =========================================================
   REVELAR VIAJE
   ========================================================= */

async function comprobarPalabraSecreta(event) {

    event.preventDefault();

    const formulario =
        event.currentTarget;

    const entrada =
        formulario.querySelector("input");

    const error =
        formulario.querySelector(".gift-password-error");

    const boton =
        formulario.querySelector("button");

    // Enter dos veces seguidas: ignoramos el segundo
    if (boton.disabled) {
        return;
    }

    const palabra =
        entrada.value;

    if (!palabra.trim()) {
        entrada.focus();
        return;
    }

    boton.disabled = true;
    boton.textContent = "Abriendo…";
    error.textContent = "";

    try {

        const { datos, llave } =
            await descifrarSorpresa({ palabra });

        localStorage.setItem(CONFIG.storage.llave, llave);

        prepararDatosViaje(datos);

        // El candado se abre antes de pasar a la postal
        formulario.classList.add("desbloqueado");
        boton.textContent = "¡Abierto!";

        const reducir =
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        await new Promise(resolver => setTimeout(resolver, reducir ? 0 : 950));

        mostrarRevelacion();

    } catch (fallo) {

        boton.disabled = false;
        boton.textContent = "Abrir";

        error.textContent =
            fallo?.name === "OperationError"
                ? "Esa no es… pídemela otra vez 😘"
                : "No he podido abrirlo. ¿Tienes conexión?";

        formulario.classList.remove("error");
        void formulario.offsetWidth;
        formulario.classList.add("error");

        entrada.select();
    }
}


/*
 * Paso 4: el destino, letra a letra.
 */
/*
 * Paso 4: el destino está tapado por una postal dorada
 * que hay que rascar con el dedo.
 */
function mostrarRevelacion() {

    const revelacion =
        datosViaje?.revelacion || {};

    const paso =
        document.querySelector('#gift-modal [data-step="4"]');

    if (!paso) {
        abrirViaje();
        return;
    }

    const letras =
        [...(revelacion.destino || "")]
            .map((letra, indice) =>
                `<span style="--i:${indice}">${letra === " " ? "&nbsp;" : escaparHTML(letra)}</span>`
            )
            .join("");

    paso.innerHTML = `

        <div class="paso-escena escena-estrellas">
            <span class="escena-icono" data-icono-revelacion>✨</span>
        </div>

        <p class="gift-small">Nos vamos a…</p>

        <div class="rasca">

            <div class="rasca-premio" aria-hidden="true">
                <h1 class="gift-destination">${letras}</h1>
                <p class="gift-dates">${escaparHTML(revelacion.fechas || "")}</p>
            </div>

            <canvas class="rasca-capa" aria-hidden="true"></canvas>

        </div>

        <!-- Antes y después ocupan el mismo hueco: el cuadro no salta -->
        <div class="rasca-pie">

            <div class="rasca-antes">

                <p class="rasca-ayuda">
                    <span aria-hidden="true">👆</span> Rasca con el dedo
                </p>

                <button type="button" class="rasca-saltar" data-rasca-saltar>
                    Descubrir sin rascar
                </button>

            </div>

            <div class="rasca-despues" aria-hidden="true">

                <p>${escaparHTML(revelacion.frase || "")}</p>

                <button type="button" class="gift-main-button" data-gift-reveal tabindex="-1">
                    ${escaparHTML(datosViaje?.billete?.boton_mas || "Ver nuestra escapada")}
                </button>

            </div>

        </div>
    `;

    paso
        .querySelector("[data-gift-reveal]")
        .addEventListener(
            "click",
            datosViaje?.billete ? mostrarPasoBillete : revelarViaje
        );

    // Esperamos a que el paso esté visible y tenga tamaño
    // para ajustar el texto y pintar la postal
    mostrarPasoRegalo(4).then(() =>
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                ajustarDestinoAlAncho(paso);
                prepararRasca(paso, revelacion);
            })
        )
    );
}


/*
 * El nombre del destino, siempre en una línea y tan grande
 * como quepa en la postal (sirve para cualquier nombre).
 */
function ajustarDestinoAlAncho(paso) {

    const caja =
        paso.querySelector(".rasca-premio");

    const titulo =
        caja?.querySelector(".gift-destination");

    if (!caja || !titulo) {
        return;
    }

    const disponible =
        caja.clientWidth - 32;

    let tamano = 60;

    titulo.style.fontSize = `${tamano}px`;

    while (titulo.scrollWidth > disponible && tamano > 24) {
        tamano -= 2;
        titulo.style.fontSize = `${tamano}px`;
    }
}


function prepararRasca(paso, revelacion) {

    const caja =
        paso.querySelector(".rasca");

    const lienzo =
        paso.querySelector(".rasca-capa");

    const contexto =
        lienzo?.getContext?.("2d");

    // Sin canvas (muy raro): se descubre directamente
    if (!caja || !contexto) {
        descubrirDestino(paso, revelacion);
        return;
    }

    const escala =
        Math.min(window.devicePixelRatio || 1, 2);

    const { width, height } =
        caja.getBoundingClientRect();

    lienzo.width = Math.round(width * escala);
    lienzo.height = Math.round(height * escala);
    contexto.scale(escala, escala);

    pintarPostalDorada(contexto, width, height);

    caja.classList.add("lista");


    let rascando = false;
    let ultimo = null;
    let trazos = 0;
    let terminado = false;

    // Más o menos la mitad de la yema de un dedo
    const radio =
        Math.max(13, Math.min(18, width / 20));

    // Hay que rascar casi toda la postal (88 %) para descubrirla
    const UMBRAL = 0.88;

    const punto = event => {
        const r = lienzo.getBoundingClientRect();
        return { x: event.clientX - r.left, y: event.clientY - r.top };
    };

    const rascar = (desde, hasta) => {

        contexto.globalCompositeOperation = "destination-out";
        contexto.lineCap = "round";
        contexto.lineJoin = "round";
        contexto.lineWidth = radio * 2;

        contexto.beginPath();
        contexto.moveTo(desde.x, desde.y);
        contexto.lineTo(hasta.x, hasta.y);
        contexto.stroke();

        contexto.beginPath();
        contexto.arc(hasta.x, hasta.y, radio, 0, Math.PI * 2);
        contexto.fill();
    };

    /*
     * Porcentaje rascado, mirando una rejilla de puntos
     * (rápido incluso en móviles antiguos).
     */
    const porcentajeRascado = () => {

        const datos =
            contexto.getImageData(0, 0, lienzo.width, lienzo.height).data;

        const paso = 12;
        let total = 0;
        let vacios = 0;

        for (let y = 0; y < lienzo.height; y += paso) {
            for (let x = 0; x < lienzo.width; x += paso) {
                total++;
                if (datos[(y * lienzo.width + x) * 4 + 3] < 40) {
                    vacios++;
                }
            }
        }

        return total ? vacios / total : 1;
    };

    const terminar = () => {

        if (terminado) {
            return;
        }

        terminado = true;
        descubrirDestino(paso, revelacion);
    };

    /*
     * Se puede empezar a rascar desde cualquier punto del paso
     * (no solo encima de la postal): lo normal es empezar el
     * gesto un poco fuera y entrar arrastrando.
     */
    paso.classList.add("por-rascar");

    paso.addEventListener("pointerdown", event => {

        if (terminado || event.target.closest("button, a")) {
            return;
        }

        rascando = true;
        ultimo = punto(event);

        // A partir de aquí todos los movimientos van a la postal
        lienzo.setPointerCapture?.(event.pointerId);

        rascar(ultimo, ultimo);
        caja.classList.add("rascando");
        paso.querySelector(".rasca-ayuda")?.classList.add("oculta");
    });

    lienzo.addEventListener("pointermove", event => {

        if (!rascando || terminado) {
            return;
        }

        const ahora = punto(event);
        rascar(ultimo, ahora);
        ultimo = ahora;

        // Comprobamos cada pocos movimientos
        if (++trazos % 8 === 0 && porcentajeRascado() > UMBRAL) {
            terminar();
        }
    });

    const soltar = () => {

        if (!rascando) {
            return;
        }

        rascando = false;
        caja.classList.remove("rascando");

        if (!terminado && porcentajeRascado() > UMBRAL) {
            terminar();
        }
    };

    lienzo.addEventListener("pointerup", soltar);
    lienzo.addEventListener("pointercancel", soltar);

    paso
        .querySelector("[data-rasca-saltar]")
        ?.addEventListener("click", terminar);
}


function pintarPostalDorada(c, w, h) {

    // Oro con brillo diagonal
    const oro = c.createLinearGradient(0, 0, w, h);
    oro.addColorStop(0, "#b8862f");
    oro.addColorStop(0.35, "#f3d27a");
    oro.addColorStop(0.5, "#fff1c4");
    oro.addColorStop(0.65, "#e6b955");
    oro.addColorStop(1, "#a8762a");

    c.fillStyle = oro;
    c.fillRect(0, 0, w, h);

    // Purpurina
    for (let i = 0; i < (w * h) / 90; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        c.fillStyle = Math.random() > 0.5
            ? `rgba(255, 250, 230, ${0.25 + Math.random() * 0.5})`
            : `rgba(120, 80, 20, ${0.08 + Math.random() * 0.15})`;
        c.fillRect(x, y, 1.2, 1.2);
    }

    // Marco interior
    c.strokeStyle = "rgba(255, 248, 225, 0.65)";
    c.lineWidth = 1.5;
    c.setLineDash([5, 5]);
    c.strokeRect(9, 9, w - 18, h - 18);
    c.setLineDash([]);

    // Texto
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "rgba(110, 70, 18, 0.85)";
    c.font = `700 ${Math.round(Math.min(30, w / 10))}px "Cormorant Garamond", Georgia, serif`;
    c.fillText("✦ Rasca aquí ✦", w / 2, h / 2 - 6);

    c.font = `600 ${Math.round(Math.min(12, w / 26))}px Inter, Arial, sans-serif`;
    c.fillStyle = "rgba(110, 70, 18, 0.7)";
    c.fillText("TU DESTINO", w / 2, h / 2 + 24);
}


function descubrirDestino(paso, revelacion) {

    paso.classList.remove("por-rascar");

    const caja =
        paso.querySelector(".rasca");

    caja?.classList.add("descubierta");
    caja?.querySelector(".rasca-premio")?.removeAttribute("aria-hidden");

    const titulo =
        caja?.querySelector(".gift-destination");

    titulo?.setAttribute("aria-label", revelacion.destino || "");

    const icono =
        paso.querySelector("[data-icono-revelacion]");

    if (icono) {
        icono.textContent = revelacion.icono || "✨";
    }

    paso.querySelector(".rasca-pie")?.classList.add("descubierta");
    paso.querySelector(".rasca-antes")?.setAttribute("aria-hidden", "true");
    paso.querySelector("[data-rasca-saltar]")?.setAttribute("tabindex", "-1");

    // La capa dorada se desvanece y luego desaparece
    const capa =
        paso.querySelector(".rasca-capa");

    setTimeout(() => capa?.remove(), 700);

    const despues =
        paso.querySelector(".rasca-despues");

    despues?.removeAttribute("aria-hidden");
    despues?.querySelector("[data-gift-reveal]")?.removeAttribute("tabindex");

    lanzarConfeti();

    setTimeout(
        () => paso.querySelector("[data-gift-reveal]")?.focus({ preventScroll: true }),
        900
    );
}


/* =========================================================
   BILLETE (segunda sorpresa)
   Todos los textos vienen de los datos cifrados.
   ========================================================= */

/*
 * Código de barras decorativo: anchos de barra a partir
 * del texto, siempre iguales para el mismo texto.
 */
function barrasDesdeTexto(texto) {

    const barras = [];

    [...String(texto || "plan")].forEach(caracter => {

        let codigo =
            caracter.charCodeAt(0);

        for (let i = 0; i < 4; i++) {
            barras.push({ ancho: 1 + (codigo % 3), hueco: 1 + ((codigo >> 2) % 2) });
            codigo = Math.floor(codigo / 3) + 7;
        }
    });

    return barras;
}


/*
 * "ancho" de un campo: true o 3 = fila entera, 2 = dos columnas.
 */
function columnasCampo(campo) {
    return campo.ancho === true ? 3 : Math.min(3, Math.max(1, Number(campo.ancho) || 1));
}


function crearBilleteHTML(billete) {

    let x = 0;

    const barras =
        barrasDesdeTexto(billete.codigo_barras)
            .map(barra => {
                const rect = `<rect x="${x}" width="${barra.ancho}" height="40" />`;
                x += barra.ancho + barra.hueco;
                return rect;
            })
            .join("");

    const campos =
        (billete.campos || [])
            .map(campo => `
                <div class="billete-campo" style="grid-column: span ${columnasCampo(campo)}">
                    <span>${escaparHTML(campo.etiqueta)}</span>
                    <strong>${escaparHTML(campo.valor)}</strong>
                </div>
            `)
            .join("");

    const ciudad = lugar => `
        <div class="billete-ciudad">
            <strong>${escaparHTML(lugar?.codigo || "")}</strong>
            <span>${escaparHTML(lugar?.ciudad || "")}</span>
            ${lugar?.hora ? `<em>${escaparHTML(lugar.hora)}</em>` : ""}
        </div>
    `;

    // Ojo: div y no header/footer, para no heredar estilos de la web.
    return `
        <article class="billete" aria-label="${escaparAtributo(billete.titulo || "")}">

            <div class="billete-cabecera">
                <span>${escaparHTML(billete.titulo || "")}</span>
                <span aria-hidden="true">${escaparHTML(billete.icono || "")}</span>
            </div>

            <div class="billete-ruta">

                ${ciudad(billete.origen)}

                <div class="billete-trayecto" aria-hidden="true">
                    <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                        <path d="M 4 26 Q 50 -6 96 26" />
                    </svg>
                    <span class="billete-icono-ruta">${escaparHTML(billete.icono || "")}</span>
                </div>

                ${ciudad(billete.destino)}

            </div>

            <div class="billete-campos">${campos}</div>

            <div class="billete-corte" aria-hidden="true"></div>

            <div class="billete-pie">
                <svg class="billete-barras" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true">
                    ${barras}
                </svg>
                <p>${escaparHTML(billete.nota || "")}</p>
            </div>

        </article>
    `;
}


function mostrarPasoBillete() {

    const billete =
        datosViaje?.billete;

    const paso =
        document.querySelector('#gift-modal [data-step="5"]');

    if (!billete || !paso) {
        revelarViaje();
        return;
    }

    paso.innerHTML = `

        <p class="gift-small">${escaparHTML(billete.intro_pequena || "")}</p>

        <h2>${escaparHTML(billete.intro_titulo || "")}</h2>

        <div class="billete-impresora">
            ${crearBilleteHTML(billete)}
        </div>

        <div class="billete-acciones">

            <button type="button" class="gift-secondary-button" data-guardar-billete>
                ${escaparHTML(billete.boton_guardar || "Guardar")}
            </button>

            <button type="button" class="gift-main-button" data-gift-reveal>
                Ver la escapada
            </button>

        </div>
    `;

    paso
        .querySelector("[data-guardar-billete]")
        .addEventListener("click", () => guardarBillete(billete));

    paso
        .querySelector("[data-gift-reveal]")
        .addEventListener("click", revelarViaje);

    mostrarPasoRegalo(5);

    setTimeout(lanzarConfeti, 1600);
}


/*
 * Ver el billete otra vez desde el plan (Inicio).
 */
function abrirBilleteSuelto() {

    const billete =
        datosViaje?.billete;

    if (!billete) {
        return;
    }

    document.getElementById("billete-modal")?.remove();

    const modal =
        document.createElement("div");

    modal.id = "billete-modal";
    modal.className = "gift-modal visible";

    modal.innerHTML = `
        <div class="gift-modal-overlay" data-cerrar-billete></div>

        <div class="gift-modal-content billete-suelto" role="dialog" aria-modal="true"
             aria-label="${escaparAtributo(billete.titulo || "")}">

            <div class="billete-impresora">
                ${crearBilleteHTML(billete)}
            </div>

            <div class="billete-acciones">
                <button type="button" class="gift-secondary-button" data-guardar-billete>
                    ${escaparHTML(billete.boton_guardar || "Guardar")}
                </button>
                <button type="button" class="gift-main-button" data-cerrar-billete>
                    Cerrar
                </button>
            </div>

        </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add("gift-open");

    const cerrar = () => {
        modal.remove();
        document.body.classList.remove("gift-open");
        document.removeEventListener("keydown", alPulsarTecla);
    };

    const alPulsarTecla = event => {
        if (event.key === "Escape") {
            cerrar();
        }
    };

    modal
        .querySelectorAll("[data-cerrar-billete]")
        .forEach(elemento => elemento.addEventListener("click", cerrar));

    modal
        .querySelector("[data-guardar-billete]")
        .addEventListener("click", () => guardarBillete(billete));

    document.addEventListener("keydown", alPulsarTecla);

    modal.querySelector("[data-cerrar-billete].gift-main-button")?.focus();
}


function colocarBotonBillete() {

    const billete =
        datosViaje?.billete;

    const destino =
        document.getElementById("trip-info");

    if (!billete || !destino || document.getElementById("abrir-billete")) {
        return;
    }

    const boton =
        document.createElement("button");

    boton.type = "button";
    boton.id = "abrir-billete";
    boton.className = "billete-abrir";
    boton.textContent = billete.boton_abrir || "Ver billete";
    boton.addEventListener("click", abrirBilleteSuelto);

    destino.insertAdjacentElement("afterend", boton);
}


/*
 * Guardar el billete como imagen: lo dibujamos en un canvas
 * y lo compartimos (en el móvil sale "Guardar imagen") o,
 * si no se puede, se descarga.
 */
async function guardarBillete(billete) {

    try {
        await document.fonts?.ready;
    } catch (error) {
        // Sin fuentes web: usamos las del sistema.
    }

    // Formato vertical de móvil (9:16)
    const W = 1080;
    const H = 1920;

    const lienzo =
        document.createElement("canvas");

    lienzo.width = W;
    lienzo.height = H;

    const c =
        lienzo.getContext("2d");

    const serif = '"Cormorant Garamond", Georgia, serif';
    const sans = 'Inter, "Helvetica Neue", Arial, sans-serif';

    const colores = {
        fondo1: "#231a3d",
        fondo2: "#15122a",
        papel: "#fffdf8",
        primario: "#8f4f3a",
        texto: "#292621",
        suave: "#756f67",
        borde: "#e5ded2"
    };

    const redondeado = (x, y, w, h, r) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    };

    // Fondo de noche
    const degradado = c.createLinearGradient(0, 0, 0, H);
    degradado.addColorStop(0, colores.fondo1);
    degradado.addColorStop(1, colores.fondo2);
    c.fillStyle = degradado;
    c.fillRect(0, 0, W, H);

    // Estrellitas
    c.fillStyle = "rgba(255, 246, 232, 0.7)";
    for (let i = 0; i < 90; i++) {
        const sx = (i * 137.5) % W;
        const sy = (i * 89.3) % H;
        c.fillRect(sx, sy, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
    }

    // Cuántas filas de campos hay (rejilla de 3 columnas)
    let filas = 0;
    let enFila = 3;
    (billete.campos || []).forEach(campo => {
        const columnas = columnasCampo(campo);
        if (enFila + columnas > 3) {
            filas++;
            enFila = 0;
        }
        enFila += columnas;
    });

    // El billete mide lo que necesita y va centrado
    const bw = W - 180;
    const bh = 570 + filas * 150 + 10 + 290;
    const bx = 90;
    const by = Math.round((H - bh) / 2);

    // Reduce la letra hasta que el texto quepa en su hueco
    const ajustar = (texto, peso, tamano, familia, maximo) => {
        let t = tamano;
        do {
            c.font = `${peso} ${t}px ${familia}`;
            t -= 2;
        } while (c.measureText(texto).width > maximo && t > 30);
    };
    c.save();
    c.shadowColor = "rgba(0, 0, 0, 0.35)";
    c.shadowBlur = 50;
    c.shadowOffsetY = 20;
    redondeado(bx, by, bw, bh, 44);
    c.fillStyle = colores.papel;
    c.fill();
    c.restore();

    // Cabecera
    c.save();
    redondeado(bx, by, bw, bh, 44);
    c.clip();
    c.fillStyle = colores.primario;
    c.fillRect(bx, by, bw, 130);
    c.restore();

    c.fillStyle = "#ffe9c7";
    c.font = `700 34px ${sans}`;
    c.textBaseline = "middle";
    c.textAlign = "left";
    c.fillText((billete.titulo || "").toUpperCase(), bx + 60, by + 65);
    c.textAlign = "right";
    c.font = `56px ${sans}`;
    c.fillText(billete.icono || "", bx + bw - 60, by + 65);

    // Ruta
    const ry = by + 300;
    c.fillStyle = colores.texto;
    c.font = `700 130px ${serif}`;
    c.textAlign = "left";
    c.fillText(billete.origen?.codigo || "", bx + 60, ry);
    c.textAlign = "right";
    c.fillText(billete.destino?.codigo || "", bx + bw - 60, ry);

    c.fillStyle = colores.suave;
    c.font = `500 36px ${sans}`;
    c.textAlign = "left";
    c.fillText(billete.origen?.ciudad || "", bx + 64, ry + 95);
    c.textAlign = "right";
    c.fillText(billete.destino?.ciudad || "", bx + bw - 64, ry + 95);

    c.fillStyle = colores.primario;
    c.font = `700 52px ${serif}`;
    c.textAlign = "left";
    c.fillText(billete.origen?.hora || "", bx + 62, ry + 160);
    c.textAlign = "right";
    c.fillText(billete.destino?.hora || "", bx + bw - 62, ry + 160);

    // Arco punteado con el icono, entre el final de un código y el inicio del otro
    c.font = `700 130px ${serif}`;
    const finOrigen = bx + 60 + c.measureText(billete.origen?.codigo || "").width + 24;
    const inicioDestino = bx + bw - 60 - c.measureText(billete.destino?.codigo || "").width - 24;
    const centroArco = (finOrigen + inicioDestino) / 2;
    c.save();
    c.strokeStyle = colores.primario;
    c.lineWidth = 4;
    c.setLineDash([4, 14]);
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(finOrigen, ry + 10);
    c.quadraticCurveTo(centroArco, ry - 110, inicioDestino, ry + 10);
    c.stroke();
    c.restore();
    c.fillStyle = colores.primario;
    c.font = `60px ${sans}`;
    c.textAlign = "center";
    c.fillText(billete.icono || "", centroArco, ry - 60);

    // Campos en una rejilla de 3 columnas
    const anchoColumna = (bw - 120) / 3;
    let fy = ry + 270;
    let ocupadas = 0;

    (billete.campos || []).forEach(campo => {

        const columnas =
            columnasCampo(campo);

        if (ocupadas + columnas > 3) {
            ocupadas = 0;
            fy += 150;
        }

        const x = bx + 60 + ocupadas * anchoColumna;

        c.textAlign = "left";
        c.fillStyle = colores.suave;
        c.font = `600 28px ${sans}`;
        c.fillText((campo.etiqueta || "").toUpperCase(), x, fy);

        c.fillStyle = colores.texto;
        ajustar(campo.valor || "", 700, columnas === 3 ? 62 : 54, serif, anchoColumna * columnas - 24);
        c.fillText(campo.valor || "", x, fy + 62);

        ocupadas += columnas;
    });

    fy += 150;

    // Línea de corte con muescas
    const cy = by + 570 + filas * 150 + 10;
    c.save();
    c.strokeStyle = colores.borde;
    c.lineWidth = 4;
    c.setLineDash([16, 14]);
    c.beginPath();
    c.moveTo(bx + 50, cy);
    c.lineTo(bx + bw - 50, cy);
    c.stroke();
    c.restore();
    c.fillStyle = colores.fondo2;
    c.beginPath(); c.arc(bx, cy, 34, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(bx + bw, cy, 34, 0, Math.PI * 2); c.fill();

    // Código de barras
    const barras = barrasDesdeTexto(billete.codigo_barras);
    const total = barras.reduce((suma, b) => suma + b.ancho + b.hueco, 0);
    const escala = (bw - 160) / total;
    let x = bx + 80;
    c.fillStyle = colores.texto;
    barras.forEach(barra => {
        c.fillRect(x, cy + 60, barra.ancho * escala, 110);
        x += (barra.ancho + barra.hueco) * escala;
    });

    c.fillStyle = colores.suave;
    c.font = `italic 600 40px ${serif}`;
    c.textAlign = "center";
    c.fillText(billete.nota || "", W / 2, cy + 230);

    const blob =
        await new Promise(resolve => lienzo.toBlob(resolve, "image/png"));

    if (!blob) {
        return;
    }

    const nombre =
        billete.archivo || "billete.png";

    const archivo =
        new File([blob], nombre, { type: "image/png" });

    try {

        if (navigator.canShare?.({ files: [archivo] })) {
            await navigator.share({ files: [archivo], title: billete.titulo || "" });
            return;
        }

    } catch (error) {
        if (error?.name === "AbortError") {
            return;
        }
    }

    const enlace =
        document.createElement("a");

    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
}


async function revelarViaje() {

    abrirViaje();

    const modal =
        document.getElementById("gift-modal");

    if (modal) {

        modal.classList.remove("visible");
        modal.classList.add("closing");

        setTimeout(() => {

            modal.remove();

            document.body.classList.remove("gift-open");

            document.removeEventListener("keydown", manejarEscapeModal);

        }, 500);
    }
}


/* =========================================================
   CARGA DE DATOS
   ========================================================= */

/*
 * Base64 <-> bytes
 */
function aBase64(bytes) {

    let binario = "";

    bytes.forEach(byte => {
        binario += String.fromCharCode(byte);
    });

    return btoa(binario);
}

function deBase64(texto) {
    return Uint8Array.from(atob(texto), caracter => caracter.charCodeAt(0));
}

function textoDeBase64(texto) {
    return new TextDecoder().decode(deBase64(texto));
}


/*
 * Igual que en tools/cifrar.mjs: sin mayúsculas, tildes
 * ni espacios de sobra.
 */
function normalizarPalabra(palabra) {

    return String(palabra || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}


/*
 * Descarga el plan cifrado y lo abre con la palabra
 * secreta (o con la llave ya guardada en este móvil).
 * Devuelve los datos y la llave para guardarla.
 */
async function descifrarSorpresa({ palabra, llaveGuardada }) {

    if (!window.crypto?.subtle) {
        throw new Error("Este navegador no permite abrir el regalo (hace falta https).");
    }

    const respuesta =
        await fetch(CONFIG.archivoSorpresa, { cache: "no-cache" });

    if (!respuesta.ok) {
        throw new Error(`Error HTTP ${respuesta.status}`);
    }

    const paquete =
        await respuesta.json();

    let clave;

    if (llaveGuardada) {

        clave = await crypto.subtle.importKey(
            "raw",
            deBase64(llaveGuardada),
            "AES-GCM",
            true,
            ["decrypt"]
        );

    } else {

        const base = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(normalizarPalabra(palabra)),
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        clave = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                hash: "SHA-256",
                salt: deBase64(paquete.sal),
                iterations: paquete.iteraciones
            },
            base,
            { name: "AES-GCM", length: 256 },
            true,
            ["decrypt"]
        );
    }

    // Si la palabra no es la buena, esto lanza OperationError.
    const descifrado = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: deBase64(paquete.iv) },
        clave,
        deBase64(paquete.datos)
    );

    const llave =
        aBase64(new Uint8Array(await crypto.subtle.exportKey("raw", clave)));

    return {
        datos: JSON.parse(new TextDecoder().decode(descifrado)),
        llave
    };
}


async function abrirConLlaveGuardada() {

    const llave =
        localStorage.getItem(CONFIG.storage.llave);

    if (!llave) {
        return false;
    }

    try {

        const { datos } =
            await descifrarSorpresa({ llaveGuardada: llave });

        prepararDatosViaje(datos);

        abrirViaje();

        return true;

    } catch (error) {

        console.warn("No se ha podido abrir con la llave guardada:", error);

        // Si es un fallo de red no borramos la llave.
        if (error?.name === "OperationError") {
            localStorage.removeItem(CONFIG.storage.llave);
        }

        return false;
    }
}


function prepararDatosViaje(datos) {

    const imagen =
        datos.imagen_hero;

    delete datos.imagen_hero;

    datosViaje = datos;

    if (imagen) {
        document.documentElement.style.setProperty(
            "--imagen-viaje",
            `url("${imagen}")`
        );
    }

    if (datos.revelacion?.titulo_pagina) {
        document.title = datos.revelacion.titulo_pagina;
    }
}


function abrirViaje() {

    saltarA(0);

    if (intervaloCuentaAtras) {
        clearInterval(intervaloCuentaAtras);
        intervaloCuentaAtras = null;
    }

    document.body.classList.remove("modo-apertura");

    // Barra del navegador en terracota, como el plan
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#8f4f3a");

    const pistas =
        document.getElementById("pistas");

    if (pistas) {
        pistas.hidden = true;
    }

    const enlaceBajar =
        document.querySelector("[data-hero-scroll]");

    if (enlaceBajar) {
        enlaceBajar.hidden = true;
    }

    renderizarAplicacion();

    colocarBotonBillete();

    activarViajeDesbloqueado();

    // Quitamos la marca de "cargando" cuando el hero ya tiene su
    // tamaño final, para que no se anime su altura
    requestAnimationFrame(() =>
        requestAnimationFrame(() => {

            const raiz =
                document.documentElement;

            // Volvía con la llave: la página entra con un fundido
            if (raiz.classList.contains("con-llave")) {
                document.body.classList.add("entrada-suave");
                raiz.classList.remove("con-llave");
            }
        })
    );
}


/* =========================================================
   VIAJE DESBLOQUEADO
   ========================================================= */

function activarViajeDesbloqueado() {


    document.body.classList.add(
        "viaje-desbloqueado"
    );

    const waitingScreen =
        document.getElementById(
            "waiting-screen"
        );

    const content =
        document.getElementById(
            "content"
        );

    const loading =
        document.getElementById(
            "loading"
        );

    if (waitingScreen) {
        waitingScreen.hidden = true;
    }

    if (loading) {
        loading.hidden = true;
    }

    if (content) {
        content.hidden = false;
    }

    actualizarHeroViaje();

    mostrarNavegacion();

    // Si recarga estando en una sección (#comer…), se queda en ella
    const desdeEnlace =
        window.location.hash.replace("#", "");

    const existe =
        desdeEnlace && document.getElementById(`page-${desdeEnlace}`);

    mostrarPagina(
        existe ? desdeEnlace : "inicio"
    );
}


/* =========================================================
   HERO - VIAJE
   ========================================================= */

function actualizarHeroViaje() {

    const hero =
        document.getElementById(
            "hero"
        );

    const eyebrow =
        document.querySelector(
            ".hero-eyebrow"
        );

    const titulo =
        document.querySelector(
            ".hero-title"
        );

    const subtitulo =
        document.querySelector(
            ".hero-subtitle"
        );

    if (eyebrow) {

        eyebrow.textContent =
            "ESCAPADA DE CUMPLEAÑOS";
    }

    const revelacion =
        datosViaje?.revelacion || {};

    if (titulo) {

        titulo.textContent =
            revelacion.destino || "";
    }

    if (subtitulo) {

        subtitulo.textContent =
            revelacion.fechas || "";
    }

    if (hero) {

        hero.classList.add(
            "hero-trip-revealed"
        );
    }

    const countdown =
        document.getElementById(
            "countdown"
        );

    if (countdown) {
        countdown.hidden = true;
    }
}


/* =========================================================
   LOADING
   ========================================================= */

function mostrarLoading() {

    const waitingScreen =
        document.getElementById(
            "waiting-screen"
        );

    const loading =
        document.getElementById(
            "loading"
        );

    const content =
        document.getElementById(
            "content"
        );

    if (waitingScreen) {
        waitingScreen.hidden = true;
    }

    if (content) {
        content.hidden = true;
    }

    if (loading) {
        loading.hidden = false;
    }

    ocultarNavegacion();
}


function mostrarErrorCarga() {

    const loading =
        document.getElementById(
            "loading"
        );

    if (!loading) {
        return;
    }

    loading.hidden = false;

    loading.innerHTML = `

        <div class="error-card">

            <div class="error-icon">
                😕
            </div>

            <h2>
                Algo ha salido mal
            </h2>

            <p>
                No hemos podido cargar
                el plan del viaje.
            </p>

            <p>
                Comprueba la conexión e inténtalo de nuevo.
            </p>

            <button
                type="button"
                class="gift-main-button"
                id="retry-load"
            >
                Intentar de nuevo
            </button>

        </div>
    `;

    const boton =
        document.getElementById(
            "retry-load"
        );

    if (boton) {

        boton.addEventListener(
            "click",
            () => {

                window.location.reload();
            }
        );
    }
}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function mostrarNavegacion() {

    const nav =
        document.getElementById(
            "main-nav"
        );

    if (nav) {
        nav.hidden = false;
    }
}


function ocultarNavegacion() {

    const nav =
        document.getElementById(
            "main-nav"
        );

    if (nav) {
        nav.hidden = true;
    }
}


function manejarNavegacion(event) {

    event.preventDefault();

    const enlace =
        event.currentTarget;

    /*
     * Tu HTML utiliza data-section.
     */
    const destino =
        enlace.dataset.section ||
        obtenerPaginaDesdeHref(
            enlace.getAttribute(
                "href"
            )
        );

    if (destino) {

        mostrarPagina(
            destino
        );
    }
}


function obtenerPaginaDesdeHref(
    href
) {

    if (!href) {
        return null;
    }

    return href
        .replace("#", "")
        .replace("page-", "");
}


function mostrarPagina(
    nombrePagina
) {

    /*
     * Tu HTML no utiliza .trip-page.
     * Utilizamos data-page, que sí existe.
     */
    const paginas =
        document.querySelectorAll(
            "[data-page]"
        );

    paginas.forEach(
        pagina => {
            pagina.hidden = true;
        }
    );


    const pagina =
        document.getElementById(
            `page-${nombrePagina}`
        );

    if (pagina) {
        pagina.hidden = false;

        animarEntradaPagina(
            pagina
        );
    }


    /*
     * Estado activo del menú.
     */
    const enlaces =
        document.querySelectorAll(
            ".main-nav a"
        );

    enlaces.forEach(
        enlace => {

            const destino =
                enlace.dataset.section ||
                obtenerPaginaDesdeHref(
                    enlace.getAttribute(
                        "href"
                    )
                );

            enlace.classList.toggle(
                "active",
                destino === nombrePagina
            );
        }
    );


    // Recordamos la sección para que al recargar se quede ahí
    try {
        history.replaceState(
            null,
            "",
            nombrePagina === "inicio"
                ? window.location.pathname + window.location.search
                : `#${nombrePagina}`
        );
    } catch (error) {
        // Sin historial (vista previa): no pasa nada
    }

    // Si estaba más abajo, subimos sin animación al principio
    // de la sección (justo debajo del menú), no hasta arriba del todo
    const contenido =
        document.getElementById("content");

    const menu =
        document.getElementById("main-nav");

    if (contenido) {

        const inicioSeccion =
            contenido.getBoundingClientRect().top + window.scrollY - (menu?.offsetHeight || 0);

        if (window.scrollY > inicioSeccion) {
            saltarA(Math.max(0, inicioSeccion));
        }
    }
}


/*
 * Desplazamiento inmediato. La web tiene scroll-behavior: smooth
 * en CSS, así que hay que desactivarlo un instante.
 */
function saltarA(posicion) {

    const raiz =
        document.documentElement;

    const anterior =
        raiz.style.scrollBehavior;

    raiz.style.scrollBehavior = "auto";
    window.scrollTo(0, posicion);
    raiz.style.scrollBehavior = anterior;
}


function animarEntradaPagina(pagina) {

    pagina.classList.remove(
        "page-enter"
    );

    requestAnimationFrame(() => {

        pagina.classList.add(
            "page-enter"
        );
    });
}


/* =========================================================
   RENDER PRINCIPAL
   ========================================================= */

/* =========================================================
   HOTEL
   Todos los nombres y datos vienen de los datos cifrados;
   aquí solo hay maquetación.
   ========================================================= */

function renderizarHotel() {

    const contenedor =
        document.getElementById("hotel-info");

    const hotel =
        datosViaje?.hotel_detalle;

    if (!contenedor || !hotel) {
        return;
    }

    const textos =
        hotel.textos || {};

    const enlaces =
        hotel.enlaces || {};

    const fotos =
        (hotel.fotos || []).filter(foto => foto?.src);

    const flecha = (dir, etiqueta) => `
        <button type="button" class="hotel-flecha ${dir}" data-galeria="${dir}" aria-label="${etiqueta}">
            <span aria-hidden="true">${dir === "anterior" ? "‹" : "›"}</span>
        </button>
    `;

    const galeria =
        fotos.length
            ? `
                <div class="hotel-galeria-marco">

                    <div class="hotel-galeria" tabindex="0" aria-label="Fotos del hotel">
                        ${fotos.map((foto, i) => `
                            <figure class="hotel-foto">
                                <img
                                    src="${escaparAtributo(foto.src)}"
                                    alt="${escaparAtributo(foto.alt || foto.texto || "")}"
                                    style="object-position: ${escaparAtributo(foto.posicion || "center")}"
                                    ${i > 0 ? 'loading="lazy"' : ""}
                                >
                                ${foto.texto ? `<figcaption>${escaparHTML(foto.texto)}</figcaption>` : ""}
                            </figure>
                        `).join("")}
                    </div>

                    ${fotos.length > 1 ? flecha("anterior", "Foto anterior") + flecha("siguiente", "Foto siguiente") : ""}

                    ${fotos.length > 1 ? `<span class="hotel-contador"><b>1</b> / ${fotos.length}</span>` : ""}

                </div>

                ${
                    fotos.length > 1
                        ? `<div class="hotel-puntos">
                               ${fotos.map((foto, i) => `
                                   <button type="button" data-ir-foto="${i}" aria-label="Foto ${i + 1}"${i === 0 ? ' class="activo"' : ""}></button>
                               `).join("")}
                           </div>`
                        : ""
                }
            `
            : "";

    const boton = (url, texto, clase) =>
        url
            ? `<a class="${clase}" href="${escaparAtributo(url)}" target="_blank" rel="noopener noreferrer">${escaparHTML(texto || "")}</a>`
            : "";

    contenedor.innerHTML = `

        <div class="section-header hotel-header">
            <span class="section-eyebrow">${escaparHTML(hotel.eyebrow || "")}</span>
            <h2>${escaparHTML(hotel.nombre || "")}</h2>
            <p>${escaparHTML(hotel.descripcion || "")}</p>
        </div>

        ${galeria}

        <div class="hotel-tarjeta">

            <div class="hotel-mapa" data-mapa>
                <a class="hotel-mapa-aviso" href="${escaparAtributo(enlaces.maps || "#")}" target="_blank" rel="noopener noreferrer">
                    <span aria-hidden="true">📍</span>
                    <span data-mapa-texto>${escaparHTML(textos.maps || "")}</span>
                </a>
            </div>

            <div class="hotel-datos">

                <p class="hotel-direccion">📍 ${escaparHTML(hotel.direccion || "")}</p>

                <h3 class="hotel-subtitulo">${escaparHTML(textos.a_pie || "")}</h3>

                <ul class="hotel-a-pie">
                    ${(hotel.a_pie || []).map(lugar => `
                        <li>
                            <span aria-hidden="true">${escaparHTML(lugar.icono || "")}</span>
                            <strong>${escaparHTML(lugar.lugar || "")}</strong>
                            <em>${escaparHTML(String(lugar.minutos ?? ""))} min</em>
                        </li>
                    `).join("")}
                </ul>

                <div class="hotel-horarios">
                    ${(hotel.horarios || []).map(h => `
                        <div>
                            <span aria-hidden="true">${escaparHTML(h.icono || "")}</span>
                            <small>${escaparHTML(h.etiqueta || "")}</small>
                            <strong>${escaparHTML(h.valor || "")}</strong>
                        </div>
                    `).join("")}
                </div>

                <div class="hotel-botones">
                    ${boton(enlaces.como_llegar, textos.como_llegar, "hotel-boton principal")}
                    ${boton(enlaces.maps, textos.maps, "hotel-boton")}
                    ${boton(enlaces.web, textos.web, "hotel-boton")}
                </div>

            </div>

        </div>
    `;

    contenedor.hidden = false;


    /*
     * Google Maps dentro de la tarjeta. Sin conexión dejamos
     * el aviso con el enlace en lugar de un mapa roto.
     */
    const cajaMapa =
        contenedor.querySelector("[data-mapa]");

    const ponerMapa = () => {

        if (!enlaces.mapa_embed || cajaMapa.querySelector("iframe")) {
            return;
        }

        if (!navigator.onLine) {
            cajaMapa.querySelector("[data-mapa-texto]").textContent =
                textos.mapa_offline || "";
            return;
        }

        cajaMapa.insertAdjacentHTML("beforeend", `
            <iframe
                src="${escaparAtributo(enlaces.mapa_embed)}"
                title="${escaparAtributo(hotel.nombre || "")}"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen
            ></iframe>
        `);
    };

    ponerMapa();
    window.addEventListener("online", ponerMapa, { once: true });


    /*
     * Galería: flechas, puntos y contador
     */
    const galeriaEl =
        contenedor.querySelector(".hotel-galeria");

    if (galeriaEl && fotos.length > 1) {

        const puntos =
            contenedor.querySelectorAll("[data-ir-foto]");

        const contador =
            contenedor.querySelector(".hotel-contador b");

        const indiceActual = () =>
            Math.round(galeriaEl.scrollLeft / galeriaEl.clientWidth);

        const irA = indice => {

            const destino =
                (indice + fotos.length) % fotos.length;

            const reducir =
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            galeriaEl.scrollTo({
                left: destino * galeriaEl.clientWidth,
                behavior: reducir ? "auto" : "smooth"
            });
        };

        galeriaEl.addEventListener("scroll", () => {

            const indice =
                indiceActual();

            puntos.forEach((punto, i) => punto.classList.toggle("activo", i === indice));

            if (contador) {
                contador.textContent = indice + 1;
            }

        }, { passive: true });

        contenedor
            .querySelector('[data-galeria="anterior"]')
            .addEventListener("click", () => irA(indiceActual() - 1));

        contenedor
            .querySelector('[data-galeria="siguiente"]')
            .addEventListener("click", () => irA(indiceActual() + 1));

        puntos.forEach(punto =>
            punto.addEventListener("click", () => irA(Number(punto.dataset.irFoto)))
        );

        galeriaEl.addEventListener("keydown", event => {

            if (event.key === "ArrowLeft") {
                event.preventDefault();
                irA(indiceActual() - 1);
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                irA(indiceActual() + 1);
            }
        });
    }


    /*
     * La tarjeta del hotel de arriba lleva hasta aquí
     */
    const tarjeta =
        document.querySelector("[data-viaje-hotel]")?.closest(".ficha-tramo, .trip-card");

    if (tarjeta && !tarjeta.dataset.enlazada) {

        tarjeta.dataset.enlazada = "true";
        tarjeta.classList.add("trip-card-enlace");
        tarjeta.setAttribute("role", "button");
        tarjeta.setAttribute("tabindex", "0");

        const irAlHotel = () =>
            contenedor.scrollIntoView({ behavior: "smooth", block: "start" });

        tarjeta.addEventListener("click", irAlHotel);
        tarjeta.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                irAlHotel();
            }
        });
    }
}


/* =========================================================
   MODO "HOY"
   Antes del viaje: cuenta atrás. Durante: qué toca ahora.
   ========================================================= */

let intervaloHoy = null;

// Diciembre: hora de invierno (UTC+1) en todo el viaje.
const ZONA_VIAJE = "+01:00";


function momentoActividad(fecha, hora) {

    if (!fecha || !/^\d{1,2}:\d{2}$/.test(hora || "")) {
        return null;
    }

    const [h, m] = hora.split(":");

    return new Date(`${fecha}T${h.padStart(2, "0")}:${m}:00${ZONA_VIAJE}`);
}


/*
 * "≈ 2 h 30 min" -> 150, "45 min" -> 45, "—" -> 0
 */
function minutosDeDuracion(texto) {

    const horas = /(\d+)\s*h/.exec(texto || "");
    const minutos = /(\d+)\s*min/.exec(texto || "");

    return (horas ? Number(horas[1]) * 60 : 0) + (minutos ? Number(minutos[1]) : 0);
}


function textoDentroDe(minutos) {

    if (minutos < 1) {
        return "ya";
    }

    if (minutos < 60) {
        return `en ${minutos} min`;
    }

    const h = Math.floor(minutos / 60);
    const m = minutos % 60;

    return m ? `en ${h} h ${m} min` : `en ${h} h`;
}


/*
 * Actividades de un día con su inicio y su fin.
 */
function actividadesConHorario(dia) {

    const lista =
        (dia?.actividades || [])
            .filter(actividad => typeof actividad === "object")
            .map(actividad => ({
                ...actividad,
                inicio: momentoActividad(dia.fecha, actividad.hora)
            }))
            .filter(actividad => actividad.inicio);

    lista.forEach((actividad, i) => {

        const siguiente =
            lista[i + 1]?.inicio;

        const duracion =
            minutosDeDuracion(actividad.duracion);

        if (duracion) {

            // Termina al acabar su duración (o antes, si empieza la siguiente)
            const porDuracion =
                new Date(actividad.inicio.getTime() + duracion * 60000);

            actividad.fin =
                siguiente && siguiente < porDuracion ? siguiente : porDuracion;

        } else {

            // Sin duración: hasta la siguiente, o una hora si es la última
            actividad.fin =
                siguiente || new Date(actividad.inicio.getTime() + 3600000);
        }
    });

    return lista;
}


function filaActividadHoy(actividad, etiqueta, extra) {

    const mapa =
        actividad.google_maps
            ? `<a class="hoy-mapa" href="${escaparAtributo(actividad.google_maps)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir en Maps">📍</a>`
            : "";

    return `
        <li class="hoy-fila${etiqueta === "Ahora" ? " ahora" : ""}">
            <span class="hoy-icono" aria-hidden="true">${escaparHTML(obtenerIconoActividad(actividad.tipo))}</span>
            <div class="hoy-texto">
                <small>
                    ${escaparHTML(etiqueta)}
                    ${extra ? `<b>${escaparHTML(extra)}</b>` : ""}
                </small>
                <strong>${escaparHTML(actividad.titulo || "")}</strong>
                ${actividad.ubicacion ? `<span>${escaparHTML(actividad.ubicacion)}</span>` : ""}
            </div>
            <span class="hoy-hora">${escaparHTML(actividad.hora || "")}</span>
            ${mapa}
        </li>
    `;
}


function renderizarHoy() {

    const contenedor =
        document.getElementById("next-plan");

    const itinerario =
        datosViaje?.viaje?.itinerario || [];

    if (!contenedor || !itinerario.length) {
        return;
    }

    const momento =
        ahora();

    const dias =
        itinerario.map(dia => ({ ...dia, actividadesHorario: actividadesConHorario(dia) }));

    const primera =
        dias[0].actividadesHorario[0];

    const ultimoDia =
        dias[dias.length - 1];

    const finViaje =
        ultimoDia.actividadesHorario.at(-1)?.fin ||
        new Date(`${ultimoDia.fecha}T23:59:00${ZONA_VIAJE}`);

    const diaEnZona = fecha =>
        fecha.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

    const hoyTexto =
        diaEnZona(momento);


    // Después del viaje: nada
    if (momento > finViaje) {
        contenedor.hidden = true;
        return;
    }


    // ---------- Antes del viaje ----------
    if (primera && momento < primera.inicio) {

        const diasQueFaltan =
            Math.round(
                (Date.parse(dias[0].fecha) - Date.parse(hoyTexto)) / 86400000
            );

        const titular =
            diasQueFaltan <= 0
                ? "¡Hoy nos vamos!"
                : diasQueFaltan === 1
                    ? "¡Mañana nos vamos!"
                    : `Nos vamos en ${diasQueFaltan} días`;

        const diaSemana =
            primera.inicio.toLocaleDateString("es-ES", {
                weekday: "long", day: "numeric", timeZone: "Europe/Madrid"
            });

        contenedor.innerHTML = `
            <article class="hoy hoy-antes">
                <span class="hoy-eyebrow">✨ Cuenta atrás</span>
                <h3>${escaparHTML(titular)}</h3>
                ${
                    diasQueFaltan > 0
                        ? `<div class="hoy-dias" aria-hidden="true">
                               ${Array.from({ length: Math.min(diasQueFaltan, 14) }, () => "<span></span>").join("")}
                               ${diasQueFaltan > 14 ? `<em>+${diasQueFaltan - 14}</em>` : ""}
                           </div>`
                        : ""
                }
                <ul class="hoy-lista">
                    ${filaActividadHoy(primera, "Primera parada", diaSemana)}
                </ul>
            </article>
        `;

        contenedor.hidden = false;
        return;
    }


    // ---------- Durante el viaje ----------
    let indiceDia =
        dias.findIndex(dia => dia.fecha === hoyTexto);

    if (indiceDia === -1) {
        indiceDia = 0;
    }

    const dia =
        dias[indiceDia];

    const lista =
        dia.actividadesHorario;

    const actual =
        lista.find(a => a.inicio <= momento && momento < a.fin);

    const proximas =
        lista.filter(a => a.inicio > momento).slice(0, actual ? 2 : 3);

    let filas = "";

    if (actual) {
        filas += filaActividadHoy(actual, "Ahora", `hasta las ${actual.fin.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}`);
    }

    proximas.forEach((actividad, i) => {

        const minutos =
            Math.round((actividad.inicio - momento) / 60000);

        filas += filaActividadHoy(
            actividad,
            i === 0 ? "Siguiente" : "Después",
            i === 0 ? textoDentroDe(minutos) : ""
        );
    });

    // Se acabó el día: adelanto de mañana
    const manana =
        dias[indiceDia + 1];

    if (!actual && !proximas.length && manana?.actividadesHorario[0]) {
        filas += filaActividadHoy(manana.actividadesHorario[0], "Mañana", manana.titulo || "");
    }

    if (!filas) {
        contenedor.hidden = true;
        return;
    }

    // De noche, cuando solo queda el adelanto de mañana, el enlace lleva a mañana
    const diaEnlace =
        !actual && !proximas.length && manana ? manana : dia;

    const fechaBonita =
        new Date(`${dia.fecha}T12:00:00${ZONA_VIAJE}`)
            .toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

    contenedor.innerHTML = `
        <article class="hoy hoy-durante">
            <span class="hoy-eyebrow">
                <i class="hoy-directo" aria-hidden="true"></i>
                Hoy · ${escaparHTML(fechaBonita)}
            </span>
            <h3>${escaparHTML(dia.titulo || "")}</h3>
            <ul class="hoy-lista">${filas}</ul>
            <button type="button" class="hoy-ver-dia" data-ver-dia="${escaparAtributo(String(diaEnlace.numero || indiceDia + 1))}">
                ${diaEnlace === dia ? "Ver todo el día →" : "Ver el plan de mañana →"}
            </button>
        </article>
    `;

    contenedor.hidden = false;

    contenedor
        .querySelector("[data-ver-dia]")
        .addEventListener("click", event => abrirDiaItinerario(event.currentTarget.dataset.verDia));
}


function abrirDiaItinerario(numero) {

    mostrarPagina("itinerario");

    const boton =
        document.querySelector(`.itinerary-day-toggle[aria-controls="itinerary-day-${CSS.escape(numero)}"]`);

    if (!boton) {
        return;
    }

    if (boton.getAttribute("aria-expanded") !== "true") {
        boton.click();
    }

    setTimeout(
        () => boton.scrollIntoView({ behavior: "smooth", block: "start" }),
        120
    );
}


function iniciarModoHoy() {

    renderizarHoy();

    clearInterval(intervaloHoy);

    // Se actualiza cada minuto ("en 25 min", "Ahora"…)
    intervaloHoy = setInterval(renderizarHoy, 60000);
}


function renderizarAplicacion() {

    if (!datosViaje) {
        return;
    }

    renderizarDatosGenerales();

    renderizarHotel();

    iniciarModoHoy();

    renderizarRestaurantes();

    renderizarItinerario();

    renderizarChecklist();
}


/* =========================================================
   DATOS GENERALES
   ========================================================= */

function renderizarDatosGenerales() {

    const viaje =
        datosViaje.viaje || {};

    const destino =
        viaje.destino ||
        "";

    const fechas =
        viaje.fechas ||
        {};

    const hotel =
        viaje.hotel ||
        {};


    /*
     * DESTINO
     */
    const destinoElemento =
        document.querySelector(
            "[data-viaje-destino]"
        );

    if (destinoElemento) {

        destinoElemento.textContent =
            destino;
    }


    /*
     * FECHAS
     */
    const fechasElemento =
        document.querySelector(
            "[data-viaje-fechas]"
        );

    const inicioObj =
        crearFechaLocal(fechas.inicio);

    const finObj =
        crearFechaLocal(fechas.fin);

    if (fechasElemento && inicioObj && finObj) {

        fechasElemento.textContent =
            formatearRangoFechas(
                inicioObj,
                finObj
            );
    }


    /*
     * Detalle: "3 noches · de viernes a lunes"
     */
    const detalleFechas =
        document.querySelector(
            "[data-viaje-fechas-detalle]"
        );

    if (detalleFechas && inicioObj && finObj) {

        const noches =
            fechas.noches ||
            Math.round(
                (finObj - inicioObj) / 86400000
            );

        const diaSemana = fecha =>
            fecha.toLocaleDateString(
                "es-ES",
                { weekday: "long" }
            );

        detalleFechas.textContent =
            `${noches} ${noches === 1 ? "noche" : "noches"} · ` +
            `de ${diaSemana(inicioObj)} a ${diaSemana(finObj)}`;
    }


    /*
     * Mini calendario del icono
     */
    const mesElemento =
        document.querySelector(
            "[data-viaje-mes]"
        );

    const diaElemento =
        document.querySelector(
            "[data-viaje-dia]"
        );

    if (inicioObj && mesElemento && diaElemento) {

        mesElemento.textContent =
            inicioObj
                .toLocaleDateString(
                    "es-ES",
                    { month: "short" }
                )
                .replace(".", "");

        diaElemento.textContent =
            inicioObj.getDate();
    }


    /*
     * HOTEL
     */
    const hotelElemento =
        document.querySelector(
            "[data-viaje-hotel]"
        );

    if (hotelElemento) {

        const hotelNombre =
            typeof hotel === "string"
                ? hotel
                : hotel.nombre;

        hotelElemento.textContent =
            hotelNombre ||
            "";
    }


    const destinoTexto =
        document.querySelector("[data-viaje-destino-texto]");

    if (destinoTexto && datosViaje.revelacion?.destino_texto) {
        destinoTexto.textContent =
            datosViaje.revelacion.destino_texto;
    }


    const hotelTexto =
        document.querySelector("[data-viaje-hotel-texto]");

    if (hotelTexto && datosViaje.revelacion?.hotel_texto) {
        hotelTexto.textContent =
            datosViaje.revelacion.hotel_texto;
    }
}


/*
 * "2026-12-18" -> Date a mediodía local
 * (evita saltos de día por la zona horaria).
 */
function crearFechaLocal(fecha) {

    if (!fecha) {
        return null;
    }

    const fechaObj =
        new Date(`${fecha}T12:00:00`);

    return Number.isNaN(fechaObj.getTime())
        ? null
        : fechaObj;
}


/*
 * Mismo mes:      "18 – 21 de diciembre"
 * Distinto mes:   "30 de diciembre – 2 de enero"
 */
function formatearRangoFechas(inicio, fin) {

    const mes = fecha =>
        fecha.toLocaleDateString(
            "es-ES",
            { month: "long" }
        );

    if (
        inicio.getMonth() === fin.getMonth() &&
        inicio.getFullYear() === fin.getFullYear()
    ) {
        return `${inicio.getDate()} – ${fin.getDate()} de ${mes(fin)}`;
    }

    return `${inicio.getDate()} de ${mes(inicio)} – ` +
        `${fin.getDate()} de ${mes(fin)}`;
}


function formatearFecha(
    fecha
) {

    if (!fecha) {
        return "";
    }

    const fechaObj =
        new Date(
            `${fecha}T12:00:00`
        );

    if (
        Number.isNaN(
            fechaObj.getTime()
        )
    ) {
        return fecha;
    }

    return fechaObj.toLocaleDateString(
        "es-ES",
        {
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


/* =========================================================
   RESTAURANTES
   ========================================================= */

function prepararRestaurantes() {

    const gastronomia =
        datosViaje?.guia_gastronomica;

    if (!gastronomia) {
        return [];
    }

    const restaurantes = [];


    /*
     * RESTAURANTES DESTACADOS
     */
    if (
        Array.isArray(
            gastronomia.restaurantes_destacados
        )
    ) {

        gastronomia.restaurantes_destacados
            .forEach(restaurante => {

                restaurantes.push({

                    ...restaurante,

                    categoriaFiltro:
                        obtenerCategoriaRestaurante(
                            restaurante,
                            "restaurante"
                        )
                });
            });
    }


    /*
     * STREET FOOD
     *
     * En tu JSON actual está integrado
     * dentro de restaurantes_destacados,
     * pero dejamos este soporte por si
     * posteriormente lo separamos.
     */
    if (
        Array.isArray(
            gastronomia.street_food
        )
    ) {

        gastronomia.street_food
            .forEach(restaurante => {

                restaurantes.push({

                    ...restaurante,

                    categoriaFiltro:
                        "street-food"
                });
            });
    }


    /*
     * APERITIVO
     */
    if (
        Array.isArray(
            gastronomia.aperitivo
        )
    ) {

        gastronomia.aperitivo
            .forEach(restaurante => {

                restaurantes.push({

                    ...restaurante,

                    categoriaFiltro:
                        "aperitivo"
                });
            });
    }


    /*
     * DESAYUNOS
     */
    if (
        Array.isArray(
            gastronomia.desayunos
        )
    ) {

        gastronomia.desayunos
            .forEach(restaurante => {

                restaurantes.push({

                    ...restaurante,

                    categoriaFiltro:
                        "desayuno"
                });
            });
    }


    /*
     * ELIMINAR DUPLICADOS
     */
    const vistos =
        new Set();

    return restaurantes.filter(
        restaurante => {

            const nombre =
                restaurante.nombre;

            if (
                !nombre ||
                vistos.has(nombre)
            ) {
                return false;
            }

            vistos.add(nombre);

            return true;
        }
    );
}


function obtenerCategoriaRestaurante(
    restaurante,
    categoriaPorDefecto
) {

    const categoria = (
        restaurante.categoria ||
        restaurante.tipo ||
        ""
    )
        .toString()
        .toLowerCase();


    if (
        categoria.includes(
            "street"
        ) ||
        categoria.includes(
            "street_food"
        ) ||
        categoria.includes(
            "sandwich"
        ) ||
        categoria.includes(
            "panino"
        )
    ) {
        return "street-food";
    }


    if (
        categoria.includes(
            "aperitivo"
        ) ||
        categoria.includes(
            "bar"
        )
    ) {
        return "aperitivo";
    }


    if (
        categoria.includes(
            "desayuno"
        ) ||
        categoria.includes(
            "breakfast"
        ) ||
        categoria.includes(
            "café"
        ) ||
        categoria.includes(
            "cafe"
        )
    ) {
        return "desayuno";
    }


    if (
        categoria.includes(
            "helad"
        )
    ) {
        return "helado";
    }


    return categoriaPorDefecto;
}


/* =========================================================
   FILTROS RESTAURANTES
   ========================================================= */

function configurarFiltrosRestaurantes() {

    const filtros =
        document.querySelectorAll(
            "[data-restaurant-filter]"
        );

    if (!filtros.length) {
        return;
    }

    filtros.forEach(
        filtro => {

            filtro.addEventListener(
                "click",
                () => {

                    const categoria =
                        filtro.dataset
                            .restaurantFilter;

                    filtroRestauranteActual =
                        categoria;


                    filtros.forEach(
                        elemento => {

                            elemento.classList.toggle(
                                "active",
                                elemento === filtro
                            );
                        }
                    );


                    renderizarRestaurantesFiltrados();
                }
            );
        }
    );
}


function renderizarRestaurantesFiltrados() {

    const contenedor =
        document.getElementById(
            "restaurant-list"
        );

    if (!contenedor) {
        return;
    }


    let restaurantes =
        restaurantesCompletos;


    if (
        filtroRestauranteActual !==
        "todos"
    ) {

        restaurantes =
            restaurantesCompletos.filter(
                restaurante =>
                    restaurante.categoriaFiltro ===
                    filtroRestauranteActual
            );
    }


    contenedor.innerHTML = "";


    if (!restaurantes.length) {

        contenedor.innerHTML = `

            <div class="empty-state">

                <span>
                    🍝
                </span>

                <h3>
                    Aún no tenemos sitios aquí
                </h3>

                <p>
                    Pronto añadiremos nuestras
                    recomendaciones.
                </p>

            </div>
        `;

        actualizarContadorRestaurantes(
            0
        );

        return;
    }


    restaurantes.forEach(
        restaurante => {

            contenedor.appendChild(
                crearTarjetaRestaurante(
                    restaurante
                )
            );
        }
    );


    actualizarContadorRestaurantes(
        restaurantes.length
    );
}


function actualizarContadorRestaurantes(
    cantidad
) {

    const elemento =
        document.getElementById(
            "restaurant-results-info"
        );

    if (!elemento) {
        return;
    }

    const palabra =
        cantidad === 1
            ? "sitio"
            : "sitios";

    elemento.innerHTML = `
        <span>
            ${cantidad}
            ${palabra}
            seleccionado${cantidad === 1 ? "" : "s"}
        </span>
    `;
}


function renderizarRestaurantes() {

    const contenedor =
        document.getElementById(
            "restaurant-list"
        );

    if (!contenedor) {
        return;
    }

    restaurantesCompletos =
        prepararRestaurantes();

    filtroRestauranteActual =
        "todos";

    configurarFiltrosRestaurantes();

    renderizarRestaurantesFiltrados();

    renderizarPlanComidas();
}


/* =========================================================
   PLAN DE COMIDAS POR DÍA
   ========================================================= */

const MOMENTOS_COMIDA = [
    { clave: "desayuno", icono: "☕", nombre: "Desayuno" },
    { clave: "comida", icono: "🍝", nombre: "Comida" },
    { clave: "aperitivo", icono: "🥂", nombre: "Aperitivo" },
    { clave: "cena", icono: "🍷", nombre: "Cena" }
];


/*
 * "Sábado" -> "sabado", "L'Ortone" -> "l'ortone"
 */
function normalizarTexto(texto) {

    return String(texto || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}


function renderizarPlanComidas() {

    const contenedor =
        document.getElementById("meal-plan");

    const plan =
        datosViaje?.guia_gastronomica?.plan_comidas;

    if (!contenedor || !plan) {
        return;
    }


    /*
     * Fecha de cada día a partir del itinerario
     * (el plan solo tiene "viernes", "sábado"...).
     */
    const itinerario =
        datosViaje?.viaje?.itinerario || [];

    const dias =
        Object.keys(plan)
            .filter(dia =>
                MOMENTOS_COMIDA.some(
                    momento => (plan[dia]?.[momento.clave] || []).length
                )
            )
            .map(dia => {

                const diaItinerario =
                    itinerario.find(
                        item =>
                            normalizarTexto(item.dia) ===
                            normalizarTexto(dia)
                    );

                return {
                    clave: dia,
                    fecha: crearFechaLocal(diaItinerario?.fecha),
                    comidas: plan[dia]
                };
            });

    if (!dias.length) {
        return;
    }


    /*
     * Si hoy es un día del viaje, abrimos ese día.
     */
    const hoy =
        new Date();

    const esHoy = fecha =>
        fecha &&
        fecha.getFullYear() === hoy.getFullYear() &&
        fecha.getMonth() === hoy.getMonth() &&
        fecha.getDate() === hoy.getDate();

    const indiceInicial =
        Math.max(
            0,
            dias.findIndex(dia => esHoy(dia.fecha))
        );


    const nombresRestaurantes =
        new Set(
            restaurantesCompletos.map(
                restaurante => normalizarTexto(restaurante.nombre)
            )
        );


    const etiquetaDia = dia => {

        const nombre =
            dia.clave.charAt(0).toUpperCase() +
            dia.clave.slice(1, 3);

        return dia.fecha
            ? `${nombre} ${dia.fecha.getDate()}`
            : nombre;
    };


    const crearChip = (sitio, indice) => {

        const enLista =
            nombresRestaurantes.has(normalizarTexto(sitio));

        const clases =
            `meal-plan-chip${indice === 0 ? " is-main" : ""}`;

        return enLista
            ? `<button type="button" class="${clases}"
                   data-ir-restaurante="${escaparAtributo(sitio)}">
                   ${escaparHTML(sitio)}
               </button>`
            : `<span class="${clases}">${escaparHTML(sitio)}</span>`;
    };


    const crearPanel = (dia, indice) => `

        <div
            class="meal-plan-panel"
            role="tabpanel"
            id="meal-plan-panel-${indice}"
            aria-labelledby="meal-plan-tab-${indice}"
            ${indice === indiceInicial ? "" : "hidden"}
        >
            ${MOMENTOS_COMIDA
                .filter(momento => (dia.comidas?.[momento.clave] || []).length)
                .map(momento => `

                    <div class="meal-plan-row">

                        <span class="meal-plan-moment">
                            <span aria-hidden="true">${momento.icono}</span>
                            ${momento.nombre}
                        </span>

                        <div class="meal-plan-options">
                            ${dia.comidas[momento.clave]
                                .map(crearChip)
                                .join("")}
                        </div>

                    </div>
                `)
                .join("")}
        </div>
    `;


    contenedor.innerHTML = `

        <div class="meal-plan-header">

            <h3>
                Qué toca cada día
            </h3>

            <p>
                El primero es el plan A; el resto, alternativas.
            </p>

        </div>


        <div class="meal-plan-tabs" role="tablist" aria-label="Días del viaje">

            ${dias
                .map((dia, indice) => `

                    <button
                        type="button"
                        role="tab"
                        class="meal-plan-tab"
                        id="meal-plan-tab-${indice}"
                        aria-controls="meal-plan-panel-${indice}"
                        aria-selected="${indice === indiceInicial}"
                    >
                        ${escaparHTML(etiquetaDia(dia))}
                        ${esHoy(dia.fecha) ? `<span class="meal-plan-today">hoy</span>` : ""}
                    </button>
                `)
                .join("")}

        </div>


        ${dias.map(crearPanel).join("")}
    `;

    contenedor.hidden = false;


    /*
     * Cambio de pestaña
     */
    const pestanas =
        contenedor.querySelectorAll(".meal-plan-tab");

    const paneles =
        contenedor.querySelectorAll(".meal-plan-panel");

    pestanas.forEach((pestana, indice) => {

        pestana.addEventListener("click", () => {

            pestanas.forEach((otra, i) =>
                otra.setAttribute("aria-selected", String(i === indice))
            );

            paneles.forEach((panel, i) => {
                panel.hidden = i !== indice;
            });
        });
    });


    /*
     * Chip -> bajar hasta la tarjeta del restaurante
     */
    contenedor.addEventListener("click", event => {

        const chip =
            event.target.closest("[data-ir-restaurante]");

        if (chip) {
            irARestaurante(chip.dataset.irRestaurante);
        }
    });
}


function irARestaurante(nombre) {

    const clave =
        normalizarTexto(nombre);

    const buscarTarjeta = () =>
        document.querySelector(
            `.restaurant-card[data-restaurante="${CSS.escape(clave)}"]`
        );

    let tarjeta =
        buscarTarjeta();


    /*
     * Si un filtro la está ocultando, volvemos a "Todos".
     */
    if (!tarjeta && filtroRestauranteActual !== "todos") {

        filtroRestauranteActual =
            "todos";

        document
            .querySelectorAll("[data-restaurant-filter]")
            .forEach(filtro =>
                filtro.classList.toggle(
                    "active",
                    filtro.dataset.restaurantFilter === "todos"
                )
            );

        renderizarRestaurantesFiltrados();

        // Que el botón "Todos" vuelva a verse en la fila de filtros.
        const filaFiltros =
            document.getElementById("restaurant-filters");

        if (filaFiltros) {
            filaFiltros.scrollLeft = 0;
        }

        tarjeta =
            buscarTarjeta();
    }

    if (!tarjeta) {
        return;
    }

    const detalles =
        tarjeta.querySelector("details");

    if (detalles) {
        detalles.open = true;
    }

    const reducirMovimiento =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    tarjeta.scrollIntoView({
        behavior: reducirMovimiento ? "auto" : "smooth",
        block: "center"
    });

    tarjeta.classList.remove("is-highlighted");
    void tarjeta.offsetWidth;
    tarjeta.classList.add("is-highlighted");

    setTimeout(
        () => tarjeta.classList.remove("is-highlighted"),
        2200
    );
}


/* =========================================================
   TARJETA RESTAURANTE
   ========================================================= */

function crearTarjetaRestaurante(
    restaurante
) {

    const tarjeta =
        document.createElement(
            "article"
        );

    tarjeta.className =
        "restaurant-card";

    tarjeta.dataset.restaurante =
        normalizarTexto(restaurante.nombre);


    const contenido =
        document.createElement(
            "div"
        );

    contenido.className =
        "restaurant-card-content";


    const nombre =
        restaurante.nombre ||
        "Restaurante";

    const zona =
        restaurante.zona ||
        "";

    const direccion =
        restaurante.direccion ||
        "";

    const descripcion =
        restaurante.descripcion ||
        restaurante.tipo ||
        "";

    const precio =
        restaurante.precio ||
        "";

    const calidad =
        restaurante.calidad;

    const romanticismo =
        restaurante.romanticismo;

    const platos =
        restaurante.platos_recomendados ||
        restaurante.recomendado ||
        restaurante.recomendados ||
        restaurante.especialidades ||
        [];


    const listaPlatos =
        Array.isArray(platos)
            ? platos.filter(Boolean)
            : (
                typeof platos === "string" &&
                platos.trim()
                    ? [platos.trim()]
                    : []
            );


    const mapsUrl =
        obtenerGoogleMapsUrl(
            restaurante
        );


    /*
     * Diseño compacto:
     * - Siempre visible: nombre, precio, zona, tipo y notas.
     * - Plegado: qué pedir + dirección (con <details>,
     *   accesible y sin JavaScript extra).
     * - Botón pequeño de Maps en la misma fila.
     */
    const notasHTML = [
        calidad
            ? `<span class="restaurant-score" title="Calidad de la comida (sobre 10)">
                   <span aria-hidden="true">⭐</span>
                   ${escaparHTML(String(calidad))}
                   <span class="restaurant-score-label">calidad</span>
               </span>`
            : "",
        romanticismo
            ? `<span class="restaurant-score" title="Lo romántico que es el sitio (sobre 10)">
                   <span aria-hidden="true">❤️</span>
                   ${escaparHTML(String(romanticismo))}
                   <span class="restaurant-score-label">romántico</span>
               </span>`
            : ""
    ].join("");


    const detallesHTML =
        listaPlatos.length || direccion
            ? `
                <details class="restaurant-details">

                    <summary>
                        Qué pedir
                        ${
                            listaPlatos.length
                                ? `<span class="restaurant-details-count">${listaPlatos.length}</span>`
                                : ""
                        }
                    </summary>

                    <div class="restaurant-details-body">

                        ${
                            listaPlatos.length
                                ? `
                                    <ul class="restaurant-dishes">
                                        ${listaPlatos
                                            .map(
                                                plato =>
                                                    `<li>${escaparHTML(plato)}</li>`
                                            )
                                            .join("")}
                                    </ul>
                                `
                                : ""
                        }

                        ${
                            direccion
                                ? `
                                    <p class="restaurant-address">
                                        📍 ${escaparHTML(direccion)}
                                    </p>
                                `
                                : ""
                        }

                    </div>

                </details>
            `
            : "";


    contenido.innerHTML = `

        <div class="restaurant-header">

            <h3>
                ${escaparHTML(nombre)}
            </h3>

            ${
                precio
                    ? `
                        <span class="restaurant-price" title="Precio orientativo">
                            ${escaparHTML(precio)}
                        </span>
                    `
                    : ""
            }

        </div>


        <p class="restaurant-subtitle">
            ${
                zona
                    ? `<span class="restaurant-zone">${escaparHTML(zona)}</span>`
                    : ""
            }
            ${
                descripcion
                    ? `<span class="restaurant-description">${escaparHTML(descripcion)}</span>`
                    : ""
            }
        </p>


        ${
            notasHTML
                ? `<div class="restaurant-meta">${notasHTML}</div>`
                : ""
        }


        ${
            detallesHTML || mapsUrl
                ? `
                    <div class="restaurant-footer">

                        ${detallesHTML}

                        ${
                            mapsUrl
                                ? `
                                    <a
                                        class="restaurant-maps"
                                        href="${escaparAtributo(mapsUrl)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Abrir ${escaparAtributo(nombre)} en Google Maps"
                                    >
                                        📍 Maps
                                    </a>
                                `
                                : ""
                        }

                    </div>
                `
                : ""
        }

    `;


    tarjeta.appendChild(
        contenido
    );

    return tarjeta;
}


/* =========================================================
   GOOGLE MAPS
   ========================================================= */

function obtenerGoogleMapsUrl(
    restaurante
) {

    if (
        restaurante.google_maps
    ) {
        return restaurante.google_maps;
    }

    if (
        restaurante.googleMaps
    ) {
        return restaurante.googleMaps;
    }

    if (
        restaurante.maps
    ) {
        return restaurante.maps;
    }


    const nombre =
        restaurante.nombre ||
        "";

    const direccion =
        restaurante.direccion ||
        restaurante.zona ||
        "";


    if (!nombre) {
        return null;
    }


    const query =
        encodeURIComponent(
            `${nombre} ${direccion} ${datosViaje?.revelacion?.maps_sufijo || ""}`.trim()
        );


    return (
        "https://www.google.com/maps/search/" +
        `?api=1&query=${query}`
    );
}


/* =========================================================
   ITINERARIO
   ========================================================= */

function renderizarItinerario() {

    const contenedor =
        document.getElementById(
            "itinerary-list"
        );

    if (!contenedor) {
        return;
    }


    const itinerario =
        datosViaje.viaje?.itinerario ||
        datosViaje.itinerario ||
        [];


    if (!Array.isArray(itinerario)) {
        return;
    }


    contenedor.innerHTML = "";


    itinerario.forEach(
        dia => {

            const elemento =
                crearElementoItinerario(
                    dia
                );

            if (elemento) {

                contenedor.appendChild(
                    elemento
                );
            }
        }
    );
}


function crearElementoItinerario(
    dia
) {

    const elemento =
        document.createElement(
            "article"
        );

    elemento.className =
        "itinerary-day";


    const numero =
        dia.numero ||
        "";

    const fecha =
        dia.fecha ||
        "";

    const titulo =
        dia.titulo ||
        dia.nombre ||
        "";

    const descripcion =
        dia.descripcion ||
        "";


    const actividades =
        dia.actividades ||
        [];


    let actividadesHTML = "";


    if (
        Array.isArray(
            actividades
        )
    ) {

        actividadesHTML =
            actividades
                .map(
                    crearActividadHTML
                )
                .join("");
    }


    elemento.innerHTML = `

        <div class="itinerary-day-header">

            ${
                numero
                    ? `
                        <div class="itinerary-day-number">
                            ${escaparHTML(
                                String(
                                    numero
                                )
                            )}
                        </div>
                    `
                    : ""
            }


            <div>

                <span class="itinerary-day-label">

                    ${
                        fecha
                            ? escaparHTML(
                                formatearFecha(
                                    fecha
                                )
                            )
                            : ""
                    }

                </span>


                <h3>
                    ${escaparHTML(
                        titulo
                    )}
                </h3>


                ${
                    descripcion
                        ? `
                            <p class="itinerary-day-description">
                                ${escaparHTML(
                                    descripcion
                                )}
                            </p>
                        `
                        : ""
                }

            </div>

        </div>


        <div class="itinerary-timeline">

            ${actividadesHTML}

        </div>
    `;


    const cabecera =
        elemento.querySelector(
            ".itinerary-day-header"
        );

    const timeline =
        elemento.querySelector(
            ".itinerary-timeline"
        );

    if (cabecera && timeline) {

        const abierto =
            Number(numero) === 1;

        const idPanel =
            `itinerary-day-${
                numero ||
                fecha ||
                "plan"
            }`;

        const boton =
            document.createElement(
                "button"
            );

        const panel =
            document.createElement(
                "div"
            );

        boton.type = "button";
        boton.className =
            "itinerary-day-toggle";

        boton.setAttribute(
            "aria-expanded",
            String(abierto)
        );

        boton.setAttribute(
            "aria-controls",
            idPanel
        );

        panel.id = idPanel;
        panel.className =
            `itinerary-day-panel${
                abierto
                    ? ""
                    : " is-collapsed"
            }`;

        panel.setAttribute(
            "aria-hidden",
            String(!abierto)
        );

        panel.inert =
            !abierto;

        const contenidoPanel =
            document.createElement(
                "div"
            );

        contenidoPanel.className =
            "itinerary-day-panel-inner";

        const indicador =
            document.createElement(
                "span"
            );

        indicador.className =
            "itinerary-day-chevron";

        indicador.setAttribute(
            "aria-hidden",
            "true"
        );

        indicador.textContent = "↓";

        cabecera.before(boton);
        boton.append(cabecera, indicador);
        timeline.before(panel);
        contenidoPanel.append(timeline);
        panel.append(contenidoPanel);

        boton.addEventListener(
            "click",
            () => {

                const expandido =
                    boton.getAttribute(
                        "aria-expanded"
                    ) === "true";

                boton.setAttribute(
                    "aria-expanded",
                    String(!expandido)
                );

                panel.classList.toggle(
                    "is-collapsed",
                    expandido
                );

                panel.setAttribute(
                    "aria-hidden",
                    String(expandido)
                );

                panel.inert =
                    expandido;
            }
        );
    }

    return elemento;
}


/* =========================================================
   ACTIVIDAD ITINERARIO
   ========================================================= */

function crearActividadHTML(
    actividad
) {

    if (
        typeof actividad ===
        "string"
    ) {

        return `

            <div class="itinerary-item">

                <div class="itinerary-content">

                    <div class="itinerary-main">

                        <p class="itinerary-description">
                            ${escaparHTML(
                                actividad
                            )}
                        </p>

                    </div>

                </div>

            </div>
        `;
    }


    const hora =
        actividad.hora ||
        "";

    const titulo =
        actividad.titulo ||
        actividad.nombre ||
        "";

    const tipo =
        actividad.tipo ||
        "";

    const duracion =
        actividad.duracion ||
        "";

    const descripcion =
        actividad.descripcion ||
        "";

    const ubicacion =
        actividad.ubicacion ||
        "";

    const reserva =
        actividad.reserva === true;

    const especial =
        actividad.especial === true;

    const googleMaps =
        actividad.google_maps ||
        "";


    let opcionesHTML = "";


    if (
        Array.isArray(
            actividad.opciones
        ) &&
        actividad.opciones.length
    ) {

        opcionesHTML = `

            <div class="itinerary-options">

                <span>
                    Opciones
                </span>

                <div>

                    ${actividad.opciones
                        .map(
                            opcion =>
                                `<span>${escaparHTML(opcion)}</span>`
                        )
                        .join("")}

                </div>

            </div>
        `;
    }


    return `

        <div
            class="itinerary-item ${
                especial
                    ? "itinerary-special"
                    : ""
            }"
        >

            ${
                hora
                    ? `
                        <div class="itinerary-time-column">

                            <span class="itinerary-time">
                                ${escaparHTML(
                                    hora
                                )}
                            </span>

                        </div>
                    `
                    : ""
            }


            <div class="itinerary-content">

                <div class="itinerary-icon">

                    ${obtenerIconoActividad(
                        tipo
                    )}

                </div>


                <div class="itinerary-main">


                    <div class="itinerary-title-row">

                        <h4>
                            ${escaparHTML(
                                titulo
                            )}
                        </h4>

                    </div>


                    <div class="itinerary-badges">

                        ${
                            tipo
                                ? `
                                    <span class="itinerary-type">
                                        ${escaparHTML(
                                            traducirTipoActividad(
                                                tipo
                                            )
                                        )}
                                    </span>
                                `
                                : ""
                        }


                        ${
                            duracion
                                ? `
                                    <span class="itinerary-duration">
                                        ${escaparHTML(
                                            duracion
                                        )}
                                    </span>
                                `
                                : ""
                        }


                        ${
                            reserva
                                ? `
                                    <span class="itinerary-reservation">
                                        🎟️ Reserva
                                    </span>
                                `
                                : ""
                        }


                        ${
                            especial
                                ? `
                                    <span class="itinerary-special-badge">
                                        ❤️ Especial
                                    </span>
                                `
                                : ""
                        }

                    </div>


                    ${
                        descripcion
                            ? `
                                <p class="itinerary-description">
                                    ${escaparHTML(
                                        descripcion
                                    )}
                                </p>
                            `
                            : ""
                    }


                    ${
                        ubicacion
                            ? `
                                <p class="itinerary-location">
                                    📍 ${escaparHTML(
                                        ubicacion
                                    )}
                                </p>
                            `
                            : ""
                    }


                    ${opcionesHTML}


                    ${
                        googleMaps
                            ? `
                                <div class="itinerary-map-button">

                                    <a
                                        href="${escaparAtributo(
                                            googleMaps
                                        )}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="maps-button"
                                    >
                                        Ver ubicación →
                                    </a>

                                </div>
                            `
                            : ""
                    }

                </div>

            </div>

        </div>
    `;
}


function obtenerIconoActividad(
    tipo
) {

    const iconos = {
        // Los tipos que delatan el viaje vienen en los datos cifrados.
        ...(datosViaje?.tipos_extra?.iconos || {}),

        transporte: "🚆",

        hotel: "🏨",

        paseo: "🚶",

        restaurante: "🍝",

        comida: "🥪",

        desayuno: "☕",

        aperitivo: "🥂",

        monumento: "🏛️",

        museo: "🎨",

        tour: "🗺️",

        helado: "🍦",

        mirador: "🌅",

        descanso: "☕",

        cafe: "☕",
    };


    return (
        iconos[tipo] ||
        "✨"
    );
}


function traducirTipoActividad(
    tipo
) {

    const traducciones = {
        ...(datosViaje?.tipos_extra?.nombres || {}),

        transporte: "Transporte",

        hotel: "Hotel",

        paseo: "Paseo",

        restaurante: "Restaurante",

        comida: "Comida",

        desayuno: "Desayuno",

        aperitivo: "Aperitivo",

        monumento: "Monumento",

        museo: "Museo",

        tour: "Tour",

        helado: "Helado",

        mirador: "Mirador",

        descanso: "Descanso",

        cafe: "Café",
    };


    return (
        traducciones[tipo] ||
        tipo
    );
}


/* =========================================================
   CHECKLIST
   ========================================================= */

function renderizarChecklist() {

    const contenedor =
        document.getElementById(
            "checklist-list"
        );

    if (!contenedor) {
        return;
    }


    const gastronomia =
        datosViaje.guia_gastronomica ||
        {};


    const checklistComidas =
        Array.isArray(
            gastronomia.checklist_comidas
        )
            ? gastronomia.checklist_comidas
            : [];


    const checklistExperiencias =
        Array.isArray(
            gastronomia.checklist_experiencias
        )
            ? gastronomia.checklist_experiencias
            : [];


    let elementos = [];


    elementos = [

        ...checklistComidas.map(
            elemento => ({
                texto:
                    typeof elemento ===
                    "string"
                        ? elemento
                        : elemento.nombre ||
                          elemento.texto ||
                          elemento.item ||
                          "",
                categoria:
                    "Comida"
            })
        ),

        ...checklistExperiencias.map(
            elemento => ({
                texto:
                    typeof elemento ===
                    "string"
                        ? elemento
                        : elemento.nombre ||
                          elemento.texto ||
                          elemento.item ||
                          "",
                categoria:
                    "Experiencia"
            })
        )

    ];


    contenedor.innerHTML = "";


    if (!elementos.length) {

        contenedor.innerHTML = `

            <div class="empty-state">

                <span>
                    📝
                </span>

                <h3>
                    La lista del viaje
                </h3>

                <p>
                    Todavía no hay elementos añadidos.
                </p>

            </div>
        `;

        return;
    }


    const estadoGuardado =
        obtenerEstadoChecklist();


    elementos.forEach(
        (elemento, index) => {

            if (!elemento.texto) {
                return;
            }


            const item =
                document.createElement(
                    "label"
                );

            item.className =
                "checklist-item";


            const id =
                `check-${index}`;


            const marcado =
                estadoGuardado[index] ===
                true;


            item.innerHTML = `

                <input
                    type="checkbox"
                    id="${id}"
                    ${
                        marcado
                            ? "checked"
                            : ""
                    }
                >

                <div class="checklist-content">

                    <small>
                        ${escaparHTML(
                            elemento.categoria
                        )}
                    </small>

                    <strong>
                        ${escaparHTML(
                            elemento.texto
                        )}
                    </strong>

                </div>
            `;


            const checkbox =
                item.querySelector(
                    "input"
                );


            checkbox.addEventListener(
                "change",
                () => {

                    guardarEstadoChecklist(
                        index,
                        checkbox.checked
                    );
                }
            );


            contenedor.appendChild(
                item
            );
        }
    );
}


/* =========================================================
   CHECKLIST STORAGE
   ========================================================= */

function obtenerEstadoChecklist() {

    try {

        const guardado =
            localStorage.getItem(
                CONFIG.storage.checklist
            );

        return guardado
            ? JSON.parse(
                guardado
            )
            : {};

    } catch (error) {

        console.error(
            "Error leyendo checklist:",
            error
        );

        return {};
    }
}


function guardarEstadoChecklist(
    index,
    valor
) {

    const estado =
        obtenerEstadoChecklist();


    estado[index] =
        valor;


    localStorage.setItem(
        CONFIG.storage.checklist,
        JSON.stringify(
            estado
        )
    );
}


/* =========================================================
   UTILIDADES HTML
   ========================================================= */

function escaparHTML(
    valor
) {

    return String(valor)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escaparAtributo(
    valor
) {

    return escaparHTML(
        valor
    );
}


/* =========================================================
   CONFETI
   ========================================================= */

function lanzarConfeti() {

    const cantidad =
        80;


    for (
        let i = 0;
        i < cantidad;
        i++
    ) {

        crearParticulaConfeti();
    }
}


function crearParticulaConfeti() {

    const confeti =
        document.createElement(
            "div"
        );


    confeti.className =
        "confetti";


    const tamaño =
        Math.random() * 8 + 5;

    const izquierda =
        Math.random() * 100;

    const duracion =
        Math.random() * 2 + 2;

    const retraso =
        Math.random() * 0.5;


    confeti.style.width =
        `${tamaño}px`;

    confeti.style.height =
        `${tamaño * 0.55}px`;

    confeti.style.left =
        `${izquierda}vw`;

    confeti.style.top =
        "-20px";

    confeti.style.animationDuration =
        `${duracion}s`;

    confeti.style.animationDelay =
        `${retraso}s`;


    document.body.appendChild(
        confeti
    );


    setTimeout(
        () => {

            confeti.remove();

        },
        (
            duracion +
            retraso
        ) * 1000 + 500
    );
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registrarServiceWorker() {

    if (
        "serviceWorker" in
        navigator
    ) {

        navigator.serviceWorker
            .register(
                "./service-worker.js"
            )
            .then(
                registro => {

                    console.log(
                        "Service Worker registrado:",
                        registro.scope
                    );
                }
            )
            .catch(
                error => {

                    console.error(
                        "Error registrando Service Worker:",
                        error
                    );
                }
            );
    }
}

function comprobarModoDesarrolloURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    if (
        parametros.get("dev") === "true"
    ) {

        console.log(
            "🔧 Modo desarrollador activado desde URL"
        );

        sessionStorage.setItem(
            CONFIG.storage.simular,
            "true"
        );

        activarModoCumpleanos();
    }
}
