/* =========================================================
   FLORENCE TRIP
   app.js
   ========================================================= */

const CONFIG = {
    fechaCumpleanos: "2026-12-10T00:00:00",

    storage: {
        viajeDesbloqueado: "florenceTrip_viajeDesbloqueado",
        checklist: "florenceTrip_checklist"
    }
};

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

    const viajeDesbloqueado =
        comprobarViajeDesbloqueado();

    if (viajeDesbloqueado) {
        await desbloquearYcargarViaje();
    } else {
        mostrarPantallaSorpresa();
    }

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
            "florenceTrip_simularCumpleanos",
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
            CONFIG.storage.viajeDesbloqueado
        );

        localStorage.removeItem(
            CONFIG.storage.checklist
        );

        sessionStorage.removeItem(
            "florenceTrip_simularCumpleanos"
        );

        window.location.reload();
    }
}


/* =========================================================
   ESTADO DEL VIAJE
   ========================================================= */

function comprobarViajeDesbloqueado() {

    return (
        localStorage.getItem(
            CONFIG.storage.viajeDesbloqueado
        ) === "true"
    );
}


function guardarViajeDesbloqueado() {

    localStorage.setItem(
        CONFIG.storage.viajeDesbloqueado,
        "true"
    );
}


/* =========================================================
   PANTALLA DE ESPERA
   ========================================================= */

function mostrarPantallaSorpresa() {

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
            "🎁 UNA SORPRESA PARA TI";
    }

    if (titulo) {
        titulo.textContent =
            "Tengo algo preparado para ti";
    }

    if (subtitulo) {
        subtitulo.textContent =
            "Solo tienes que esperar un poquito";
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

    const simulandoCumpleanos =
        sessionStorage.getItem(
            "florenceTrip_simularCumpleanos"
        ) === "true";

    if (simulandoCumpleanos) {
        activarModoCumpleanos();
        return;
    }

    const ahora =
        new Date();

    const fechaObjetivo =
        new Date(
            CONFIG.fechaCumpleanos
        );

    const diferencia =
        fechaObjetivo - ahora;

    if (diferencia <= 0) {

        activarModoCumpleanos();

        return;
    }

    const dias =
        Math.floor(
            diferencia /
            (1000 * 60 * 60 * 24)
        );

    const horas =
        Math.floor(
            (diferencia /
                (1000 * 60 * 60)) % 24
        );

    const minutos =
        Math.floor(
            (diferencia /
                (1000 * 60)) % 60
        );

    const segundos =
        Math.floor(
            (diferencia / 1000) % 60
        );

    actualizarElemento(
        "countdown-days",
        formatearNumero(dias)
    );

    actualizarElemento(
        "countdown-hours",
        formatearNumero(horas)
    );

    actualizarElemento(
        "countdown-minutes",
        formatearNumero(minutos)
    );

    actualizarElemento(
        "countdown-seconds",
        formatearNumero(segundos)
    );
}


function actualizarElemento(
    id,
    valor
) {

    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.textContent =
            valor;
    }
}


function formatearNumero(numero) {

    return String(numero)
        .padStart(2, "0");
}


/* =========================================================
   CUMPLEAÑOS
   ========================================================= */

function comprobarFechaReal() {

    const ahora =
        new Date();

    const fechaCumpleanos =
        new Date(
            CONFIG.fechaCumpleanos
        );

    if (ahora >= fechaCumpleanos) {
        activarModoCumpleanos();
    }
}


function activarModoCumpleanos() {

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
            "🎂 HOY ES TU DÍA";
    }

    if (titulo) {
        titulo.textContent =
            "BUON COMPLEANNO ❤️";
    }

    if (subtitulo) {
        subtitulo.textContent =
            "Y tengo una pequeña sorpresa preparada para ti...";
    }

    const boton =
        document.getElementById(
            "open-gift"
        );

    if (boton) {

        boton.hidden = false;

        /*
         * Añadimos una pequeña animación
         * si existe en CSS.
         */
        boton.classList.add(
            "gift-ready"
        );
    }

    actualizarCuentaAtrasCumpleanos();

    if (intervaloCuentaAtras) {

        clearInterval(
            intervaloCuentaAtras
        );

        intervaloCuentaAtras = null;
    }
}


function actualizarCuentaAtrasCumpleanos() {

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
        document.getElementById(
            "gift-modal"
        );

    if (modalExistente) {
        modalExistente.remove();
    }

    const modal =
        document.createElement(
            "div"
        );

    modal.id =
        "gift-modal";

    modal.className =
        "gift-modal";


    modal.innerHTML = `

        <div
            class="gift-modal-overlay"
            data-gift-close
        ></div>


        <div
            class="gift-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-title"
        >


            <!-- =========================================
                 PASO 1
                 ========================================= -->

            <div
                class="gift-step"
                data-step="1"
            >

                <div class="gift-big-icon">
                    🎁
                </div>

                <p class="gift-small">
                    TENGO ALGO PARA TI
                </p>

                <h2 id="gift-title">
                    Tu regalo es...
                </h2>

                <p>
                    Algo que llevamos un tiempo
                    esperando.
                </p>

                <button
                    type="button"
                    class="gift-main-button"
                    data-gift-next="2"
                >
                    Descubrir
                </button>

            </div>


            <!-- =========================================
                 PASO 2
                 ========================================= -->

            <div
                class="gift-step"
                data-step="2"
                hidden
            >

                <div class="gift-big-icon">
                    ✨
                </div>

                <p class="gift-small">
                    PREPÁRATE
                </p>

                <h2>
                    Nos vamos de viaje
                </h2>

                <p>
                    Pero todavía falta descubrir...
                </p>

                <button
                    type="button"
                    class="gift-main-button"
                    data-gift-next="3"
                >
                    ¿A dónde?
                </button>

            </div>


            <!-- =========================================
                 PASO 3
                 ========================================= -->

            <div
                class="gift-step"
                data-step="3"
                hidden
            >

                <div class="gift-big-icon">
                    🇮🇹
                </div>

                <p class="gift-small">
                    NUESTRO DESTINO
                </p>

                <h1>
                    FLORENCIA
                </h1>

                <p class="gift-dates">
                    18 — 21 DICIEMBRE 2026
                </p>

                <p>
                    Tres noches, nosotros dos,
                    comida italiana y una ciudad preciosa.
                </p>

                <button
                    type="button"
                    class="gift-main-button"
                    data-gift-reveal
                >
                    Descubrir nuestro viaje ❤️
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    /*
     * Botones siguiente paso
     */
    const botonesPaso =
        modal.querySelectorAll(
            "[data-gift-next]"
        );

    botonesPaso.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    const paso =
                        Number(
                            boton.dataset
                                .giftNext
                        );

                    mostrarPasoRegalo(
                        paso
                    );
                }
            );
        }
    );


    /*
     * Botón final
     */
    const botonRevelar =
        modal.querySelector(
            "[data-gift-reveal]"
        );

    if (botonRevelar) {

        botonRevelar.addEventListener(
            "click",
            revelarViaje
        );
    }


    /*
     * Cerrar haciendo click fuera.
     * No mostramos ningún botón de cerrar
     * para mantener la experiencia.
     */
    const overlay =
        modal.querySelector(
            "[data-gift-close]"
        );

    if (overlay) {

        overlay.addEventListener(
            "click",
            cerrarModalRegalo
        );
    }


    /*
     * ESC para cerrar.
     */
    document.addEventListener(
        "keydown",
        manejarEscapeModal
    );
}


/* =========================================================
   PASOS DEL REGALO
   ========================================================= */

function mostrarPasoRegalo(
    numeroPaso
) {

    const pasos =
        document.querySelectorAll(
            "#gift-modal .gift-step"
        );

    pasos.forEach(
        paso => {

            const numero =
                Number(
                    paso.dataset.step
                );

            paso.hidden =
                numero !== numeroPaso;
        }
    );
}


/* =========================================================
   CERRAR MODAL
   ========================================================= */

function manejarEscapeModal(event) {

    if (event.key !== "Escape") {
        return;
    }

    const modal =
        document.getElementById(
            "gift-modal"
        );

    if (!modal) {
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

async function revelarViaje() {

    console.log(
        "❤️ Revelando nuestro viaje..."
    );

    lanzarConfeti();

    const cargado =
        await desbloquearYcargarViaje();

    if (!cargado) {
        return;
    }

    const modal =
        document.getElementById(
            "gift-modal"
        );

    if (modal) {

        modal.classList.remove(
            "visible"
        );

        modal.classList.add(
            "closing"
        );

        setTimeout(() => {

            modal.remove();

            document.body.classList.remove(
                "gift-open"
            );

            document.removeEventListener(
                "keydown",
                manejarEscapeModal
            );

        }, 500);
    }
}


/* =========================================================
   CARGA DE DATOS
   ========================================================= */

async function desbloquearYcargarViaje() {

    mostrarLoading();

    try {

        console.log(
            "📂 Cargando florencia.json..."
        );

        const respuesta =
            await fetch(
                "./data/florencia.json",
                {
                    cache: "no-store"
                }
            );

        if (!respuesta.ok) {

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );
        }

        datosViaje =
            await respuesta.json();

        console.log(
            "✅ Datos del viaje cargados"
        );

        renderizarAplicacion();

        guardarViajeDesbloqueado();

        activarViajeDesbloqueado();

        return true;

    } catch (error) {

        console.error(
            "❌ No se ha podido cargar florencia.json:",
            error
        );

        mostrarErrorCarga();

        return false;
    }
}


/* =========================================================
   VIAJE DESBLOQUEADO
   ========================================================= */

function activarViajeDesbloqueado() {

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
            "✨ NUESTRO VIAJE";
    }

    if (titulo) {

        titulo.textContent =
            "Nos vamos a Florencia 🇮🇹";
    }

    if (subtitulo) {

        subtitulo.textContent =
            "18 — 21 diciembre 2026";
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
                nuestra escapada.
            </p>

            <p>
                Comprueba que
                <strong>
                    data/florencia.json
                </strong>
                existe.
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

                desbloquearYcargarViaje();
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
        "Florencia";

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

    if (fechasElemento) {

        const inicio =
            formatearFecha(
                fechas.inicio
            );

        const fin =
            formatearFecha(
                fechas.fin
            );

        if (inicio && fin) {

            fechasElemento.textContent =
                `${inicio} — ${fin}`;

        } else {

            fechasElemento.textContent =
                "18 — 21 diciembre 2026";
        }
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
            "La Scaletta al Ponte Vecchio";
    }
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
     * GELATO
     */
    if (
        Array.isArray(
            gastronomia.gelato
        )
    ) {

        gastronomia.gelato
            .forEach(restaurante => {

                restaurantes.push({

                    ...restaurante,

                    categoriaFiltro:
                        "gelato"
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
            "schiacciata"
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
            "gelato"
        ) ||
        categoria.includes(
            "gelateria"
        ) ||
        categoria.includes(
            "helado"
        )
    ) {
        return "gelato";
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


    let platosHTML = "";


    if (
        Array.isArray(platos) &&
        platos.length
    ) {

        platosHTML = `

            <div class="restaurant-dishes">

                <h4>
                    Qué pedir
                </h4>

                <ul>

                    ${platos
                        .slice(0, 5)
                        .map(
                            plato =>
                                `<li>${escaparHTML(plato)}</li>`
                        )
                        .join("")}

                </ul>

            </div>
        `;

    } else if (
        typeof platos === "string" &&
        platos.trim()
    ) {

        platosHTML = `

            <div class="restaurant-dishes">

                <h4>
                    Qué pedir
                </h4>

                <p>
                    ${escaparHTML(platos)}
                </p>

            </div>
        `;
    }


    const mapsUrl =
        obtenerGoogleMapsUrl(
            restaurante
        );


    contenido.innerHTML = `

        <div class="restaurant-header">

            <div>

                <h3>
                    ${escaparHTML(nombre)}
                </h3>

                ${
                    zona
                        ? `
                            <span class="restaurant-zone">
                                ${escaparHTML(zona)}
                            </span>
                        `
                        : ""
                }

            </div>

            ${
                precio
                    ? `
                        <span class="restaurant-price">
                            ${escaparHTML(precio)}
                        </span>
                    `
                    : ""
            }

        </div>


        ${
            descripcion
                ? `
                    <p class="restaurant-description">
                        ${escaparHTML(
                            descripcion
                        )}
                    </p>
                `
                : ""
        }


        ${
            calidad || romanticismo
                ? `

                    <div class="restaurant-meta">

                        ${
                            calidad
                                ? `
                                    <span class="restaurant-score">
                                        ⭐ ${escaparHTML(
                                            String(
                                                calidad
                                            )
                                        )}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            romanticismo
                                ? `
                                    <span class="restaurant-score">
                                        ❤️ ${escaparHTML(
                                            String(
                                                romanticismo
                                            )
                                        )}
                                    </span>
                                `
                                : ""
                        }

                    </div>

                `
                : ""
        }


        ${
            direccion
                ? `
                    <p class="restaurant-address">
                        📍 ${escaparHTML(
                            direccion
                        )}
                    </p>
                `
                : ""
        }


        ${platosHTML}


        ${
            mapsUrl
                ? `

                    <div class="restaurant-actions">

                        <a
                            class="maps-button"
                            href="${escaparAtributo(
                                mapsUrl
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Ver en Google Maps →
                        </a>

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
            `${nombre} ${direccion} Florence Italy`
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

        vuelo: "✈️",

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

        gelato: "🍦",

        mirador: "🌅",

        descanso: "☕",

        cafe: "☕",

        aeropuerto: "✈️"
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

        vuelo: "Vuelo",

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

        gelato: "Gelato",

        mirador: "Mirador",

        descanso: "Descanso",

        cafe: "Café",

        aeropuerto: "Aeropuerto"
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
                    Nuestra checklist
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