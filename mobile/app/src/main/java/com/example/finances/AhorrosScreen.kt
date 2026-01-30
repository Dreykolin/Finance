package com.example.finances

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val White = Color(0xFFFFFFFF)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)
private val Zinc600 = Color(0xFF52525B)
private val Zinc700 = Color(0xFF3F3F46)
private val Zinc800 = Color(0xFF27272A)
private val Zinc900 = Color(0xFF18181B)
private val Zinc950 = Color(0xFF09090B)
private val Azure500 = Color(0xFF3B82F6)
private val Red500 = Color(0xFFEF4444)

@Composable
fun AhorrosScreen(
    metas: List<MetaAhorro>,
    onMetasChanged: (List<MetaAhorro>) -> Unit
) {
    var ahorros by remember { mutableStateOf(listOf<Ahorro>()) }
    var mostrarFormulario by remember { mutableStateOf(false) }
    var mostrarMetasPanel by remember { mutableStateOf(false) }
    var mostrarFormMeta by remember { mutableStateOf(false) }
    
    var movimientoAEliminar by remember { mutableStateOf<Ahorro?>(null) }
    var metaAEliminar by remember { mutableStateOf<MetaAhorro?>(null) }

    val metaActiva = metas.filter { !it.completada }.minOfOrNull { it.montoObjetivo } ?: 0

    if (movimientoAEliminar != null) {
        AlertDialog(
            onDismissRequest = { movimientoAEliminar = null },
            containerColor = Zinc900,
            title = { Text("¿Eliminar registro?", color = White, fontWeight = FontWeight.Bold) },
            text = { Text("Se borrará este movimiento permanentemente.", color = Zinc400) },
            confirmButton = {
                TextButton(onClick = { 
                    ahorros = ahorros.filter { it.id != movimientoAEliminar!!.id }
                    movimientoAEliminar = null 
                }) { Text("Eliminar", color = Red500, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { movimientoAEliminar = null }) { Text("Cancelar", color = Zinc500) }
            }
        )
    }

    if (metaAEliminar != null) {
        AlertDialog(
            onDismissRequest = { metaAEliminar = null },
            containerColor = Zinc900,
            title = { Text("¿Eliminar meta?", color = White, fontWeight = FontWeight.Bold) },
            text = { Text("¿Quieres quitar esta meta de tus objetivos?", color = Zinc400) },
            confirmButton = {
                TextButton(onClick = { 
                    onMetasChanged(metas.filter { it.id != metaAEliminar!!.id })
                    metaAEliminar = null 
                }) { Text("Eliminar", color = Red500, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { metaAEliminar = null }) { Text("Cancelar", color = Zinc500) }
            }
        )
    }

    Surface(modifier = Modifier.fillMaxSize(), color = Zinc950) {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Mis Ahorros", color = White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp)
                        Text("Gestiona tu capital y metas.", color = Zinc400, fontSize = 16.sp)
                    }
                    IconButton(onClick = { mostrarMetasPanel = !mostrarMetasPanel }, colors = IconButtonDefaults.iconButtonColors(containerColor = if(mostrarMetasPanel) Azure500 else Zinc900)) {
                        Icon(Icons.Default.Flag, null, tint = if(mostrarMetasPanel) White else Zinc400)
                    }
                }
            }

            if (mostrarMetasPanel) {
                item {
                    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Azure500.copy(alpha = 0.3f), RoundedCornerShape(12.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Metas de Ahorro", color = White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            IconButton(onClick = { mostrarFormMeta = !mostrarFormMeta }, modifier = Modifier.size(24.dp)) { Icon(Icons.Default.Add, null, tint = Azure500) }
                        }
                        if (mostrarFormMeta) {
                            FormularioNuevaMeta(onSave = { nueva -> onMetasChanged(metas + nueva.copy(id = (metas.lastOrNull()?.id ?: 0) + 1)); mostrarFormMeta = false })
                        }
                        metas.forEach { meta ->
                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = if(meta.completada) Icons.Default.CheckCircle else Icons.Outlined.Circle,
                                    contentDescription = null,
                                    tint = if(meta.completada) Azure500 else Zinc600,
                                    modifier = Modifier.size(20.dp).clickable { onMetasChanged(metas.map { if(it.id == meta.id) it.copy(completada = !it.completada) else it }) }
                                )
                                Spacer(Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f).clickable { onMetasChanged(metas.map { if(it.id == meta.id) it.copy(completada = !it.completada) else it }) }) {
                                    Text(text = meta.nombre, color = if(meta.completada) Zinc500 else White, style = MaterialTheme.typography.bodyMedium.copy(textDecoration = if(meta.completada) TextDecoration.LineThrough else null))
                                    Text(text = formatCLP(meta.montoObjetivo), color = Zinc500, fontSize = 12.sp)
                                }
                                IconButton(onClick = { metaAEliminar = meta }, modifier = Modifier.size(32.dp)) { Icon(Icons.Default.Delete, null, tint = Zinc700, modifier = Modifier.size(18.dp)) }
                            }
                        }
                    }
                }
            }

            item { ChartContainer("Crecimiento vs Meta") { AhorrosChart(ahorros = ahorros, metaAhorro = metaActiva) } }

            item {
                Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(12.dp)).padding(16.dp)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Movimientos", color = White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Button(onClick = { mostrarFormulario = !mostrarFormulario }, colors = ButtonDefaults.buttonColors(containerColor = if (mostrarFormulario) Zinc800 else White, contentColor = if (mostrarFormulario) Zinc400 else Zinc950), shape = RoundedCornerShape(8.dp)) {
                            Text(if (mostrarFormulario) "✕ Cancelar" else "+ Añadir", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        }
                    }
                    if (mostrarFormulario) FormularioNuevoAhorro(onSave = { nuevo -> ahorros = (ahorros + nuevo.copy(id = (ahorros.lastOrNull()?.id ?: 0) + 1)).sortedBy { it.fecha }; mostrarFormulario = false })
                    Spacer(modifier = Modifier.height(16.dp))
                    TablaAhorros(ahorros, onEliminarClick = { movimientoAEliminar = it })
                }
            }
        }
    }
}

@Composable
fun TablaAhorros(ahorros: List<Ahorro>, onEliminarClick: (Ahorro) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, Zinc800, RoundedCornerShape(12.dp))) {
        Row(modifier = Modifier.fillMaxWidth().background(Zinc900).padding(vertical = 12.dp, horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("Fecha", Modifier.weight(0.3f), color = Zinc500, fontSize = 11.sp)
            Text("Tipo", Modifier.weight(0.25f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.Center)
            Text("Monto", Modifier.weight(0.3f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.End)
            Spacer(Modifier.width(40.dp))
        }
        if (ahorros.isEmpty()) { Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { Text("Sin movimientos", color = Zinc600, fontSize = 13.sp) } }
        else {
            ahorros.forEach { ahorro -> 
                Row(modifier = Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp).padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    val date = try { LocalDate.parse(ahorro.fecha) } catch(e: Exception) { LocalDate.now() }
                    Text(date.format(DateTimeFormatter.ofPattern("dd/MM/yy")), Modifier.weight(0.3f), color = Zinc400, fontSize = 14.sp)
                    Text(text = if(ahorro.esRetiro) "Retiro" else "Ahorro", modifier = Modifier.weight(0.25f), color = if(ahorro.esRetiro) Red500 else Azure500, fontSize = 11.sp, textAlign = TextAlign.Center, fontWeight = FontWeight.Bold)
                    Text(text = (if(ahorro.esRetiro) "-" else "+") + formatCLP(ahorro.monto), modifier = Modifier.weight(0.3f), color = if(ahorro.esRetiro) Red500 else White, fontWeight = FontWeight.Bold, fontSize = 14.sp, textAlign = TextAlign.End)
                    
                    IconButton(onClick = { onEliminarClick(ahorro) }, modifier = Modifier.size(40.dp)) {
                        Icon(Icons.Default.Delete, null, tint = Red500.copy(alpha = 0.8f), modifier = Modifier.size(20.dp))
                    }
                }
                HorizontalDivider(color = Zinc800.copy(alpha = 0.5f))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormularioNuevaMeta(onSave: (MetaAhorro) -> Unit) {
    var nombre by remember { mutableStateOf("") }
    var monto by remember { mutableStateOf("") }
    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(value = nombre, onValueChange = { nombre = it }, label = { Text("Meta") }, modifier = Modifier.fillMaxWidth(), colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950), shape = RoundedCornerShape(8.dp))
        OutlinedTextField(value = monto, onValueChange = { if(it.all { c -> c.isDigit() } || it.isEmpty()) monto = it }, label = { Text("Monto") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950), shape = RoundedCornerShape(8.dp))
        Button(onClick = { if (nombre.isNotBlank() && monto.isNotBlank()) onSave(MetaAhorro(0, nombre, monto.toInt())) }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Azure500, contentColor = White), shape = RoundedCornerShape(8.dp)) { Text("Añadir", fontWeight = FontWeight.Bold) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormularioNuevoAhorro(onSave: (Ahorro) -> Unit) {
    var monto by remember { mutableStateOf("") }
    var esRetiro by remember { mutableStateOf(false) }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var showDatePicker by remember { mutableStateOf(false) }
    val dateState = rememberDatePickerState(initialSelectedDateMillis = selectedDate.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli())
    if (showDatePicker) {
        DatePickerDialog(onDismissRequest = { showDatePicker = false }, confirmButton = { TextButton(onClick = { dateState.selectedDateMillis?.let { selectedDate = Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()).toLocalDate() }; showDatePicker = false }) { Text("OK", color = Azure500) } }, dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancelar") } }, colors = DatePickerDefaults.colors(containerColor = Zinc900)) { DatePicker(state = dateState) }
    }
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc950).border(1.dp, Zinc700, RoundedCornerShape(12.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(value = monto, onValueChange = { if(it.all { c -> c.isDigit() } || it.isEmpty()) monto = it }, label = { Text("Monto") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950), shape = RoundedCornerShape(8.dp))
            OutlinedTextField(value = selectedDate.format(DateTimeFormatter.ofPattern("dd/MM/yy")), onValueChange = {}, readOnly = true, label = { Text("Fecha") }, trailingIcon = { IconButton(onClick = { showDatePicker = true }) { Icon(Icons.Default.CalendarMonth, null, tint = Zinc400) } }, modifier = Modifier.weight(1f).clickable { showDatePicker = true }, colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = Zinc700), shape = RoundedCornerShape(8.dp))
        }
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column { Text("¿Es un retiro?", color = White, fontSize = 14.sp, fontWeight = FontWeight.Bold); Text("Se restará del total", color = Zinc500, fontSize = 12.sp) }
            Switch(checked = esRetiro, onCheckedChange = { esRetiro = it }, colors = SwitchDefaults.colors(checkedThumbColor = Red500, checkedTrackColor = Red500.copy(alpha = 0.3f)))
        }
        Button(onClick = { if (monto.isNotBlank()) onSave(Ahorro(0, monto.toInt(), selectedDate.toString(), esRetiro)) }, modifier = Modifier.fillMaxWidth().height(50.dp), colors = ButtonDefaults.buttonColors(containerColor = if(esRetiro) Red500 else White, contentColor = if(esRetiro) White else Zinc950), shape = RoundedCornerShape(8.dp)) { Text(if(esRetiro) "Registrar Retiro" else "Guardar Ahorro", fontWeight = FontWeight.Bold) }
    }
}
