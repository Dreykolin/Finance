package com.example.finances

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate

private val White = Color(0xFFFFFFFF)
private val Zinc300 = Color(0xFFD4D4D8)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)
private val Zinc600 = Color(0xFF52525B)
private val Zinc700 = Color(0xFF3F3F46)
private val Zinc800 = Color(0xFF27272A)
private val Zinc900 = Color(0xFF18181B)
private val Zinc950 = Color(0xFF09090B)

@Composable
fun AhorrosScreen(metaAhorro: Int = 500000) {
    var ahorros by remember { mutableStateOf(listOf<Ahorro>()) }
    var mostrarFormulario by remember { mutableStateOf(false) }

    Surface(modifier = Modifier.fillMaxSize(), color = Zinc950) {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
                    Text("Mis Ahorros", color = White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp)
                    Text("Visualiza el crecimiento de tu capital.", color = Zinc400, fontSize = 16.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }

            // Gráfico de Ahorro Acumulado con la Meta
            item {
                ChartContainer("Crecimiento vs Meta") {
                    AhorrosChart(ahorros = ahorros, metaAhorro = metaAhorro)
                }
            }

            // Sección de Lista y Botón
            item {
                Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(12.dp)).padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Historial de Ahorro", color = White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Button(
                            onClick = { mostrarFormulario = !mostrarFormulario },
                            colors = ButtonDefaults.buttonColors(containerColor = if (mostrarFormulario) Zinc800 else White, contentColor = if (mostrarFormulario) Zinc400 else Zinc950),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Text(if (mostrarFormulario) "✕ Cancelar" else "+ Añadir", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        }
                    }

                    if (mostrarFormulario) {
                        FormularioNuevoAhorro(
                            onSave = { nuevo -> 
                                ahorros = ahorros + nuevo.copy(id = (ahorros.lastOrNull()?.id ?: 0) + 1)
                                mostrarFormulario = false
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    
                    TablaAhorros(ahorros)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormularioNuevoAhorro(onSave: (Ahorro) -> Unit) {
    var monto by remember { mutableStateOf("") }
    var fecha by remember { mutableStateOf(LocalDate.now().toString()) }

    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc950).border(1.dp, Zinc700, RoundedCornerShape(12.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(
                value = monto,
                onValueChange = { monto = it.filter { char -> char.isDigit() } },
                label = { Text("Monto a Ahorrar") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = White, unfocusedBorderColor = Zinc700, cursorColor = White),
                shape = RoundedCornerShape(8.dp)
            )
            OutlinedTextField(
                value = fecha,
                onValueChange = { fecha = it },
                label = { Text("Fecha") },
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Zinc950, unfocusedContainerColor = Zinc950, focusedBorderColor = White, unfocusedBorderColor = Zinc700, cursorColor = White),
                shape = RoundedCornerShape(8.dp)
            )
        }
        Button(
            onClick = { if (monto.isNotBlank()) onSave(Ahorro(0, monto.toInt(), fecha)) },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Guardar Ahorro", fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun TablaAhorros(ahorros: List<Ahorro>) {
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).border(1.dp, Zinc800, RoundedCornerShape(12.dp))) {
        Row(modifier = Modifier.fillMaxWidth().background(Zinc900).padding(12.dp)) {
            Text("Fecha", Modifier.weight(0.4f), color = Zinc500, fontSize = 11.sp)
            Text("Monto", Modifier.weight(0.6f), color = Zinc500, fontSize = 11.sp, textAlign = TextAlign.End)
        }
        if (ahorros.isEmpty()) {
            Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                Text("No hay ahorros registrados", color = Zinc600, fontSize = 13.sp)
            }
        } else {
            ahorros.forEach { ahorro ->
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 14.dp)) {
                    val parts = ahorro.fecha.split("-")
                    val fmt = if(parts.size == 3) "${parts[2]}/${parts[1]}/${parts[0].takeLast(2)}" else ahorro.fecha
                    Text(fmt, Modifier.weight(0.4f), color = Zinc400, fontSize = 14.sp)
                    Text(formatCLP(ahorro.monto), Modifier.weight(0.6f), color = White, fontWeight = FontWeight.Bold, fontSize = 14.sp, textAlign = TextAlign.End)
                }
                HorizontalDivider(color = Zinc800.copy(alpha = 0.5f))
            }
        }
    }
}
