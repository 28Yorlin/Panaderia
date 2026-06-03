# Credenciales para iniciar secion 
usuario: admin
contraseña: admin123


#  Panadería - Sistema de Predicción de Demanda

Este es un sistema integral para una panadería que incluye un backend en Node.js, un frontend moderno en React y un servicio de Inteligencia Artificial en Python (Random Forest) para predecir la demanda de los productos.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React + Vite + Javascript (.jsx)
- **Backend:** Node.js + Express + MySQL
- **Machine Learning:** Python + Scikit-Learn + FastAPI

---

##  Estructura del Proyecto

El proyecto está dividido en tres partes principales:
- `/frontend`: Interfaz de usuario interactiva (Dashboard).
- `/backend`: API REST para gestión de la panadería (ventas, stock, usuarios, etc.).
- `/ml-service`: Servicio que entrena el modelo y predice la demanda futura.

---

##  Cómo instalar y ejecutar el proyecto

Para ejecutar este proyecto en tu computadora localmente, sigue estas instrucciones paso a paso:

### 1. Clonar el repositorio
Abre tu terminal y ejecuta:
```bash
git clone https://github.com/28Yorlin/Panaderia.git
cd Panaderia
```

### 2. Configurar la Base de Datos y Variables de Entorno
1. Ejecuta el script SQL que se encuentra en `database/panaderia_db.sql` en tu gestor de base de datos MySQL para crear la estructura inicial.
2. Crea un archivo llamado `.env` dentro de la carpeta `backend/` con tus credenciales de base de datos (usuario, contraseña, nombre de la base de datos, etc.).

### 3. Iniciar el Backend (Node.js)
Abre una terminal y ejecuta:
```bash
cd backend
npm install
npm run dev
```
*El servidor backend debería iniciar.*

### 4. Iniciar el Frontend (React)
Abre otra terminal y ejecuta:
```bash
cd frontend
npm install
npm run dev
```
*Esto te dará un enlace local (ej. http://localhost:5173) para ver la aplicación en tu navegador web.*

### 5. Iniciar el Servicio de IA (Python)


Abre una tercera terminal y ejecuta:
```bash
cd ml-service

# Recomendado: Crear y activar un entorno virtual
python -m venv venv
venv\Scripts\activate  # (Si usas Windows)
# source venv/bin/activate # (Si usas Mac/Linux)

# Instalar dependencias
pip install -r requirements.txt

# 1. Entrenar el modelo (Esto generará el archivo .pkl faltante)
python src/models/random_forest.py

# 2. Iniciar la API del servicio ML
uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
# O alternativamente: python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

---


