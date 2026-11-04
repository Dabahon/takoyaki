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
        { fecha: "2026-11-25T19:00:00+01:00", icono: "👟", texto: "Q2FsemFkbyBjw7Ntb2RvLCBwb3IgZmF2b3I6IHZhcyBhIHN1YmlyIG3DoXMgZXNjYWxvbmVzIGRlIGxvcyBxdWUgdGUgaW1hZ2luYXMu" },
        { fecha: "2026-12-02T19:00:00+01:00", icono: "🎨", texto: "SGFicsOhIGFydGUuIERlbCBxdWUgc2FsZSBlbiBsb3MgbGlicm9zIGRlbCBjb2xlLg==" },
        { fecha: "2026-12-09T19:00:00+01:00", icono: "🕖", texto: "TWHDsWFuYSBhIGxhcyAxOTowMCwgY29ubWlnby4gTG8gZGVtw6FzLCB5YSBsbyB2ZXLDoXMu" }
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

    try {

        const respuesta =
            await fetch(window.location.pathname, {
                method: "HEAD",
                cache: "no-store"
            });

        const fechaServidor =
            new Date(respuesta.headers.get("Date") || "");

        if (!Number.isNaN(fechaServidor.getTime())) {
            desfaseReloj = fechaServidor.getTime() - Date.now();
        }

    } catch (error) {
        // Sin conexión: usamos la hora del dispositivo.
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


function activarModoCumpleanos() {

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

    actualizarCuentaAtrasCumpleanos();

    document.body.classList.add("modo-apertura");

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

    lista.innerHTML =
        CONFIG.pistas
            .map((pista, indice) => {

                const fecha =
                    new Date(pista.fecha);

                const numero =
                    indice + 1;

                const abierta =
                    simulando || momento >= fecha;

                if (!abierta) {

                    const esSiguiente =
                        !siguienteMarcada;

                    siguienteMarcada = true;

                    return `
                        <li class="pista">
                            <div class="pista-card bloqueada${esSiguiente ? " siguiente" : ""}">
                                <span class="pista-numero">${numero}</span>
                                <span class="pista-candado" aria-hidden="true">🔒</span>
                                <span class="pista-fecha">${escaparHTML(textoCuandoAbre(fecha))}</span>
                                ${
                                    esSiguiente
                                        ? `<span class="pista-falta">${escaparHTML(textoCuantoFalta(fecha))}</span>`
                                        : ""
                                }
                            </div>
                        </li>
                    `;
                }

                abiertas++;

                const vista =
                    vistas.includes(indice);

                return `
                    <li class="pista">
                        <button
                            type="button"
                            class="pista-card${vista ? " girada" : " nueva"}"
                            data-pista="${indice}"
                            aria-pressed="${vista}"
                            aria-label="Pista ${numero}"
                        >
                            <span class="pista-cara pista-frente">
                                <span class="pista-numero">${numero}</span>
                                ${vista ? "" : `<span class="pista-badge">Nueva</span>`}
                                <span class="pista-sello" aria-hidden="true">✦</span>
                                <span class="pista-instruccion">Toca para verla</span>
                            </span>
                            <span class="pista-cara pista-dorso">
                                <span class="pista-icono" aria-hidden="true">${pista.icono}</span>
                                <span class="pista-texto">${escaparHTML(textoDeBase64(pista.texto))}</span>
                            </span>
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


    lista
        .querySelectorAll("[data-pista]")
        .forEach(carta => {

            carta.addEventListener("click", () => {

                const girada =
                    carta.classList.toggle("girada");

                carta.classList.remove("nueva");

                carta.setAttribute("aria-pressed", String(girada));

                carta.querySelector(".pista-badge")?.remove();

                if (girada) {
                    guardarPistaVista(Number(carta.dataset.pista));
                }
            });
        });
}


/* =========================================================
   REGALO
   ========================================================= */

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
                <span></span><span></span><span></span><span></span>
            </div>


            <div class="gift-step" data-step="1">

                <div class="gift-big-icon">🎁</div>

                <p class="gift-small">Hoy toca celebrar</p>

                <h2 id="gift-title">30 años, justiciera</h2>

                <p>
                    Y como no se cumplen todos los días,
                    he preparado algo solo para nosotros.
                </p>

                <button type="button" class="gift-main-button" data-gift-next="2">
                    Sigue
                </button>

            </div>


            <div class="gift-step" data-step="2" hidden>

                <div class="gift-big-icon">🧳</div>

                <p class="gift-small">Una pista más</p>

                <h2>Nos vamos unos días</h2>

                <p>
                    Del 18 al 21 de diciembre, tú y yo.
                    Solo falta saber adónde…
                </p>

                <button type="button" class="gift-main-button" data-gift-next="3">
                    ¿Adónde?
                </button>

            </div>


            <form class="gift-step gift-password" data-step="3" hidden novalidate>

                <div class="gift-big-icon">🔐</div>

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


            <div class="gift-step gift-reveal" data-step="4" hidden></div>

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
        .addEventListener("click", cerrarModalRegalo);

    document.addEventListener("keydown", manejarEscapeModal);
}


/* =========================================================
   PASOS DEL REGALO
   ========================================================= */

function mostrarPasoRegalo(
    numeroPaso
) {

    const pasos =
        document.querySelectorAll("#gift-modal .gift-step");

    pasos.forEach(paso => {

        const activo =
            Number(paso.dataset.step) === numeroPaso;

        paso.hidden = !activo;

        if (activo) {

            // Reiniciamos la animación de entrada del paso.
            paso.classList.remove("entrando");
            void paso.offsetWidth;
            paso.classList.add("entrando");
        }
    });

    document
        .querySelectorAll("#gift-modal .gift-progress span")
        .forEach((punto, indice) => {
            punto.classList.toggle("activo", indice < numeroPaso);
        });
}


/* =========================================================
   CERRAR MODAL
   ========================================================= */

function manejarEscapeModal(event) {

    if (event.key !== "Escape") {
        return;
    }

    // En la revelación no dejamos cerrar sin querer.
    if (datosViaje) {
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

        <div class="gift-big-icon">${escaparHTML(revelacion.icono || "✨")}</div>

        <p class="gift-small">Nos vamos a…</p>

        <h1 class="gift-destination" aria-label="${escaparAtributo(revelacion.destino || "")}">
            ${letras}
        </h1>

        <p class="gift-dates">${escaparHTML(revelacion.fechas || "")}</p>

        <p>${escaparHTML(revelacion.frase || "")}</p>

        <button type="button" class="gift-main-button" data-gift-reveal>
            Ver nuestra escapada
        </button>
    `;

    paso
        .querySelector("[data-gift-reveal]")
        .addEventListener("click", revelarViaje);

    mostrarPasoRegalo(4);

    lanzarConfeti();
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

    if (intervaloCuentaAtras) {
        clearInterval(intervaloCuentaAtras);
        intervaloCuentaAtras = null;
    }

    document.body.classList.remove("modo-apertura");

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

    activarViajeDesbloqueado();
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

    mostrarPagina(
        "inicio"
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


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
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

function renderizarAplicacion() {

    if (!datosViaje) {
        return;
    }

    renderizarDatosGenerales();

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
