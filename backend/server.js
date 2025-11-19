const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
const dbConfig = {
    // Render usará la variable de entorno DATABASE_URL
    connectionString: process.env.DATABASE_URL || 'postgresql://cuestionario_db_goho_user:JK2Qqt592xLOPJvfd4tCaDyoerePSQ0l@dpg-d4eh34er433s738n8u8g-a.oregon-postgres.render.com/cuestionario_db_goho',
    

    ssl: {
        rejectUnauthorized: false
    }
};

const pool = new Pool(dbConfig);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // Necesario para parsear el body en el POST

// Servir los archivos estáticos (Frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// --- ENDPOINTS DE LA API ---

// Endpoint 1: Obtener todas las preguntas (sin la respuesta correcta)
app.get('/api/preguntas', async (req, res) => {
    try {
        // Consulta SQL: Obtener todas las preguntas, excluyendo la columna respuesta_correcta.
        const query = 'SELECT id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d FROM preguntas ORDER BY id;';
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener preguntas de la DB:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener preguntas.' });
    }
});

// Endpoint 2: Corregir las respuestas y calcular la puntuación
app.post('/api/corregir', async (req, res) => {
    const respuestasUsuario = req.body; // { "1": "B", "2": "A", ... }
    const ids = Object.keys(respuestasUsuario).map(id => parseInt(id));
    
    if (ids.length === 0) {
        return res.status(400).json({ error: 'No se recibieron respuestas.' });
    }

    try {
        // Consulta SQL: Obtener solo las respuestas correctas de los IDs enviados.
        const query = `
            SELECT id, respuesta_correcta 
            FROM preguntas 
            WHERE id = ANY($1::int[])
            ORDER BY id;
        `;
        const result = await pool.query(query, [ids]);
        
        let puntuacion = 0;
        const totalPreguntas = result.rows.length;

        // Comparar las respuestas
        result.rows.forEach(preguntaDB => {
            const id = preguntaDB.id.toString();
            if (respuestasUsuario[id] === preguntaDB.respuesta_correcta) {
                puntuacion++;
            }
        });

        res.json({ 
            puntuacion: puntuacion,
            total: totalPreguntas,
            mensaje: `¡Has respondido correctamente ${puntuacion} de ${totalPreguntas} preguntas!`
        });
    } catch (error) {
        console.error('Error al corregir respuestas:', error);
        res.status(500).json({ error: 'Error interno del servidor al corregir respuestas.' });
    }
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});