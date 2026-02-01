package com.example.finances

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.ui.text.font.FontWeight
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
private val Zinc800 = Color(0xFF27272A)
private val Zinc950 = Color(0xFF09090B)
private val Red500 = Color(0xFFEF4444)

@OptIn(ExperimentalTextApi::class)
@Composable
fun AhorrosChart(
    ahorros: List<Ahorro>,
    metaAhorro: Int = 500000,
    modifier: Modifier = Modifier.fillMaxWidth().height(300.dp)
) {
    val accentColor = LocalAppAccentColor.current

    if (ahorros.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Text("No hay ahorros registrados.", color = Zinc500)
        }
        return
    }

    val chartData = remember(ahorros) {
        val porMes = ahorros.groupBy {
            val date = LocalDate.parse(it.fecha)
            "${date.year}-${date.monthValue.toString().padStart(2, '0')}"
        }.mapValues { entry -> entry.value.sumOf { it.monto } }.toSortedMap()

        val labels = mutableListOf<String>()
        val values = mutableListOf<Float>()
        var acumulado = 0f

        porMes.forEach { (key, monto) ->
            val parts = key.split("-")
            val date = LocalDate.of(parts[0].toInt(), parts[1].toInt(), 1)
            labels.add(date.format(DateTimeFormatter.ofPattern("MMM", Locale("es", "CL"))).replaceFirstChar { it.uppercase() })
            acumulado += monto
            values.add(acumulado)
        }
        Pair(labels, values)
    }

    val (labels, data) = chartData
    val maxAhorro = data.maxOrNull() ?: 0f
    
    val rawMaxY = max(maxAhorro, metaAhorro.toFloat())
    
    val stepCount = 4
    val powerOf10 = 10f.pow(ceil(log10(rawMaxY / stepCount)).toInt() - 1)
    val niceStep = ceil((rawMaxY / stepCount) / powerOf10) * powerOf10
    val maxY = niceStep * stepCount

    val textMeasurer = rememberTextMeasurer()
    val density = LocalDensity.current
    
    val priceStyle = MaterialTheme.typography.bodySmall.copy(color = Zinc500, fontSize = 10.sp)
    val labelStyle = TextStyle(color = Zinc400, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    val tooltipStyle = TextStyle(color = White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    val goalLabelStyle = TextStyle(color = Red500, fontSize = 10.sp, fontWeight = FontWeight.Bold)

    var selectedIndex by remember { mutableIntStateOf(-1) }

    BoxWithConstraints(modifier = modifier) {
        val widthPx = constraints.maxWidth.toFloat()
        val visibleMonths = 4
        val yAxisWidth = with(density) { 65.dp.toPx() }
        val graphWidth = widthPx - yAxisWidth
        val columnWidth = graphWidth / visibleMonths
        val contentWidth = max(graphWidth, columnWidth * labels.size)
        val maxScrollOffset = max(0f, contentWidth - graphWidth)
        var scrollOffset by remember { mutableFloatStateOf(maxScrollOffset) }

        LaunchedEffect(data.size) { scrollOffset = maxScrollOffset }

        Canvas(
            modifier = Modifier.fillMaxSize()
                .pointerInput(Unit) {
                    detectHorizontalDragGestures { change, dragAmount ->
                        change.consume()
                        scrollOffset = (scrollOffset - dragAmount).coerceIn(0f, maxScrollOffset)
                        selectedIndex = -1
                    }
                }
                .pointerInput(labels.size) {
                    detectTapGestures { offset ->
                        val localX = offset.x - yAxisWidth + scrollOffset
                        val index = (localX / columnWidth).toInt()
                        if (index in data.indices) selectedIndex = if (selectedIndex == index) -1 else index
                        else selectedIndex = -1
                    }
                }
        ) {
            val height = size.height
            val bottomPadding = 35.dp.toPx()
            val graphHeight = height - bottomPadding

            // EJE Y
            for (i in 0..stepCount) {
                val value = niceStep * i
                val y = graphHeight - (value / maxY) * graphHeight
                val textLayout = textMeasurer.measure(formatMil(value), style = priceStyle)
                drawText(
                    textLayoutResult = textLayout,
                    topLeft = Offset(yAxisWidth - textLayout.size.width - 15f, y - textLayout.size.height/2)
                )
                drawLine(White.copy(alpha = 0.05f), Offset(yAxisWidth, y), Offset(size.width, y), 1.dp.toPx())
            }

            // LÍNEA DE META (FIJA)
            val goalY = graphHeight - (metaAhorro / maxY) * graphHeight
            if (goalY >= 0) {
                drawLine(
                    color = Red500.copy(alpha = 0.6f),
                    start = Offset(yAxisWidth, goalY),
                    end = Offset(size.width, goalY),
                    strokeWidth = 2.dp.toPx(),
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                )

                val goalText = "META: ${formatCLP(metaAhorro)}"
                val goalMeasured = textMeasurer.measure(goalText, style = goalLabelStyle)
                drawText(
                    textLayoutResult = goalMeasured,
                    topLeft = Offset(
                        x = size.width - goalMeasured.size.width - 10f,
                        y = goalY - goalMeasured.size.height - 4f
                    )
                )
            }

            // CONTENIDO SCROLLABLE
            clipRect(left = yAxisWidth, right = size.width, top = 0f, bottom = size.height) {
                translate(left = -scrollOffset + yAxisWidth) {
                    val path = Path()
                    val points = mutableListOf<Offset>()

                    data.forEachIndexed { index, valor ->
                        val x = (index * columnWidth) + (columnWidth / 2)
                        val y = graphHeight - (valor / maxY) * graphHeight
                        points.add(Offset(x, y))
                        if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)

                        val labelResult = textMeasurer.measure(labels[index], style = labelStyle)
                        drawText(
                            textLayoutResult = labelResult,
                            topLeft = Offset(x - labelResult.size.width/2, graphHeight + 10f)
                        )
                    }

                    val fillPath = Path().apply {
                        addPath(path)
                        lineTo(points.last().x, graphHeight)
                        lineTo(points.first().x, graphHeight)
                        close()
                    }
                    drawPath(fillPath, brush = Brush.verticalGradient(listOf(accentColor.copy(alpha = 0.2f), Color.Transparent), startY = 0f, endY = graphHeight))
                    drawPath(path, color = accentColor, style = Stroke(3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))

                    points.forEachIndexed { index, point ->
                        val isSelected = index == selectedIndex
                        val radius = if (isSelected) 8.dp.toPx() else 6.dp.toPx()
                        drawCircle(Zinc950, radius, point)
                        drawCircle(if (isSelected) White else accentColor, radius, point, style = Stroke(if (isSelected) 3.dp.toPx() else 2.dp.toPx()))

                        if (isSelected) {
                            val precise = formatCLP(data[index].toInt())
                            val tooltip = textMeasurer.measure(precise, style = tooltipStyle)
                            val tw = tooltip.size.width + 16f
                            val th = tooltip.size.height + 8f
                            val to = Offset(point.x - tw/2, point.y - th - 12f)
                            drawRoundRect(Zinc800, to, androidx.compose.ui.geometry.Size(tw, th), androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()))
                            drawText(
                                textLayoutResult = tooltip,
                                topLeft = Offset(to.x + 8f, to.y + 4f)
                            )
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
