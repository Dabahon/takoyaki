/* =========================================================
   FLORENCE TRIP
   app.js
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const CONFIG = {

    fechaCumpleanos:
        "2026-12-10T00:00:00",

    storage: {

        viajeDesbloqueado:
            "florenceTrip_viajeDesbloqueado",

        checklist:
            "florenceTrip_checklist"

    }

};


/* =========================================================
   ESTADO
   ========================================================= */

let datosViaje = null;

let estadoApp = {

    modoDesarrollador:
        false,

    cumpleanosSimulado:
        false,

    viajeDesbloqueado:
        false

};


/* =========================================================
   INICIO
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    iniciarApp
);


async function iniciarApp() {

    detectarModoDesarrollador();

    cargarEstadoGuardado();

    configurarEventos();


    /*
        MUY IMPORTANTE:

        Si el viaje NO está desbloqueado,
        NO cargamos florencia.json.

        De esta forma no hay ninguna petición
        que pueda revelar información del viaje.
    */

    if (
        estadoApp.viajeDesbloqueado
    ) {

        await desbloquearYcargarViaje();

    } else {

        actualizarInterfazSorpresa();

    }


    iniciarCuentaAtras();

}


/* =========================================================
   MODO DESARROLLADOR
   ========================================================= */

/*
    CTRL + SHIFT + G
    → Simula el 10 de diciembre.

    CTRL + SHIFT + R
    → Reinicia completamente la sorpresa.
*/

function detectarModoDesarrollador() {

    document.addEventListener(
        "keydown",
        event => {

            /*
                Probar cumpleaños
            */

            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.key.toLowerCase() === "g"
            ) {

                event.preventDefault();

                estadoApp.modoDesarrollador =
                    true;

                estadoApp.cumpleanosSimulado =
                    true;

                activarModoCumpleanos();

                console.log(
                    "🎁 MODO DESARROLLADOR ACTIVADO"
                );

            }


            /*
                Reiniciar sorpresa
            */

            if (
                event.ctrlKey &&
                event.shiftKey &&
                event.key.toLowerCase() === "r"
            ) {

                event.preventDefault();

                reiniciarSorpresa();

            }

        }
    );

}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function cargarEstadoGuardado() {

    const guardado =
        localStorage.getItem(
            CONFIG.storage.viajeDesbloqueado
        );


    estadoApp.viajeDesbloqueado =
        guardado === "true";

}


function guardarViajeDesbloqueado() {

    localStorage.setItem(
        CONFIG.storage.viajeDesbloqueado,
        "true"
    );


    estadoApp.viajeDesbloqueado =
        true;

}


function reiniciarSorpresa() {

    localStorage.removeItem(
        CONFIG.storage.viajeDesbloqueado
    );


    localStorage.removeItem(
        CONFIG.storage.checklist
    );


    estadoApp.viajeDesbloqueado =
        false;


    estadoApp.cumpleanosSimulado =
        false;


    location.reload();

}


/* =========================================================
   INTERFAZ INICIAL
   ========================================================= */

function actualizarInterfazSorpresa() {

    cambiarHero(

        "Tengo algo preparado para ti",

        "Solo tienes que esperar un poquito",

        "🎁 UNA SORPRESA PARA TI"

    );


    mostrarPantallaEspera();


    ocultarNavegacion();

}


/* =========================================================
   PANTALLA DE ESPERA
   ========================================================= */

function mostrarPantallaEspera() {

    const waiting =
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


    if (waiting) {

        waiting.hidden =
            false;

    }


    if (loading) {

        loading.hidden =
            true;

    }


    if (content) {

        content.hidden =
            true;

    }

}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function ocultarNavegacion() {

    const nav =
        document.getElementById(
            "main-nav"
        );


    if (!nav) {
        return;
    }


    nav.hidden =
        true;

}


function mostrarNavegacion() {

    const nav =
        document.getElementById(
            "main-nav"
        );


    if (!nav) {
        return;
    }


    nav.hidden =
        false;

}


/* =========================================================
   CARGAR JSON
   ========================================================= */

async function cargarDatos() {

    try {

        const respuesta =
            await fetch(
                "./data/florencia.json",
                {
                    cache:
                        "no-store"
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        datosViaje =
            await respuesta.json();


        console.log(
            "✅ Datos del viaje cargados"
        );


        return true;

    } catch (error) {

        console.error(
            "❌ Error cargando florencia.json:",
            error
        );


        mostrarErrorCarga();


        return false;

    }

}


/* =========================================================
   DESBLOQUEAR Y CARGAR VIAJE
   ========================================================= */

async function desbloquearYcargarViaje() {

    const waiting =
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


    if (waiting) {

        waiting.hidden =
            true;

    }


    if (loading) {

        loading.hidden =
            false;

    }


    mostrarNavegacion();


    const cargado =
        await cargarDatos();


    if (!cargado) {
        return;
    }


    if (loading) {

        loading.hidden =
            true;

    }


    if (content) {

        content.hidden =
            false;

    }


    renderizarAplicacion();


    activarViajeDesbloqueado();

}


/* =========================================================
   ERROR DE CARGA
   ========================================================= */

function mostrarErrorCarga() {

    const loading =
        document.getElementById(
            "loading"
        );


    if (!loading) {
        return;
    }


    loading.hidden =
        false;


    loading.innerHTML = `

        <div class="error-card">

            <div class="error-icon">
                ❌
            </div>

            <h2>
                Algo ha salido mal
            </h2>

            <p>
                No hemos podido cargar
                la información.
            </p>

            <p>
                Comprueba que estás utilizando
                <strong>Live Server</strong>.
            </p>

        </div>

    `;

}


/* =========================================================
   RENDER GENERAL
   ========================================================= */

function renderizarAplicacion() {

    if (!datosViaje) {
        return;
    }


    renderizarRestaurantes();

    renderizarItinerario();

    renderizarChecklist();

    actualizarInformacionViaje();

}


/* =========================================================
   INFORMACIÓN DEL VIAJE
   ========================================================= */

function actualizarInformacionViaje() {

    const viaje =
        datosViaje?.viaje;


    if (!viaje) {
        return;
    }


    const destino =
        document.querySelector(
            "[data-viaje-destino]"
        );


    const fechas =
        document.querySelector(
            "[data-viaje-fechas]"
        );


    const hotel =
        document.querySelector(
            "[data-viaje-hotel]"
        );


    if (
        destino &&
        viaje.destino
    ) {

        destino.textContent =
            viaje.destino;

    }


    if (
        fechas &&
        viaje.fechas
    ) {

        fechas.textContent =
            `${formatearFecha(
                viaje.fechas.inicio
            )} — ${formatearFecha(
                viaje.fechas.fin
            )}`;

    }


    if (
        hotel &&
        viaje.hotel
    ) {

        if (
            typeof viaje.hotel ===
            "string"
        ) {

            hotel.textContent =
                viaje.hotel;

        } else if (
            viaje.hotel.nombre
        ) {

            hotel.textContent =
                viaje.hotel.nombre;

        }

    }

}


/* =========================================================
   RESTAURANTES
   ========================================================= */

function renderizarRestaurantes() {

    const contenedor =
        document.getElementById(
            "restaurant-list"
        );


    if (!contenedor) {
        return;
    }


    const gastronomia =
        datosViaje?.guia_gastronomica;


    if (!gastronomia) {
        return;
    }


    let restaurantes = [];


    if (
        Array.isArray(
            gastronomia.zonas
        )
    ) {

        gastronomia.zonas.forEach(
            zona => {

                if (
                    !Array.isArray(
                        zona.restaurantes
                    )
                ) {

                    return;

                }


                zona.restaurantes.forEach(
                    restaurante => {

                        restaurantes.push({

                            ...restaurante,

                            zona:
                                restaurante.zona ||
                                zona.nombre ||
                                ""

                        });

                    }
                );

            }
        );

    }


    if (
        restaurantes.length === 0 &&
        Array.isArray(
            gastronomia.restaurantes
        )
    ) {

        restaurantes =
            gastronomia.restaurantes;

    }


    const categorias = [

        "restaurantes",
        "street_food",
        "aperitivo",
        "desayunos",
        "gelato"

    ];


    categorias.forEach(
        categoria => {

            if (
                !Array.isArray(
                    gastronomia[categoria]
                )
            ) {

                return;

            }


            gastronomia[categoria].forEach(
                restaurante => {

                    if (
                        restaurante &&
                        restaurante.nombre
                    ) {

                        restaurantes.push(
                            restaurante
                        );

                    }

                }
            );

        }
    );


    const vistos =
        new Set();


    restaurantes =
        restaurantes.filter(
            restaurante => {

                const clave =
                    restaurante.nombre;


                if (
                    !clave ||
                    vistos.has(clave)
                ) {

                    return false;

                }


                vistos.add(clave);

                return true;

            }
        );


    if (
        restaurantes.length === 0
    ) {

        contenedor.innerHTML = `

            <div class="empty-state">

                <span>
                    🍝
                </span>

                <h3>
                    Próximamente
                </h3>

                <p>
                    Aquí aparecerán nuestros
                    restaurantes.
                </p>

            </div>

        `;

        return;

    }


    contenedor.innerHTML =
        "";


    restaurantes.forEach(
        restaurante => {

            contenedor.appendChild(
                crearTarjetaRestaurante(
                    restaurante
                )
            );

        }
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


    const nombre =
        restaurante.nombre ||
        "Restaurante";


    const descripcion =
        restaurante.descripcion ||
        restaurante.tipo ||
        restaurante.categoria ||
        "Restaurante recomendado";


    const precio =
        restaurante.precio ||
        restaurante.rango_precio ||
        "€€";


    const calidad =
        restaurante.calidad ||
        restaurante.puntuacion ||
        restaurante.rating ||
        "";


    const zona =
        restaurante.zona ||
        restaurante.ubicacion ||
        "";


    const direccion =
        restaurante.direccion ||
        restaurante.address ||
        "";


    const maps =
        restaurante.google_maps ||
        restaurante.maps ||
        restaurante.googleMaps ||
        "";


    const platos =
        restaurante.platos_recomendados ||
        restaurante.recomendados ||
        restaurante.platos ||
        [];


    const platosArray =
        Array.isArray(platos)
            ? platos
            : [];


    const platosHTML =
        platosArray.length > 0
            ? `

                <div class="restaurant-dishes">

                    <h4>
                        🍴 Qué pedir
                    </h4>

                    <ul>

                        ${platosArray
                            .map(
                                plato => `
                                    <li>
                                        ${plato}
                                    </li>
                                `
                            )
                            .join("")
                        }

                    </ul>

                </div>

            `
            : "";


    tarjeta.innerHTML = `

        <div class="restaurant-card-content">

            <div class="restaurant-header">

                <div>

                    <h3>
                        ${nombre}
                    </h3>

                    <p class="restaurant-description">
                        ${descripcion}
                    </p>

                </div>

                <span class="restaurant-price">
                    ${precio}
                </span>

            </div>


            <div class="restaurant-meta">

                ${
                    zona
                        ? `
                            <span class="restaurant-zone">
                                📍 ${zona}
                            </span>
                        `
                        : ""
                }


                ${
                    calidad
                        ? `
                            <span class="restaurant-score">
                                ⭐ ${calidad}
                            </span>
                        `
                        : ""
                }

            </div>


            ${
                direccion
                    ? `
                        <p class="restaurant-address">
                            📍 ${direccion}
                        </p>
                    `
                    : ""
            }


            ${platosHTML}


            ${
                maps
                    ? `
                        <div class="restaurant-actions">

                            <a
                                class="maps-button"
                                href="${maps}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                🗺️ Google Maps
                            </a>

                        </div>
                    `
                    : ""
            }

        </div>

    `;


    return tarjeta;

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
        datosViaje?.viaje?.itinerario;


    if (
        !Array.isArray(itinerario) ||
        itinerario.length === 0
    ) {

        contenedor.innerHTML = `

            <div class="empty-state">

                <span>
                    🗓️
                </span>

                <h3>
                    Itinerario
                </h3>

                <p>
                    Próximamente añadiremos
                    todos los detalles.
                </p>

            </div>

        `;

        return;

    }


    contenedor.innerHTML =
        "";


    itinerario.forEach(
        (dia, index) => {

            const elemento =
                document.createElement(
                    "article"
                );


            elemento.className =
                "itinerary-day";


            const actividades =
                dia.actividades ||
                dia.plan ||
                dia.eventos ||
                [];


            const numero =
                dia.numero ||
                index + 1;


            const titulo =
                dia.titulo ||
                dia.dia ||
                `Día ${numero}`;


            const fecha =
                dia.fecha
                    ? formatearFecha(
                        dia.fecha
                    )
                    : "";


            elemento.innerHTML = `

                <div class="itinerary-day-header">

                    <span class="itinerary-day-number">
                        ${numero}
                    </span>

                    <div>

                        <h3>
                            ${titulo}
                        </h3>

                        ${
                            fecha
                                ? `
                                    <p>
                                        ${fecha}
                                    </p>
                                `
                                : ""
                        }

                    </div>

                </div>


                <div>

                    ${
                        Array.isArray(
                            actividades
                        )
                            ? actividades
                                .map(
                                    actividad =>
                                        crearActividadHTML(
                                            actividad
                                        )
                                )
                                .join("")
                            : ""
                    }

                </div>

            `;


            contenedor.appendChild(
                elemento
            );

        }
    );

}


/* =========================================================
   ACTIVIDAD
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

                <p>
                    ${actividad}
                </p>

            </div>

        `;

    }


    return `

        <div class="itinerary-item">

            ${
                actividad.hora
                    ? `
                        <span class="itinerary-time">
                            ${actividad.hora}
                        </span>
                    `
                    : ""
            }


            <div>

                ${
                    actividad.titulo
                        ? `
                            <h4>
                                ${actividad.titulo}
                            </h4>
                        `
                        : ""
                }


                ${
                    actividad.descripcion
                        ? `
                            <p>
                                ${actividad.descripcion}
                            </p>
                        `
                        : ""
                }

            </div>

        </div>

    `;

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


    const checklist =
        datosViaje
            ?.guia_gastronomica
            ?.checklist;


    if (
        !Array.isArray(checklist)
    ) {

        return;

    }


    contenedor.innerHTML =
        "";


    checklist.forEach(
        (item, index) => {

            const elemento =
                document.createElement(
                    "label"
                );


            elemento.className =
                "checklist-item";


            elemento.innerHTML = `

                <input
                    type="checkbox"
                    data-checklist="${index}"
                >

                <span>
                    ${item}
                </span>

            `;


            contenedor.appendChild(
                elemento
            );

        }
    );


    cargarChecklistGuardado();

}


/* =========================================================
   CHECKLIST STORAGE
   ========================================================= */

function cargarChecklistGuardado() {

    let guardado = [];


    try {

        guardado =
            JSON.parse(
                localStorage.getItem(
                    CONFIG.storage.checklist
                ) || "[]"
            );

    } catch {

        guardado =
            [];

    }


    guardado.forEach(
        index => {

            const checkbox =
                document.querySelector(
                    `[data-checklist="${index}"]`
                );


            if (checkbox) {

                checkbox.checked =
                    true;

            }

        }
    );

}


function guardarChecklist() {

    const seleccionados =
        Array.from(
            document.querySelectorAll(
                "[data-checklist]:checked"
            )
        ).map(
            checkbox =>
                Number(
                    checkbox.dataset.checklist
                )
        );


    localStorage.setItem(
        CONFIG.storage.checklist,
        JSON.stringify(
            seleccionados
        )
    );

}


/* =========================================================
   EVENTOS
   ========================================================= */

function configurarEventos() {


    /*
        Checklist
    */

    document.addEventListener(
        "change",
        event => {

            if (
                event.target.matches(
                    "[data-checklist]"
                )
            ) {

                guardarChecklist();

            }

        }
    );


    /*
        Navegación
    */

    document.addEventListener(
        "click",
        event => {

            const enlace =
                event.target.closest(
                    "[data-section]"
                );


            if (!enlace) {
                return;
            }


            event.preventDefault();


            const seccion =
                enlace.dataset.section;


            cambiarSeccion(
                seccion
            );

        }
    );


    /*
        Abrir regalo
    */

    document.addEventListener(
        "click",
        event => {

            const boton =
                event.target.closest(
                    "#open-gift"
                );


            if (!boton) {
                return;
            }


            abrirRegalo();

        }
    );


    /*
        Descubrir viaje
    */

    document.addEventListener(
        "click",
        event => {

            const boton =
                event.target.closest(
                    "#discover-trip"
                );


            if (!boton) {
                return;
            }


            revelarViaje();

        }
    );

}


/* =========================================================
   NAVEGACIÓN ENTRE PÁGINAS
   ========================================================= */

function cambiarSeccion(
    seccion
) {

    if (
        !estadoApp.viajeDesbloqueado
    ) {

        return;

    }


    const secciones =
        document.querySelectorAll(
            "[data-page]"
        );


    secciones.forEach(
        elemento => {

            elemento.hidden =
                elemento.dataset.page !==
                seccion;

        }
    );


    const enlaces =
        document.querySelectorAll(
            "[data-section]"
        );


    enlaces.forEach(
        enlace => {

            enlace.classList.toggle(
                "active",
                enlace.dataset.section ===
                seccion
            );

        }
    );


    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}


/* =========================================================
   COMPROBAR FECHA
   ========================================================= */

function comprobarFechaReal() {

    const ahora =
        new Date();


    const cumpleanos =
        new Date(
            CONFIG.fechaCumpleanos
        );


    if (
        ahora >= cumpleanos
    ) {

        activarModoCumpleanos();

    } else {

        activarModoPreCumpleanos();

    }

}


/* =========================================================
   PRE-CUMPLEAÑOS
   ========================================================= */

function activarModoPreCumpleanos() {

    if (
        estadoApp.viajeDesbloqueado
    ) {

        return;

    }


    cambiarHero(

        "Tengo algo preparado para ti",

        "Solo tienes que esperar un poquito",

        "🎁 UNA SORPRESA PARA TI"

    );


    ocultarNavegacion();


    const boton =
        document.getElementById(
            "open-gift"
        );


    if (boton) {

        boton.hidden =
            true;

    }


    mostrarPantallaEspera();

}


/* =========================================================
   CUMPLEAÑOS
   ========================================================= */

function activarModoCumpleanos() {

    if (
        estadoApp.viajeDesbloqueado
    ) {

        return;

    }


    cambiarHero(

        "Hoy es un día especial",

        "Tengo un regalo para ti ❤️",

        "🎂 FELIZ CUMPLEAÑOS"

    );


    ocultarNavegacion();


    const boton =
        document.getElementById(
            "open-gift"
        );


    if (boton) {

        boton.hidden =
            false;

        boton.classList.add(
            "gift-ready"
        );

    }


    const waiting =
        document.getElementById(
            "waiting-screen"
        );


    if (waiting) {

        waiting.hidden =
            true;

    }


    const countdown =
        document.getElementById(
            "countdown"
        );


    if (countdown) {

        countdown.innerHTML = `

            <div class="birthday-message">
                ❤️
            </div>

        `;

    }

}


/* =========================================================
   HERO
   ========================================================= */

function cambiarHero(
    titulo,
    subtitulo,
    eyebrow
) {

    const heroTitle =
        document.getElementById(
            "hero-title"
        );


    const heroSubtitle =
        document.getElementById(
            "hero-subtitle"
        );


    const heroEyebrow =
        document.getElementById(
            "hero-eyebrow"
        );


    if (heroTitle) {

        heroTitle.textContent =
            titulo;

    }


    if (heroSubtitle) {

        heroSubtitle.textContent =
            subtitulo;

    }


    if (heroEyebrow) {

        heroEyebrow.textContent =
            eyebrow;

    }

}


/* =========================================================
   ABRIR REGALO
   ========================================================= */

function abrirRegalo() {

    const boton =
        document.getElementById(
            "open-gift"
        );


    if (boton) {

        boton.disabled =
            true;

        boton.classList.add(
            "gift-opening"
        );

    }


    document.body.classList.add(
        "gift-open"
    );


    lanzarConfeti();


    setTimeout(
        mostrarModalRegalo,
        650
    );

}


/* =========================================================
   MODAL
   ========================================================= */

function mostrarModalRegalo() {

    let modal =
        document.getElementById(
            "gift-modal"
        );


    if (!modal) {

        modal =
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
            ></div>


            <div
                class="gift-modal-content"
            >

                <button
                    class="gift-modal-close"
                    id="close-gift-modal"
                    aria-label="Cerrar"
                >
                    ×
                </button>


                <!-- PASO 1 -->

                <div
                    class="gift-step"
                    id="gift-step-1"
                >

                    <div class="gift-big-icon">
                        🎁
                    </div>


                    <p class="gift-small">
                        Tengo algo para ti...
                    </p>


                    <h2>
                        Tu regalo es
                    </h2>


                    <button
                        class="gift-main-button"
                        id="gift-next-1"
                    >
                        Descubrir
                    </button>

                </div>


                <!-- PASO 2 -->

                <div
                    class="gift-step"
                    id="gift-step-2"
                    hidden
                >

                    <div class="gift-big-icon">
                        ✈️
                    </div>


                    <p class="gift-small">
                        Prepara la maleta...
                    </p>


                    <h2>
                        Nos vamos de viaje
                    </h2>


                    <button
                        class="gift-main-button"
                        id="gift-next-2"
                    >
                        ¿A dónde?
                    </button>

                </div>


                <!-- PASO 3 -->

                <div
                    class="gift-step"
                    id="gift-step-3"
                    hidden
                >

                    <div class="gift-big-icon">
                        🇮🇹
                    </div>


                    <p class="gift-small">
                        Nuestro próximo destino
                    </p>


                    <h1>
                        FLORENCIA
                    </h1>


                    <p class="gift-dates">
                        18 — 21 diciembre 2026
                    </p>


                    <button
                        class="gift-main-button"
                        id="discover-trip"
                    >
                        Descubrir nuestro viaje ❤️
                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        configurarEventosModal(
            modal
        );

    }


    modal.classList.add(
        "visible"
    );

}


/* =========================================================
   EVENTOS DEL MODAL
   ========================================================= */

function configurarEventosModal(
    modal
) {

    const cerrar =
        modal.querySelector(
            "#close-gift-modal"
        );


    if (cerrar) {

        cerrar.addEventListener(
            "click",
            () => {

                modal.classList.remove(
                    "visible"
                );

                document.body.classList.remove(
                    "gift-open"
                );

            }
        );

    }


    const overlay =
        modal.querySelector(
            ".gift-modal-overlay"
        );


    if (overlay) {

        overlay.addEventListener(
            "click",
            () => {

                modal.classList.remove(
                    "visible"
                );

                document.body.classList.remove(
                    "gift-open"
                );

            }
        );

    }


    const siguiente1 =
        modal.querySelector(
            "#gift-next-1"
        );


    const siguiente2 =
        modal.querySelector(
            "#gift-next-2"
        );


    if (siguiente1) {

        siguiente1.addEventListener(
            "click",
            () => {

                mostrarPasoRegalo(
                    2
                );

            }
        );

    }


    if (siguiente2) {

        siguiente2.addEventListener(
            "click",
            () => {

                mostrarPasoRegalo(
                    3
                );

            }
        );

    }

}


/* =========================================================
   PASOS DEL REGALO
   ========================================================= */

function mostrarPasoRegalo(
    numero
) {

    document
        .querySelectorAll(
            ".gift-step"
        )
        .forEach(
            paso => {

                paso.hidden =
                    true;

            }
        );


    const paso =
        document.getElementById(
            `gift-step-${numero}`
        );


    if (paso) {

        paso.hidden =
            false;

    }

}


/* =========================================================
   REVELAR VIAJE
   ========================================================= */

async function revelarViaje() {

    guardarViajeDesbloqueado();


    lanzarConfeti();


    const modal =
        document.getElementById(
            "gift-modal"
        );


    if (modal) {

        modal.classList.remove(
            "visible"
        );

    }


    document.body.classList.remove(
        "gift-open"
    );


    await desbloquearYcargarViaje();

}


/* =========================================================
   ACTIVAR VIAJE
   ========================================================= */

function activarViajeDesbloqueado() {

    estadoApp.viajeDesbloqueado =
        true;


    mostrarNavegacion();


    cambiarHero(

        "Nos vamos a Florencia 🇮🇹",

        "18 — 21 diciembre 2026",

        "✨ NUESTRO VIAJE"

    );


    const waiting =
        document.getElementById(
            "waiting-screen"
        );


    if (waiting) {

        waiting.hidden =
            true;

    }


    /*
        Mostrar inicio.
    */

    cambiarSeccion(
        "inicio"
    );

}


/* =========================================================
   CUENTA ATRÁS
   ========================================================= */

function iniciarCuentaAtras() {

    actualizarCuentaAtras();


    setInterval(
        actualizarCuentaAtras,
        1000
    );

}


/* =========================================================
   ACTUALIZAR CUENTA ATRÁS
   ========================================================= */

function actualizarCuentaAtras() {

    if (
        estadoApp.viajeDesbloqueado
    ) {

        return;

    }


    if (
        estadoApp.cumpleanosSimulado
    ) {

        return;

    }


    const ahora =
        new Date();


    const cumpleanos =
        new Date(
            CONFIG.fechaCumpleanos
        );


    const diferencia =
        cumpleanos - ahora;


    if (
        diferencia <= 0
    ) {

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
            (
                diferencia /
                (1000 * 60 * 60)
            ) % 24
        );


    const minutos =
        Math.floor(
            (
                diferencia /
                (1000 * 60)
            ) % 60
        );


    const segundos =
        Math.floor(
            (
                diferencia /
                1000
            ) % 60
        );


    const days =
        document.getElementById(
            "countdown-days"
        );


    const hours =
        document.getElementById(
            "countdown-hours"
        );


    const minutes =
        document.getElementById(
            "countdown-minutes"
        );


    const seconds =
        document.getElementById(
            "countdown-seconds"
        );


    if (days) {

        days.textContent =
            dias;

    }


    if (hours) {

        hours.textContent =
            String(horas)
                .padStart(2, "0");

    }


    if (minutes) {

        minutes.textContent =
            String(minutos)
                .padStart(2, "0");

    }


    if (seconds) {

        seconds.textContent =
            String(segundos)
                .padStart(2, "0");

    }

}


/* =========================================================
   CONFETI
   ========================================================= */

function lanzarConfeti() {

    const cantidad =
        80;


    const simbolos = [

        "❤️",
        "✨",
        "🎉",
        "💝",
        "🎁"

    ];


    for (
        let i = 0;
        i < cantidad;
        i++
    ) {

        const confeti =
            document.createElement(
                "div"
            );


        confeti.className =
            "confetti";


        confeti.textContent =
            simbolos[
                Math.floor(
                    Math.random() *
                    simbolos.length
                )
            ];


        confeti.style.left =
            `${Math.random() * 100}%`;


        confeti.style.animationDelay =
            `${Math.random() * 1.5}s`;


        confeti.style.fontSize =
            `${14 + Math.random() * 20}px`;


        document.body.appendChild(
            confeti
        );


        setTimeout(
            () => {

                confeti.remove();

            },
            4000
        );

    }

}


/* =========================================================
   FORMATEAR FECHA
   ========================================================= */

function formatearFecha(
    fecha
) {

    if (!fecha) {
        return "";
    }


    const date =
        new Date(fecha);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return fecha;

    }


    return new Intl.DateTimeFormat(
        "es-ES",
        {

            day:
                "numeric",

            month:
                "long",

            year:
                "numeric"

        }
    ).format(
        date
    );

}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registrarServiceWorker() {

    /*
        Lo registramos únicamente cuando
        el viaje ya está desbloqueado.

        Así evitamos que el Service Worker
        pueda cachear información del viaje
        antes de tiempo.
    */

    if (
        !estadoApp.viajeDesbloqueado
    ) {

        return;

    }


    if (
        !("serviceWorker" in navigator)
    ) {

        return;

    }


    navigator.serviceWorker
        .register(
            "./service-worker.js"
        )
        .then(
            registro => {

                console.log(
                    "✅ Service Worker:",
                    registro.scope
                );

            }
        )
        .catch(
            error => {

                console.warn(
                    "⚠️ Service Worker:",
                    error
                );

            }
        );

}


/* =========================================================
   DEBUG
   ========================================================= */

console.log(
    "%c🎁 Una sorpresa para ti",
    "font-size:20px;font-weight:bold;"
);

console.log(
    "🛠️ Ctrl + Shift + G → simular cumpleaños"
);

console.log(
    "🔄 Ctrl + Shift + R → reiniciar sorpresa"
);