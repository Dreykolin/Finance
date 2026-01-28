package com.example.finances

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.List // Importación corregida
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.tooling.preview.Preview
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

// --- Rutas de navegación ---
sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    data object Cuotas : Screen("cuotas", "Cuotas", Icons.Rounded.Payments)
    // Se usa la versión AutoMirrored para corregir el warning
    data object Gastos : Screen("gastos", "Gastos", Icons.AutoMirrored.Rounded.List)
}

val items = listOf(Screen.Cuotas, Screen.Gastos)

// --- Aplicación Principal ---
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FinancesApp()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinancesApp() {
    val navController = rememberNavController()

    // Asignación de colores para el Bottom Bar
    val Zinc900 = Color(0xFF18181B)
    val Zinc700 = Color(0xFF3F3F46)
    val White = Color(0xFFFFFFFF)

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = Zinc900,
                contentColor = White
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination

                items.forEach { screen ->
                    val selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = screen.title) },
                        label = { Text(screen.title) },
                        selected = selected,
                        onClick = {
                            navController.navigate(screen.route) {
                                // Evita construir una gran pila de destinos al navegar
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                // Evita múltiples copias del mismo destino en la pila
                                launchSingleTop = true
                                // Restaura el estado al cambiar de pestaña
                                restoreState = true
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = White,
                            selectedTextColor = White,
                            unselectedIconColor = Zinc700,
                            unselectedTextColor = Zinc700,
                            indicatorColor = Zinc700
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Cuotas.route, // La pestaña de Cuotas será la principal
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Cuotas.route) {
                GestorCuotasScreen()
            }
            composable(Screen.Gastos.route) {
                ResumenGastosScreen()
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun PreviewFinancesApp() {
    FinancesApp()
}