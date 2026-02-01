package com.example.finances

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

// --- DAOS ---

@Dao
interface CompraCuotasDao {
    @Query("SELECT * FROM compras_cuotas")
    fun getAll(): Flow<List<CompraCuotas>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(compra: CompraCuotas)

    @Update
    suspend fun update(compra: CompraCuotas)

    @Delete
    suspend fun delete(compra: CompraCuotas)
}

@Dao
interface GastoDao {
    @Query("SELECT * FROM gastos ORDER BY fecha DESC")
    fun getAll(): Flow<List<Gasto>>

    @Insert
    suspend fun insert(gasto: Gasto)

    @Delete
    suspend fun delete(gasto: Gasto)
}

@Dao
interface AhorroDao {
    @Query("SELECT * FROM ahorros ORDER BY fecha DESC")
    fun getAll(): Flow<List<Ahorro>>

    @Insert
    suspend fun insert(ahorro: Ahorro)

    @Delete
    suspend fun delete(ahorro: Ahorro)
}

@Dao
interface MetaAhorroDao {
    @Query("SELECT * FROM metas_ahorro")
    fun getAll(): Flow<List<MetaAhorro>>

    @Insert
    suspend fun insert(meta: MetaAhorro)

    @Update
    suspend fun update(meta: MetaAhorro)

    @Delete
    suspend fun delete(meta: MetaAhorro)
}

// --- DATABASE ---

@Database(
    entities = [CompraCuotas::class, Gasto::class, Ahorro::class, MetaAhorro::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun compraCuotasDao(): CompraCuotasDao
    abstract fun gastoDao(): GastoDao
    abstract fun ahorroDao(): AhorroDao
    abstract fun metaAhorroDao(): MetaAhorroDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "finances_db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
