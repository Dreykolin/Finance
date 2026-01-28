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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CreditCard
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// --- DEFINICIÓN DE COLORES LOCALES ---
// Se definen aquí para evitar errores de referencia
private val White = Color(0xFFFFFFFF)
private val Zinc500 = Color(0xFF71717A)
private val Zinc700 = Color(0xFF3F3F46)
private val Zinc800 = Color(0xFF27272A)
private val Zinc900 = Color(0xFF18181B)
private val Zinc950 = Color(0xFF09090B)
private val Emerald500 = Color(0xFF10B981)

// --- 4. COMPONENTE GRÁFICO (PIE CHART) ---
@Composable
fun CuotasPieChart(
    cuotasPagadas: Int,
    cuotasTotales: Int,
    modifier: Modifier = Modifier,
    size: Dp = 160.dp,
    strokeWidth: Dp = 12.dp,
    showPercentage: Boolean = true
) {
    val progressTarget = if (cuotasTotales > 0) cuotasPagadas.toFloat() / cuotasTotales.toFloat() else 0f
    val progress by animateFloatAsState(
        targetValue = progressTarget,
        animationSpec = tween(durationMillis = 1000),
        label = "progressAnimation"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(size)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val radius = (this.size.width - strokeWidth.toPx()) / 2
            drawCircle(
                color = Zinc800,
                radius = radius,
                style = Stroke(width = strokeWidth.toPx())
            )
            drawArc(
                color = White,
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
            Text(
                text = "${(progress * 100).toInt()}%",
                color = White,
                fontSize = (size.value * 0.25).sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// --- 5. PANTALLA PRINCIPAL ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GestorCuotasScreen() {
    // Datos de ejemplo
    val compras = remember {
        listOf(
            CompraCuotas(1, "MacBook Pro M3", "MacOnline", 12, 4, 180000, "2025-10-01"),
            CompraCuotas(2, "iPhone 15 Pro", "Falabella", 24, 12, 65000, "2025-02-15"),
            CompraCuotas(3, "Smart TV Samsung", "Paris", 6, 5, 85000, "2025-09-10"),
            CompraCuotas(4, "Muebles Terraza", "Sodimac", 3, 1, 120000, "2026-01-05")
        )
    }

    var selectedCompra by remember { mutableStateOf<CompraCuotas?>(null) }
    var showSheet by remember { mutableStateOf(false) }

    // El truco está aquí: skipPartiallyExpanded = true obliga al sheet a abrirse completo
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val totalPagadas = compras.sumOf { it.cuotasPagadas }
    val totalCuotas = compras.sumOf { it.cuotasTotales }

    Scaffold(
        containerColor = Zinc950
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // HEADER ESTÁTICO (NO DESAPARECE)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Rounded.CreditCard,
                            contentDescription = null,
                            tint = White,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Seguimiento",
                            color = White,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                    }
                    Text(
                        text = "Progreso global",
                        color = Zinc500,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                CuotasPieChart(
                    cuotasPagadas = totalPagadas,
                    cuotasTotales = totalCuotas,
                    size = 56.dp,
                    strokeWidth = 6.dp
                )
            }

            HorizontalDivider(color = Zinc800, thickness = 1.dp, modifier = Modifier.padding(horizontal = 24.dp))

            // LISTA DE COMPRAS (DESLIZABLE)
            LazyColumn(
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                item {
                    Text(
                        text = "TUS PRODUCTOS",
                        color = Zinc500,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp
                    )
                }

                items(compras) { compra ->
                    CompraItemCard(
                        compra = compra,
                        onClick = {
                            selectedCompra = compra
                            showSheet = true
                        }
                    )
                }

                item {
                    BotonNuevaCompra()
                }
            }
        }

        // PANEL DE DETALLES (MODAL BOTTOM SHEET)
        if (showSheet && selectedCompra != null) {
            ModalBottomSheet(
                onDismissRequest = { showSheet = false },
                sheetState = sheetState,
                containerColor = Zinc900,
                dragHandle = { BottomSheetDefaults.DragHandle(color = Zinc700) }
            ) {
                DetallePanelSheet(selectedCompra!!)
            }
        }
    }
}

// --- 6. COMPONENTES INDIVIDUALES ---

@Composable
fun CompraItemCard(
    compra: CompraCuotas,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, Zinc800, RoundedCornerShape(16.dp))
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = Zinc900.copy(alpha = 0.5f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(20.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = compra.producto,
                    color = White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${compra.tienda} • ${compra.cuotasPagadas}/${compra.cuotasTotales} cuotas",
                    color = Zinc500,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            Icon(Icons.Rounded.ShoppingBag, null, tint = Zinc700, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
fun DetallePanelSheet(compra: CompraCuotas) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(bottom = 48.dp, top = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = compra.producto.uppercase(),
            color = White,
            fontSize = 20.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.sp
        )
        Text(
            text = compra.tienda,
            color = Zinc500,
            fontSize = 14.sp
        )

        Spacer(modifier = Modifier.height(32.dp))

        CuotasPieChart(
            cuotasPagadas = compra.cuotasPagadas,
            cuotasTotales = compra.cuotasTotales,
            size = 140.dp,
            strokeWidth = 10.dp
        )

        Spacer(modifier = Modifier.height(32.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Zinc950)
                .border(1.dp, Zinc800, RoundedCornerShape(16.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ResumenRow("Total Compra", formatCLP(compra.cuotasTotales * compra.montoCuota), White)
            ResumenRow(
                "Pagado (${compra.cuotasPagadas}x)",
                "+ ${formatCLP(compra.cuotasPagadas * compra.montoCuota)}",
                Emerald500
            )
            HorizontalDivider(color = Zinc800, thickness = 1.dp)
            ResumenRow(
                "Deuda Restante",
                formatCLP((compra.cuotasTotales - compra.cuotasPagadas) * compra.montoCuota),
                White,
                isBold = true
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = { /* Acción */ },
            colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
        ) {
            Icon(Icons.Rounded.Check, null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = "Marcar cuota como pagada", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun BotonNuevaCompra() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(2.dp, Zinc800, RoundedCornerShape(16.dp))
            .clickable { /* Acción */ }
            .padding(vertical = 20.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Add, contentDescription = null, tint = Zinc500)
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Registrar nueva compra",
                color = Zinc500,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun ResumenRow(label: String, value: String, valueColor: Color, isBold: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, color = Zinc500, fontSize = 14.sp)
        Text(text = value, color = valueColor, fontSize = if(isBold) 18.sp else 15.sp, fontWeight = if(isBold) FontWeight.Bold else FontWeight.Medium)
    }
}

// Extensión para simular border-bottom
fun Modifier.drawBehindBottomBorder(color: Color, strokeWidth: Dp = 1.dp) = this.drawBehind {
    val strokeWidthPx = strokeWidth.toPx()
    drawLine(
        color = color,
        start = Offset(0f, size.height),
        end = Offset(size.width, size.height),
        strokeWidth = strokeWidthPx
    )
}

@Preview(showBackground = true)
@Composable
fun PreviewGestorCuotas() {
    GestorCuotasScreen()
}