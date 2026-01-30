package com.example.finances

import java.text.NumberFormat
import java.util.Locale

// --- MODELO DE DATOS (CUOTAS) ---
data class CompraCuotas(
    val id: Int,
    val producto: String,
    val tienda: String,
    val cuotasTotales: Int,
    val cuotasPagadas: Int,
    val montoCuota: Int,
    val fechaInicio: String
)

// --- MODELO DE DATOS (GASTOS) ---
data class Gasto(
    val id: Int,
    val descripcion: String,
    val metodoPago: String,
    val monto: Int,
    val fecha: String // YYYY-MM-DD
)

// --- MODELO DE DATOS (AHORROS) ---
data class Ahorro(
    val id: Int,
    val monto: Int,
    val fecha: String, // YYYY-MM-DD
    val esRetiro: Boolean = false
)

// --- MODELO DE DATOS (METAS) ---
data class MetaAhorro(
    val id: Int,
    val nombre: String,
    val montoObjetivo: Int,
    val completada: Boolean = false
)

// --- UTILIDADES ---
fun formatCLP(amount: Int): String {
    val format = NumberFormat.getCurrencyInstance(Locale("es", "CL"))
    return format.format(amount)
}
