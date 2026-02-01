package com.example.finances

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ShowChart
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.rounded.PieChart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import androidx.compose.material.icons.filled.ArrowDropDown
import kotlinx.coroutines.launch

private val White = Color(0xFFFFFFFF)
private val Zinc300 = Color(0xFFD4D4D8)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)
private val Zinc600 = Color(0xFF52525B)
private val Zinc700 = Color(0xFF3F3F46)
private val Zinc800 = Color(0xFF27272A)
private val Zinc900 = Color(0xFF18181B)
private val Zinc950 = Color(0xFF09090B)
private val Red500 = Color(0xFFEF4444)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ResumenGastosScreen(
    presupuestoMensual: Int,
    onPresupuestoChanged: (Int) -> Unit,
    metodosVisibles: List<String>,
    onMetodosChanged: (List<String>) -> Unit
) {
    val context = LocalContext.current
    val accentColor = LocalAppAccentColor.current
    val db = remember { AppDatabase.getDatabase(context) }
    val dao = db.gastoDao()
    val scope = rememberCoroutineScope()

    val gastos by dao.getAll().collectAsState(initial = emptyList())
    
    var mostrarTendencias by remember { mutableStateOf(false) }
    var mostrarMetodos by remember { mutableStateOf(false) }
    var showChartSettings by remember { mutableStateOf(false) }

    val sheetState = rememberModalBottomSheetState()

    Surface(modifier = Modifier.fillMaxSize(), color = Zinc950) {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            // HEADER CON ICONO DE AJUSTES
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Resumen de Gastos", color = White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp)
                        Text("Controla y analiza tus finanzas.", color = Zinc400, fontSize = 16.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                    IconButton(
                        onClick = { showChartSettings = true },
                        colors = IconButtonDefaults.iconButtonColors(containerColor = Zinc900)
                    ) {
                        Icon(Icons.Default.Tune, null, tint = accentColor)
                    }
                }
            }

            // BOTONES DE GRÁFICOS
            item {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = { mostrarTendencias = !mostrarTendencias; if (mostrarTendencias) mostrarMetodos = false },
                        colors = ButtonDefaults.buttonColors(containerColor = if (mostrarTendencias) Zinc800 else Zinc900, contentColor = White),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f).height(50.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Rounded.ShowChart, null, modifier = Modifier.size(18.dp), tint = if (mostrarTendencias) White else Zinc500)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Tendencias", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    }

                    Button(
                        onClick = { mostrarMetodos = !mostrarMetodos; if (mostrarMetodos) mostrarTendencias = false },
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

            item { 
                ListaGastosSection(
                    gastos = gastos, 
                    onAgregarGasto = { nuevo -> scope.launch { dao.insert(nuevo) } },
                    onEliminarGasto = { gasto -> scope.launch { dao.delete(gasto) } }
                ) 
            }
        }

        // MODAL DE CONFIGURACIÓN DE GRÁFICOS
        if (showChartSettings) {
            ModalBottomSheet(
                onDismissRequest = { showChartSettings = false },
                sheetState = sheetState,
                containerColor = Zinc900,
                dragHandle = { BottomSheetDefaults.DragHandle(color = Zinc700) }
            ) {
                SettingsPanel(
                    presupuestoActual = presupuestoMensual,
                    onPresupuestoChanged = onPresupuestoChanged,
                    metodosSeleccionados = metodosVisibles,
                    onMetodosChanged = onMetodosChanged
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsPanel(
    presupuestoActual: Int,
    onPresupuestoChanged: (Int) -> Unit,
    metodosSeleccionados: List<String>,
    onMetodosChanged: (List<String>) -> Unit
) {
    val accentColor = LocalAppAccentColor.current
    var tempPresupuesto by remember { mutableStateOf(presupuestoActual.toString()) }
    val todosLosMetodos = listOf("Efectivo", "Tarjeta", "Débito", "Crédito", "Transferencia")

    Column(
        modifier = Modifier.fillMaxWidth().padding(24.dp).padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Text("Configuración de Gráficos", color = White, fontSize = 20.sp, fontWeight = FontWeight.Bold)

        // Presupuesto
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Presupuesto Mensual (Línea Roja)", color = Zinc400, fontSize = 14.sp)
            OutlinedTextField(
                value = tempPresupuesto,
                onValueChange = { 
                    if (it.all { c -> c.isDigit() }) {
                        tempPresupuesto = it
                        it.toIntOrNull()?.let { valInt -> onPresupuestoChanged(valInt) }
                    }
                },
                prefix = { Text("$ ", color = Zinc500) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Zinc950,
                    unfocusedContainerColor = Zinc950,
                    focusedBorderColor = accentColor,
                    focusedTextColor = White,
                    unfocusedTextColor = White,
                    focusedLabelColor = accentColor,
                    cursorColor = accentColor
                ),
                shape = RoundedCornerShape(12.dp)
            )
        }

        // Métodos de Pago
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Métodos Visibles (Gráfico de Barras)", color = Zinc400, fontSize = 14.sp)
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                todosLosMetodos.forEach { metodo ->
                    val isSelected = metodosSeleccionados.contains(metodo)
                    FilterChip(
                        selected = isSelected,
                        onClick = {
                            val newList = if (isSelected) metodosSeleccionados - metodo else metodosSeleccionados + metodo
                            onMetodosChanged(newList)
                        },
                        label = { Text(metodo) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = accentColor,
                            selectedLabelColor = White,
                            containerColor = Zinc800,
                            labelColor = Zinc400
                        ),
                        border = null
                    )
                }
            }
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
fun ListaGastosSection(gastos: List<Gasto>, onAgregarGasto: (Gasto) -> Unit, onEliminarGasto: (Gasto) -> Unit) {
    val accentColor = LocalAppAccentColor.current
    var mostrarFormulario by remember { mutableStateOf(false) }
    var gastoAEliminar by remember { mutableStateOf<Gasto?>(null) }
    var verTodos by remember { mutableStateOf(false) }

    if (gastoAEliminar != null) {
        AlertDialog(
            onDismissRequest = { gastoAEliminar = null },
            containerColor = Zinc900,
            title = { Text("¿Eliminar gasto?", color = White, fontWeight = FontWeight.Bold) },
            text = { Text("Esta acción no se puede deshacer. ¿Realmente quieres borrar \"${gastoAEliminar?.descripcion}\"?", color = Zinc400) },
            confirmButton = { TextButton(onClick = { onEliminarGasto(gastoAEliminar!!); gastoAEliminar = null }) { Text("Eliminar", color = Red500, fontWeight = FontWeight.Bold) } },
            dismissButton = { TextButton(onClick = { gastoAEliminar = null }) { Text("Cancelar", color = Zinc500) } }
        )
    }

    val gastosAMostrar = if (verTodos) gastos else gastos.take(10)

    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(12.dp)).padding(16.dp)) {
        Row(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Lista de Gastos", color = White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Button(onClick = { mostrarFormulario = !mostrarFormulario }, colors = ButtonDefaults.buttonColors(containerColor = if (mostrarFormulario) Zinc800 else White, contentColor = if (mostrarFormulario) Zinc300 else Zinc950), shape = RoundedCornerShape(8.dp)) {
                Text(if (mostrarFormulario) "✕ Cancelar" else "+ Añadir", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            }
        }
        if (mostrarFormulario) FormularioNuevoGasto(onAgregarGasto) { mostrarFormulario = false }
        Spacer(modifier = Modifier.height(16.dp))
        TablaGastos(gastosAMostrar, onEliminarClick = { gastoAEliminar = it })
        
        if (gastos.size > 10) {
            Spacer(modifier = Modifier.height(12.dp))
            TextButton(
                onClick = { verTodos = !verTodos },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.textButtonColors(contentColor = accentColor)
            ) {
                Text(if (verTodos) "Ver menos" else "Ver todos (${gastos.size})", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormularioNuevoGasto(onSave: (Gasto) -> Unit, onCancel: () -> Unit) {
    val accentColor = LocalAppAccentColor.current
    var descripcion by remember { mutableStateOf("") }
    var metodoPago by remember { mutableStateOf<String?>(null) }
    var monto by remember { mutableStateOf("") }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var showDatePicker by remember { mutableStateOf(false) }
    val dateState = rememberDatePickerState(initialSelectedDateMillis = selectedDate.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli())
    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = { TextButton(onClick = { dateState.selectedDateMillis?.let { selectedDate = Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).toLocalDate() }; showDatePicker = false }) { Text("OK", color = accentColor) } },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancelar") } },
            colors = DatePickerDefaults.colors(
                containerColor = Zinc900,
                selectedDayContainerColor = accentColor,
                todayContentColor = accentColor,
                todayDateBorderColor = accentColor
            )
        ) { DatePicker(state = dateState) }
    }
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc950).border(1.dp, Zinc700, RoundedCornerShape(12.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        OutlinedTextField(
            value = descripcion,
            onValueChange = { descripcion = it },
            label = { Text("Descripción") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Zinc950,
                unfocusedContainerColor = Zinc950,
                focusedBorderColor = accentColor,
                cursorColor = accentColor,
                focusedTextColor = White,
                unfocusedTextColor = White,
                focusedLabelColor = accentColor,
                unfocusedLabelColor = Zinc500
            ),
            shape = RoundedCornerShape(8.dp)
        )
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(
                value = monto,
                onValueChange = { monto = it.filter { char -> char.isDigit() } },
                label = { Text("Monto") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Zinc950,
                    unfocusedContainerColor = Zinc950,
                    focusedTextColor = White,
                    unfocusedTextColor = White,
                    focusedBorderColor = accentColor,
                    unfocusedBorderColor = Zinc700,
                    focusedLabelColor = accentColor,
                    unfocusedLabelColor = Zinc500,
                    cursorColor = accentColor
                ),
                shape = RoundedCornerShape(8.dp)
            )
            OutlinedTextField(
                value = selectedDate.format(DateTimeFormatter.ofPattern("dd/MM/yy")),
                onValueChange = {},
                readOnly = true,
                label = { Text("Fecha") },
                trailingIcon = { IconButton(onClick = { showDatePicker = true }) { Icon(Icons.Default.CalendarMonth, null, tint = Zinc400) } },
                modifier = Modifier.weight(1f).clickable { showDatePicker = true },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Zinc950,
                    unfocusedContainerColor = Zinc950,
                    focusedBorderColor = Zinc700,
                    focusedTextColor = White,
                    unfocusedTextColor = White,
                    focusedLabelColor = accentColor,
                    unfocusedLabelColor = Zinc500
                ),
                shape = RoundedCornerShape(8.dp)
            )
        }
        var expanded by remember { mutableStateOf(false) }
        val metodos = listOf("Efectivo", "Tarjeta", "Débito", "Crédito", "Transferencia")
        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = metodoPago ?: "Seleccionar método...",
                onValueChange = {},
                readOnly = true,
                label = { Text("Método de Pago") },
                trailingIcon = { Icon(Icons.Filled.ArrowDropDown, null, Modifier.clickable { expanded = true }) },
                modifier = Modifier.fillMaxWidth().clickable { expanded = true },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Zinc950,
                    unfocusedContainerColor = Zinc950,
                    focusedBorderColor = accentColor,
                    unfocusedBorderColor = Zinc700,
                    focusedTextColor = White,
                    unfocusedTextColor = White,
                    focusedLabelColor = accentColor,
                    unfocusedLabelColor = Zinc500,
                    cursorColor = accentColor
                ),
                shape = RoundedCornerShape(8.dp)
            )
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }, modifier = Modifier.background(Zinc900)) {
                metodos.forEach { metodo -> DropdownMenuItem(text = { Text(metodo, color = White) }, onClick = { metodoPago = metodo; expanded = false }) }
            }
        }
        Button(
            onClick = { try { if (descripcion.isNotBlank() && metodoPago != null && monto.isNotBlank()) { onSave(Gasto(0, descripcion, metodoPago!!, monto.toInt(), selectedDate.toString())); onCancel() } } catch (e: Exception) {} },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Guardar Gasto", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun TablaGastos(gastos: List<Gasto>, onEliminarClick: (Gasto) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, Zinc800, RoundedCornerShape(12.dp))) {
        Row(modifier = Modifier.fillMaxWidth().background(Zinc900).padding(12.dp)) {
            Text("Fecha", Modifier.weight(0.25f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.Start)
            Text("Descripción", Modifier.weight(0.45f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.Start)
            Text("Monto", Modifier.weight(0.3f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.End)
        }
        if (gastos.isEmpty()) { Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { Text("No hay gastos registrados", color = Zinc600, fontSize = 13.sp) } }
        else { gastos.forEach { GastoRow(it, onEliminarClick) } }
    }
}

@Composable
fun GastoRow(gasto: Gasto, onEliminarClick: (Gasto) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded }.animateContentSize().background(if (expanded) Zinc800.copy(alpha = 0.3f) else Color.Transparent)) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            val formattedDate = try { LocalDate.parse(gasto.fecha).format(DateTimeFormatter.ofPattern("dd/MM/yy")) } catch (e: Exception) { gasto.fecha }
            Text(formattedDate, Modifier.weight(0.25f), color = Zinc400, fontSize = 12.sp, textAlign = TextAlign.Start)
            Text(text = gasto.descripcion, modifier = Modifier.weight(0.45f), color = White, fontSize = 14.sp, maxLines = if (expanded) Int.MAX_VALUE else 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Start)
            Text(formatCLP(gasto.monto), Modifier.weight(0.3f), color = White, fontWeight = FontWeight.Bold, fontSize = 14.sp, textAlign = TextAlign.End)
        }
        if (expanded) {
            Row(modifier = Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, bottom = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { onEliminarClick(gasto) }, modifier = Modifier.size(24.dp)) { Icon(Icons.Default.Delete, null, tint = Red500.copy(alpha = 0.7f), modifier = Modifier.size(20.dp)) }
                Surface(color = Zinc800, shape = RoundedCornerShape(4.dp)) { Text(text = gasto.metodoPago.uppercase(), color = Zinc400, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp) }
            }
        }
        HorizontalDivider(color = Zinc800.copy(alpha = 0.5f), thickness = 0.5.dp)
    }
}
