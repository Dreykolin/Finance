package com.example.finances

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val White = Color(0xFFFFFFFF)
private val Zinc400 = Color(0xFFA1A1AA)
private val Zinc500 = Color(0xFF71717A)
private val Zinc700 = Color(0xFF3F3F46)
private val Zinc800 = Color(0xFF27272A)
private val Zinc900 = Color(0xFF18181B)
private val Zinc950 = Color(0xFF09090B)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AjustesScreen(
    presupuestoActual: Int,
    metodosSeleccionados: List<String>,
    onPresupuestoChanged: (Int) -> Unit,
    onMetodosChanged: (List<String>) -> Unit,
    currentAccentColor: Color,
    onAccentColorChanged: (Color) -> Unit
) {
    var presupuestoInput by remember { mutableStateOf(presupuestoActual.toString()) }
    val todosLosMetodos = listOf("Efectivo", "Tarjeta", "Débito", "Crédito", "Transferencia")
    
    // Estados para el selector RGB
    var red by remember { mutableFloatStateOf(currentAccentColor.red) }
    var green by remember { mutableFloatStateOf(currentAccentColor.green) }
    var blue by remember { mutableFloatStateOf(currentAccentColor.blue) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Zinc950
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Header
            item {
                Column {
                    Text("Ajustes", color = White, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-1).sp)
                    Text("Configura tus metas y preferencias.", color = Zinc400, fontSize = 16.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }

            // Sección Color de Acento (RGB)
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(12.dp)).padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Rounded.Palette, null, tint = currentAccentColor)
                        Text("Color del Tema", color = White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }

                    // Previsualización del color
                    Box(
                        modifier = Modifier.fillMaxWidth().height(60.dp).clip(RoundedCornerShape(8.dp)).background(Color(red, green, blue))
                    )

                    // Sliders RGB
                    ColorSlider(label = "Rojo", value = red, onValueChange = { red = it; onAccentColorChanged(Color(red, green, blue)) }, color = Color.Red)
                    ColorSlider(label = "Verde", value = green, onValueChange = { green = it; onAccentColorChanged(Color(red, green, blue)) }, color = Color.Green)
                    ColorSlider(label = "Azul", value = blue, onValueChange = { blue = it; onAccentColorChanged(Color(red, green, blue)) }, color = Color.Blue)
                    
                    // Ajustes rápidos (Presets)
                    Text("Presets rápidos", color = Zinc500, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        listOf(Color(0xFF3B82F6), Color(0xFFEF4444), Color(0xFF10B981), Color(0xFFF59E0B), Color(0xFF8B5CF6)).forEach { color ->
                            Box(
                                modifier = Modifier.size(32.dp).clip(CircleShape).background(color).clickable {
                                    red = color.red
                                    green = color.green
                                    blue = color.blue
                                    onAccentColorChanged(color)
                                }
                            )
                        }
                    }
                }
            }

            // Sección Presupuesto
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(12.dp)).padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text("Límites", color = White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = presupuestoInput,
                        onValueChange = { if (it.all { char -> char.isDigit() }) presupuestoInput = it },
                        label = { Text("Presupuesto Mensual") },
                        prefix = { Text("$ ") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Zinc950,
                            unfocusedContainerColor = Zinc950,
                            focusedBorderColor = currentAccentColor,
                            focusedTextColor = White,
                            unfocusedTextColor = White,
                            cursorColor = currentAccentColor
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                    Button(
                        onClick = { onPresupuestoChanged(presupuestoInput.toIntOrNull() ?: 0) },
                        colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) {
                        Text("Actualizar Valores", fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Sección Métodos de Pago
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Zinc900).border(1.dp, Zinc800, RoundedCornerShape(12.dp)).padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text("Métodos en Gráficos", color = White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        todosLosMetodos.forEach { metodo ->
                            val isSelected = metodosSeleccionados.contains(metodo)
                            Row(
                                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) currentAccentColor.copy(alpha = 0.2f) else Color.Transparent)
                                    .clickable {
                                        val newList = if (isSelected) metodosSeleccionados - metodo else metodosSeleccionados + metodo
                                        onMetodosChanged(newList)
                                    }
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(text = metodo, color = if (isSelected) White else Zinc500)
                                if (isSelected) Icon(Icons.Rounded.Check, null, tint = currentAccentColor, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ColorSlider(label: String, value: Float, onValueChange: (Float) -> Unit, color: Color) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, color = Zinc400, fontSize = 12.sp)
            Text((value * 255).toInt().toString(), color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            colors = SliderDefaults.colors(
                thumbColor = White,
                activeTrackColor = color,
                inactiveTrackColor = Zinc800
            )
        )
    }
}
