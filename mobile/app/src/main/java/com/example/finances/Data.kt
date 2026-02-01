package com.example.finances

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.text.NumberFormat
import java.util.Locale

// --- MODELO DE DATOS (CUOTAS) ---
@Entity(tableName = "compras_cuotas")
data class CompraCuotas(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val producto: String,
    val tienda: String,
    val cuotasTotales: Int,
    val cuotasPagadas: Int,
    val montoCuota: Int,
    val fechaInicio: String
)

// --- MODELO DE DATOS (GASTOS) ---
@Entity(tableName = "gastos")
data class Gasto(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val descripcion: String,
    val metodoPago: String,
    val monto: Int,
    val fecha: String // YYYY-MM-DD
)

// --- MODELO DE DATOS (AHORROS) ---
@Entity(tableName = "ahorros")
data class Ahorro(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val monto: Int,
    val fecha: String, // YYYY-MM-DD
    val esRetiro: Boolean = false
)

// --- MODELO DE DATOS (METAS) ---
@Entity(tableName = "metas_ahorro")
data class MetaAhorro(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val nombre: String,
    val montoObjetivo: Int,
    val completada: Boolean = false
)

// --- UTILIDADES ---
fun formatCLP(amount: Int): String {
    val format = NumberFormat.getCurrencyInstance(Locale("es", "CL"))
    return format.format(amount)
}
