package com.example.finances

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// --- DEFINICIÓN DE COLORES LOCALES ---
private val White = Color(0xFFFFFFFF)
private val Zinc500 = Color(0xFF71717A)

@Composable
fun MetodoPagoChart(
    gastos: List<Gasto>,
    modifier: Modifier = Modifier.fillMaxWidth().height(250.dp)
) {
    // Definimos las columnas específicas que queremos mostrar
    val metodosPermitidos = listOf("Crédito", "Débito", "Efectivo")

    // Filtramos los gastos para incluir solo los métodos deseados
    val gastosFiltrados = gastos.filter { it.metodoPago in metodosPermitidos }

    if (gastosFiltrados.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Text(
                text = "No hay datos de Crédito, Débito o Efectivo.",
                color = Zinc500,
                fontSize = 14.sp,
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
            )
        }
        return
    }

    // Agrupar por método de pago y sumar montos
    val datosAgrupados = gastosFiltrados.groupBy { it.metodoPago }
        .mapValues { it.value.sumOf { g -> g.monto } }
        .toList()
        .sortedByDescending { it.second }

    val labels = datosAgrupados.map { it.first }
    val montos = datosAgrupados.map { it.second.toFloat() }
    val maxMonto = montos.maxOrNull() ?: 1f

    Column(modifier = modifier.padding(16.dp)) {
        Canvas(modifier = Modifier.weight(1f).fillMaxWidth()) {
            val width = size.width
            val height = size.height
            val barCount = labels.size

            // Ajuste dinámico del espaciado (más espacio ya que son pocas columnas)
            val barSpacing = 32.dp.toPx()

            val availableWidth = width - (barSpacing * (barCount - 1))
            // Ancho máximo controlado para que no se vean excesivamente anchas
            val barWidth = (availableWidth / barCount).coerceAtMost(80.dp.toPx())

            // Cálculo para centrar el grupo de barras en el canvas
            val totalContentWidth = (barWidth * barCount) + (barSpacing * (barCount - 1))
            val startOffset = (width - totalContentWidth) / 2

            // Dibujar líneas de guía horizontales sutiles
            val gridLines = 4
            for (i in 0..gridLines) {
                val y = height - (i.toFloat() / gridLines) * height
                drawLine(
                    color = White.copy(alpha = 0.05f),
                    start = Offset(0f, y),
                    end = Offset(width, y),
                    strokeWidth = 1.dp.toPx()
                )
            }

            // Dibujar barras
            montos.forEachIndexed { index, monto ->
                val barHeight = (monto / maxMonto) * height
                val x = startOffset + index * (barWidth + barSpacing)
                val y = height - barHeight

                drawRoundRect(
                    color = White.copy(alpha = 0.9f),
                    topLeft = Offset(x, y),
                    size = Size(barWidth, barHeight),
                    cornerRadius = CornerRadius(8.dp.toPx(), 8.dp.toPx())
                )
            }
        }

        // Etiquetas X (Métodos)
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.Center // Centrado ya que son pocas
        ) {
            labels.forEachIndexed { index, label ->
                // Agregamos espaciado manual para alinear con las barras centradas
                // (Nota: Una alineación perfecta requeriría un Layout custom, pero esto funciona visualmente para pocos items)
                Text(
                    text = label,
                    color = White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
        }
    }
}