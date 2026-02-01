package com.example.finances

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import java.time.LocalDate

// --- COLORES ---
private val White = Color(0xFFFFFFFF)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)
private val Zinc700 = Color(0xFF3F3F46)
private val Zinc800 = Color(0xFF27272A)
private val Zinc900 = Color(0xFF18181B)
private val Zinc950 = Color(0xFF09090B)
private val Red500 = Color(0xFFEF4444)

@Composable
fun CuotasPieChart(
    cuotasPagadas: Int,
    cuotasTotales: Int,
    modifier: Modifier = Modifier,
    size: Dp = 160.dp,
    strokeWidth: Dp = 12.dp,
    showPercentage: Boolean = true
) {
    val accentColor = LocalAppAccentColor.current
    val progressTarget = if (cuotasTotales > 0) cuotasPagadas.toFloat() / cuotasTotales.toFloat() else 0f
    val progress by animateFloatAsState(
        targetValue = progressTarget,
        animationSpec = tween(durationMillis = 1000),
        label = "progressAnimation"
    )

    Box(contentAlignment = Alignment.Center, modifier = modifier.size(size)) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val radius = (this.size.width - strokeWidth.toPx()) / 2
            drawCircle(color = Zinc800, radius = radius, style = Stroke(width = strokeWidth.toPx()))
            drawArc(
                color = accentColor,
                startAngle = -90f,
                sweepAngle = 360 * progress,
                useCenter = false,
                style = Stroke(width = strokeWidth.toPx(), cap = StrokeCap.Round),
                topLeft = Offset(strokeWidth.toPx() / 2, strokeWidth.toPx() / 2),
                size = androidx.compose.ui.geometry.Size(
                    width = this.size.width - strokeWidth.toPx(),
                    height = this.size.height - strokeWidth.toPx()
                )
            )
        }
        if (showPercentage) {
            Text(text = "${(progress * 100).toInt()}%", color = White, fontSize = (size.value * 0.25).sp, fontWeight = FontWeight.Bold)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GestorCuotasScreen() {
    val context = LocalContext.current
    val accentColor = LocalAppAccentColor.current
    val db = remember { AppDatabase.getDatabase(context) }
    val dao = db.compraCuotasDao()
    val scope = rememberCoroutineScope()
    
    val compras by dao.getAll().collectAsState(initial = emptyList())

    var selectedCompra by remember { mutableStateOf<CompraCuotas?>(null) }
    var showGlobalSummary by remember { mutableStateOf(false) }
    var showSheet by remember { mutableStateOf(false) }
    var showAddDialog by remember { mutableStateOf(false) }
    var compraAEliminar by remember { mutableStateOf<CompraCuotas?>(null) }
    
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Diálogo para Nueva Compra
    if (showAddDialog) {
        FormularioNuevaCompraDialog(
            onDismiss = { showAddDialog = false },
            onSave = { nuevaCompra ->
                scope.launch {
                    dao.insert(nuevaCompra)
                    showAddDialog = false
                }
            }
        )
    }

    // Diálogo de Confirmación para Eliminar
    if (compraAEliminar != null) {
        AlertDialog(
            onDismissRequest = { compraAEliminar = null },
            containerColor = Zinc900,
            title = { Text("¿Eliminar producto?", color = White, fontWeight = FontWeight.Bold) },
            text = { Text("¿Realmente quieres borrar \"${compraAEliminar?.producto}\"? Esta acción no se puede deshacer.", style = TextStyle(color = Zinc400)) },
            confirmButton = {
                TextButton(onClick = { 
                    val aBorrar = compraAEliminar!!
                    scope.launch { 
                        dao.delete(aBorrar)
                        compraAEliminar = null
                        showSheet = false
                    }
                }) { Text("Eliminar", color = Red500, fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = { compraAEliminar = null }) { Text("Cancelar", color = Zinc500) }
            }
        )
    }

    val comprasActivas = compras.filter { it.cuotasPagadas < it.cuotasTotales }
    val totalPagadas = compras.sumOf { it.cuotasPagadas }
    val totalCuotas = compras.sumOf { it.cuotasTotales }
    val montoMensualTotal = comprasActivas.sumOf { it.montoCuota }

    val montoTotalActual = compras.sumOf { it.cuotasTotales * it.montoCuota }
    val montoAbonadoActual = compras.sumOf { it.cuotasPagadas * it.montoCuota }
    val deudaPendienteActual = montoTotalActual - montoAbonadoActual

    Scaffold(containerColor = Zinc950) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.CreditCard, null, tint = accentColor, modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Seguimiento", color = White, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                    }
                    Column(modifier = Modifier.padding(top = 8.dp)) {
                        Text("Carga Mensual:", color = Zinc500, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text(formatCLP(montoMensualTotal), color = White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }

                CuotasPieChart(
                    cuotasPagadas = totalPagadas,
                    cuotasTotales = totalCuotas,
                    size = 64.dp,
                    strokeWidth = 7.dp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(32.dp))
                        .clickable { 
                            showGlobalSummary = true
                            showSheet = true
                        }
                )
            }

            HorizontalDivider(color = Zinc800, thickness = 1.dp, modifier = Modifier.padding(horizontal = 24.dp))

            LazyColumn(contentPadding = PaddingValues(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.weight(1f)) {
                item { Text("TUS PRODUCTOS", color = Zinc500, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp) }
                items(compras, key = { it.id }) { compra ->
                    CompraItemCard(compra = compra) {
                        selectedCompra = compra
                        showGlobalSummary = false
                        showSheet = true
                    }
                }
                item { 
                    BotonNuevaCompra { showAddDialog = true }
                }
            }
        }

        if (showSheet) {
            ModalBottomSheet(
                onDismissRequest = { showSheet = false },
                sheetState = sheetState,
                containerColor = Zinc900,
                dragHandle = { BottomSheetDefaults.DragHandle(color = Zinc700) }
            ) {
                if (showGlobalSummary) {
                    DetalleGlobalSheet(montoTotalActual, montoAbonadoActual, deudaPendienteActual, totalPagadas, totalCuotas)
                } else if (selectedCompra != null) {
                    // Buscamos la compra actualizada de la lista
                    val currentCompra = compras.find { it.id == selectedCompra?.id } ?: selectedCompra!!
                    DetallePanelSheet(
                        compra = currentCompra,
                        onEliminarClick = { compraAEliminar = it },
                        onMarcarCuota = {
                            if (currentCompra.cuotasPagadas < currentCompra.cuotasTotales) {
                                scope.launch {
                                    dao.update(currentCompra.copy(cuotasPagadas = currentCompra.cuotasPagadas + 1))
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormularioNuevaCompraDialog(
    onDismiss: () -> Unit,
    onSave: (CompraCuotas) -> Unit
) {
    val accentColor = LocalAppAccentColor.current
    var producto by remember { mutableStateOf("") }
    var tienda by remember { mutableStateOf("") }
    var cuotasTotales by remember { mutableStateOf("") }
    var montoCuota by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Zinc900,
        title = { Text("Nueva Compra", color = White, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = producto,
                    onValueChange = { producto = it },
                    label = { Text("Producto") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Zinc950,
                        unfocusedContainerColor = Zinc950,
                        focusedBorderColor = accentColor,
                        cursorColor = accentColor,
                        focusedTextColor = White,
                        unfocusedTextColor = White,
                        focusedLabelColor = accentColor
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
                OutlinedTextField(
                    value = tienda,
                    onValueChange = { tienda = it },
                    label = { Text("Tienda") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Zinc950,
                        unfocusedContainerColor = Zinc950,
                        focusedBorderColor = accentColor,
                        cursorColor = accentColor,
                        focusedTextColor = White,
                        unfocusedTextColor = White,
                        focusedLabelColor = accentColor
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = cuotasTotales,
                        onValueChange = { if (it.all { c -> c.isDigit() }) cuotasTotales = it },
                        label = { Text("Cuotas") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Zinc950,
                            unfocusedContainerColor = Zinc950,
                            focusedBorderColor = accentColor,
                            cursorColor = accentColor,
                            focusedTextColor = White,
                            unfocusedTextColor = White,
                            focusedLabelColor = accentColor
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                    OutlinedTextField(
                        value = montoCuota,
                        onValueChange = { if (it.all { c -> c.isDigit() }) montoCuota = it },
                        label = { Text("Valor Cuota") },
                        modifier = Modifier.weight(1.5f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Zinc950,
                            unfocusedContainerColor = Zinc950,
                            focusedBorderColor = accentColor,
                            cursorColor = accentColor,
                            focusedTextColor = White,
                            unfocusedTextColor = White,
                            focusedLabelColor = accentColor
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (producto.isNotBlank() && tienda.isNotBlank() && cuotasTotales.isNotBlank() && montoCuota.isNotBlank()) {
                        onSave(CompraCuotas(
                            producto = producto,
                            tienda = tienda,
                            cuotasTotales = cuotasTotales.toInt(),
                            cuotasPagadas = 0,
                            montoCuota = montoCuota.toInt(),
                            fechaInicio = LocalDate.now().toString()
                        ))
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Guardar", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar", color = Zinc500) }
        }
    )
}

@Composable
fun DetalleGlobalSheet(total: Int, abonado: Int, pendiente: Int, cPagadas: Int, cTotales: Int) {
    val accentColor = LocalAppAccentColor.current
    Column(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 48.dp, top = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("RESUMEN DE DEUDA", color = White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
        Text("Estado de tus productos activos", color = Zinc500, fontSize = 14.sp)
        Spacer(modifier = Modifier.height(32.dp))
        CuotasPieChart(cuotasPagadas = cPagadas, cuotasTotales = cTotales, size = 140.dp, strokeWidth = 10.dp)
        Spacer(modifier = Modifier.height(32.dp))
        Column(
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Zinc950).border(1.dp, Zinc800, RoundedCornerShape(16.dp)).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ResumenRow("Deuda Total Actual", formatCLP(total), White)
            ResumenRow("Total Abonado", "+ ${formatCLP(abonado)}", accentColor)
            HorizontalDivider(color = Zinc800, thickness = 1.dp)
            ResumenRow("Deuda Pendiente", formatCLP(pendiente), White, isBold = true)
        }
    }
}

@Composable
fun CompraItemCard(compra: CompraCuotas, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, Zinc800, RoundedCornerShape(16.dp)).clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Zinc900.copy(alpha = 0.5f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(modifier = Modifier.padding(20.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(compra.producto, color = White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text("${compra.tienda} • ${compra.cuotasPagadas}/${compra.cuotasTotales} cuotas", color = Zinc500, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
            }
            Icon(Icons.Rounded.ShoppingBag, null, tint = Zinc700, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
fun DetallePanelSheet(compra: CompraCuotas, onEliminarClick: (CompraCuotas) -> Unit, onMarcarCuota: () -> Unit) {
    val accentColor = LocalAppAccentColor.current
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 48.dp, top = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(compra.producto.uppercase(), color = White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
        Text(compra.tienda, color = Zinc500, fontSize = 14.sp)
        Spacer(modifier = Modifier.height(32.dp))
        CuotasPieChart(cuotasPagadas = compra.cuotasPagadas, cuotasTotales = compra.cuotasTotales, size = 140.dp, strokeWidth = 10.dp)
        Spacer(modifier = Modifier.height(32.dp))
        Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Zinc950).border(1.dp, Zinc800, RoundedCornerShape(16.dp)).padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            ResumenRow("Total a Pagar", formatCLP(compra.cuotasTotales * compra.montoCuota), White)
            ResumenRow("Monto de Cuota", formatCLP(compra.montoCuota), accentColor)
            HorizontalDivider(color = Zinc800, thickness = 1.dp)
            ResumenRow("Deuda Restante", formatCLP((compra.cuotasTotales - compra.cuotasPagadas) * compra.montoCuota), White, isBold = true)
        }
        Spacer(modifier = Modifier.height(24.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(
                onClick = onMarcarCuota, 
                colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950), 
                shape = RoundedCornerShape(12.dp), 
                modifier = Modifier.weight(1f).height(56.dp),
                enabled = compra.cuotasPagadas < compra.cuotasTotales
            ) {
                Icon(Icons.Rounded.Check, null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(if (compra.cuotasPagadas < compra.cuotasTotales) "Marcar cuota" else "Pagado", fontWeight = FontWeight.Bold)
            }
            
            IconButton(
                onClick = { onEliminarClick(compra) },
                modifier = Modifier.size(56.dp).clip(RoundedCornerShape(12.dp)).background(Zinc800)
            ) {
                Icon(Icons.Default.Delete, null, tint = Red500)
            }
        }
    }
}

@Composable
fun BotonNuevaCompra(onClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(2.dp, Zinc800, RoundedCornerShape(16.dp)).clickable { onClick() }.padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Add, null, tint = Zinc500)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Registrar nueva compra", color = Zinc500, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
fun ResumenRow(label: String, value: String, valueColor: Color, isBold: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(text = label, color = Zinc500, fontSize = 14.sp)
        Text(text = value, color = valueColor, fontSize = if(isBold) 18.sp else 15.sp, fontWeight = if(isBold) FontWeight.Bold else FontWeight.Medium)
    }
}

@Preview(showBackground = true)
@Composable
fun PreviewGestorCuotas() { GestorCuotasScreen() }
