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
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.roundToInt

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

    val chartData = remember(gastos) {
        val porMes = gastos.groupBy {
            val date = LocalDate.parse(it.fecha)
            "${date.year}-${date.monthValue.toString().padStart(2, '0')}"
        }.mapValues { entry -> entry.value.sumOf { it.monto } }.toSortedMap()

        val labels = porMes.keys.map { key ->
            val parts = key.split("-")
            val date = LocalDate.of(parts[0].toInt(), parts[1].toInt(), 1)
            val mes = date.format(DateTimeFormatter.ofPattern("MMM", Locale("es", "CL")))
            mes.replaceFirstChar { it.uppercase() }
        }
        val values = porMes.values.map { it.toFloat() }
        Pair(labels, values)
    }

    val (labels, data) = chartData
    val maxGasto = data.maxOrNull() ?: 0f
    val rawMaxY = max(maxGasto, presupuestoMensual.toFloat())

    // --- LÓGICA DE REDONDEO DINÁMICO (Eje Y) ---
    val stepCount = 4
    // Calculamos una unidad de redondeo (10, 100, 1000, 10000...)
    val powerOf10 = 10f.pow(ceil(log10(rawMaxY / stepCount)).toInt() - 1)
    val niceStep = ceil((rawMaxY / stepCount) / powerOf10) * powerOf10
    val maxY = niceStep * stepCount

    val textMeasurer = rememberTextMeasurer()
    val density = LocalDensity.current

    val labelStyle = MaterialTheme.typography.bodySmall.copy(
        color = Zinc400, fontSize = 11.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
    )
    val priceStyle = MaterialTheme.typography.bodySmall.copy(
        color = Zinc500, fontSize = 10.sp
    )

    BoxWithConstraints(modifier = modifier) {
        val widthPx = constraints.maxWidth.toFloat()
        val visibleMonths = 4
        val yAxisWidth = with(density) { 55.dp.toPx() } // Aumentado para que quepa "mil"
        val graphWidth = widthPx - yAxisWidth
        val columnWidth = graphWidth / visibleMonths
        val contentWidth = max(graphWidth, columnWidth * labels.size)
        val maxScrollOffset = max(0f, contentWidth - graphWidth)

        var scrollOffset by remember { mutableFloatStateOf(maxScrollOffset) }

        LaunchedEffect(data.size) { scrollOffset = maxScrollOffset }

        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectHorizontalDragGestures { change, dragAmount ->
                        change.consume()
                        scrollOffset = (scrollOffset - dragAmount).coerceIn(0f, maxScrollOffset)
                    }
                }
        ) {
            val height = size.height
            val bottomPadding = 35.dp.toPx()
            val graphHeight = height - bottomPadding

            // --- CAPA 1: EJE Y ---
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
                    end = Offset(size.width, y),
                    strokeWidth = 1.dp.toPx()
                )
            }

            // Línea de Presupuesto
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

            // --- CAPA 2: GRÁFICO ---
            clipRect(left = yAxisWidth, right = size.width, top = 0f, bottom = size.height) {
                translate(left = -scrollOffset + yAxisWidth) {
                    if (data.isNotEmpty()) {
                        val path = Path()
                        val points = mutableListOf<Offset>()

                        data.forEachIndexed { index, valor ->
                            val x = (index * columnWidth) + (columnWidth / 2)
                            val y = graphHeight - (valor / maxY) * graphHeight

                            points.add(Offset(x, y))
                            if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)

                            val labelResult = textMeasurer.measure(
                                text = AnnotatedString(labels[index]),
                                style = labelStyle
                            )
                            drawText(
                                textLayoutResult = labelResult,
                                topLeft = Offset(
                                    x = x - (labelResult.size.width / 2),
                                    y = graphHeight + 10f
                                )
                            )
                        }

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

                        drawPath(
                            path = path,
                            color = White,
                            style = Stroke(
                                width = 3.dp.toPx(),
                                cap = StrokeCap.Round,
                                join = StrokeJoin.Round
                            )
                        )

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

private fun formatMil(value: Float): String {
    val rounded = value.roundToInt()
    return when {
        rounded == 0 -> "0"
        rounded >= 1000 -> "${rounded / 1000}mil"
        else -> rounded.toString()
    }
}
