"""
API de Servicios de Machine Learning (FastAPI)
Expone los endpoints para consumir el modelo predictivo de demanda de panadería.
Incluye carga de modelo en memoria, conexión a DB para extracción de features históricas
y un proceso asíncrono para reentrenamiento continuo.
"""
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import joblib
import os
import pandas as pd
import numpy as np
import asyncio
import pymysql
from src.models.random_forest import train_model
from dotenv import load_dotenv

# Cargar variables de entorno (credenciales DB, puertos, etc.)
load_dotenv(os.path.join(os.path.dirname(__file__), '../../../backend/.env'))

app = FastAPI(
    title="Servicio de Predicción de Demanda - Panadería",
    description="Microservicio Python para inferencia y entrenamiento del modelo Random Forest",
    version="1.0.0"
)
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../saved_models/modelo_panaderia.pkl')

# Variables globales para el almacenamiento del modelo en memoria
modelo = None
prod_map = None
temp_map = None
features_list = None

def get_db_conn():
    """Establece y retorna la conexión con la base de datos MySQL."""
    return pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'panaderia_db'),
        port=int(os.getenv('DB_PORT', 3306)),
        cursorclass=pymysql.cursors.DictCursor
    )


def get_history_features(producto, temporada, dia_semana, fecha_dt, precio):
    """
    Obtiene las características históricas de ventas desde la base de datos
    para nutrir las variables del modelo predictivo.
    """
    features = {
        'Lag_1': 0.0,
        'Lag_7': 0.0,
        'Rolling_7': 0.0,
        'Rolling_14': 0.0,
        'Producto_mean_ventas': 0.0,
        'Producto_std_ventas': 0.0,
        'Producto_precio_mean': float(precio),
        'Temporada_mean_ventas': 0.0,
        'Dia_Semana_mean_ventas': 0.0,
        'Producto_Dia_Semana_mean_ventas': 0.0,
    }
    try:
        conn = get_db_conn()
        with conn.cursor() as cursor:
            # Estadísticas por producto
            cursor.execute(
                """
                SELECT
                    AVG(Cantidad_Vendida) AS producto_mean_ventas,
                    STDDEV_POP(Cantidad_Vendida) AS producto_std_ventas,
                    AVG(Precio) AS producto_precio_mean
                FROM v_demanda_historica_ml
                WHERE Producto = %s
                """,
                (producto,)
            )
            row = cursor.fetchone()
            if row:
                features['Producto_mean_ventas'] = float(row.get('producto_mean_ventas') or 0)
                features['Producto_std_ventas'] = float(row.get('producto_std_ventas') or 0)
                if row.get('producto_precio_mean') is not None:
                    features['Producto_precio_mean'] = float(row['producto_precio_mean'])

            # Estadísticas por temporada
            cursor.execute(
                """
                SELECT AVG(Cantidad_Vendida) AS temporada_mean_ventas
                FROM v_demanda_historica_ml
                WHERE Temporada = %s
                """,
                (temporada,)
            )
            row = cursor.fetchone()
            if row and row.get('temporada_mean_ventas') is not None:
                features['Temporada_mean_ventas'] = float(row['temporada_mean_ventas'])

            # Estadísticas por día de la semana
            cursor.execute(
                """
                SELECT AVG(Cantidad_Vendida) AS dia_semana_mean_ventas
                FROM v_demanda_historica_ml
                WHERE Dia_Semana = %s
                """,
                (dia_semana,)
            )
            row = cursor.fetchone()
            if row and row.get('dia_semana_mean_ventas') is not None:
                features['Dia_Semana_mean_ventas'] = float(row['dia_semana_mean_ventas'])

            # Estadísticas combinadas (Producto y Día)
            cursor.execute(
                """
                SELECT AVG(Cantidad_Vendida) AS producto_dia_mean
                FROM v_demanda_historica_ml
                WHERE Producto = %s AND Dia_Semana = %s
                """,
                (producto, dia_semana)
            )
            row = cursor.fetchone()
            if row and row.get('producto_dia_mean') is not None:
                features['Producto_Dia_Semana_mean_ventas'] = float(row['producto_dia_mean'])

            # Obtención de historial reciente para cálculo de rezagos (lags) y medias móviles
            cursor.execute(
                """
                SELECT fecha AS Fecha, Cantidad_Vendida
                FROM v_demanda_historica_ml
                WHERE Producto = %s AND fecha < %s
                ORDER BY fecha DESC
                LIMIT 14
                """,
                (producto, fecha_dt.strftime('%Y-%m-%d'))
            )
            history = cursor.fetchall()
            if history:
                history_values = [float(r['Cantidad_Vendida']) for r in history if r.get('Cantidad_Vendida') is not None]
                if len(history_values) > 0:
                    features['Lag_1'] = history_values[0]
                    if len(history_values) > 6:
                        features['Lag_7'] = history_values[6]
                    if len(history_values) >= 1:
                        features['Rolling_7'] = float(sum(history_values[:7]) / min(len(history_values), 7))
                    if len(history_values) >= 1:
                        features['Rolling_14'] = float(sum(history_values[:14]) / min(len(history_values), 14))
    except Exception as e:
        print(f"WARNING: No se pudieron calcular las características históricas: {e}")
    finally:
        try:
            conn.close()
        except:
            pass
    return features

def recargar_modelo():
    """Carga el modelo predictivo serializado (.pkl) en memoria para inferencia rápida."""
    global modelo, prod_map, temp_map, features_list
    try:
        if os.path.exists(MODEL_PATH):
            data = joblib.load(MODEL_PATH)
            modelo = data.get('model')
            prod_map = data.get('prod_map', {})
            temp_map = data.get('temp_map', {})
            features_list = data.get('features', [])
            print("INFO: Modelo cargado en memoria exitosamente.")
        else:
            print("WARNING: No se encontró el archivo del modelo para inicializar.")
    except Exception as e:
        print(f"ERROR: Fallo al cargar el modelo: {e}")

async def tarea_aprendizaje_continuo():
    """
    Proceso en segundo plano que reentrena el modelo periódicamente (cada 24 horas)
    utilizando los datos más recientes de la base de datos para mantener la precisión.
    """
    await asyncio.sleep(15)
    while True:
        print("INFO: Iniciando proceso de reentrenamiento programado.")
        try:
            exito, metrics = train_model(source='combined')
            if exito:
                recargar_modelo()
                src = metrics.get('data_source', 'Desconocida')
                n   = metrics.get('data_size', 0)
                print(f"INFO: Modelo actualizado correctamente. Fuente de datos: {src} | Total registros: {n}")
            else:
                print("WARNING: El reentrenamiento no pudo completarse debido a validaciones internas.")
        except Exception as e:
            print(f"ERROR: Fallo en el ciclo de aprendizaje continuo: {e}")

        # Pausa de 24 horas (86400 segundos)
        await asyncio.sleep(86400)

@app.on_event("startup")
async def startup_event():
    """Inicialización de recursos al arrancar la API."""
    recargar_modelo()
    asyncio.create_task(tarea_aprendizaje_continuo())


class InputFeatures(BaseModel):
    """
    Contrato de datos de entrada (JSON Payload) esperado por el endpoint de predicción.
    Garantiza que el frontend envíe los datos obligatorios con el formato correcto.
    """
    fecha: str
    producto: str
    precio: Optional[float] = None
    es_feriado: Optional[int] = 0

def get_temporada(mes):
    """
    Asigna la temporada del año basada en el mes actual.
    Ayuda al modelo a entender patrones estacionales (ej. más ventas en invierno).
    """
    if mes in [12, 1, 2, 3]: return 'Verano'
    if mes in [4, 5]: return 'Otoño'
    if mes in [6, 7, 8, 9]: return 'Invierno'
    return 'Primavera'

@app.get("/health")
def health():
    """
    Endpoint de verificación de estado (Healthcheck).
    Utilizado por Docker o balanceadores de carga para saber si la API está viva
    y si el modelo predictivo se cargó correctamente en la RAM.
    """
    return {"status": "online", "model_ready": modelo is not None}

@app.post("/predecir")
def predecir(features: InputFeatures):
    """
    Endpoint principal de inferencia (Predicción de demanda).
    
    Flujo:
    1. Recibe fecha y producto del frontend.
    2. Enriquece los datos consultando precios y el historial reciente en la Base de Datos.
    3. Construye un vector de características (Feature Vector) idéntico al usado en entrenamiento.
    4. El modelo evalúa el vector y devuelve la cantidad exacta recomendada a producir.
    """
    if modelo is None:
        return {"error": "El modelo predictivo no se encuentra cargado en memoria."}
    
    # Procesamiento de variables de tiempo
    fecha_dt = pd.to_datetime(features.fecha)
    dia_semana = fecha_dt.dayofweek
    es_fin_semana = 1 if dia_semana >= 5 else 0
    temporada = get_temporada(fecha_dt.month)
    mes = int(fecha_dt.month)
    dia_mes = int(fecha_dt.day)
    semana_anio = int(fecha_dt.isocalendar().week)
    trimestre = int((mes - 1) // 3 + 1)
    es_inicio_mes = 1 if dia_mes <= 3 else 0
    es_final_mes = 1 if dia_mes >= 28 else 0

    # Transformación de variables categóricas mediante diccionarios
    prod_enc = prod_map.get(features.producto, -1)
    temp_enc = temp_map.get(temporada, -1)
        
    # Obtención del precio (Prioridad: Petición HTTP -> Base de Datos -> Valor por defecto)
    precio = features.precio
    if precio is None or precio <= 0:
        try:
            conn = get_db_conn()
            with conn.cursor() as cursor:
                cursor.execute("SELECT precio FROM productos WHERE nombre = %s LIMIT 1", (features.producto,))
                res = cursor.fetchone()
                precio = float(res['precio']) if res else 0.50
            conn.close()
        except:
            precio = 0.50

    # Recuperar variables derivadas de la base de datos
    history_features = get_history_features(
        features.producto,
        temporada,
        dia_semana,
        fecha_dt,
        precio,
    )

    # Estructurar el vector de características (Feature Vector)
    X = pd.DataFrame([{
        'Dia_Semana': dia_semana,
        'Es_Fin_Semana': es_fin_semana,
        'Es_Feriado': features.es_feriado or 0,
        'Temporada_enc': temp_enc,
        'Producto_enc': prod_enc,
        'Precio': precio,
        'Mes': mes,
        'Dia_Mes': dia_mes,
        'Semana_Anio': semana_anio,
        'Trimestre': trimestre,
        'Es_Inicio_Mes': es_inicio_mes,
        'Es_Final_Mes': es_final_mes,
        'Es_Real': 0,
        'Lag_1': history_features['Lag_1'],
        'Lag_7': history_features['Lag_7'],
        'Rolling_7': history_features['Rolling_7'],
        'Rolling_14': history_features['Rolling_14'],
        'Producto_mean_ventas': history_features['Producto_mean_ventas'],
        'Producto_std_ventas': history_features['Producto_std_ventas'],
        'Producto_precio_mean': history_features['Producto_precio_mean'],
        'Temporada_mean_ventas': history_features['Temporada_mean_ventas'],
        'Dia_Semana_mean_ventas': history_features['Dia_Semana_mean_ventas'],
        'Producto_Dia_Semana_mean_ventas': history_features['Producto_Dia_Semana_mean_ventas'],
    }])
    
    # Garantizar el orden estricto de las columnas para el modelo
    if features_list:
        # Añadir variables faltantes con valor 0 para no romper el predict
        for col in features_list:
            if col not in X.columns:
                X[col] = 0
        X = X.reindex(columns=features_list).fillna(0)
    else:
        # Fallback a columnas hardcodeadas si no están en el pkl
        X = X.reindex(columns=[
            'Dia_Semana', 'Es_Fin_Semana', 'Es_Feriado', 'Temporada_enc',
            'Producto_enc', 'Precio', 'Es_Real', 'Mes', 'Dia_Mes', 'Semana_Anio',
            'Trimestre', 'Es_Inicio_Mes', 'Es_Final_Mes', 'Lag_1', 'Lag_7',
            'Rolling_7', 'Rolling_14', 'Producto_mean_ventas',
            'Producto_std_ventas', 'Producto_precio_mean',
            'Temporada_mean_ventas', 'Dia_Semana_mean_ventas',
            'Producto_Dia_Semana_mean_ventas'
        ]).fillna(0)
    
    # Ejecutar la predicción
    pred = float(modelo.predict(X)[0])
    pred = max(0, pred)  # Truncar posibles valores negativos
    
    return {
        "producto": features.producto,
        "cantidad_estimada": int(max(0, round(pred))),
        "fecha": features.fecha,
        "variables_usadas": {
            "precio": precio,
            "temporada": temporada,
            "es_feriado": bool(features.es_feriado)
        }
    }

@app.post("/entrenar")
def entrenar():
    """
    Endpoint manual para forzar la actualización y reentrenamiento del modelo.
    Este endpoint puede ser disparado desde el Dashboard del Administrador.
    Al finalizar, recarga el modelo fresco en la memoria RAM automáticamente.
    """
    try:
        exito, metrics = train_model(source='auto')
        if exito:
            recargar_modelo()
            return {"success": True, "message": "Entrenamiento finalizado exitosamente", "metrics": metrics}
        else:
            return {"success": False, "message": "No se pudo entrenar el modelo, verifique la disponibilidad de datos"}
    except Exception as e:
        return {"success": False, "message": f"Error durante el entrenamiento: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
