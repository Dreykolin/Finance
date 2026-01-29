package com.example.finances

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
    onMetodosChanged: (List<String>) -> Unit
) {
    var presupuestoInput by remember { mutableStateOf(presupuestoActual.toString()) }
    val todosLosMetodos = listOf("Efectivo", "Tarjeta", "Débito", "Crédito", "Transferencia")

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Zinc950
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            // Header
            Column {
                Text(
                    text = "Ajustes",
                    color = White,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-1).sp
                )
                Text(
                    text = "Configura tus preferencias y límites.",
                    color = Zinc400,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // Sección Presupuesto
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Zinc900)
                    .border(1.dp, Zinc800, RoundedCornerShape(12.dp))
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Presupuesto Mensual",
                    color = White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                
                OutlinedTextField(
                    value = presupuestoInput,
                    onValueChange = { if (it.all { char -> char.isDigit() }) presupuestoInput = it },
                    label = { Text("Monto del Presupuesto") },
                    prefix = { Text("$ ") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Zinc950,
                        unfocusedContainerColor = Zinc950,
                        focusedBorderColor = White,
                        unfocusedBorderColor = Zinc700,
                        cursorColor = White,
                        focusedLabelColor = White,
                        unfocusedLabelColor = Zinc500
                    ),
                    shape = RoundedCornerShape(8.dp)
                )

                Button(
                    onClick = { onPresupuestoChanged(presupuestoInput.toIntOrNull() ?: 0) },
                    colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Zinc950),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Actualizar Presupuesto", fontWeight = FontWeight.Bold)
                }
            }

            // Sección Métodos de Pago
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(Zinc900)
                    .border(1.dp, Zinc800, RoundedCornerShape(12.dp))
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Métodos en Gráficos",
                    color = White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Selecciona qué métodos ver en el gráfico de barras.",
                    color = Zinc500,
                    fontSize = 14.sp
                )

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    todosLosMetodos.forEach { metodo ->
                        val isSelected = metodosSeleccionados.contains(metodo)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) Zinc800 else Color.Transparent)
                                .clickable {
                                    val newList = if (isSelected) {
                                        metodosSeleccionados - metodo
                                    } else {
                                        metodosSeleccionados + metodo
                                    }
                                    onMetodosChanged(newList)
                                }
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(text = metodo, color = if (isSelected) White else Zinc500)
                            if (isSelected) {
                                Icon(Icons.Rounded.Check, null, tint = White, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
