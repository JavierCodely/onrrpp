Contexto General
Necesito implementar un sistema completo de gestión de mesas para el nightclub, siguiendo una arquitectura similar al sistema de lotes ya existente. Este sistema debe permitir la gestión visual de mesas dentro de sectores, con capacidades de reserva y venta, tracking de comisiones, actualización en tiempo real, gestión de bartenders para consumiciones, y control de escaneos múltiples.

PARTE 1: GESTIÓN DE SECTORES (Panel Admin)
Funcionalidad de Creación de Sectores
El administrador debe poder crear sectores (áreas físicas del club) con los siguientes campos:

Nombre del sector (ej: "VIP Principal", "Terraza", "Salón Central")
Imagen del plano: Upload de una imagen que represente el layout del sector
Asignación de seguridad: Vincular personal de seguridad que podrá escanear QR codes en ese sector específico

Esta funcionalidad debe ser idéntica en flujo y UI a la creación de lotes existente en el panel de admin.

PARTE 2: GESTIÓN DE PERSONAL - NUEVO ROL BARTENDER
Update en Sección de Personal
En la gestión de personal del admin, agregar el rol de "Bartender" siguiendo la misma estructura que "Seguridad":
Funcionalidades del Bartender:

Puede escanear QR codes de mesas vendidas
Propósito específico: Gestionar la entrega de consumiciones incluidas en las mesas
Tiene acceso a una interfaz propia similar a la de seguridad

Implementación con Agente de React:

Copiar la estructura de componentes de "Seguridad"
Adaptar para mostrar información específica de consumiciones
Crear hooks personalizados para gestión de bartenders


PARTE 3: GESTIÓN DE MESAS (Panel Admin)
Creación y Configuración de Mesas
Una vez creado un sector, el admin debe poder agregar mesas dentro de ese sector con los siguientes campos:
Identificación:

ID de mesa (auto-generado)
Nombre/número de mesa (ej: "Mesa 1", "VIP-A")

Estado y Pricing:

Estado: libre, reservado, o vendido
Precio de la mesa

Control de Acceso:

Máximo número de personas: Cuántas veces puede escanearse el QR en seguridad (ej: 5 personas = 5 escaneos máximos)
Este límite solo aplica para seguridad en la entrada
El bartender puede escanear vacias veces hasta que coloque que consumicion fue entregada (para entregar la consumición)

Asignación de RRPP:

ID del RRPP asignado
Comisión para el RRPP
Monto de consumición incluida
Estado de consumición: true (incluye consumición) o false (sin consumición)
Detalle de consumición: Descripción de qué incluye (ej: "1 botella de vodka + mixers")

Posicionamiento Visual:

Coordenada X (posición horizontal en la imagen)
Coordenada Y (posición vertical en la imagen)

Estas coordenadas permitirán colocar la representación de la mesa sobre la imagen del sector en la posición exacta.

PARTE 4: SISTEMA DE ESCANEO DIFERENCIADO
Escaneo por SEGURIDAD (Entrada al Club)
Funcionalidad:

Seguridad escanea el QR de la mesa vendida
El sistema valida:

Si la mesa está vendida (estado vendido)
Si el sector corresponde al asignado a este personal de seguridad
Cuántos escaneos se han realizado vs el máximo permitido


Si no se alcanzó el límite:

Registra el escaneo
Incrementa contador de personas ingresadas
Muestra la imagen del sector con la ubicación exacta de la mesa (círculo destacado)
Permite al cliente encontrar fácilmente su mesa


Si se alcanzó el límite:

Muestra mensaje: "Mesa completa - Límite de personas alcanzado"
No permite más ingresos



Importante: La seguridad puede escanear el QR múltiples veces (hasta el máximo configurado) para permitir que todos los invitados de la mesa ingresen.
Escaneo por BARTENDER (Entrega de Consumición)
Funcionalidad:

Bartender escanea el QR de la mesa vendida
El sistema valida:

Si la mesa incluye consumición (tiene_consumicion = true)
Si la consumición ya fue entregada


Primera vez que se escanea:

Muestra pantalla con información:

Número de mesa
Sector
Detalle de la consumición a entregar (ej: "1 botella vodka Absolut + 2L Coca Cola + hielo")


Botones disponibles:

✅ "Entregado": Marca la consumición como entregada, registra timestamp
❌ "Cancelar": Cierra sin marcar como entregada (por si escaneó por error)




Si ya fue entregada:

Muestra mensaje: "Consumición ya entregada el [fecha/hora]"
No permite re-escaneo
El QR queda "bloqueado" para bartenders



Importante: El bartender solo puede escanear 1 vez por mesa para entregar la consumición. Una vez marcada como entregada, no puede volver a escanearse por bartenders.

PARTE 5: SISTEMA REALTIME Y VISUALIZACIÓN
Actualización en Tiempo Real
Todas las mesas deben tener Supabase Realtime habilitado para que:

Cuando un RRPP reserva una mesa, se actualice instantáneamente para todos los usuarios
Cuando se realiza una venta, el cambio de estado sea inmediato
Cuando se entrega una consumición, se actualice el estado
Cuando se escanea en seguridad, se actualice el contador de personas
Todos los RRPP vean el estado actual sin necesidad de refrescar

Código de Colores y Estados Visuales
En la vista del plano del sector, cada mesa debe mostrarse como un círculo con colores según su estado:

🟢 Verde: Mesa libre (disponible para reserva/venta)
🟡 Amarillo: Mesa reservada (muestra el nombre del RRPP que la reservó)
🔴 Rojo: Mesa vendida (no disponible)

Cuando una mesa está reservada o vendida, debe mostrarse el nombre del RRPP responsable sobre o junto al círculo.

PARTE 6: FUNCIONALIDAD PARA RRPP
Flujo de Reserva
Cuando un RRPP reserva una mesa:

Selecciona la mesa en el plano visual
La mesa cambia a estado reservado
Se asocia el ID del RRPP a la mesa
NO se genera QR code (la reserva solo bloquea la mesa temporalmente)
La mesa aparece en color amarillo para todos
NO se registra comisión aún (no hay venta confirmada)

Flujo de Venta
Cuando un RRPP vende una mesa:

Selecciona la mesa en el plano visual
Ingresa los datos del cliente:

DNI del cliente (obligatorio)
Nombre y email (opcional)


La mesa cambia a estado vendido
Se genera automáticamente un QR code único (igual que el sistema de lotes)
El QR incluye:

ID de la mesa
DNI del cliente
Número máximo de personas permitidas
Datos de consumición (si aplica)
Sector y ubicación


La venta se registra en "Mis Ventas" del RRPP
Se calcula y suma la comisión correspondiente al total del RRPP
La mesa aparece en color rojo para todos
El sistema inicializa:

Contador de escaneos en 0
Estado de consumición en "pendiente" (si tiene consumición)




PARTE 7: INTERFAZ DE RRPP (Frontend React)
Nueva Sección de Mesas
En el panel del RRPP, agregar un botón "Mesas" en la navegación inferior (junto a Ventas, Clientes, etc.).
Vista de Sectores y Mesas
Al acceder a la sección Mesas:

Lista de sectores disponibles

Botón para cada sector creado por el admin
Al hacer clic, se abre la vista del sector


Vista del plano del sector

Imagen de fondo del sector (la subida por el admin)
Mesas representadas como círculos posicionados según coordenadas X e Y
Cada círculo muestra:

Color según estado (verde/amarillo/rojo)
Número o nombre de la mesa
Nombre del RRPP si está reservada/vendida
Indicador visual: "👥 3/5" (personas ingresadas vs máximo)




Interacción con las mesas

Click en mesa verde → Opciones: "Reservar" o "Vender"
Click en mesa amarilla propia → Opciones: "Liberar reserva" o "Convertir a venta"
Click en mesa roja o reservada por otro RRPP → Solo vista de información
Vista de información muestra:

Estado de consumición (entregada/pendiente)
Personas ingresadas
QR code (si está vendida)






PARTE 8: INTERFAZ DE BARTENDER (Frontend React)
Panel de Bartender
Crear una interfaz específica para bartenders con:

Escáner de QR

Botón principal: "Escanear QR de Mesa"
Usa cámara del dispositivo


Pantalla de Validación Post-Escaneo
Si la consumición NO ha sido entregada:

   ┌────────────────────────────────┐
   │  Mesa VIP-3 - Sector Terraza  │
   ├────────────────────────────────┤
   │  🍾 CONSUMICIÓN A ENTREGAR:    │
   │                                │
   │  • 1 Botella Vodka Absolut     │
   │  • 2 Litros Coca Cola          │
   │  • 2 Litros Sprite             │
   │  • Hielo y vasos               │
   │                                │
   │  Cliente: Juan Pérez           │
   │  DNI: 12345678                 │
   ├────────────────────────────────┤
   │  [✅ Marcar como Entregado]    │
   │  [❌ Cancelar]                 │
   └────────────────────────────────┘
Si ya fue entregada:
   ┌────────────────────────────────┐
   │  ⚠️ CONSUMICIÓN YA ENTREGADA   │
   ├────────────────────────────────┤
   │  Mesa VIP-3                    │
   │  Entregada el: 28/01/2026      │
   │  Hora: 23:45                   │
   │  Por: María García (Bartender) │
   │                                │
   │  [Cerrar]                      │
   └────────────────────────────────┘
Si la mesa no incluye consumición:
   ┌────────────────────────────────┐
   │  ℹ️ MESA SIN CONSUMICIÓN       │
   ├────────────────────────────────┤
   │  Esta mesa no incluye          │
   │  consumición prepagada.        │
   │                                │
   │  [Cerrar]                      │
   └────────────────────────────────┘

Historial de Entregas

Lista de consumiciones entregadas por el bartender en el turno
Filtros por fecha/hora
Resumen: "15 consumiciones entregadas hoy"




PARTE 9: INTERFAZ DE SEGURIDAD MEJORADA (Frontend React)
Panel de Seguridad para Sectores Asignados

Escáner de QR

Botón principal: "Escanear QR de Mesa"
Valida que la mesa pertenezca a su sector asignado


Pantalla Post-Escaneo con Mapa
Si aún hay capacidad:

   ┌────────────────────────────────┐
   │  ✅ ACCESO AUTORIZADO          │
   ├────────────────────────────────┤
   │  Mesa VIP-3 - Sector Terraza   │
   │  Cliente: Juan Pérez           │
   │  👥 Personas: 3/5              │
   │                                │
   │  📍 UBICACIÓN DE LA MESA:      │
   │  ┌──────────────────────────┐  │
   │  │   [Imagen del Sector]    │  │
   │  │         ⭕ ← Mesa VIP-3  │  │
   │  │   (círculo destacado)    │  │
   │  └──────────────────────────┘  │
   │                                │
   │  Dirija al cliente a la mesa   │
   │  marcada en el mapa.           │
   │                                │
   │  [Confirmar Ingreso]           │
   └────────────────────────────────┘
Si se alcanzó el límite:
   ┌────────────────────────────────┐
   │  ⛔ MESA COMPLETA               │
   ├────────────────────────────────┤
   │  Mesa VIP-3                    │
   │  👥 Capacidad: 5/5 (LLENO)     │
   │                                │
   │  No se permite más ingresos    │
   │  para esta mesa.               │
   │                                │
   │  [Cerrar]                      │
   └────────────────────────────────┘

Historial de Ingresos

Lista de todos los escaneos realizados en su turno
Filtros por sector, mesa, hora
Información de ocupación en tiempo real




PARTE 10: INTEGRACIÓN Y TRACKING
Registro de Ventas
Cuando se realiza una venta de mesa:

Se crea un registro en la tabla de ventas similar a los lotes
Se vincula: mesa_id, rrpp_id, cliente_dni, precio, comisión
Se genera y almacena el QR code
Se inicializa tracking:

escaneos_seguridad: 0
max_escaneos: según lo configurado por admin
consumicion_entregada: false
bartender_entrega_id: null
fecha_entrega_consumicion: null


Se actualiza el dashboard de "Mis Ventas" del RRPP sumando la comisión

Panel de Comisiones
En la sección "Mis Ventas" del RRPP debe aparecer:

Ventas de lotes (existente)
Ventas de mesas (nuevo) con detalle:

Número de mesa
Sector
Estado de consumición
Personas ingresadas
Comisión ganada


Total de comisiones combinadas
Filtros por tipo de venta, fecha, sector, etc.


PARTE 11: REQUISITOS TÉCNICOS
Stack Tecnológico

Backend: Supabase (PostgreSQL + Realtime + Storage para imágenes)
Frontend: React con hooks personalizados
Generación de QR: Librería similar a la usada en lotes
Upload de imágenes: Supabase Storage para planos de sectores
Escáner QR: Librería compatible con móviles (react-qr-scanner o similar)

Agente de Supabase
Utiliza el agente de Supabase para:

Diseñar el esquema de base de datos (tablas, relaciones, RLS policies)
Agregar campos:

max_personas en tabla mesas
escaneos_seguridad, bartender_entrega_id, fecha_entrega_consumicion
Tabla de historial de escaneos


Configurar Realtime para las tablas de mesas y escaneos
Crear las funciones y triggers necesarios:

Validar límite de escaneos
Bloquear re-escaneo de bartender
Actualizar contadores en tiempo real


Configurar el storage bucket para imágenes de sectores

Agente de React
Utiliza el agente de React para:

Crear los componentes de UI necesarios para:

Admin (gestión de sectores y mesas)
RRPP (venta y reserva de mesas)
Bartender (entrega de consumiciones)
Seguridad (validación de entrada + mapa de ubicación)


Implementar hooks personalizados para:

Gestión de sectores y mesas
Escaneo de QR diferenciado por rol
Tracking de escaneos y entregas


Integrar el posicionamiento visual de mesas sobre imágenes
Manejar los estados y actualización realtime desde Supabase
Implementar validaciones específicas:

Límite de escaneos para seguridad
Bloqueo de re-escaneo para bartender
Visualización del mapa de ubicación




PARTE 12: TABLA RESUMEN DE ESCANEOS
RolPuede EscanearLímiteFunciónPost-EscaneoSeguridadSí, múltiples vecesSegún max_personas configurado por adminValidar entrada de invitadosMuestra mapa con ubicación exacta de la mesaBartenderSí, solo 1 vez1 escaneo únicoEntregar consumiciónMuestra detalle de consumición + botones Entregado/CancelarRRPPNo escanea-Vender y gestionar mesas-AdminNo escanea-Configurar todo el sistema-

RESUMEN DE FLUJOS PRINCIPALES
Para Admin:

Crear sector → Subir imagen → Asignar seguridad
Agregar mesas al sector → Configurar:

Posición (X, Y)
Precio
Comisiones
Máximo de personas
Detalle de consumición


Agregar personal tipo "Bartender" en gestión de personal

Para RRPP:

Acceder a "Mesas"
Seleccionar sector
Ver plano con estado actual de mesas (realtime)
Reservar mesa (sin QR, sin comisión) o Vender mesa (con QR, con comisión)
Ver ventas y comisiones acumuladas
Monitorear estado de consumiciones entregadas

Para Seguridad:

Escanear QR code de entrada
Validar límite de personas
Ver mapa del sector con ubicación exacta de la mesa
Confirmar ingreso (incrementa contador)
Ayudar al cliente a encontrar su mesa

Para Bartender:

Escanear QR code de mesa
Ver detalle de consumición a entregar
Marcar como "Entregado" o "Cancelar"
No poder re-escanear mesas ya entregadas