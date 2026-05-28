# Script de Inicialización: Servicio de Machine Learning (Panadería)
# Este script levanta automáticamente la API de predicción de Python.
# Si detecta que no existe un modelo preentrenado, ejecutará el 
# entrenamiento automático (First-time setup) antes de levantar el servidor.
# 
# Uso desde PowerShell: .\start.ps1
# O si hay restricción de permisos: powershell -ExecutionPolicy Bypass -File .\start.ps1

Set-Location $PSScriptRoot

# 1. Verificación de existencia del modelo serializado
$pkl = Join-Path $PSScriptRoot "saved_models\modelo_panaderia.pkl"
if (-not (Test-Path $pkl)) {
    Write-Host "[ML] No hay modelo detectado. Iniciando entrenamiento en frío (Cold Start)..."
    python src/models/random_forest.py
    if (-not (Test-Path $pkl)) {
        Write-Host "[ML] ERROR FATAL: No se pudo generar el modelo predictivo. Revise los logs." -ForegroundColor Red
        exit 1
    }
}

# 2. Impresión de ayudas y atajos útiles para el desarrollador
Write-Host "[ML] Para re-entrenar manualmente:" -ForegroundColor DarkGray
Write-Host "     Automático (DB+CSV): python src/models/random_forest.py auto" -ForegroundColor DarkGray
Write-Host "     Solo Base de Datos:  python src/models/random_forest.py mysql" -ForegroundColor DarkGray
Write-Host "     Solo Archivo Plano:  python src/models/random_forest.py csv" -ForegroundColor DarkGray

# 3. Levantamiento del servidor FastAPI mediante Uvicorn
Write-Host "[ML] Iniciando API Predictiva en http://127.0.0.1:8000  (Ctrl+C para detener)" -ForegroundColor Green
Write-Host "[ML] Monitoreo de salud: http://127.0.0.1:8000/health" -ForegroundColor Cyan
python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
