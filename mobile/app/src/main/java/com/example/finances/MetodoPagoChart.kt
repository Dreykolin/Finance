package com.example.finances

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.ceil
import kotlin.math.log10
import kotlin.math.pow
import kotlin.math.roundToInt

private val White = Color(0xFFFFFFFF)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)

@OptIn(ExperimentalTextApi::class)
@Composable
fun MetodoPagoChart(
    gastos: List<Gasto>,
    metodosAVisualizar: List<String> = listOf("Crédito", "Débito", "Efectivo"),
    modifier: Modifier = Modifier.fillMaxWidth().height(300.dp)
) {
    val datosAgrupados = remember(gastos, metodosAVisualizar) {
        gastos
            .filter { it.metodoPago in metodosAVisualizar }
            .groupBy { it.metodoPago }
            .mapValues { it.value.sumOf { g -> g.monto } }
            .toList()
            .sortedByDescending { it.second }
    }

    if (datosAgrupados.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Text(
                text = "No hay datos para los métodos seleccionados",
                color = Zinc500,
                fontSize = 14.sp,
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
            )
        }
        return
    }

    val labels = datosAgrupados.map { it.first }
    val montos = datosAgrupados.map { it.second.toFloat() }
    val maxMonto = montos.maxOrNull() ?: 1f

    // --- LÓGICA DE REDONDEO DINÁMICO (Eje Y) ---
    val stepCount = 4
    val powerOf10 = 10f.pow(ceil(log10(maxMonto / stepCount)).toInt() - 1)
    val niceStep = ceil((maxMonto / stepCount) / powerOf10) * powerOf10
    val maxY = niceStep * stepCount

    val textMeasurer = rememberTextMeasurer()
    val density = LocalDensity.current
    
    val labelStyle = MaterialTheme.typography.bodySmall.copy(
        color = White,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold
    )
    val priceStyle = MaterialTheme.typography.bodySmall.copy(
        color = Zinc500, fontSize = 10.sp
    )

    Canvas(modifier = modifier.padding(vertical = 16.dp)) {
        val width = size.width
        val height = size.height
        val bottomPadding = 24.dp.toPx()
        val graphHeight = height - bottomPadding
        
        val yAxisWidth = 65.dp.toPx()
        val graphWidth = width - yAxisWidth - 24.dp.toPx() // Margen derecho

        // --- CAPA 1: EJE Y (FIJO) ---
        for (i in 0..stepCount) {
            val value = niceStep * i
            val y = graphHeight - (value / maxY) * graphHeight

            val textLayoutResult = textMeasurer.measure(
                text = AnnotatedString(formatMil(value)),
                style = priceStyle
            )

            drawText(
                textLayoutResult = textLayoutResult,
                topLeft = Offset(
                    x = yAxisWidth - textLayoutResult.size.width - 15f,
                    y = y - (textLayoutResult.size.height / 2)
                )
            )

            drawLine(
                color = White.copy(alpha = 0.05f),
                start = Offset(yAxisWidth, y),
                end = Offset(width - 16.dp.toPx(), y),
                strokeWidth = 1.dp.toPx()
            )
        }

        // --- CAPA 2: BARRAS ---
        val barCount = labels.size
        val barSpacing = 24.dp.toPx()
        val totalSpacing = barSpacing * (barCount - 1)
        val barWidth = ((graphWidth - totalSpacing) / barCount).coerceAtMost(60.dp.toPx())
        val totalContentWidth = (barWidth * barCount) + totalSpacing
        val startOffset = yAxisWidth + (graphWidth - totalContentWidth) / 2

        montos.forEachIndexed { index, monto ->
            val barHeight = (monto / maxY) * graphHeight
            val x = startOffset + index * (barWidth + barSpacing)
            val y = graphHeight - barHeight

            // Dibujar la Barra
            drawRoundRect(
                color = White.copy(alpha = 0.8f),
                topLeft = Offset(x, y),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx())
            )

            // Dibujar el nombre del método centrado bajo la barra
            val label = labels[index]
            val textLayoutResult = textMeasurer.measure(AnnotatedString(label), style = labelStyle)
            
            val textX = x + (barWidth - textLayoutResult.size.width) / 2
            val textY = graphHeight + 8.dp.toPx()

            drawText(
                textLayoutResult = textLayoutResult,
                topLeft = Offset(textX, textY)
            )
        }
    }
}

private fun formatMil(value: Float): String {
    val rounded = value.roundToInt()
    return when {
        rounded == 0 -> "0"
        rounded >= 1000 -> "${rounded / 1000}mil"
        else -> rounded.toString()
    }
}
