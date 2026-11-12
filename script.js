/* ============================================================
   script.js — compartido por index.html e index2.html
   - Todos los eventos usan delegación sobre document ($(document).on(...))
     con el espacio de nombres ".app": se registran UNA sola vez, funcionan
     con elementos dinámicos y se pueden retirar con $(document).off(".app").
   - Cada bloque se ignora solo si su página no tiene esos elementos.
   ============================================================ */
$(function () {
    "use strict";

    const $doc = $(document);
    const $cuerpo = $("body");
    const RETRASO_HIDRATACION = 500;     // ms (puedes bajarlo o poner 0)

    // Respeta "reducir movimiento" del sistema
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        $.fx.off = true;
    }

    /* ============================================================
       1. TEMA CLARO / OSCURO (con persistencia)
       ============================================================ */
    function aplicarTema(oscuro) {
        $cuerpo.toggleClass("modo-oscuro", oscuro);
        $("#btnTema").text(oscuro ? "☀️ Claro" : "🌙 Oscuro");
    }

    let temaGuardado = null;
    try { temaGuardado = localStorage.getItem("tema"); } catch (e) { /* sin almacenamiento */ }
    aplicarTema(temaGuardado !== "claro");                      // por defecto: oscuro

    $doc.on("click.app", "#btnTema", function () {
        const oscuro = !$cuerpo.hasClass("modo-oscuro");
        aplicarTema(oscuro);
        try { localStorage.setItem("tema", oscuro ? "oscuro" : "claro"); } catch (e) { /* sin almacenamiento */ }
    });

    /* ============================================================
       2. AVISO TEMPORAL
       ============================================================ */
    let temporizadorAviso = null;

    function mostrarAviso(texto) {
        const $aviso = $("#avisoEstado");
        clearTimeout(temporizadorAviso);
        $aviso.stop(true, true).text(texto).fadeIn(150);
        temporizadorAviso = setTimeout(function () { $aviso.fadeOut(250); }, 1800);
    }

    /* ============================================================
       3. INDICADOR DE RED EN TIEMPO REAL (navigator.onLine)
       ============================================================ */
    function actualizarEstadoRed(avisar) {
        const enLinea = navigator.onLine;
        $("#estadoRed").toggleClass("estado-red--sin-conexion", !enLinea);
        $("#estadoRedTexto").text(enLinea ? "En línea" : "Modo Offline Activo");
        $("#datoConexion").text(enLinea ? "En línea" : "Sin conexión");
        if (avisar) {
            mostrarAviso(enLinea ? "Conexión restablecida" : "Sin conexión: modo offline activo");
        }
    }

    $(window).on("online.app offline.app", function () { actualizarEstadoRed(true); });
    actualizarEstadoRed(false);

    /* ============================================================
       4. MENÚS DESPLEGABLES (hamburguesa y filtros) — genérico
          botón: data-desplegable="idDelMenu"   menú: .menu-desplegable
       ============================================================ */
    function cerrarDesplegables($excepto) {
        $(".menu-desplegable:visible").not($excepto || $()).each(function () {
            const $menu = $(this);
            $menu.stop(true, true).slideUp(140);
            $('[data-desplegable="' + this.id + '"]').attr("aria-expanded", "false");
        });
    }

    $doc.on("click.app", "[data-desplegable]", function () {
        const $boton = $(this);
        const $menu = $("#" + $boton.attr("data-desplegable"));
        $menu.stop(true, true);
        const abrir = !$menu.is(":visible");

        cerrarDesplegables($menu);
        $menu.slideToggle(180);
        $boton.attr("aria-expanded", String(abrir));
    });

    // Clic fuera de cualquier menú: se cierran
    $doc.on("click.app", function (e) {
        if (!$(e.target).closest(".menu-desplegable, [data-desplegable]").length) cerrarDesplegables();
    });

    /* ============================================================
       5. NAVEGACIÓN INTERNA (SPA): vistas conmutables
       ============================================================ */
    const titulos = {};
    let vistaActual = null;
    let cambiando = false;

    $(".menu-enlace[data-vista]").each(function () {
        titulos[$(this).attr("data-vista")] = $(this).text().trim();
    });

    function marcarActivo(id) {
        $(".menu-enlace[data-vista]").removeClass("menu-enlace--activo")
            .filter('[data-vista="' + id + '"]').addClass("menu-enlace--activo");
        $("#tituloVista").text(titulos[id]);
        try { history.replaceState(null, "", "#" + id); } catch (e) { /* sin history */ }
    }

    function irA(id) {
        if (!titulos[id] || id === vistaActual || cambiando) return;
        const $destino = $("#vista-" + id);

        if (vistaActual === null) {                  // primera carga: sin animación de salida
            $destino.show();
            vistaActual = id;
            marcarActivo(id);
            actualizarDatos(id);
            return;
        }

        cambiando = true;
        marcarActivo(id);
        $("#vista-" + vistaActual).fadeOut(140, function () {
            vistaActual = id;
            actualizarDatos(id);
            $destino.scrollTop(0).fadeIn(200, function () { cambiando = false; });
        });
    }

    $doc.on("click.app", "[data-vista]", function () {
        irA($(this).attr("data-vista"));
        cerrarDesplegables();
    });
    $doc.on("click.app", "[data-ir]", function () { irA($(this).attr("data-ir")); });

    /* ============================================================
       6. CARRUSEL DE INICIO (fadeIn / fadeOut)
       ============================================================ */
    const $diapositivas = $(".diapositiva");
    let indiceDiapositiva = 0;
    let temporizadorCarrusel = null;

    if ($diapositivas.length > 1) {
        temporizadorCarrusel = setInterval(function () {
            if (vistaActual !== "inicio" || document.hidden) return;
            const $sale = $diapositivas.eq(indiceDiapositiva);
            indiceDiapositiva = (indiceDiapositiva + 1) % $diapositivas.length;
            $sale.fadeOut(500);
            $diapositivas.eq(indiceDiapositiva).fadeIn(500);
        }, 3500);
    }
    $(window).on("pagehide.app", function () { clearInterval(temporizadorCarrusel); });

    /* ============================================================
       7. ACORDEÓN (solo un panel abierto)
       ============================================================ */
    $doc.on("click.app", ".acordeon-cabecera", function () {
        const $cabecera = $(this);
        const $cuerpoPanel = $cabecera.next(".acordeon-cuerpo");
        const abierto = $cuerpoPanel.is(":visible");

        $(".acordeon-cuerpo").not($cuerpoPanel).stop(true, true).slideUp(220)
            .prev(".acordeon-cabecera").attr("aria-expanded", "false");

        $cuerpoPanel.stop(true, true).slideToggle(220);
        $cabecera.attr("aria-expanded", String(!abierto));
    });

    /* ============================================================
       8. HORARIO: resalta la actividad actual
       ============================================================ */
    function resaltarHorario() {
        const ahora = new Date();
        const hora = ahora.getHours() + ahora.getMinutes() / 60;
        $(".tabla-horario tbody tr").each(function () {
            const $fila = $(this);
            $fila.toggleClass("es-actual",
                hora >= Number($fila.attr("data-inicio")) && hora < Number($fila.attr("data-fin")));
        });
    }

    /* ============================================================
       9. LISTAS PAGINADAS (evitan el scroll) — genérico
          contenedor: [data-lista="id"] (hijos .elemento-lista)
          botones:    [data-pag="id"][data-dir="-1|1"]
          contador:   [data-pag-info="id"]
       ============================================================ */
    const paginas = {};            // id -> índice de página actual
    const filtrosLista = {};       // id -> función($elemento) que decide si se muestra

    function renderLista(id, animar) {
        const $lista = $('[data-lista="' + id + '"]');
        if (!$lista.length) return;

        const porPagina = Number($lista.attr("data-por-pagina")) || 4;
        const filtro = filtrosLista[id] || function () { return true; };
        const $todos = $lista.children(".elemento-lista");
        const $visibles = $todos.filter(function () { return filtro($(this)); });
        const total = Math.max(1, Math.ceil($visibles.length / porPagina));

        paginas[id] = Math.min(paginas[id] || 0, total - 1);

        function pintar() {
            const desde = paginas[id] * porPagina;
            $todos.addClass("es-oculto");
            $visibles.slice(desde, desde + porPagina).removeClass("es-oculto");
            $('[data-pag-info="' + id + '"]').text((paginas[id] + 1) + " / " + total);
            $('[data-pag="' + id + '"][data-dir="-1"]').prop("disabled", paginas[id] === 0);
            $('[data-pag="' + id + '"][data-dir="1"]').prop("disabled", paginas[id] >= total - 1);
        }

        if (animar) {
            $lista.stop(true, true).fadeOut(110, function () {
                pintar();
                $lista.fadeIn(180);
            });
        } else {
            pintar();
        }
    }

    $doc.on("click.app", "[data-pag]", function () {
        const id = $(this).attr("data-pag");
        paginas[id] = Math.max(0, (paginas[id] || 0) + Number($(this).attr("data-dir")));
        renderLista(id, true);
    });

    /* ============================================================
       10. MÚSICA: doble selección género → artista (dinámico)
       ============================================================ */
    filtrosLista.musica = function ($tarjeta) {
        const genero = $("#selGenero").val();
        const artista = $("#selArtista").val();
        return (genero === "todos" || $tarjeta.attr("data-genero") === genero) &&
               (artista === "todos" || $tarjeta.attr("data-artista") === artista);
    };

    function llenarArtistas(genero) {
        const $selArtista = $("#selArtista");
        $selArtista.html('<option value="todos">Todos los artistas</option>');

        if (genero === "todos") {
            $selArtista.prop("disabled", true);
            return;
        }
        $('[data-lista="musica"] .elemento-lista[data-genero="' + genero + '"]').each(function () {
            const artista = $(this).attr("data-artista");
            $("<option>").val(artista).text(artista).appendTo($selArtista);
        });
        $selArtista.prop("disabled", false);
    }

    $doc.on("change.app", "#selGenero", function () {
        llenarArtistas($(this).val());
        paginas.musica = 0;
        renderLista("musica", true);
    });
    $doc.on("change.app", "#selArtista", function () {
        paginas.musica = 0;
        renderLista("musica", true);
    });

    /* ============================================================
       11. FILTROS POR MENÚ DESPLEGABLE (juegos y catálogo)
           opción: [data-filtro="id"][data-valor="categoria"]
       ============================================================ */
    const categoriaActiva = { juegos: "todos", catalogo: "todos" };

    function crearFiltroCategoria(id) {
        return function ($elemento) {
            return categoriaActiva[id] === "todos" || $elemento.attr("data-categoria") === categoriaActiva[id];
        };
    }
    filtrosLista.juegos = crearFiltroCategoria("juegos");
    filtrosLista.catalogo = crearFiltroCategoria("catalogo");

    function etiquetaDe(id) {
        return $("#etiqueta" + id.charAt(0).toUpperCase() + id.slice(1));
    }

    $doc.on("click.app", "[data-filtro]", function () {
        const id = $(this).attr("data-filtro");
        categoriaActiva[id] = $(this).attr("data-valor");
        etiquetaDe(id).text($(this).text());
        cerrarDesplegables();
        paginas[id] = 0;
        renderLista(id, true);
    });

    /* ============================================================
       12. DIÁLOGO DE DETALLE (juegos y proyectos)
       ============================================================ */
    const $dialogo = $("#dialogoDetalle");
    let $focoPrevio = null;

    function abrirDialogo($origen) {
        $focoPrevio = $origen;
        $("#dialogoTitulo").text($origen.attr("data-titulo"));
        $("#dialogoTexto").text($origen.attr("data-descripcion"));
        $dialogo.stop(true, true).fadeIn(200, function () {
            $dialogo.find("[data-cerrar-dialogo]").trigger("focus");
        });
    }

    function cerrarDialogo() {
        if (!$dialogo.is(":visible")) return;
        $dialogo.stop(true, true).fadeOut(180, function () {
            if ($focoPrevio && $focoPrevio.length) $focoPrevio.trigger("focus");
        });
    }

    $doc.on("click.app", "[data-abrir-dialogo]", function () { abrirDialogo($(this)); });
    $doc.on("keydown.app", "[data-abrir-dialogo]", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrirDialogo($(this));
        }
    });
    $doc.on("click.app", "[data-cerrar-dialogo]", cerrarDialogo);
    $doc.on("click.app", "#dialogoDetalle", function (e) { if (e.target === this) cerrarDialogo(); });

    $doc.on("keydown.app", function (e) {
        if (e.key === "Escape") {
            cerrarDialogo();
            cerrarDesplegables();
        }
    });

    /* ============================================================
       13. FORMULARIO POR PASOS + VALIDACIÓN EN VIVO
       ============================================================ */
    const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$/;
    const $formulario = $("#formSolicitud");
    const $pasos = $(".paso-formulario");
    const TOTAL_PASOS = $pasos.length;
    let paso = 0;

    function fechaHoy() {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return d.getFullYear() + "-" + mm + "-" + dd;
    }

    function validarCampo(tipo, $entrada) {
        if (tipo === "acepto") return $entrada.is(":checked") ? "" : "⚠ Debes aceptar";

        const valor = String($entrada.val()).trim();
        if (valor === "") return "⚠ Requerido";

        switch (tipo) {
            case "nombre": {
                const palabras = valor.split(/\s+/);
                if (!palabras.every(function (p) { return SOLO_LETRAS.test(p); })) return "⚠ Solo letras";
                if (palabras.length < 3) return "⚠ Mín. nombre y 2 apellidos";
                if (palabras.some(function (p) { return p.length < 2; })) return "⚠ Cada palabra: mín. 2 letras";
                return "";
            }
            case "email":
                return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(valor) ? "" : "⚠ Correo inválido";
            case "telefono":
                return /^[67]\d{7}$/.test(valor) ? "" : "⚠ 8 dígitos, inicia con 6 o 7";
            case "servicio":
                if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(valor)) return "⚠ Solo letras";
                return valor.length < 3 ? "⚠ Mín. 3 letras" : "";
            case "presupuesto":
                if (!/^[0-9]+$/.test(valor)) return "⚠ Solo números";
                return Number(valor) <= 0 ? "⚠ Debe ser mayor a 0" : "";
            case "fecha":
                if (isNaN(new Date(valor))) return "⚠ Fecha inválida";
                return valor < fechaHoy() ? "⚠ No puede ser pasada" : "";
            case "descripcion":
                if (valor.length < 5) return "⚠ Mín. 5 caracteres";
                return valor.length > 200 ? "⚠ Máx. 200 caracteres" : "";
            default:
                return "";
        }
    }

    function validarGrupo($grupo) {
        const msg = validarCampo($grupo.attr("data-tipo"), $grupo.find("input"));
        $grupo.find(".mensaje-campo")
            .text(msg || "✔ OK")
            .attr("class", "mensaje-campo " + (msg ? "mensaje--error" : "mensaje--ok"));
        return msg === "";
    }

    $("#fechaLimite").attr("min", fechaHoy());

    // Validación en vivo (delegada). Teléfono y presupuesto: bloquea letras al escribir
    $doc.on("input.app change.app", ".campo-grupo input", function () {
        if ($(this).is("#presupuesto, #telefono")) this.value = this.value.replace(/\D/g, "");
        validarGrupo($(this).closest(".campo-grupo"));
    });

    function actualizarPasoUI() {
        $("#textoPaso").text("Paso " + (paso + 1) + " de " + TOTAL_PASOS);
        $(".punto").each(function (i) { $(this).toggleClass("es-activo", i <= paso); });
        $("#btnAtras").prop("disabled", paso === 0);
        $("#btnSiguiente").toggle(paso < TOTAL_PASOS - 1);
        $("#btnEnviar").toggle(paso === TOTAL_PASOS - 1);
    }

    function irAPaso(n, enfocar) {
        if (n === paso) { if (enfocar) enfocar.focus(); return; }
        $pasos.eq(paso).fadeOut(120, function () {
            paso = n;
            $pasos.eq(paso).fadeIn(180, function () { if (enfocar) enfocar.focus(); });
            actualizarPasoUI();
        });
    }

    function validarPasoActual() {
        let primerError = null;
        $pasos.eq(paso).find(".campo-grupo").each(function () {
            if (!validarGrupo($(this)) && !primerError) primerError = $(this).find("input")[0];
        });
        if (primerError) primerError.focus();
        return primerError === null;
    }

    $doc.on("click.app", "#btnSiguiente", function () {
        if (validarPasoActual() && paso < TOTAL_PASOS - 1) irAPaso(paso + 1);
    });
    $doc.on("click.app", "#btnAtras", function () { if (paso > 0) irAPaso(paso - 1); });

    $doc.on("submit.app", "#formSolicitud", function (e) {
        e.preventDefault();

        if (paso < TOTAL_PASOS - 1) {                 // Enter en pasos intermedios = Siguiente
            $("#btnSiguiente").trigger("click");
            return;
        }

        let pasoError = -1;
        let entradaError = null;

        $pasos.each(function (i) {
            $(this).find(".campo-grupo").each(function () {
                if (!validarGrupo($(this)) && pasoError === -1) {
                    pasoError = i;
                    entradaError = $(this).find("input")[0];
                }
            });
        });

        const $caja = $("#cajaMensaje");

        if (pasoError !== -1) {
            $caja.html('<p class="mensaje--error">⚠ Corrige los errores.</p>').hide().fadeIn(180);
            irAPaso(pasoError, entradaError);
            return;
        }

        $caja.html('<p class="mensaje--ok">✅ ¡Enviado con éxito!</p>').hide().fadeIn(200);
        $formulario[0].reset();
        $(".mensaje-campo").text("").attr("class", "mensaje-campo");

        setTimeout(function () {
            $caja.fadeOut(250, function () { $caja.empty().show(); });
            irAPaso(0);
        }, 2200);
    });

    function reiniciarFormulario() {
        if (!$formulario.length) return;
        $formulario[0].reset();
        $(".mensaje-campo").text("").attr("class", "mensaje-campo");
        $("#cajaMensaje").empty();
        $pasos.hide().eq(0).show();
        paso = 0;
        actualizarPasoUI();
    }

    /* ============================================================
       14. PANEL DE ESTADO PWA (index2.html)
       ============================================================ */
    function cargarPanelEstado() {
        if (!$("#datoServicio").length) return;

        const instalada = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
                          window.navigator.standalone === true;
        $("#datoModo").text(instalada ? "App instalada" : "Navegador");
        $("#datoConexion").text(navigator.onLine ? "En línea" : "Sin conexión");

        if (!("serviceWorker" in navigator)) {
            $("#datoServicio").text("No compatible");
        } else {
            navigator.serviceWorker.getRegistration().then(function (reg) {
                let texto = "Sin registrar";
                if (reg) texto = reg.active ? "Activo" : (reg.installing ? "Instalando…" : (reg.waiting ? "En espera" : "—"));
                $("#datoServicio").text(texto);
            });
        }

        if (!("caches" in window)) {
            $("#datoCache").text("No compatible");
            $("#datoArchivos").text("—");
            return;
        }
        caches.keys().then(function (nombres) {
            $("#datoCache").text(nombres.length ? nombres.join(", ") : "Vacía");
            return Promise.all(nombres.map(function (n) {
                return caches.open(n).then(function (c) { return c.keys(); }).then(function (k) { return k.length; });
            }));
        }).then(function (cantidades) {
            $("#datoArchivos").text(cantidades.reduce(function (a, b) { return a + b; }, 0));
        });
    }

    // Instalación de la app (cuando el navegador la ofrece)
    let eventoInstalacion = null;

    window.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault();
        eventoInstalacion = e;
        $("#btnInstalar").removeClass("es-oculto");
    });
    window.addEventListener("appinstalled", function () {
        eventoInstalacion = null;
        $("#btnInstalar").addClass("es-oculto");
        mostrarAviso("App instalada");
        cargarPanelEstado();
    });

    $doc.on("click.app", "#btnInstalar", function () {
        if (!eventoInstalacion) return;
        eventoInstalacion.prompt();
        eventoInstalacion.userChoice.then(function () {
            eventoInstalacion = null;
            $("#btnInstalar").addClass("es-oculto");
        });
    });

    $doc.on("click.app", "#btnActualizar", function () {
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.getRegistration().then(function (reg) {
            if (!reg) { mostrarAviso("Service Worker sin registrar"); return; }
            return reg.update().then(function () {
                mostrarAviso("Búsqueda de actualización completada");
                cargarPanelEstado();
            });
        }).catch(function () { mostrarAviso("No se pudo buscar: sin conexión"); });
    });

    /* ============================================================
       15. REFRESCO GLOBAL (delegado): botones con data-refrescar
           "vista"    -> recarga suave: reinicia estados + actualiza datos
           "hidratar" -> vuelve a ejecutar la hidratación
           "total"    -> location.reload()
       ============================================================ */
    const reseteadores = {
        inicio: function () {
            indiceDiapositiva = 0;
            $diapositivas.stop(true, true).hide().eq(0).show();
        },
        pasatiempos: function () {
            $(".acordeon-cuerpo").stop(true, true).hide().first().show();
            $(".acordeon-cabecera").attr("aria-expanded", "false").first().attr("aria-expanded", "true");
        },
        musica: function () {
            $("#selGenero").val("todos");
            llenarArtistas("todos");
            paginas.musica = 0;
            renderLista("musica", false);
        },
        juegos: function () {
            categoriaActiva.juegos = "todos";
            etiquetaDe("juegos").text("Todos");
            paginas.juegos = 0;
            renderLista("juegos", false);
        },
        catalogo: function () {
            categoriaActiva.catalogo = "todos";
            etiquetaDe("catalogo").text("Todos");
            paginas.catalogo = 0;
            renderLista("catalogo", false);
        },
        trabajos: reiniciarFormulario
    };

    const actualizadores = {
        horario: resaltarHorario,
        estado: cargarPanelEstado
    };

    function actualizarDatos(id) {
        if (actualizadores[id]) actualizadores[id]();
    }

    function refrescarVista(id, $boton) {
        if (!id) return;
        const $vista = $("#vista-" + id);

        if ($boton && $boton.length) {
            $boton.addClass("esta-girando");
            setTimeout(function () { $boton.removeClass("esta-girando"); }, 650);
        }

        $vista.stop(true, true).fadeTo(120, 0.35, function () {
            if (reseteadores[id]) reseteadores[id]();
            actualizarDatos(id);
            actualizarEstadoRed(false);
            $vista.fadeTo(180, 1);
        });
        mostrarAviso("Vista actualizada");
    }

    $doc.on("click.app", "[data-refrescar]", function () {
        const $boton = $(this);
        const modo = $boton.attr("data-refrescar");

        if (modo === "total") {
            mostrarAviso("Recargando…");
            setTimeout(function () { location.reload(); }, 250);
        } else if (modo === "hidratar") {
            rehidratar($boton);
        } else {
            refrescarVista(vistaActual, $boton);
        }
    });

    /* ============================================================
       16. HIDRATACIÓN DE LA INTERFAZ
       El HTML llega estático (botones deshabilitados y
       data-hidratado="false"). Como los eventos son delegados,
       hidratar = activar los botones y marcar data-hidratado="true".
       Es idempotente: ejecutarla dos veces no cambia nada.
       ============================================================ */
    function hidratarInterfaz() {
        const $caja = $("#contenedorMenu");
        if ($caja.attr("data-hidratado") === "true") return false;   // ya hidratado

        $("#btnMenu").text("☰");
        $caja.find(".boton-icono").prop("disabled", false).removeClass("boton-pendiente");
        $caja.attr("data-hidratado", "true");
        return true;
    }

    function rehidratar($boton) {
        const $etiqueta = $boton.find(".etiqueta-boton");

        $boton.prop("disabled", true);
        $etiqueta.text(" Hidratando…");
        cerrarDesplegables();

        // Vuelve al estado estático
        $("#contenedorMenu").attr("data-hidratado", "false")
            .find(".boton-icono").prop("disabled", true).addClass("boton-pendiente");
        $("#btnMenu").text("⏳");

        setTimeout(function () {
            hidratarInterfaz();
            $boton.prop("disabled", false);
            $etiqueta.text(" Hidratado ✔");
            mostrarAviso("Interfaz hidratada");
        }, RETRASO_HIDRATACION);
    }

    /* ============================================================
       17. ARRANQUE
       ============================================================ */
    $("[data-lista]").each(function () { renderLista($(this).attr("data-lista"), false); });
    resaltarHorario();
    actualizarPasoUI();

    const hashInicial = (location.hash || "").replace("#", "");
    const primeraVista = $(".menu-enlace[data-vista]").first().attr("data-vista");
    irA(titulos[hashInicial] ? hashInicial : primeraVista);

    setTimeout(hidratarInterfaz, RETRASO_HIDRATACION);
});
