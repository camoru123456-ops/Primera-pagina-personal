$(function () {

    /* ============================================================
       1. TEMA CLARO / OSCURO (con persistencia)
       ============================================================ */
    const $body = $("body");
    const $themeBtn = $("#themeBtn");

    function aplicarTema(oscuro) {
        $body.toggleClass("dark-mode", oscuro);
        $themeBtn.text(oscuro ? "☀️ Claro" : "🌙 Oscuro");
        $("meta[name='theme-color']").attr("content", oscuro ? "#14171b" : "#e6e8ec");
    }

    let temaGuardado = null;
    try { temaGuardado = localStorage.getItem("tema"); } catch (e) { /* sin storage */ }
    aplicarTema(temaGuardado !== "claro");   // por defecto: oscuro

    $themeBtn.on("click", function () {
        const oscuro = !$body.hasClass("dark-mode");
        aplicarTema(oscuro);
        try { localStorage.setItem("tema", oscuro ? "oscuro" : "claro"); } catch (e) { /* sin storage */ }
    });

    /* ============================================================
       2. NAVEGACIÓN INTERNA (SPA): menú hamburguesa + vistas
       ============================================================ */
    const $menuBtn = $("#menuBtn");
    const $navMenu = $("#navMenu");
    const $viewTitle = $("#viewTitle");
    const titulos = {};
    let vistaActual = null;
    let cambiando = false;

    $(".nav-link").each(function () {
        titulos[$(this).data("view")] = $(this).text().trim();
    });

    function cerrarNav() {
        $navMenu.stop(true, true).slideUp(160);
        $menuBtn.attr("aria-expanded", "false");
    }

    $menuBtn.on("click", function (e) {
        e.stopPropagation();
        $navMenu.stop(true, true).slideToggle(180);
        $menuBtn.attr("aria-expanded", String($menuBtn.attr("aria-expanded") !== "true"));
    });

    function marcarActivo(id) {
        $(".nav-link").removeClass("active").filter("[data-view='" + id + "']").addClass("active");
        $viewTitle.text(titulos[id]);
        try { history.replaceState(null, "", "#" + id); } catch (e) { /* sin history */ }
    }

    function irA(id) {
        if (!titulos[id] || id === vistaActual || cambiando) return;
        const $destino = $("#view-" + id);

        if (vistaActual === null) {            // primera carga: sin animación de salida
            $destino.show();
            vistaActual = id;
            marcarActivo(id);
            return;
        }

        cambiando = true;
        marcarActivo(id);
        $("#view-" + vistaActual).fadeOut(140, function () {
            $destino.scrollTop(0).fadeIn(200, function () { cambiando = false; });
            vistaActual = id;
        });
    }

    $(".nav-link").on("click", function () {
        irA($(this).data("view"));
        cerrarNav();
    });
    $(".tile").on("click", function () { irA($(this).data("go")); });

    /* Cerrar menús al hacer clic fuera */
    $(document).on("click", function (e) {
        const $t = $(e.target);
        if (!$t.closest("#navMenu, #menuBtn").length) cerrarNav();
        if (!$t.closest("#juegosMenu, #juegosMenuBtn").length) cerrarJuegosMenu();
    });

    /* Vista inicial: hash válido o inicio */
    const hashInicial = (location.hash || "").replace("#", "");
    irA(titulos[hashInicial] ? hashInicial : "inicio");

    /* ============================================================
       3. CARRUSEL (fadeIn / fadeOut)
       ============================================================ */
    const $slides = $(".slide");
    let slideIdx = 0;
    if ($slides.length > 1) {
        setInterval(function () {
            if (vistaActual !== "inicio") return;
            const $sale = $slides.eq(slideIdx);
            slideIdx = (slideIdx + 1) % $slides.length;
            $sale.fadeOut(500);
            $slides.eq(slideIdx).fadeIn(500);
        }, 3500);
    }

    /* ============================================================
       4. ACORDEÓN DE PASATIEMPOS (solo un panel abierto)
       ============================================================ */
    $(".acc-head").on("click", function () {
        const $head = $(this);
        const $body = $head.next(".acc-body");
        const abierto = $body.is(":visible");

        $(".acc-body").not($body).stop(true, true).slideUp(220)
            .prev(".acc-head").attr("aria-expanded", "false");

        $body.stop(true, true).slideToggle(220);
        $head.attr("aria-expanded", String(!abierto));
    });

    /* ============================================================
       5. HORARIO: resalta la actividad actual
       ============================================================ */
    (function resaltarAhora() {
        const d = new Date();
        const h = d.getHours() + d.getMinutes() / 60;
        $(".tabla tbody tr").each(function () {
            const $f = $(this);
            $f.toggleClass("ahora", h >= Number($f.data("ini")) && h < Number($f.data("fin")));
        });
    })();

    /* ============================================================
       6. PAGINADOR GENÉRICO (evita scroll en listas largas)
       ============================================================ */
    function crearPaginador(cfg) {
        let pagina = 0;

        function pintar($ok, total) {
            cfg.$todos.addClass("is-hidden");
            $ok.slice(pagina * cfg.porPagina, (pagina + 1) * cfg.porPagina).removeClass("is-hidden");
            cfg.$info.text((pagina + 1) + " / " + total);
            cfg.$prev.prop("disabled", pagina === 0);
            cfg.$next.prop("disabled", pagina >= total - 1);
        }

        function render(animar) {
            const $ok = cfg.$todos.filter(function () { return cfg.filtro($(this)); });
            const total = Math.max(1, Math.ceil($ok.length / cfg.porPagina));
            pagina = Math.min(pagina, total - 1);

            if (animar) {
                cfg.$grid.stop(true, true).fadeOut(110, function () {
                    pintar($ok, total);
                    cfg.$grid.fadeIn(180);
                });
            } else {
                pintar($ok, total);
            }
        }

        cfg.$prev.on("click", function () { if (pagina > 0) { pagina--; render(true); } });
        cfg.$next.on("click", function () { pagina++; render(true); });

        return {
            render: render,
            reiniciar: function () { pagina = 0; render(true); }
        };
    }

    /* ============================================================
       7. MÚSICA: doble selección género → artista (dinámico)
       ============================================================ */
    const $selGenero = $("#selGenero");
    const $selArtista = $("#selArtista");
    const $tarjetasMusica = $(".card-musica");

    const pagMusica = crearPaginador({
        $todos: $tarjetasMusica,
        $grid: $("#gridMusica"),
        $prev: $("#musicaPrev"),
        $next: $("#musicaNext"),
        $info: $("#musicaInfo"),
        porPagina: 4,
        filtro: function ($c) {
            const g = $selGenero.val();
            const a = $selArtista.val();
            return (g === "todos" || $c.attr("data-genero") === g) &&
                   (a === "todos" || $c.attr("data-artista") === a);
        }
    });

    function llenarArtistas(genero) {
        $selArtista.html('<option value="todos">Todos los artistas</option>');
        if (genero === "todos") {
            $selArtista.prop("disabled", true);
            return;
        }
        $tarjetasMusica.filter("[data-genero='" + genero + "']").each(function () {
            const artista = $(this).attr("data-artista");
            $("<option>").val(artista).text(artista).appendTo($selArtista);
        });
        $selArtista.prop("disabled", false);
    }

    $selGenero.on("change", function () {
        llenarArtistas($selGenero.val());
        pagMusica.reiniciar();
    });
    $selArtista.on("change", function () { pagMusica.reiniciar(); });
    pagMusica.render(false);

    /* ============================================================
       8. JUEGOS: menú de categorías + modal
       ============================================================ */
    const $juegosMenu = $("#juegosMenu");
    const $juegosMenuBtn = $("#juegosMenuBtn");
    let categoriaJuego = "todos";

    function cerrarJuegosMenu() {
        $juegosMenu.stop(true, true).slideUp(120);
        $juegosMenuBtn.attr("aria-expanded", "false");
    }

    const pagJuegos = crearPaginador({
        $todos: $(".card-juego"),
        $grid: $("#gridJuegos"),
        $prev: $("#juegosPrev"),
        $next: $("#juegosNext"),
        $info: $("#juegosInfo"),
        porPagina: 4,
        filtro: function ($c) {
            return categoriaJuego === "todos" || $c.attr("data-categoria") === categoriaJuego;
        }
    });
    pagJuegos.render(false);

    $juegosMenuBtn.on("click", function (e) {
        e.stopPropagation();
        $juegosMenu.stop(true, true).slideToggle(160);
        $juegosMenuBtn.attr("aria-expanded", String($juegosMenuBtn.attr("aria-expanded") !== "true"));
    });

    $(".btn-filtro-item").on("click", function () {
        categoriaJuego = $(this).attr("data-cat");
        $("#juegosFiltroActual").text($(this).text());
        cerrarJuegosMenu();
        pagJuegos.reiniciar();
    });

    const $modal = $("#modalJuego");

    function cerrarModal() { $modal.stop(true, true).fadeOut(180); }

    $(".card-juego").on("click", function () {
        $("#modalTitulo").text($(this).attr("data-titulo"));
        $("#modalDescripcion").text($(this).attr("data-descripcion"));
        $modal.stop(true, true).fadeIn(200);
    });
    $("#cerrarModal").on("click", cerrarModal);
    $modal.on("click", function (e) { if (e.target === this) cerrarModal(); });

    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            cerrarModal();
            cerrarNav();
            cerrarJuegosMenu();
        }
    });

    /* ============================================================
       9. FORMULARIO POR PASOS + VALIDACIÓN EN VIVO
       ============================================================ */
    const $form = $("#workForm");
    const $pasos = $(".paso");
    const $dots = $(".dot");
    const $grupos = $(".form-group");
    const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$/;
    const TOTAL_PASOS = $pasos.length;
    let paso = 0;

    function fechaHoy() {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return d.getFullYear() + "-" + mm + "-" + dd;
    }

    function validarCampo(tipo, $input) {
        if (tipo === "acepto") return $input.is(":checked") ? "" : "⚠ Debes aceptar";

        const valor = $.trim($input.val());
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

    function mostrarMensaje($span, msg) {
        if (msg) {
            $span.text(msg).attr("class", "error-campo msg-error");
        } else {
            $span.text("✔ OK").attr("class", "error-campo msg-exito");
        }
    }

    function validarGrupo($g) {
        const msg = validarCampo($g.data("tipo"), $g.find("input"));
        mostrarMensaje($g.find(".error-campo"), msg);
        return msg === "";
    }

    /* Presupuesto y teléfono: bloquea letras mientras se escribe */
    $("#presupuesto, #telefono").on("input", function () {
        this.value = this.value.replace(/\D/g, "");
    });

    $("#fechaLimite").attr("min", fechaHoy());

    /* Validación en vivo */
    $grupos.each(function () {
        const $g = $(this);
        const $input = $g.find("input");
        const evento = $input.attr("type") === "checkbox" ? "change" : "input";
        $input.on(evento, function () { validarGrupo($g); });
    });

    /* Navegación entre pasos */
    function actualizarPasoUI() {
        $("#pasoTexto").text("Paso " + (paso + 1) + " de " + TOTAL_PASOS);
        $dots.each(function (i) { $(this).toggleClass("active", i <= paso); });
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
        $pasos.eq(paso).find(".form-group").each(function () {
            if (!validarGrupo($(this)) && !primerError) primerError = $(this).find("input")[0];
        });
        if (primerError) primerError.focus();
        return primerError === null;
    }

    $("#btnSiguiente").on("click", function () {
        if (validarPasoActual() && paso < TOTAL_PASOS - 1) irAPaso(paso + 1);
    });
    $("#btnAtras").on("click", function () { if (paso > 0) irAPaso(paso - 1); });

    /* Envío */
    $form.on("submit", function (e) {
        e.preventDefault();

        if (paso < TOTAL_PASOS - 1) {          // Enter en pasos intermedios = Siguiente
            $("#btnSiguiente").trigger("click");
            return;
        }

        let pasoError = -1;
        let inputError = null;

        $pasos.each(function (i) {
            $(this).find(".form-group").each(function () {
                if (!validarGrupo($(this)) && pasoError === -1) {
                    pasoError = i;
                    inputError = $(this).find("input")[0];
                }
            });
        });

        const $alerta = $("#alertaBox");

        if (pasoError !== -1) {
            $alerta.html('<p class="msg-error">⚠ Corrige los errores.</p>').hide().fadeIn(180);
            irAPaso(pasoError, inputError);
            return;
        }

        $alerta.html('<p class="msg-exito">✅ ¡Enviado con éxito!</p>').hide().fadeIn(200);
        $form[0].reset();
        $(".error-campo").text("").attr("class", "error-campo");

        setTimeout(function () {
            $alerta.fadeOut(250, function () { $alerta.empty().show(); });
            irAPaso(0);
        }, 2200);
    });

    actualizarPasoUI();
});
