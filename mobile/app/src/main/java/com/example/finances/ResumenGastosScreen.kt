package com.example.finances

import androidx.compose.animation.animateContentSize
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.foundation.shape.CornerSize
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions

private val White = Color(0xFFFFFFFF)
private val Zinc300 = Color(0xFFD4D4D8)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)
private val Zinc600 = Color(0xFF52525B)
private val Zinc700 = Color(0xFF3F3F46)
private val Zinc800 = Color(0xFF27272A)
private val Zinc900 = Color(0xFF18181B)
private val Zinc950 = Color(0xFF09090B)

private val initialGastos = listOf(
    Gasto(1, "Supermercado Jumbo - Compra del mes con carnes y verduras", "Tarjeta", 45000, "2026-01-10"),
    Gasto(2, "Transporte Uber al centro", "Efectivo", 8000, "2026-01-11"),
    Gasto(3, "Cine Hoyts - Estreno Batman", "Tarjeta", 12000, "2026-02-12"),
    Gasto(4, "Farmacia Cruz Verde - Vitaminas", "Débito", 15000, "2026-02-13"),
    Gasto(5, "Restaurante Italiano - Cena familiar", "Crédito", 38000, "2026-02-14"),
    Gasto(6, "Gasolina Shell - Llenado estanque", "Débito", 32000, "2026-03-15"),
    Gasto(7, "Internet Hogar - Plan 1GB", "Transferencia", 27000, "2026-03-16"),
    Gasto(8, "Luz Enel - Pago Marzo", "Transferencia", 21000, "2026-03-17"),
    Gasto(9, "Agua Andina - Pago Marzo", "Transferencia", 18000, "2026-03-18"),
    Gasto(10, "Comida rápida McDonald's", "Efectivo", 9000, "2026-03-19"),
    Gasto(11, "Mantenimiento Preventivo Auto - Cambio de Aceite y Filtros", "Débito", 120000, "2026-06-15")
)

@Composable
fun ResumenGastosScreen(
    presupuestoMensual: Int = 90000,
    metodosVisibles: List<String> = listOf("Crédito", "Débito", "Efectivo")
) {
    var gastos by remember { mutableStateOf(initialGastos) }
    var mostrarTendencias by remember { mutableStateOf(false) }
    var mostrarMetodos by remember { mutableStateOf(false) }

    Surface(modifier = Modifier.fillMaxSize(), color = Zinc950) {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                    Text("Resumen de Gastos", color = White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp)
                    Text("Controla y analiza tus finanzas mensuales.", color = Zinc400, fontSize = 16.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }

            item {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = { 
                            mostrarTendencias = !mostrarTendencias
                            if (mostrarTendencias) mostrarMetodos = false
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = if (mostrarTendencias) Zinc800 else Zinc900, contentColor = White),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f).height(50.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Rounded.ShowChart, null, modifier = Modifier.size(18.dp), tint = if (mostrarTendencias) White else Zinc500)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Tendencias", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    }

                    Button(
                        onClick = { 
                            mostrarMetodos = !mostrarMetodos
                            if (mostrarMetodos) mostrarTendencias = false
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = if (mostrarMetodos) Zinc800 else Zinc900, contentColor = White),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f).height(50.dp)
                    ) {
                        Icon(Icons.Rounded.PieChart, null, modifier = Modifier.size(18.dp), tint = if (mostrarMetodos) White else Zinc500)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Métodos", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    }
                }
            }

            if (mostrarTendencias) {
                item {
                    ChartContainer("Gasto Mensual") {
                        GastosChart(gastos = gastos, presupuestoMensual = presupuestoMensual)
                    }
                }
            }

            if (mostrarMetodos) {
                item {
                    ChartContainer("Gastos por Método de Pago") {
                        MetodoPagoChart(gastos = gastos, metodosAVisualizar = metodosVisibles)
                    }
                }
            }

            item { ListaGastosSection(gastos = gastos) { nuevo -> gastos = gastos + nuevo.copy(id = (gastos.lastOrNull()?.id ?: 0) + 1) } }
        }
    }
}

@Composable
fun ChartContainer(title: String, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(12.dp)).padding(top = 20.dp, bottom = 12.dp)
    ) {
        Text(text = title, color = Zinc400, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, modifier = Modifier.padding(start = 24.dp))
        Spacer(modifier = Modifier.height(20.dp))
        content()
    }
}

@Composable
fun ListaGastosSection(gastos: List<Gasto>, onAgregarGasto: (Gasto) -> Unit) {
    var mostrarFormulario by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(12.dp)).padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Lista de Gastos", color = White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Button(
                onClick = { mostrarFormulario = !mostrarFormulario }, 
                colors = ButtonDefaults.buttonColors(containerColor = if (mostrarFormulario) Zinc800 else White, contentColor = if (mostrarFormulario) Zinc300 else Zinc950),
                shape = RoundedCornerShape(8.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Text(if (mostrarFormulario) "✕ Cancelar" else "+ Añadir", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            }
        }
        
        if (mostrarFormulario) FormularioNuevoGasto(onAgregarGasto) { mostrarFormulario = false }
        Spacer(modifier = Modifier.height(16.dp))
        TablaGastos(gastos)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormularioNuevoGasto(onSave: (Gasto) -> Unit, onCancel: () -> Unit) {
    var descripcion by remember { mutableStateOf("") }
    var metodoPago by remember { mutableStateOf<String?>(null) }
    var monto by remember { mutableStateOf("") }
    var fecha by remember { mutableStateOf(LocalDate.now().toString()) }
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc950).border(1.dp, Zinc700, RoundedCornerShape(12.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        OutlinedTextField(value = descripcion, onValueChange = { descripcion = it }, label = { Text("Descripción") }, modifier = Modifier.fillMaxWidth(), colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = White, unfocusedBorderColor = Zinc700, cursorColor = White), shape = RoundedCornerShape(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(value = monto, onValueChange = { monto = it.filter { it.isDigit() } }, label = { Text("Monto") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950), shape = RoundedCornerShape(8.dp))
            OutlinedTextField(value = fecha, onValueChange = { fecha = it }, label = { Text("Fecha (YYYY-MM-DD)") }, modifier = Modifier.weight(1f), colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950), shape = RoundedCornerShape(8.dp))
        }
        
        var expanded by remember { mutableStateOf(false) }
        val metodos = listOf("Efectivo", "Tarjeta", "Débito", "Crédito", "Transferencia")
        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = metodoPago ?: "Método de Pago",
                onValueChange = {},
                readOnly = true,
                label = { Text("Método") },
                trailingIcon = { Icon(Icons.Filled.ArrowDropDown, null, Modifier.clickable { expanded = true }) },
                modifier = Modifier.fillMaxWidth().clickable { expanded = true },
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = White, unfocusedBorderColor = Zinc700),
                shape = RoundedCornerShape(8.dp)
            )
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }, modifier = Modifier.background(Zinc900)) {
                metodos.forEach { metodo ->
                    DropdownMenuItem(text = { Text(metodo, color = White) }, onClick = { metodoPago = metodo; expanded = false })
                }
            }
        }
        
        Button(onClick = { if (descripcion.isNotBlank() && metodoPago != null && monto.isNotBlank()) { onSave(Gasto(0, descripcion, metodoPago!!, monto.toInt(), fecha)); onCancel() } }, modifier = Modifier.fillMaxWidth().height(50.dp), colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950)) { Text("Guardar Gasto", fontWeight = FontWeight.Bold) }
    }
}

@Composable
fun TablaGastos(gastos: List<Gasto>) {
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, Zinc800, RoundedCornerShape(12.dp))) {
        Row(modifier = Modifier.fillMaxWidth().background(Zinc900).padding(12.dp)) {
            Text("Fecha", Modifier.weight(0.25f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.Start)
            Text("Descripción", Modifier.weight(0.45f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.Start)
            Text("Monto", Modifier.weight(0.3f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.End)
        }
        gastos.forEach { GastoRow(it) }
    }
}

@Composable
fun GastoRow(gasto: Gasto) {
    var expanded by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = !expanded }
            .animateContentSize()
            .background(if (expanded) Zinc800.copy(alpha = 0.3f) else Color.Transparent)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            val dateParts = gasto.fecha.split("-")
            val formattedDate = if (dateParts.size == 3) "${dateParts[2]}/${dateParts[1]}/${dateParts[0].takeLast(2)}" else gasto.fecha
            
            Text(formattedDate, Modifier.weight(0.25f), color = Zinc400, fontSize = 12.sp, textAlign = TextAlign.Start)
            
            Text(
                text = gasto.descripcion,
                modifier = Modifier.weight(0.45f),
                color = White,
                fontSize = 14.sp,
                maxLines = if (expanded) Int.MAX_VALUE else 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Start
            )
            
            Text(formatCLP(gasto.monto), Modifier.weight(0.3f), color = White, fontWeight = FontWeight.Bold, fontSize = 14.sp, textAlign = TextAlign.End)
        }

        if (expanded) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 12.dp, end = 12.dp, bottom = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "ID: #${gasto.id}",
                    color = Zinc600,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.weight(1f)
                )

                // Cápsula del Método de pago ahora a la derecha
                Surface(
                    color = Zinc800,
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = gasto.metodoPago.uppercase(),
                        color = Zinc400,
                        fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }
        HorizontalDivider(color = Zinc800.copy(alpha = 0.5f), thickness = 0.5.dp)
    }
}
