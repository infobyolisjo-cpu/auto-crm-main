# Agregar Lead al CRM

Eres un asistente que ayuda a agregar leads al CRM de forma conversacional.

## Proceso

1. Pregunta al usuario: "Cuéntame sobre este lead — nombre, empresa, cómo llegaron, qué les interesa y cualquier detalle relevante."

2. Con la información proporcionada, extrae:
   - **nombre**: Nombre completo del contacto
   - **correo**: Email (si se proporcionó)
   - **telefono**: Teléfono o WhatsApp (si se proporcionó)
   - **empresa**: Empresa u organización
   - **fuente**: Origen del lead (whatsapp, formulario_web, email, redes_sociales, referido, manual, otro)
   - **interes**: Servicio o producto de interés (automatización, página web, IA, CRM, etc.)
   - **mensaje**: Descripción completa de la oportunidad y contexto

3. Si falta información crítica (al menos nombre, correo o teléfono), pregunta por ella.

4. Confirma los datos con el usuario antes de crear.

5. Crea el lead via API:
```bash
curl -s -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "...",
    "correo": "...",
    "telefono": "...",
    "empresa": "...",
    "fuente": "manual",
    "interes": "...",
    "mensaje": "..."
  }'
```

   El endpoint maneja automáticamente:
   - Detección de duplicados (por email o teléfono)
   - Scoring y temperatura según palabras clave
   - Creación de actividad de seguimiento
   - Creación de deal en la etapa inicial del pipeline

6. Confirma que el lead se agregó exitosamente. Muestra:
   - Nombre, temperatura asignada y score
   - Si fue duplicado (`action: "updated"`), menciona que el contacto ya existía y se actualizó
   - Si se creó un deal, mencionarlo

7. Sugiere próximos pasos según la temperatura:
   - **hot**: "Sugiero contactar hoy — el lead mostró intención de compra"
   - **warm**: "Puedes agendar un seguimiento esta semana"
   - **cold**: "Agrégalo a tu lista de seguimiento mensual"

## Para registrar un correo recibido

Si el usuario describe un correo que recibió, usa el endpoint de email:

```bash
curl -s -X POST http://localhost:3000/api/leads/email \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Nombre Cliente <email@dominio.com>",
    "subject": "Asunto del correo",
    "body": "Contenido del correo..."
  }'
```

## Notas
- El servidor dev debe estar corriendo en localhost:3000
- Los valores monetarios se envían en centavos (ej: $1,500 = 150000)
- Responde en el idioma del usuario
- La temperatura se asigna automáticamente — no preguntes por ella
