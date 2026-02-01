package com.example.finances

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.List
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Savings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    data object Gastos : Screen("gastos", "Gastos", Icons.AutoMirrored.Rounded.List)
    data object Cuotas : Screen("cuotas", "Cuotas", Icons.Rounded.Payments)
    data object Ahorros : Screen("ahorros", "Ahorros", Icons.Rounded.Savings)
    data object Ajustes : Screen("ajustes", "Ajustes", Icons.Rounded.Settings)
}

val items = listOf(Screen.Gastos, Screen.Cuotas, Screen.Ahorros, Screen.Ajustes)

val LocalAppAccentColor = staticCompositionLocalOf { Color(0xFF3B82F6) }

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
    val context = LocalContext.current
    val sharedPrefs = remember { context.getSharedPreferences("finances_prefs", Context.MODE_PRIVATE) }
    
    var accentColor by remember { 
        mutableStateOf(Color(sharedPrefs.getInt("accent_color", Color(0xFF3B82F6).toArgb()))) 
    }
    
    var presupuestoMensual by remember { 
        mutableIntStateOf(sharedPrefs.getInt("presupuesto", 100000)) 
    }
    var metodosVisibles by remember { 
        mutableStateOf(sharedPrefs.getStringSet("metodos", setOf("Efectivo", "Tarjeta", "Débito"))?.toList() ?: listOf("Efectivo")) 
    }

    val Zinc900 = Color(0xFF18181B)
    val Zinc700 = Color(0xFF3F3F46)
    val White = Color(0xFFFFFFFF)

    CompositionLocalProvider(LocalAppAccentColor provides accentColor) {
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
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = accentColor,
                                selectedTextColor = accentColor,
                                unselectedIconColor = Zinc700,
                                unselectedTextColor = Zinc700,
                                indicatorColor = Zinc700.copy(alpha = 0.3f)
                            )
                        )
                    }
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = Screen.Gastos.route,
                modifier = Modifier.padding(innerPadding),
                // Eliminamos las transiciones laterales pesadas por un Crossfade (Fade In/Out) más limpio
                enterTransition = { fadeIn(animationSpec = tween(300)) },
                exitTransition = { fadeOut(animationSpec = tween(300)) },
                popEnterTransition = { fadeIn(animationSpec = tween(300)) },
                popExitTransition = { fadeOut(animationSpec = tween(300)) }
            ) {
                composable(Screen.Gastos.route) {
                    ResumenGastosScreen(
                        presupuestoMensual = presupuestoMensual,
                        onPresupuestoChanged = { 
                            presupuestoMensual = it
                            sharedPrefs.edit().putInt("presupuesto", it).apply()
                        },
                        metodosVisibles = metodosVisibles,
                        onMetodosChanged = { 
                            metodosVisibles = it
                            sharedPrefs.edit().putStringSet("metodos", it.toSet()).apply()
                        }
                    )
                }
                composable(Screen.Cuotas.route) {
                    GestorCuotasScreen()
                }
                composable(Screen.Ahorros.route) {
                    AhorrosScreen()
                }
                composable(Screen.Ajustes.route) {
                    AjustesScreen(
                        presupuestoActual = presupuestoMensual,
                        metodosSeleccionados = metodosVisibles,
                        onPresupuestoChanged = { 
                            presupuestoMensual = it
                            sharedPrefs.edit().putInt("presupuesto", it).apply()
                        },
                        onMetodosChanged = { 
                            metodosVisibles = it
                            sharedPrefs.edit().putStringSet("metodos", it.toSet()).apply()
                        },
                        currentAccentColor = accentColor,
                        onAccentColorChanged = { newColor ->
                            accentColor = newColor
                            sharedPrefs.edit().putInt("accent_color", newColor.toArgb()).apply()
                        }
                    )
                }
            }
        }
    }
}
