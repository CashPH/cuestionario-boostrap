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
        
        // 1. Verificar el estado HTTP
        if (!response.ok) {
            const errorData = await response.json(); 
            throw new Error(errorData.error || `Error HTTP! Status: ${response.status}`);
        }
        
        // 2. Intentar leer el JSON
        const data = await response.json(); 
        
        // 3. ¡LA CORRECCIÓN CLAVE! Validar que es un array
        if (Array.isArray(data)) {
            preguntas = data;
        } else {
            // Si no es array (es undefined, null, o un objeto {}), lo tratamos como error
            throw new Error("El servidor devolvió un formato incorrecto (no es un array).");
        }


        if (preguntas.length > 0) {
            mostrarPregunta(indiceActual);
        } else {
            cuestionarioContainer.innerHTML = '<p class="alert alert-warning text-center">Base de datos vacía o datos no cargados. Revise la tabla SQL.</p>';
        }
    } catch (error) {
        console.error('Error al cargar las preguntas:', error);
        // Mostrar el mensaje de error capturado
        cuestionarioContainer.innerHTML = `<p class="alert alert-danger text-center">Error de conexión: ${error.message}. Verifique los logs del servidor.</p>`;
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