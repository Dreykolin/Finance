package com.example.finances

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
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
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
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

@OptIn(ExperimentalMaterial3Api::class)
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
    var selectedTab by remember { mutableIntStateOf(0) }
    var showChartSettings by remember { mutableStateOf(false) }
    
    // Orden de los gráficos (0: Tendencias, 1: Métodos)
    var chartOrder by remember { mutableStateOf(listOf(0, 1)) }

    val sheetState = rememberModalBottomSheetState()

    Surface(modifier = Modifier.fillMaxSize(), color = Zinc950) {
        Column(modifier = Modifier.fillMaxSize()) {
            // HEADER
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(top = 24.dp, bottom = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Finanzas", color = White, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp)
                    Text("Gestión de gastos", color = Zinc500, fontSize = 14.sp)
                }
                IconButton(
                    onClick = { showChartSettings = true },
                    colors = IconButtonDefaults.iconButtonColors(containerColor = Zinc900)
                ) {
                    Icon(Icons.Default.Tune, null, tint = accentColor)
                }
            }

            // TABS
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.Transparent,
                contentColor = accentColor,
                indicator = { tabPositions ->
                    if (selectedTab < tabPositions.size) {
                        TabRowDefaults.SecondaryIndicator(
                            Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = accentColor
                        )
                    }
                },
                divider = { HorizontalDivider(color = Zinc900) }
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("ANÁLISIS", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                    selectedContentColor = accentColor,
                    unselectedContentColor = Zinc500
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("HISTORIAL", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                    selectedContentColor = accentColor,
                    unselectedContentColor = Zinc500
                )
            }

            // CONTENIDO
            Box(modifier = Modifier.weight(1f)) {
                if (selectedTab == 0) {
                    // PESTAÑA ANÁLISIS (GRÁFICOS)
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(24.dp),
                        verticalArrangement = Arrangement.spacedBy(20.dp)
                    ) {
                        item {
                            Text("Dashboard", color = Zinc400, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        }
                        
                        items(chartOrder) { type ->
                            if (type == 0) {
                                ChartContainer(
                                    title = "Tendencia Mensual",
                                    onLongPress = {
                                        chartOrder = chartOrder.reversed()
                                    }
                                ) {
                                    GastosChart(gastos = gastos, presupuestoMensual = presupuestoMensual)
                                }
                            } else {
                                ChartContainer(
                                    title = "Distribución de Métodos",
                                    onLongPress = {
                                        chartOrder = chartOrder.reversed()
                                    }
                                ) {
                                    MetodoPagoChart(gastos = gastos, metodosAVisualizar = metodosVisibles)
                                }
                            }
                        }
                        
                        item {
                            Box(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), contentAlignment = Alignment.Center) {
                                Text("Mantén presionado un gráfico para reordenar", color = Zinc700, fontSize = 11.sp)
                            }
                        }
                    }
                } else {
                    // PESTAÑA HISTORIAL (LISTA)
                    ListaGastosSection(
                        gastos = gastos, 
                        onAgregarGasto = { nuevo -> scope.launch { dao.insert(nuevo) } },
                        onEliminarGasto = { gasto -> scope.launch { dao.delete(gasto) } }
                    )
                }
            }
        }

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

@Composable
fun ChartContainer(title: String, onLongPress: () -> Unit, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Zinc900)
            .border(1.dp, Zinc800, RoundedCornerShape(16.dp))
            .pointerInput(Unit) {
                detectDragGesturesAfterLongPress(
                    onDragStart = { onLongPress() },
                    onDrag = { _, _ -> },
                    onDragEnd = { },
                    onDragCancel = { }
                )
            }
            .padding(vertical = 20.dp)
    ) {
        Text(text = title.uppercase(), color = Zinc500, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp, modifier = Modifier.padding(start = 24.dp))
        Spacer(modifier = Modifier.height(16.dp))
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

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("MOVIMIENTOS", color = Zinc500, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                Button(
                    onClick = { mostrarFormulario = !mostrarFormulario }, 
                    colors = ButtonDefaults.buttonColors(containerColor = if (mostrarFormulario) Zinc800 else White, contentColor = if (mostrarFormulario) Zinc300 else Zinc950), 
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Text(if (mostrarFormulario) "Cerrar" else "+ Añadir", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        if (mostrarFormulario) {
            item { FormularioNuevoGasto(onAgregarGasto) { mostrarFormulario = false } }
        }

        item {
            Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(16.dp))) {
                Row(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                    Text("Fecha", Modifier.weight(0.25f), color = Zinc600, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Text("Descripción", Modifier.weight(0.45f), color = Zinc600, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Text("Monto", Modifier.weight(0.3f), color = Zinc600, fontSize = 10.sp, textAlign = TextAlign.End, fontWeight = FontWeight.Bold)
                }
                if (gastos.isEmpty()) { 
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { 
                        Text("No hay registros", color = Zinc700, fontSize = 13.sp) 
                    } 
                } else {
                    gastosAMostrar.forEach { GastoRow(it, onEliminarClick = { gastoAEliminar = it }) }
                }
            }
        }

        if (gastos.size > 10) {
            item {
                TextButton(
                    onClick = { verTodos = !verTodos },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.textButtonColors(contentColor = accentColor)
                ) {
                    Text(if (verTodos) "Ver menos historial" else "Ver todos los movimientos (${gastos.size})", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun FormularioNuevoGasto(onSave: (Gasto) -> Unit, onCancel: () -> Unit) {
    val accentColor = LocalAppAccentColor.current
    var descripcion by remember { mutableStateOf("") }
    var metodoPago by remember { mutableStateOf<String?>(null) }
    var monto by remember { mutableStateOf("") }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var showDatePicker by remember { mutableStateOf(false) }
    
    val metodos = listOf("Efectivo", "Tarjeta", "Débito", "Crédito", "Transferencia")

    if (showDatePicker) {
        val dateState = rememberDatePickerState(initialSelectedDateMillis = selectedDate.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = { TextButton(onClick = { dateState.selectedDateMillis?.let { selectedDate = Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).toLocalDate() }; showDatePicker = false }) { Text("OK", color = accentColor) } },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancelar") } },
            colors = DatePickerDefaults.colors(containerColor = Zinc900, selectedDayContainerColor = accentColor, todayContentColor = accentColor, todayDateBorderColor = accentColor)
        ) { DatePicker(state = dateState) }
    }

    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Zinc900.copy(alpha = 0.5f)).border(1.dp, Zinc800, RoundedCornerShape(16.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        OutlinedTextField(
            value = descripcion, onValueChange = { descripcion = it }, label = { Text("¿En qué gastaste?") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = accentColor, cursorColor = accentColor, focusedTextColor = White, unfocusedTextColor = White, focusedLabelColor = accentColor),
            shape = RoundedCornerShape(12.dp)
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = monto, onValueChange = { monto = it.filter { c -> c.isDigit() } }, label = { Text("Monto") },
                modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = accentColor, cursorColor = accentColor, focusedTextColor = White, unfocusedTextColor = White, focusedLabelColor = accentColor),
                shape = RoundedCornerShape(12.dp)
            )
            OutlinedTextField(
                value = selectedDate.format(DateTimeFormatter.ofPattern("dd/MM/yy")), onValueChange = {}, readOnly = true, label = { Text("Fecha") },
                trailingIcon = { IconButton(onClick = { showDatePicker = true }) { Icon(Icons.Default.CalendarMonth, null, tint = Zinc500) } },
                modifier = Modifier.weight(1f).clickable { showDatePicker = true },
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = Zinc700, focusedTextColor = White, unfocusedTextColor = White, focusedLabelColor = accentColor),
                shape = RoundedCornerShape(12.dp)
            )
        }
        
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("MÉTODO DE PAGO", color = Zinc500, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                metodos.forEach { metodo ->
                    val isSelected = metodoPago == metodo
                    FilterChip(
                        selected = isSelected,
                        onClick = { metodoPago = metodo },
                        label = { Text(metodo, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = accentColor,
                            selectedLabelColor = White,
                            containerColor = Zinc800,
                            labelColor = Zinc500
                        ),
                        border = null,
                        shape = RoundedCornerShape(8.dp)
                    )
                }
            }
        }

        Button(
            onClick = { if (descripcion.isNotBlank() && metodoPago != null && monto.isNotBlank()) { onSave(Gasto(0, descripcion, metodoPago!!, monto.toInt(), selectedDate.toString())); onCancel() } },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = accentColor, contentColor = White),
            shape = RoundedCornerShape(12.dp)
        ) { Text("Guardar Registro", fontWeight = FontWeight.Bold) }
    }
}

@Composable
fun GastoRow(gasto: Gasto, onEliminarClick: () -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Column(modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded }.animateContentSize().background(if (expanded) Zinc800.copy(alpha = 0.3f) else Color.Transparent)) {
        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            val formattedDate = try { LocalDate.parse(gasto.fecha).format(DateTimeFormatter.ofPattern("dd/MM/yy")) } catch (e: Exception) { gasto.fecha }
            Text(formattedDate, Modifier.weight(0.25f), color = Zinc500, fontSize = 12.sp)
            Text(text = gasto.descripcion, modifier = Modifier.weight(0.45f), color = White, fontSize = 14.sp, maxLines = if (expanded) Int.MAX_VALUE else 1, overflow = TextOverflow.Ellipsis)
            Text(formatCLP(gasto.monto), Modifier.weight(0.3f), color = White, fontWeight = FontWeight.Bold, fontSize = 14.sp, textAlign = TextAlign.End)
        }
        if (expanded) {
            Row(modifier = Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, bottom = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onEliminarClick, modifier = Modifier.size(24.dp)) { Icon(Icons.Default.Delete, null, tint = Red500.copy(alpha = 0.7f), modifier = Modifier.size(20.dp)) }
                Surface(color = Zinc800, shape = RoundedCornerShape(4.dp)) { Text(text = gasto.metodoPago.uppercase(), color = Zinc400, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontWeight = FontWeight.Bold, letterSpacing = 0.5.sp) }
            }
        }
        HorizontalDivider(color = Zinc800.copy(alpha = 0.5f), thickness = 0.5.dp)
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

    Column(modifier = Modifier.fillMaxWidth().padding(24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Text("Configuración Visual", color = White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Presupuesto Mensual", color = Zinc400, fontSize = 14.sp)
            OutlinedTextField(
                value = tempPresupuesto, onValueChange = { if (it.all { c -> c.isDigit() }) { tempPresupuesto = it; it.toIntOrNull()?.let { v -> onPresupuestoChanged(v) } } },
                prefix = { Text("$ ", color = Zinc500) }, modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = accentColor, focusedTextColor = White, unfocusedTextColor = White, focusedLabelColor = accentColor, cursorColor = accentColor),
                shape = RoundedCornerShape(12.dp)
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Métodos Visibles", color = Zinc400, fontSize = 14.sp)
            FlowRow(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                todosLosMetodos.forEach { metodo ->
                    val isSelected = metodosSeleccionados.contains(metodo)
                    FilterChip(
                        selected = isSelected,
                        onClick = { onMetodosChanged(if (isSelected) metodosSeleccionados - metodo else metodosSeleccionados + metodo) },
                        label = { Text(metodo) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = accentColor, selectedLabelColor = White, containerColor = Zinc800, labelColor = Zinc400),
                        border = null
                    )
                }
            }
        }
    }
}
