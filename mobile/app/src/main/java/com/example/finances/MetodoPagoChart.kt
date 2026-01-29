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
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val White = Color(0xFFFFFFFF)
private val Zinc500 = Color(0xFF71717A)

@OptIn(ExperimentalTextApi::class)
@Composable
fun MetodoPagoChart(
    gastos: List<Gasto>,
    metodosAVisualizar: List<String> = listOf("Crédito", "Débito", "Efectivo"),
    modifier: Modifier = Modifier.fillMaxWidth().height(250.dp)
) {
    // Filtramos y agrupamos los datos basándonos en la lista de métodos seleccionados
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

    val textMeasurer = rememberTextMeasurer()
    val textStyle = MaterialTheme.typography.bodySmall.copy(
        color = White,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold
    )

    Canvas(modifier = modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
        val width = size.width
        val height = size.height
        val textPaddingBottom = 24.dp.toPx()
        val graphHeight = height - textPaddingBottom

        val barCount = labels.size
        val barSpacing = 24.dp.toPx()
        
        // Calculamos el ancho de barra dinámico para que se ajuste al espacio
        val totalSpacing = barSpacing * (barCount - 1)
        val barWidth = ((width - totalSpacing) / barCount).coerceAtMost(80.dp.toPx())
        val totalContentWidth = (barWidth * barCount) + totalSpacing
        val startOffset = (width - totalContentWidth) / 2

        // Líneas de guía horizontales
        for (i in 0..3) {
            val y = graphHeight - (i.toFloat() / 3) * graphHeight
            drawLine(
                color = White.copy(alpha = 0.05f),
                start = Offset(0f, y),
                end = Offset(width, y),
                strokeWidth = 1.dp.toPx()
            )
        }

        montos.forEachIndexed { index, monto ->
            val barHeight = (monto / maxMonto) * graphHeight
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
            val textLayoutResult = textMeasurer.measure(AnnotatedString(label), style = textStyle)
            
            val textX = x + (barWidth - textLayoutResult.size.width) / 2
            val textY = graphHeight + 8.dp.toPx()

            drawText(
                textLayoutResult = textLayoutResult,
                topLeft = Offset(textX, textY)
            )
        }
    }
}
