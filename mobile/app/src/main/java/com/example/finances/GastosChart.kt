package com.example.finances

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.*
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.max
import kotlin.math.roundToInt

// --- COLORES ---
private val White = Color(0xFFFFFFFF)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)
private val Zinc950 = Color(0xFF09090B)
private val Red500 = Color(0xFFEF4444)

@OptIn(ExperimentalTextApi::class)
@Composable
fun GastosChart(
    gastos: List<Gasto>,
    presupuestoMensual: Int = 90000,
    modifier: Modifier = Modifier
        .fillMaxWidth()
        .height(300.dp)
) {
    if (gastos.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Text("No hay datos suficientes.", color = Zinc500)
        }
        return
    }

    // --- 1. PROCESAMIENTO DE DATOS ---
    val chartData = remember(gastos) {
        val porMes = gastos.groupBy {
            val date = LocalDate.parse(it.fecha)
            "${date.year}-${date.monthValue.toString().padStart(2, '0')}"
        }.mapValues { entry ->
            entry.value.sumOf { it.monto }
        }.toSortedMap()

        val labels = porMes.keys.map { key ->
            val parts = key.split("-")
            val date = LocalDate.of(parts[0].toInt(), parts[1].toInt(), 1)
            val mes = date.format(DateTimeFormatter.ofPattern("MMM", Locale("es", "CL")))
            mes.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() }
        }
        val values = porMes.values.map { it.toFloat() }
        Pair(labels, values)
    }

    val (labels, data) = chartData
    val maxGasto = data.maxOrNull() ?: 0f
    val maxY = max(maxGasto, presupuestoMensual.toFloat()) * 1.1f

    // --- 2. HERRAMIENTAS DE DIBUJO ---
    val textMeasurer = rememberTextMeasurer()
    val density = LocalDensity.current

    // Estilos de texto pre-calculados para mejor performance
    val labelStyle = MaterialTheme.typography.bodySmall.copy(
        color = Zinc400, fontSize = 11.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
    )
    val priceStyle = MaterialTheme.typography.bodySmall.copy(
        color = Zinc500, fontSize = 10.sp
    )

    // --- 3. ESTADO DEL SCROLL ---
    // Usamos BoxWithConstraints para calcular el scroll inicial antes de dibujar
    BoxWithConstraints(modifier = modifier) {
        val widthPx = constraints.maxWidth.toFloat()
        val visibleMonths = 4

        // Espacio reservado a la izquierda para el eje Y (40dp)
        val yAxisWidth = with(density) { 40.dp.toPx() }
        val graphWidth = widthPx - yAxisWidth

        // Ancho de cada columna (mes)
        val columnWidth = graphWidth / visibleMonths

        // Ancho total del contenido scrollable
        val contentWidth = max(graphWidth, columnWidth * labels.size)

        // El máximo scroll posible (para ver el final)
        val maxScrollOffset = max(0f, contentWidth - graphWidth)

        // Estado del scroll
        var scrollOffset by remember { mutableFloatStateOf(maxScrollOffset) }

        // Si cambian los datos, resetear al final
        LaunchedEffect(data.size) {
            scrollOffset = maxScrollOffset
        }

        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectHorizontalDragGestures { change, dragAmount ->
                        change.consume()
                        // Actualizar scroll invirtiendo el drag (arrastrar izquierda = scroll derecha)
                        // Clamp para no pasarse de los límites
                        scrollOffset = (scrollOffset - dragAmount).coerceIn(0f, maxScrollOffset)
                    }
                }
        ) {
            val height = size.height
            val bottomPadding = 30.dp.toPx() // Espacio para etiquetas X
            val graphHeight = height - bottomPadding

            // --- CAPA 1: EJE Y (FIJO) ---
            // Dibujamos esto primero o último, pero SIN traslación
            val steps = 4
            for (i in 0..steps) {
                val value = (maxY / steps) * i
                val y = graphHeight - (graphHeight / steps) * i

                // Texto del precio
                val textLayoutResult = textMeasurer.measure(
                    text = AnnotatedString(formatCompact(value)),
                    style = priceStyle
                )

                // Dibujar texto alineado a la derecha dentro del área de yAxisWidth
                drawText(
                    textLayoutResult = textLayoutResult,
                    topLeft = Offset(
                        x = yAxisWidth - textLayoutResult.size.width - 10f, // 10f padding right
                        y = y - (textLayoutResult.size.height / 2)
                    )
                )

                // Línea de grilla (Fondo sutil)
                drawLine(
                    color = White.copy(alpha = 0.05f),
                    start = Offset(yAxisWidth, y),
                    end = Offset(size.width, y),
                    strokeWidth = 1.dp.toPx()
                )
            }

            // Línea de Presupuesto (Fija, cruza todo)
            val budgetY = graphHeight - (presupuestoMensual / maxY) * graphHeight
            if (budgetY >= 0) {
                drawLine(
                    color = Red500.copy(alpha = 0.6f),
                    start = Offset(yAxisWidth, budgetY),
                    end = Offset(size.width, budgetY),
                    strokeWidth = 2.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                )
            }

            // --- CAPA 2: CONTENIDO SCROLLABLE (GRÁFICO + ETIQUETAS X) ---
            // Usamos clipRect para que el gráfico no se dibuje sobre el eje Y
            clipRect(left = yAxisWidth, right = size.width, top = 0f, bottom = size.height) {
                // Trasladamos el canvas basado en el scroll negativo
                translate(left = -scrollOffset + yAxisWidth) {

                    if (data.isNotEmpty()) {
                        val path = Path()
                        val points = mutableListOf<Offset>()

                        data.forEachIndexed { index, valor ->
                            // Centro de la columna del mes
                            val x = (index * columnWidth) + (columnWidth / 2)
                            val y = graphHeight - (valor / maxY) * graphHeight

                            points.add(Offset(x, y))
                            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)

                            // DIBUJAR ETIQUETA DEL MES (EJE X)
                            val labelResult = textMeasurer.measure(
                                text = AnnotatedString(labels[index]),
                                style = labelStyle
                            )
                            drawText(
                                textLayoutResult = labelResult,
                                topLeft = Offset(
                                    x = x - (labelResult.size.width / 2),
                                    y = graphHeight + 10f // Un poco debajo del gráfico
                                )
                            )
                        }

                        // A. Relleno Gradiente
                        val fillPath = Path().apply {
                            addPath(path)
                            lineTo(points.last().x, graphHeight)
                            lineTo(points.first().x, graphHeight)
                            close()
                        }
                        drawPath(
                            path = fillPath,
                            brush = Brush.verticalGradient(
                                colors = listOf(White.copy(alpha = 0.1f), Color.Transparent),
                                startY = 0f,
                                endY = graphHeight
                            )
                        )

                        // B. Línea
                        drawPath(
                            path = path,
                            color = White,
                            style = Stroke(
                                width = 3.dp.toPx(),
                                cap = StrokeCap.Round,
                                join = StrokeJoin.Round
                            )
                        )

                        // C. Puntos
                        points.forEach { point ->
                            drawCircle(Zinc950, radius = 6.dp.toPx(), center = point)
                            drawCircle(White, radius = 6.dp.toPx(), center = point, style = Stroke(2.dp.toPx()))
                        }
                    }
                }
            }
        }
    }
}

private fun formatCompact(value: Float): String {
    return when {
        value >= 1_000_000 -> "${(value / 1_000_000).toInt()}M"
        value >= 1_000 -> "${(value / 1_000).toInt()}k"
        else -> value.toInt().toString()
    }
}