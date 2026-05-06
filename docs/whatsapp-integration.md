# Integración WhatsApp Agent Kit → Auto-CRM ByOlisJo

## Endpoint

POST https://TU_DOMINIO/api/leads
Content-Type: application/json

> En desarrollo local: http://localhost:3000/api/leads

## Ejemplo de payload mínimo

```json
{
  "telefono": "5512345678",
  "fuente": "whatsapp_agent_kit"
}
```

## Ejemplo de payload completo

```json
{
  "nombre": "María García",
  "telefono": "5512345678",
  "correo": "maria@empresa.com",
  "mensaje": "Hola, quiero saber el precio de automatización de WhatsApp",
  "fuente": "whatsapp_agent_kit",
  "interes": "Automatización WhatsApp",
  "campana": "landing-mayo-2026",
  "metadata": {
    "conversationId": "abc123",
    "platform": "whatsapp"
  }
}
```

## Todos los campos aceptados

| Campo (ES) | Campo (EN) | Tipo | Descripción |
|------------|------------|------|-------------|
| nombre | name | string | Nombre del lead |
| correo | email | string | Email |
| telefono | phone | string | WhatsApp o teléfono |
| empresa | company | string | Empresa u organización |
| mensaje | message | string | Mensaje o consulta |
| notas | notes | string | Notas adicionales |
| fuente | source | string | Origen del lead |
| interes | interest | string | Servicio de interés |
| estado | status | string | Estado inicial |
| campana | campaign | string | Campaña de marketing |
| metadata | metadata | objeto | Datos extra (JSON) |

## Fuentes válidas para `fuente`

- whatsapp_agent_kit — Bot de WhatsApp
- formulario_web — Formulario de la página
- whatsapp — WhatsApp directo
- instagram, linkedin, redes_sociales
- email, manual, webhook, otro

## Respuesta exitosa

### Lead nuevo (201)

```json
{
  "success": true,
  "action": "created",
  "isIncomplete": false,
  "contact": {
    "id": "uuid",
    "name": "María García",
    "phone": "5512345678",
    "source": "whatsapp_agent_kit",
    "temperature": "hot",
    "score": 70,
    "status": "new",
    "isIncomplete": false
  },
  "deal": {
    "id": "uuid",
    "title": "Oportunidad con María García"
  }
}
```

### Lead duplicado (200 — actualizado, no duplicado)

```json
{
  "success": true,
  "action": "updated",
  ...
}
```

## Scoring automático

El CRM detecta intención en el mensaje y ajusta la temperatura:

| Temperatura | Palabras clave detectadas |
|-------------|--------------------------|
| 🔴 Caliente (hot) | precio, presupuesto, cuánto cobras, cotización, contratar, urgente |
| 🟡 Tibio (warm) | ia, automatización, auditoría, página web, whatsapp, crm, agenda, consulta |
| 🔵 Frío (cold) | Sin palabras clave relevantes |

## Detección de duplicados

Si el `telefono` o `correo` ya existe en el CRM:
- No se crea un contacto duplicado
- Se actualiza el contacto existente
- Se registra una nueva actividad con el mensaje
- La respuesta indica `"action": "updated"`

## Integración con n8n

1. Nodo: HTTP Request
2. Method: POST
3. URL: https://TU_DOMINIO/api/leads
4. Body Content Type: JSON
5. Body:

```json
{
  "nombre": "={{ $json.pushName }}",
  "telefono": "={{ $json.from.replace('@s.whatsapp.net', '') }}",
  "mensaje": "={{ $json.body }}",
  "fuente": "whatsapp_agent_kit"
}
```

## Integración con Make (Integromat)

1. Módulo: HTTP → Make a request
2. URL: https://TU_DOMINIO/api/leads
3. Method: POST
4. Body type: Raw
5. Content type: application/json
6. Body: (mismo JSON de arriba)

## Integración con Zapier

1. Action: Webhooks by Zapier → POST
2. URL: https://TU_DOMINIO/api/leads
3. Payload Type: json
4. Data: (campos del formulario/trigger mapeados a los campos de arriba)

## Registrar leads desde correo (manual)

Para registrar un lead recibido por email, usa el endpoint de email:

```
POST /api/leads/email
Content-Type: application/json
```

```json
{
  "from": "Cliente Nombre <cliente@empresa.com>",
  "subject": "Consulta sobre automatización",
  "body": "Hola, vi tu página y me interesa...",
  "receivedAt": "2026-05-06T10:00:00Z"
}
```

O desde Claude Code:
/add-lead → describe el correo recibido → el CRM lo registra automáticamente

## Próximos pasos

- [ ] Configurar dominio de producción en TU_DOMINIO
- [ ] Conectar bot de WhatsApp (Baileys, Twilio, WATI, etc.) al endpoint
- [ ] Opcional: agregar WEBHOOK_SECRET en variables de entorno para seguridad adicional
