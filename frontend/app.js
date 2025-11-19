const cuestionarioContainer = document.getElementById('cuestionario-container');
const btnSiguiente = document.getElementById('btn-siguiente');
const btnAnterior = document.getElementById('btn-anterior');
const btnFinalizar = document.getElementById('btn-finalizar');

// ¡IMPORTANTE! Reemplaza esto con la URL que te dé Render para tu Web Service
// NO es la URL de la base de datos, sino la URL pública de tu API.
const API_URL = 'https://cuestionario-api.onrender.com/api'; 

let preguntas = [];
let indiceActual = 0;
let respuestasUsuario = {}; 

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_URL}/preguntas`);
        // ⚠️ CLAVE: Verifica si la respuesta es OK antes de leer el JSON
        if (!response.ok) {
             // Si la respuesta no es 200 (OK), lanzamos un error que se captura abajo
             const errorData = await response.json(); // Intenta leer el JSON de error
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }
        
        preguntas = await response.json(); 

        // ⚠️ CLAVE: Verifica que el JSON sea un array de preguntas (es la fuente del error 'forEach')
        if (Array.isArray(preguntas) && preguntas.length > 0) {
            mostrarPregunta(indiceActual);
        } else {
            // Esto manejaría el caso donde la DB esté vacía
            cuestionarioContainer.innerHTML = '<p class="text-danger text-center">Error: La base de datos no devolvió preguntas (¡puede estar vacía!).</p>';
        }
    } catch (error) {
        console.error('Error al cargar las preguntas:', error);
        // Mostrar el mensaje de error capturado
        cuestionarioContainer.innerHTML = `<p class="alert alert-danger text-center">Error de conexión: ${error.message}. Verifica los logs del servidor.</p>`;
    }
});

// Función principal para mostrar una pregunta
function mostrarPregunta(indice) {
    const preguntaData = preguntas[indice];
    if (!preguntaData) return;

    let html = `
        <h4 class="card-title text-center mb-4">Pregunta ${indice + 1} de ${preguntas.length}</h4>
        <p class="fs-5">${preguntaData.pregunta}</p>
        <div class="opciones-list">
    `;

    // Crear las opciones de respuesta como botones de radio de Bootstrap
    preguntaData.opciones.forEach(opcion => {
        const letra = opcion.charAt(0);
        const checked = respuestasUsuario[preguntaData.id] === letra ? 'checked' : '';
        html += `
            <div class="form-check my-3">
                <input class="form-check-input" type="radio" name="respuesta" 
                    id="opcion-${letra}" value="${letra}" ${checked} 
                    data-id-pregunta="${preguntaData.id}">
                <label class="form-check-label" for="opcion-${letra}">
                    ${opcion}
                </label>
            </div>
        `;
    });

    html += `</div>`;
    cuestionarioContainer.innerHTML = html;

    // Actualizar estado de los botones
    actualizarNavegacion();

    // Añadir listener para guardar la respuesta al seleccionar
    document.querySelectorAll('input[name="respuesta"]').forEach(input => {
        input.addEventListener('change', guardarRespuesta);
    });
}

function guardarRespuesta(event) {
    const id = event.target.dataset.idPregunta;
    const valor = event.target.value;
    respuestasUsuario[id] = valor;
}

function actualizarNavegacion() {
    // Botón Anterior
    btnAnterior.disabled = indiceActual === 0;

    // Botón Siguiente / Finalizar
    if (indiceActual === preguntas.length - 1) {
        btnSiguiente.style.display = 'none';
        btnFinalizar.style.display = 'inline-block';
    } else {
        btnSiguiente.style.display = 'inline-block';
        btnFinalizar.style.display = 'none';
    }
}

// Eventos de navegación
btnSiguiente.addEventListener('click', () => {
    if (indiceActual < preguntas.length - 1) {
        indiceActual++;
        mostrarPregunta(indiceActual);
    }
});

btnAnterior.addEventListener('click', () => {
    if (indiceActual > 0) {
        indiceActual--;
        mostrarPregunta(indiceActual);
    }
});

btnFinalizar.addEventListener('click', async () => {
    // 2. Enviar respuestas al Backend para corrección
    try {
        const response = await fetch(`${API_URL}/corregir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(respuestasUsuario)
        });

        const resultado = await response.json();
        
        // 3. Mostrar el resultado usando el Modal de Bootstrap
        document.getElementById('puntuacion-final').textContent = `${resultado.puntuacion} / ${resultado.total}`;
        document.getElementById('mensaje-final').textContent = resultado.mensaje;
        
        // Inicializar y mostrar el modal
        const modalElement = document.getElementById('resultadoModal');
        const resultadoModal = new bootstrap.Modal(modalElement);
        resultadoModal.show();

    } catch (error) {
        alert('Error al enviar las respuestas al servidor.');
        console.error('Error al corregir:', error);
    }
});