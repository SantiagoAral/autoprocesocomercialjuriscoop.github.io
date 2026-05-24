# 🏆 Juriscoop MVP – Sistema de Gestión Comercial con Trazabilidad

Plataforma web para la gestión de cartera que **reemplaza el seguimiento manual en Excel/SharePoint** por un modelo digital **centralizado, auditable y medible en tiempo real**.

---

## 🎯 Problema (AS-IS)

En el proceso actual:

- La gestión se realiza en **archivos Excel compartidos**
- Los asesores **sobrescriben información**
- **No existe historial confiable**
- **No hay control de cambios ni timestamps reales**
- Los KPIs son manuales o inexistentes

### Impacto operativo

- Pérdida de información histórica  
- Errores humanos frecuentes  
- Baja visibilidad del desempeño  
- Dificultad para auditoría  

---

## 🚀 Solución (TO-BE)

Se implementa una plataforma que:

- Centraliza la gestión de clientes  
- Registra cada acción como un evento (gestión)  
- Mantiene historial completo (no se sobrescribe)  
- Genera KPIs automáticamente  
- Permite análisis en tiempo real  

> 🔁 **Cambio clave:** de un modelo de “archivo editable” a un modelo **event-driven con trazabilidad total**

---

## 🧠 Principio de diseño

El sistema está basado en un **modelo transaccional de eventos**:

- Cada caso tiene un estado
- Cada cambio genera una **nueva gestión**
- El historial es acumulativo (append-only)

```js
// Cada cambio crea un nuevo registro (no se pierde información)
gestiones.unshift(gestion);
```
📌 Evidencia en código: gestión registrada en asesor.js

## 🏗️ Arquitectura del MVP

### Tipo
- MVP: Frontend puro (cliente)  
- Persistencia: `localStorage`  
- Preparado para migración a Cloud  

### Componentes

| Componente     | Descripción                          |
|---------------|--------------------------------------|
| `index.html`  | Carga y validación de archivos       |
| `asesor.html` | Gestión operativa                    |
| `admin.html`  | Visualización y control              |
| `historial.html` | Trazabilidad (timeline)           |
| `app.js`      | Lógica central                       |
| `asesor.js`   | Registro de gestiones                |
| `historial.js`| Construcción de línea de tiempo      |

---

## 🔄 Flujo operativo

### 1. Ingesta de datos
- Se carga archivo `.xlsx` o `.csv`
- Validación estructural
- Transformación a modelo interno

📌 Interfaz de carga: `index.html`

---

### 2. Generación de casos
- Se crean registros estructurados  
- Se asignan asesores  
- Se inicializa estado (`pendiente`)  

---

### 3. Gestión operativa (Asesor)

El asesor puede:
- Cambiar estado  
- Registrar nota  
- Actualizar actividad  

Cada acción genera:

```json
{
  "caso_id": "GC-0047",
  "estado_anterior": "pendiente",
  "estado_nuevo": "en-gestion",
  "nota": "Cliente contactado",
  "fecha": "timestamp"
}
```

### 4. Persistencia
- Casos → juriscoop_casos
- Historial → juriscoop_gestiones
```js
saveLocalStorage(LS_KEY, casos);
```

### 5. Visualización (Admin)
- KPIs automáticos
- Filtros por estado y asesor
- Vista global del sistema

### 6. Trazabilidad (Historial)
- Línea de tiempo por asesor
- Transiciones de estado
- Fecha + nota
 📌 Implementación: `historial.js`

## 👥 Roles del sistema

| Rol           | Responsabilidad               |
|--------------|-----------------------------|
| Asesor       | Gestionar casos             |
| Administrador| Monitorear KPIs             |
| Sistema      | Registrar y almacenar eventos |

---

## ⚙️ Automatización

### Automatizado
- Registro de cambios  
- Generación de historial  
- Cálculo de KPIs  
- Validación de datos  

### Manual
- Decisión del asesor (gestión comercial)  

📌 **Justificación:**  
La decisión humana se mantiene porque implica contexto comercial.

---

## 📊 KPIs definidos

- Total de casos  
- Pendientes  
- En gestión  
- Completados  
- Actividad por asesor  
- Evolución de estados  

📈 Generados automáticamente desde la base transaccional  

---

## 📦 Modelo de datos

### Caso

```json
{
  "id": "GC-0047",
  "cliente": "Carlos Martínez",
  "producto": "Crédito",
  "asesor": "Laura Gómez",
  "estado": "pendiente",
  "ultima_actividad": null
}
```
```json
Gestión (Evento)
{
  "caso_id": "GC-0047",
  "estado_anterior": "pendiente",
  "estado_nuevo": "en-gestion",
  "nota": "Cliente contactado",
  "fecha": "timestamp"
}
```

## 📊 AS-IS vs TO-BE

| Dimensión     | AS-IS              | TO-BE                |
|--------------|-------------------|----------------------|
| Trazabilidad | ❌ No existe       | ✅ Completa           |
| Errores      | ❌ Altos           | ✅ Reducidos          |
| Tiempo       | ❌ Alto            | ✅ Optimizado         |
| Visibilidad  | ❌ Baja            | ✅ Tiempo real        |
| Control      | ❌ Manual          | ✅ Automatizado       |

---

## 💡 Valor generado

- Eliminación de Excel manual  
- Mejora en control operativo  
- Base para analítica avanzada  
- Escalabilidad tecnológica  

---

## 🔐 Seguridad (MVP)

- Login básico para admin  
- Control de sesión local  

---

## ⚠️ Limitaciones

- Persistencia local  
- No multiusuario real  
- Autenticación básica  

---

## 🔄 Escalabilidad futura

El sistema está preparado para evolucionar a:

- Supabase → base de datos real  
- n8n → automatización de flujos  
- APIs → integración externa  

```js
// Preparado para reemplazar localStorage por API
```
## 🧪 Estado del proyecto

- ✔ MVP funcional  
- ✔ Flujo completo  
- ✔ Trazabilidad implementada  
- ✔ KPIs operativos  
- ✔ UI funcional  

---

## 🧠 Conclusión

Este proyecto no es solo una aplicación, sino una reingeniería del proceso comercial, pasando de:

> Excel manual → Sistema digital con trazabilidad y control  

Esto permite:

- Mejor toma de decisiones  
- Mayor eficiencia operativa  
- Escalabilidad tecnológica  

---

## 🏁 Resultado esperado

- Reducción de errores  
- Mayor productividad  
- Control total de la gestión  
- Preparación para automatización avanzada  

---

## 📌 Evidencia técnica clave

- Registro de gestiones (historial) → `asesor.js`  
- Línea de tiempo → `historial.js`  
- Interfaz de carga → `index.html`  