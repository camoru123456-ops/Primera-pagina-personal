document.addEventListener("DOMContentLoaded", () => {

    // 1. MODO OSCURO / CLARO
    const themeBtn = document.getElementById('themeBtn');
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        themeBtn.textContent = document.body.classList.contains('dark-mode') ? "☀️ Claro" : "🌙 Modo";
    });

    // 2. MENÚ DE NAVEGACIÓN
    const burguerBtn = document.getElementById('burguerBtn');
    const navMenu = document.getElementById('navMenu');
    burguerBtn.addEventListener('click', () => navMenu.classList.toggle('show'));
    navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navMenu.classList.remove('show')));

    // MENÚ DESPLEGABLE EN CADA SECCIÓN (mostrar / ocultar contenido)
    window.toggleSeccion = function (idContenido, boton) {
        const contenido = document.getElementById(idContenido);
        const oculto = contenido.classList.toggle('oculto');
        if (boton) {
            boton.setAttribute('aria-expanded', String(!oculto));
            boton.classList.toggle('cerrado', oculto);
        }
    };

    // 3. MÚSICA: DOBLE SELECCIÓN (género → artista)
    const selGenero = document.getElementById('selGenero');
    const selArtista = document.getElementById('selArtista');
    const tarjetasMusica = document.querySelectorAll('.card-musica');

    function llenarArtistas(genero) {
        selArtista.innerHTML = '<option value="todos">Todos los artistas</option>';
        if (genero === 'todos') {
            selArtista.disabled = true;
            return;
        }
        tarjetasMusica.forEach(card => {
            if (card.dataset.genero === genero) {
                const opt = document.createElement('option');
                opt.value = card.dataset.artista;
                opt.textContent = card.dataset.artista;
                selArtista.appendChild(opt);
            }
        });
        selArtista.disabled = false;
    }

    function filtrarMusica() {
        const genero = selGenero.value;
        const artista = selArtista.value;
        tarjetasMusica.forEach(card => {
            const okGenero = genero === 'todos' || card.dataset.genero === genero;
            const okArtista = artista === 'todos' || card.dataset.artista === artista;
            card.style.display = (okGenero && okArtista) ? '' : 'none';
        });
    }

    selGenero.addEventListener('change', () => {
        llenarArtistas(selGenero.value);
        filtrarMusica();
    });
    selArtista.addEventListener('change', filtrarMusica);

    // FILTRO DE JUEGOS
    const juegosMenuBtn = document.getElementById('juegosMenuBtn');
    const juegosMenu = document.getElementById('juegosMenu');
    juegosMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        juegosMenu.classList.toggle('show');
    });

    window.filtrarJuegos = function (categoria) {
        document.querySelectorAll('.card-juego').forEach(card => {
            card.style.display = (categoria === 'todos' || card.dataset.categoria === categoria) ? 'flex' : 'none';
        });
        juegosMenu.classList.remove('show');
    };

    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!juegosMenu.contains(e.target)) juegosMenu.classList.remove('show');
        if (!navMenu.contains(e.target) && e.target !== burguerBtn) navMenu.classList.remove('show');
    });

    // MODAL DE JUEGOS
    const modalJuego = document.getElementById('modalJuego');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalDescripcion = document.getElementById('modalDescripcion');
    const cerrarModal = document.getElementById('cerrarModal');

    document.querySelectorAll('.card-juego').forEach(card => {
        card.addEventListener('click', () => {
            modalTitulo.textContent = card.dataset.titulo;
            modalDescripcion.textContent = card.dataset.descripcion;
            modalJuego.classList.add('active');
        });
    });
    cerrarModal.addEventListener('click', () => modalJuego.classList.remove('active'));
    window.addEventListener('click', (e) => { if (e.target === modalJuego) modalJuego.classList.remove('active'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modalJuego.classList.remove('active'); });

    // 4. VALIDACIÓN DEL FORMULARIO
    const workForm = document.getElementById('workForm');
    const formGrupos = document.querySelectorAll('.form-group');
    const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+$/;

    function fechaHoy() {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${mm}-${dd}`;
    }

    function validarCampo(tipo, input) {
        if (tipo === 'acepto') return input.checked ? "" : "⚠ Debes aceptar";

        const valor = input.value.trim();
        if (valor === "") return "⚠ Requerido";

        switch (tipo) {
            case 'nombre': {
                const palabras = valor.split(/\s+/);
                if (!palabras.every(p => SOLO_LETRAS.test(p))) return "⚠ Solo letras";
                if (palabras.length < 3) return "⚠ Mín. nombre y 2 apellidos";
                if (palabras.some(p => p.length < 2)) return "⚠ Cada palabra: mín. 2 letras";
                return "";
            }
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(valor) ? "" : "⚠ Correo inválido";
            case 'telefono':
                return /^[67]\d{7}$/.test(valor) ? "" : "⚠ 8 dígitos, inicia con 6 o 7";
            case 'servicio':
                if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(valor)) return "⚠ Solo letras";
                return valor.length < 3 ? "⚠ Mín. 3 letras" : "";
            case 'presupuesto':
                if (!/^[0-9]+$/.test(valor)) return "⚠ Solo números";
                return Number(valor) <= 0 ? "⚠ Debe ser mayor a 0" : "";
            case 'fecha':
                if (isNaN(new Date(valor))) return "⚠ Fecha inválida";
                return valor < fechaHoy() ? "⚠ No puede ser pasada" : "";
            case 'descripcion':
                if (valor.length < 5) return "⚠ Mín. 5 caracteres";
                return valor.length > 200 ? "⚠ Máx. 200 caracteres" : "";
            default:
                return "";
        }
    }

    function mostrarMensaje(span, msg) {
        if (msg) {
            span.textContent = msg;
            span.className = "error-campo msg-error";
        } else {
            span.textContent = "✔ OK";
            span.className = "error-campo msg-exito";
        }
    }

    // Presupuesto y teléfono: bloquea letras mientras se escribe
    ['presupuesto', 'telefono'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    });

    // Fecha mínima = hoy
    document.getElementById('fechaLimite').min = fechaHoy();

    // Validación en vivo (bucle for)
    for (let i = 0; i < formGrupos.length; i++) {
        const grupo = formGrupos[i];
        const input = grupo.querySelector('input');
        const span = grupo.querySelector('.error-campo');
        const tipo = grupo.dataset.tipo;
        const evento = input.type === 'checkbox' ? 'change' : 'input';

        input.addEventListener(evento, () => mostrarMensaje(span, validarCampo(tipo, input)));
    }

    workForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let valido = true;
        let primerError = null;

        for (let i = 0; i < formGrupos.length; i++) {
            const grupo = formGrupos[i];
            const input = grupo.querySelector('input');
            const span = grupo.querySelector('.error-campo');
            const msg = validarCampo(grupo.dataset.tipo, input);

            if (msg) {
                span.textContent = msg;
                span.className = "error-campo msg-error";
                valido = false;
                if (!primerError) primerError = input;
            }
        }

        const alertaBox = document.getElementById('alertaBox');
        if (valido) {
            alertaBox.innerHTML = '<p class="msg-exito" style="margin-top:8px;">✅ ¡Enviado con éxito!</p>';
            workForm.reset();
            formGrupos.forEach(g => {
                const s = g.querySelector('.error-campo');
                s.textContent = "";
                s.className = "error-campo";
            });
            setTimeout(() => { alertaBox.innerHTML = ''; }, 4000);
        } else {
            alertaBox.innerHTML = '<p class="msg-error" style="margin-top:8px;">⚠ Corrige los errores.</p>';
            primerError.focus();
        }
    });

});
