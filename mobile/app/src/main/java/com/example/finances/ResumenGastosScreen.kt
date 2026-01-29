package com.example.finances

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ShowChart
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.rounded.PieChart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.foundation.shape.CornerSize
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions

// --- 1. DEFINICIÓN DE COLORES ---
private val White = Color(0xFFFFFFFF)
private val Zinc300 = Color(0xFFD4D4D8)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)
private val Zinc600 = Color(0xFF52525B)
private val Zinc700 = Color(0xFF3F3F46)
private val Zinc800 = Color(0xFF27272A)
private val Zinc900 = Color(0xFF18181B)
private val Zinc950 = Color(0xFF09090B)

// Datos simulados iniciales
private val initialGastos = listOf(
    Gasto(1, "Supermercado Jumbo", "Tarjeta", 45000, "2026-01-10"),
    Gasto(2, "Transporte Uber", "Efectivo", 8000, "2026-01-11"),
    Gasto(3, "Cine Hoyts", "Tarjeta", 12000, "2026-02-12"),
    Gasto(4, "Farmacia Cruz Verde", "Débito", 15000, "2026-02-13"),
    Gasto(5, "Restaurante Italiano", "Crédito", 38000, "2026-02-14"),
    Gasto(6, "Gasolina Shell", "Débito", 32000, "2026-03-15"),
    Gasto(7, "Internet Hogar", "Transferencia", 27000, "2026-03-16"),
    Gasto(8, "Luz Enel", "Transferencia", 21000, "2026-03-17"),
    Gasto(9, "Agua Andina", "Transferencia", 18000, "2026-03-18"),
    Gasto(10, "Comida rápida", "Efectivo", 9000, "2026-03-19"),
    Gasto(11, "Spotify", "Tarjeta", 4300, "2026-04-20"),
    Gasto(12, "Netflix", "Tarjeta", 8900, "2026-04-21"),
    Gasto(13, "Taxi", "Efectivo", 7000, "2026-04-22"),
    Gasto(14, "Panadería", "Efectivo", 3500, "2026-05-23"),
    Gasto(15, "Veterinario", "Débito", 25000, "2026-06-24"),
    Gasto(16, "Ropa Zara", "Crédito", 56000, "2026-07-25"),
    Gasto(17, "Clases Yoga", "Tarjeta", 22000, "2026-07-26"),
    Gasto(18, "Café local", "Efectivo", 2500, "2026-07-27"),
    Gasto(19, "Libro técnico", "Tarjeta", 18000, "2026-08-28"),
    Gasto(20, "Suscripción App", "Crédito", 5900, "2026-08-29")
)

@Composable
fun ResumenGastosScreen(
    presupuestoMensual: Int = 90000,
    metodosVisibles: List<String> = listOf("Crédito", "Débito", "Efectivo")
) {
    var gastos by remember { mutableStateOf(initialGastos) }

    // Estados independientes para cada gráfico
    var mostrarTendencias by remember { mutableStateOf(false) }
    var mostrarMetodos by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Zinc950
    ) {
        LazyColumn(
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            // Header
            item {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Resumen de Gastos",
                        color = White,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = (-1).sp
                    )
                    Text(
                        text = "Controla y analiza tus finanzas mensuales.",
                        color = Zinc400,
                        fontSize = 16.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // --- FILA DE BOTONES PARA GRÁFICOS ---
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Botón Tendencias
                    Button(
                        onClick = { mostrarTendencias = !mostrarTendencias },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (mostrarTendencias) Zinc800 else Zinc900,
                            contentColor = White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, if (mostrarTendencias) Zinc600 else Zinc800),
                        modifier = Modifier.weight(1f).height(50.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ShowChart,
                            contentDescription = null,
                            tint = if (mostrarTendencias) White else Zinc500,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Tendencias",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = if (mostrarTendencias) White else Zinc400
                        )
                    }

                    // Botón Métodos
                    Button(
                        onClick = { mostrarMetodos = !mostrarMetodos },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (mostrarMetodos) Zinc800 else Zinc900,
                            contentColor = White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, if (mostrarMetodos) Zinc600 else Zinc800),
                        modifier = Modifier.weight(1f).height(50.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.PieChart,
                            contentDescription = null,
                            tint = if (mostrarMetodos) White else Zinc500,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Métodos",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = if (mostrarMetodos) White else Zinc400
                        )
                    }
                }
            }

            // --- SECCIÓN DE TENDENCIAS (CONDICIONAL) ---
            if (mostrarTendencias) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Zinc900)
                            .border(1.dp, Zinc800, RoundedCornerShape(12.dp))
                            .padding(top = 16.dp, bottom = 8.dp)
                    ) {
                        Text(
                            text = "Historial Anual vs Presupuesto",
                            color = Zinc400,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(start = 16.dp)
                        )
                        GastosChart(gastos = gastos, presupuestoMensual = presupuestoMensual)
                    }
                }
            }

            // --- SECCIÓN DE MÉTODOS DE PAGO (CONDICIONAL) ---
            if (mostrarMetodos) {
                item {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Zinc900)
                            .border(1.dp, Zinc800, RoundedCornerShape(12.dp))
                            .padding(top = 16.dp, bottom = 8.dp)
                    ) {
                        Text(
                            text = "Gastos por Método de Pago",
                            color = Zinc400,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(start = 16.dp)
                        )
                        MetodoPagoChart(gastos = gastos, metodosAVisualizar = metodosVisibles)
                    }
                }
            }

            // Lista de Gastos
            item {
                ListaGastosSection(gastos = gastos) { nuevoGasto ->
                    gastos = gastos + nuevoGasto.copy(id = (gastos.lastOrNull()?.id ?: 0) + 1)
                }
            }
        }
    }
}

// --- Componentes de la Lista (Sin cambios, pero incluidos para consistencia) ---

@Composable
fun ListaGastosSection(
    gastos: List<Gasto>,
    onAgregarGasto: (Gasto) -> Unit
) {
    var mostrarFormulario by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Zinc900)
            .border(1.dp, Zinc800, RoundedCornerShape(12.dp))
            .padding(24.dp)
    ) {
        Text(
            text = "Lista de Gastos",
            color = White,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        BotonToggleFormulario(mostrarFormulario) {
            mostrarFormulario = !mostrarFormulario
        }

        if (mostrarFormulario) {
            FormularioNuevoGasto(onAgregarGasto) { mostrarFormulario = false }
        }

        Spacer(modifier = Modifier.height(24.dp))

        TablaGastos(gastos)
    }
}

@Composable
fun BotonToggleFormulario(mostrarFormulario: Boolean, onClick: () -> Unit) {
    val containerColor = if (mostrarFormulario) Zinc800 else White
    val contentColor = if (mostrarFormulario) Zinc300 else Zinc950

    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = containerColor, contentColor = contentColor),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.padding(bottom = 16.dp)
    ) {
        Text(
            text = if (mostrarFormulario) "✕ Cancelar" else "+ Añadir gasto",
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormularioNuevoGasto(
    onSave: (Gasto) -> Unit,
    onCancel: () -> Unit
) {
    var descripcion by remember { mutableStateOf("") }
    var metodoPago by remember { mutableStateOf<String?>(null) }
    var monto by remember { mutableStateOf("") }
    var fecha by remember { mutableStateOf(LocalDate.now().toString()) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Zinc900)
            .border(1.dp, Zinc700, RoundedCornerShape(12.dp))
            .padding(16.dp)
            .padding(bottom = 8.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        OutlinedTextField(
            value = descripcion,
            onValueChange = { descripcion = it },
            label = { Text("Descripción") },
            placeholder = { Text("Ej. Compra semanal", color = Zinc600) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Zinc950,
                unfocusedContainerColor = Zinc950,
                focusedBorderColor = White,
                unfocusedBorderColor = Zinc700,
                cursorColor = White,
                focusedLabelColor = White,
                unfocusedLabelColor = Zinc500
            ),
            shape = RoundedCornerShape(8.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = monto,
                onValueChange = { monto = it.filter { char -> char.isDigit() } },
                label = { Text("Monto") },
                placeholder = { Text("0", color = Zinc600) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Zinc950,
                    unfocusedContainerColor = Zinc950,
                    focusedBorderColor = White,
                    unfocusedBorderColor = Zinc700,
                    cursorColor = White,
                    focusedLabelColor = White,
                    unfocusedLabelColor = Zinc500
                ),
                shape = RoundedCornerShape(8.dp)
            )

            OutlinedTextField(
                value = fecha,
                onValueChange = { fecha = it },
                label = { Text("Fecha (YYYY-MM-DD)") },
                singleLine = true,
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Zinc950,
                    unfocusedContainerColor = Zinc950,
                    focusedBorderColor = White,
                    unfocusedBorderColor = Zinc700,
                    cursorColor = White,
                    focusedLabelColor = White,
                    unfocusedLabelColor = Zinc500
                ),
                shape = RoundedCornerShape(8.dp)
            )
        }

        var expanded by remember { mutableStateOf(false) }
        val metodos = listOf("Efectivo", "Tarjeta", "Débito", "Crédito", "Transferencia")

        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = metodoPago ?: "Seleccionar...",
                onValueChange = {},
                readOnly = true,
                label = { Text("Método de Pago") },
                trailingIcon = { Icon(Icons.Filled.ArrowDropDown, null, Modifier.clickable { expanded = true }) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Zinc950,
                    unfocusedContainerColor = Zinc950,
                    focusedBorderColor = White,
                    unfocusedBorderColor = Zinc700,
                    cursorColor = White,
                    focusedLabelColor = White,
                    unfocusedLabelColor = Zinc500
                ),
                shape = RoundedCornerShape(8.dp)
            )
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                metodos.forEach { metodo ->
                    DropdownMenuItem(
                        text = { Text(metodo) },
                        onClick = {
                            metodoPago = metodo
                            expanded = false
                        }
                    )
                }
            }
        }

        Button(
            onClick = {
                if (descripcion.isNotBlank() && metodoPago != null && monto.isNotBlank()) {
                    onSave(Gasto(
                        id = 0,
                        descripcion = descripcion,
                        metodoPago = metodoPago!!,
                        monto = monto.toInt(),
                        fecha = fecha
                    ))
                    onCancel()
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text("Guardar Gasto", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun TablaGastos(gastos: List<Gasto>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Zinc900.copy(alpha = 0.3f))
            .border(1.dp, Zinc800.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Zinc900.copy(alpha = 0.5f))
                .border(1.dp, Zinc800, RoundedCornerShape(12.dp).copy(bottomStart = CornerSize(0.dp), bottomEnd = CornerSize(0.dp)))
                .padding(vertical = 12.dp, horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val headerStyle = MaterialTheme.typography.labelSmall.copy(color = Zinc500, fontWeight = FontWeight.Bold)
            Text("Fecha", modifier = Modifier.weight(0.2f), style = headerStyle, textAlign = TextAlign.Center)
            Text("Descripción", modifier = Modifier.weight(0.5f), style = headerStyle)
            Text("Método", modifier = Modifier.weight(0.3f), style = headerStyle, textAlign = TextAlign.Center)
            Text("Monto", modifier = Modifier.weight(0.3f), style = headerStyle, textAlign = TextAlign.End)
        }

        if (gastos.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxWidth().padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "No hay gastos registrados aún.",
                    color = Zinc600,
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                )
            }
        } else {
            Column {
                gastos.forEachIndexed { index, gasto ->
                    GastoRow(gasto)
                    if (index < gastos.lastIndex) {
                        HorizontalDivider(color = Zinc800.copy(alpha = 0.5f), thickness = 1.dp)
                    }
                }
            }
        }
    }
}

@Composable
fun GastoRow(gasto: Gasto) {
    var isHovered by remember { mutableStateOf(false) }

    val rowModifier = Modifier
        .fillMaxWidth()
        .background(if (isHovered) White else Color.Transparent)
        .clickable { /* Acción al click */ }
        .padding(vertical = 12.dp, horizontal = 16.dp)

    Row(
        modifier = rowModifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = gasto.fecha.split("-").takeLast(2).joinToString("/"),
            modifier = Modifier.weight(0.2f),
            color = if (isHovered) Zinc600 else Zinc400,
            fontSize = 13.sp,
            textAlign = TextAlign.Center
        )

        Text(
            text = gasto.descripcion,
            modifier = Modifier.weight(0.5f),
            color = if (isHovered) Zinc900 else White,
            fontWeight = FontWeight.Medium,
            fontSize = 14.sp,
            maxLines = 1
        )

        Text(
            text = gasto.metodoPago,
            modifier = Modifier.weight(0.3f),
            color = Zinc500,
            fontSize = 12.sp,
            textAlign = TextAlign.Center
        )

        Text(
            text = formatCLP(gasto.monto),
            modifier = Modifier.weight(0.3f),
            color = if (isHovered) Zinc950 else White,
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            textAlign = TextAlign.End,
            fontFamily = FontFamily.Monospace
        )
    }
}

@Preview(showBackground = true)
@Composable
fun PreviewResumenGastosScreen() {
    ResumenGastosScreen()
}
