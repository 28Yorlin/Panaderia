"""
Módulo de Predicción de Demanda con Machine Learning
Implementa un modelo RandomForestRegressor para predecir las ventas diarias de panadería.
Este script se encarga de la extracción, transformación, entrenamiento y evaluación del modelo,
generando finalmente métricas de rendimiento y gráficos de validación.
"""
import os
import sys
import pymysql
import json
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg') # Usar backend Agg para guardar gráficos sin interfaz gráfica
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_percentage_error,
    r2_score,
    mean_absolute_error,
    mean_squared_error,
)

def _add_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Genera características temporales y variables de rezago (lags/rolling windows)
    necesarias para el entrenamiento de series de tiempo.
    
    Args:
        df (pd.DataFrame): DataFrame original con datos históricos.
    Returns:
        pd.DataFrame: DataFrame enriquecido con nuevas columnas calculadas.
    """
    df = df.copy()
    # Limpieza básica de datos numéricos
    df["Cantidad_Vendida"] = pd.to_numeric(df["Cantidad_Vendida"], errors="coerce")
    df["Precio"] = pd.to_numeric(df["Precio"], errors="coerce")
    df["Precio"] = df["Precio"].fillna(df["Precio"].median())

    df["Producto"] = df["Producto"].astype(str).str.strip()

    if "fecha" in df.columns and "Fecha" not in df.columns:
        df = df.rename(columns={"fecha": "Fecha"})
        
    if "Fecha" in df.columns:
        df["Fecha"] = pd.to_datetime(df["Fecha"], errors="coerce")
        valid_fecha = df["Fecha"].notna()
        invalid_count = int((~valid_fecha).sum())
        if invalid_count > 0:
            print(f"WARNING: {invalid_count} registros carecen de formato de fecha valido.")
        
        if valid_fecha.any():
            # Descomposición de la fecha en variables categóricas temporales
            df.loc[valid_fecha, "Mes"] = df.loc[valid_fecha, "Fecha"].dt.month.astype(int)
            df.loc[valid_fecha, "Dia_Mes"] = df.loc[valid_fecha, "Fecha"].dt.day.astype(int)
            df.loc[valid_fecha, "Semana_Anio"] = df.loc[valid_fecha, "Fecha"].dt.isocalendar().week.astype(int)
            df.loc[valid_fecha, "Trimestre"] = df.loc[valid_fecha, "Fecha"].dt.quarter.astype(int)
            df.loc[valid_fecha, "Es_Inicio_Mes"] = (df.loc[valid_fecha, "Fecha"].dt.day <= 3).astype(int)
            df.loc[valid_fecha, "Es_Final_Mes"] = (df.loc[valid_fecha, "Fecha"].dt.day >= 28).astype(int)

            # Cálculo de variables de memoria (Lags y Promedios Móviles)
            temp = df.loc[valid_fecha].sort_values(["Producto", "Fecha"])
            temp["Lag_1"] = temp.groupby("Producto")["Cantidad_Vendida"].shift(1) # Ventas del día anterior
            temp["Lag_7"] = temp.groupby("Producto")["Cantidad_Vendida"].shift(7) # Ventas del mismo día la semana pasada
            temp["Rolling_7"] = temp.groupby("Producto")["Cantidad_Vendida"].transform(
                lambda s: s.shift(1).rolling(window=7, min_periods=1).mean() # Promedio móvil de 7 días
            )
            temp["Rolling_14"] = temp.groupby("Producto")["Cantidad_Vendida"].transform(
                lambda s: s.shift(1).rolling(window=14, min_periods=1).mean() # Promedio móvil quincenal
            )
            
            # Integrar los cálculos de vuelta al DataFrame principal
            df.loc[temp.index, ["Lag_1", "Lag_7", "Rolling_7", "Rolling_14"]] = (
                temp[["Lag_1", "Lag_7", "Rolling_7", "Rolling_14"]].fillna(0)
            )
        else:
            print("WARNING: Ausencia de registros con formato de fecha valido. Omitiendo variables de historial.")

    df["Es_Real"] = df.get("Es_Real", 0).fillna(0).astype(int)
    return df


def _train_and_save(df: pd.DataFrame, source_label: str):
    """
    Controlador principal del pipeline de Machine Learning.
    Entrena el modelo Random Forest y serializa los resultados.
    
    Args:
        df (pd.DataFrame): Dataset crudo con las ventas.
        source_label (str): Etiqueta descriptiva del origen de datos (CSV o MySQL).
    
    Returns:
        tuple: (bool success, dict metrics) Indicando éxito y las métricas obtenidas.
    """
    df = df.copy()
    df.columns = df.columns.str.strip()
    required = ["Dia_Semana", "Es_Fin_Semana", "Es_Feriado",
                "Temporada", "Producto", "Precio", "Cantidad_Vendida"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"ERROR: Columnas requeridas faltantes en el dataset: {missing}")
        return False, None

    df = df.dropna(subset=["Cantidad_Vendida", "Producto", "Temporada"])
    if len(df) < 30:
        print(f"ERROR: Insuficiente volumen de registros ({len(df)}). El minimo requerido es 30.")
        return False, None

    df["Cantidad_Vendida"] = pd.to_numeric(df["Cantidad_Vendida"], errors="coerce")
    df = df.dropna(subset=["Cantidad_Vendida"]).copy()
    if "Fecha" in df.columns:
        df["Fecha"] = pd.to_datetime(df["Fecha"], errors="coerce")
    
    df = df.sort_values(by="Fecha").reset_index(drop=True)
    df = _add_features(df)

    # 1. División temporal estricta (Prevención de Data Leakage)
    # Se usa el 80% más antiguo para entrenamiento y el 20% más reciente para validación.
    split_idx = int(len(df) * 0.8)
    train_indices = df.index[:split_idx]
    test_indices = df.index[split_idx:]
    
    # 2. Crear mapeos categóricos SOLO con datos de entrenamiento (evita fuga de datos)
    train_df = df.loc[train_indices].copy()
    prod_map = {p: i for i, p in enumerate(train_df["Producto"].unique())}
    temp_map = {s: i for i, s in enumerate(train_df["Temporada"].unique())}
    
    # 3. Aplicar codificación a TODO el dataset (valores nuevos/no vistos -> -1)
    df["Producto_enc"] = df["Producto"].map(prod_map).fillna(-1).astype(int)
    df["Temporada_enc"] = df["Temporada"].map(temp_map).fillna(-1).astype(int)
    
    # 4. Redefinir train_df para que incluya las nuevas columnas codificadas
    train_df = df.loc[train_indices]

    # 5. Cálculo de promedios históricos (Target Encoding) SOLO con datos de entrenamiento
    # Esto ayuda al modelo a entender el comportamiento promedio sin sesgarse con el futuro
    prod_mean = train_df.groupby("Producto_enc")["Cantidad_Vendida"].mean()
    prod_std = train_df.groupby("Producto_enc")["Cantidad_Vendida"].std().fillna(0)
    temp_mean = train_df.groupby("Temporada_enc")["Cantidad_Vendida"].mean()
    dia_mean = train_df.groupby("Dia_Semana")["Cantidad_Vendida"].mean()
    prod_price_mean = train_df.groupby("Producto_enc")["Precio"].mean()
    
    # Mapear los promedios al dataset completo
    df["Producto_mean_ventas"] = df["Producto_enc"].map(prod_mean).fillna(prod_mean.mean())
    df["Producto_std_ventas"] = df["Producto_enc"].map(prod_std).fillna(0)
    df["Temporada_mean_ventas"] = df["Temporada_enc"].map(temp_mean).fillna(temp_mean.mean())
    df["Dia_Semana_mean_ventas"] = df["Dia_Semana"].map(dia_mean).fillna(dia_mean.mean())
    df["Producto_precio_mean"] = df["Producto_enc"].map(prod_price_mean).fillna(prod_price_mean.mean())

    features = ["Dia_Semana", "Es_Fin_Semana", "Es_Feriado",
                "Temporada_enc", "Producto_enc", "Precio", "Es_Real"]
    extra_features = ["Mes", "Dia_Mes", "Semana_Anio", "Trimestre",
                      "Es_Inicio_Mes", "Es_Final_Mes", "Lag_1", "Lag_7",
                      "Rolling_7", "Rolling_14", "Producto_mean_ventas",
                      "Producto_std_ventas", "Producto_precio_mean",
                      "Temporada_mean_ventas", "Dia_Semana_mean_ventas"]
    features += [f for f in extra_features if f in df.columns]

    X = df[features].fillna(0)
    y = df["Cantidad_Vendida"].astype(float)

    X_train, X_test = X.loc[train_indices], X.loc[test_indices]
    y_train, y_test = y.loc[train_indices], y.loc[test_indices]
    
    print(f"INFO: Segmentacion temporal: {len(X_train)} entrenamiento / {len(X_test)} validacion")

    # Configuración del Random Forest Regressor
    # n_estimators=500: Cantidad de árboles de decisión a construir
    # max_depth=20: Profundidad máxima para prevenir sobreajuste (overfitting)
    model = RandomForestRegressor(
        n_estimators=500, max_depth=20, max_features="sqrt",
        min_samples_leaf=1, min_samples_split=2, bootstrap=True,
        oob_score=True, n_jobs=-1, random_state=42,
    )
    
    # Asignar más peso (importancia) a los registros que provienen de la BD Real vs el CSV simulado
    sample_weights = np.where(X_train["Es_Real"] == 1, 2.0, 1.0)
    
    # Entrenamiento del modelo
    model.fit(X_train, y_train, sample_weight=sample_weights)
    
    # Predicción sobre el set de prueba (20% más reciente)
    y_pred = model.predict(X_test)
    y_pred = np.clip(y_pred, 0, None) # Evitar predicciones negativas imposibles en ventas

    oob_score = float(model.oob_score_) if hasattr(model, 'oob_score_') else None
    mae  = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2   = r2_score(y_test, y_pred)
    mask = y_test != 0
    mape = (mean_absolute_percentage_error(y_test[mask], y_pred[mask]) * 100 if mask.any() else 0)

    print("\n" + "=" * 40)
    print(f"INFORME DE RENDIMIENTO ({source_label})")
    print("=" * 40)
    print(f"Registros analizados: {len(df)}")
    print(f"MAE: {mae:.2f}  RMSE: {rmse:.2f}  MAPE: {mape:.2f}%  R2: {r2:.2f}")
    if oob_score is not None:
        print(f"OOB R2: {oob_score:.4f}")
    print("=" * 40 + "\n")

    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, "../../data")
        os.makedirs(data_dir, exist_ok=True)
        
        plot_path_1 = os.path.join(data_dir, "real_vs_pred.png")
        plt.figure(figsize=(10, 5))
        sns.scatterplot(x=y_test, y=y_pred, color="blue", alpha=0.6)
        plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()],
                 color="red", linestyle="--", lw=2)
        plt.title("Comparación de Ventas Reales vs Predicciones")
        plt.xlabel("Ventas Reales")
        plt.ylabel("Predicción (IA)")
        plt.grid(True)
        plt.savefig(plot_path_1)
        plt.close()
        print(f"INFO: Visualizacion de dispersion exportada: {plot_path_1}")

        test_productos = df.loc[X_test.index, "Producto"]
        test_fechas = df.loc[X_test.index, "Fecha"]
        
        resultados_df = pd.DataFrame({
            "Fecha": test_fechas, "Producto": test_productos,
            "Real": y_test, "Predicción": y_pred
        })

        # Gráfico 2: Comparación Real vs Predicción (sin ordenar, por producto)
        plot_path_2 = os.path.join(data_dir, "real_vs_pred_producto.png")
        agrupado = resultados_df.groupby("Producto")[["Real", "Predicción"]].sum().reset_index()
        agrupado_melt = agrupado.melt(id_vars="Producto", var_name="Categoría", value_name="Volumen Total")
        
        plt.figure(figsize=(12, 6))
        sns.barplot(data=agrupado_melt, x="Producto", y="Volumen Total", hue="Categoría", palette=["#2ca02c", "#ff7f0e"])
        plt.title("Ventas Reales y Predicciones por Producto")
        plt.xlabel("Producto")
        plt.ylabel("Unidades Totales")
        plt.xticks(rotation=45, ha="right")
        plt.legend(title="")
        plt.tight_layout()
        plt.savefig(plot_path_2)
        plt.close()
        print(f"INFO: Visualizacion de volumen exportada: {plot_path_2}")

        # Gráfico 3: Los 5 Más Vendidos vs 5 Menos Vendidos
        plot_path_3 = os.path.join(data_dir, "top_bottom_productos.png")
        hist_ventas = df.groupby("Producto")["Cantidad_Vendida"].sum().reset_index()
        hist_ventas = hist_ventas.sort_values(by="Cantidad_Vendida", ascending=False)
        
        if len(hist_ventas) > 10:
            top_5 = hist_ventas.head(5).copy()
            bottom_5 = hist_ventas.tail(5).copy()
            hist_ventas = pd.concat([top_5, bottom_5])
            
        plt.figure(figsize=(12, 7))
        sns.set_style("whitegrid")  # Fondo limpio moderno
        
        # Colores específicos: Verdes esmeralda para Top 5, Rojos coral para Bottom 5
        colores = ['#10b981'] * 5 + ['#ef4444'] * 5
        
        ax = sns.barplot(data=hist_ventas, x="Cantidad_Vendida", y="Producto", palette=colores)
        
        # Escribir los números exactos al lado de cada barra
        for p in ax.patches:
            width = p.get_width()
            plt.text(width + (width * 0.015), p.get_y() + p.get_height() / 2,
                     f'{int(width):,}', ha='left', va='center', 
                     fontsize=11, fontweight='bold', color='#4b5563')
        
        # Quitar los marcos negros cuadrados del gráfico (minimalismo)
        sns.despine(left=True, bottom=True)
        
        # Tipografía y títulos elegantes
        plt.title("Los 5 Productos Más Vendidos y los 5 Menos Vendidos", 
                  fontsize=16, pad=20, fontweight='bold', color='#1f2937')
        plt.xlabel("Total de Unidades Vendidas", fontsize=11, color='#6b7280', labelpad=10)
        plt.ylabel("")
        
        # Hacer las líneas de guía más sutiles
        ax.xaxis.grid(True, linestyle='--', alpha=0.4)
        ax.yaxis.grid(False)
        
        plt.tight_layout()
        plt.savefig(plot_path_3, dpi=300) # Alta resolución
        plt.close()
        
        # Restaurar estilo por defecto por si afecta a otros gráficos en el futuro
        sns.reset_defaults()
        print(f"INFO: Visualizacion Premium Top 5 / Bottom 5 exportada: {plot_path_3}")

    except Exception as e:
        print(f"WARNING: Anomalia durante la generacion de graficos: {e}")

    # Guardar métricas y modelo en disco
    base_dir = os.path.dirname(os.path.abspath(__file__))
    save_path = os.path.join(base_dir, "../../saved_models/modelo_panaderia.pkl")
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    
    # Serialización del modelo mediante Joblib
    joblib.dump({
        "model": model, 
        "prod_map": prod_map, 
        "temp_map": temp_map,
        "features": features
    }, save_path)
    print(f"INFO: Modelo predictivo serializado correctamente en: {save_path}")

    metrics = {
        "mae": float(mae), "rmse": float(rmse),
        "mape": float(mape), "r2": float(r2),
        "data_source": source_label, "data_size": len(df)
    }
    if oob_score is not None:
        metrics["oob_r2"] = oob_score

    # Registro de métricas en la Base de Datos para el Dashboard
    try:
        conn = pymysql.connect(
            host=os.environ.get("DB_HOST", "127.0.0.1"),
            user=os.environ.get("DB_USER", "root"),
            password=os.environ.get("DB_PASSWORD", ""),
            database=os.environ.get("DB_NAME", "panaderia_db"),
            port=int(os.environ.get("DB_PORT", "3306")),
            charset="utf8mb4"
        )
        with conn.cursor() as cursor:
            # Actualizamos el registro del "Random Forest v1" (asumiendo id=1)
            sql = "UPDATE modelos_ml SET metrics = %s, fecha_entrenamiento = CURDATE() WHERE id = 1"
            cursor.execute(sql, (json.dumps(metrics),))
        conn.commit()
        conn.close()
        print("INFO: Metricas de entrenamiento registradas en MySQL exitosamente.")
    except Exception as e:
        print(f"WARNING: Error al registrar metricas en MySQL: {e}")

    return True, metrics


def load_from_csv():
    """
    Carga el dataset histórico base desde un archivo CSV estático.
    Ideal para entrenamiento frío cuando no hay suficientes datos en la DB.
    """
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../data/raw/Panaderia.csv")
    if not os.path.isfile(csv_path):
        print(f"ERROR: Archivo fuente no localizado: {csv_path}")
        return None
    
    column_names = [
        "Fecha", "Producto", "Dia_Semana", "Es_Fin_Semana", 
        "Es_Feriado", "Temporada", "Cantidad_Vendida", "Precio"
    ]
    df = pd.read_csv(csv_path, header=None, names=column_names, encoding="utf-8")
    df.columns = df.columns.str.strip()
    df["Es_Real"] = 0
    print(f"INFO: Conjunto historico CSV cargado: {len(df)} registros procesados — {df['Producto'].nunique()} categorias detectadas")
    return df


def load_from_mysql():
    """
    Extrae la data transaccional operativa directamente desde MySQL.
    Utiliza una Vista SQL (v_demanda_historica_ml) que cruza tablas para facilitar el análisis.
    """
    try:
        import pymysql
    except ImportError:
        print("ERROR: Paquete pymysql no detectado. Instalar con: pip install pymysql")
        return None

    conn = pymysql.connect(
        host     = os.environ.get("DB_HOST", "127.0.0.1"),
        user     = os.environ.get("DB_USER", "root"),
        password = os.environ.get("DB_PASSWORD", ""),
        database = os.environ.get("DB_NAME", "panaderia_db"),
        port     = int(os.environ.get("DB_PORT", "3306")),
        charset  = "utf8mb4",
    )
    sql = """
        SELECT Fecha, Dia_Semana, Es_Fin_Semana, Es_Feriado,
               Temporada, Producto, Precio, Cantidad_Vendida
        FROM v_demanda_historica_ml
        ORDER BY Fecha, id_producto
    """
    try:
        df = pd.read_sql(sql, conn)
    finally:
        conn.close()

    if df is None or len(df) == 0:
        print("WARNING: La vista relacional v_demanda_historica_ml se encuentra vacia.")
        return None

    df.columns = df.columns.str.strip()
    if "fecha" in df.columns and "Fecha" not in df.columns:
        df = df.rename(columns={"fecha": "Fecha"})

    df["Es_Real"] = 1
    print(f"INFO: Conjunto de datos relacionales cargado (MySQL): {len(df)} registros operativos")
    return df


def load_combined():
    """
    Estrategia de consolidación: Fusiona el historial estático (CSV)
    con las operaciones reales recientes (MySQL) para un entrenamiento robusto.
    """
    df_csv   = load_from_csv()
    df_mysql = load_from_mysql()

    if df_csv is None and df_mysql is None:
        return None, "Ausencia total de origenes de datos"

    if df_csv is None:
        return df_mysql, "Base relacional exclusiva (MySQL)"

    if df_mysql is None or len(df_mysql) == 0:
        print("INFO: Informacion operativa no detectada. Procediendo exclusivamente con el conjunto historico.")
        return df_csv, "Archivo plano exclusivo (CSV)"

    df_combined   = pd.concat([df_csv, df_mysql], ignore_index=True)
    label = f"Modelo Mixto CSV+MySQL ({len(df_mysql)} transacciones operativas)"
    print(f"INFO: Consolidacion finalizada: {len(df_csv)} estaticos + {len(df_mysql)} dinamicos = {len(df_combined)} volumen consolidado")
    return df_combined, label


def train_model(source=None):
    """
    Punto de entrada para el entrenamiento del modelo.
    Coordina la inyección de datos y dispara el pipeline principal.
    
    Args:
        source (str): 'auto', 'combined', 'csv', o 'mysql'. Determina el origen de datos.
    """
    if source is None:
        source = os.environ.get("TRAIN_SOURCE", "auto").lower()

    if source in ("auto", "combined"):
        df, label = load_combined()
        if df is None:
            return False, None
        return _train_and_save(df, label)

    if source == "csv":
        df = load_from_csv()
        if df is None:
            return False, None
        return _train_and_save(df, "Origen unico (CSV)")

    if source == "mysql":
        df = load_from_mysql()
        if df is None:
            return False, None
        return _train_and_save(df, "Origen unico (MySQL)")

    print(f"ERROR: Origen de datos especificado invalido: {source}")
    return False, None


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else None
    ok, metrics = train_model(source=src)
    sys.exit(0 if ok else 1)