/**
 * Controlador de Productos e Inventario Base
 * 
 * Gestiona el catálogo de productos de la panadería.
 * Incluye la carga de imágenes (Uploads mediante Multer), 
 * paginación, y manejo transaccional para mantener la consistencia 
 * entre la tabla "productos" y la tabla "inventario".
 */
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Configuración del motor de almacenamiento de Multer.
 * Define la ruta física donde se guardarán las imágenes de los productos
 * y genera nombres de archivo únicos para prevenir colisiones.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/productos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Nombre único: timestamp + nombre original limpio
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    const uniqueName = `${Date.now()}-${base}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
  }
};

/** Middleware de Multer configurado con límite de 5MB por imagen */
exports.upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Recupera el listado de productos activos.
 * Permite paginación, filtrado por categoría y búsqueda de texto.
 * También realiza un JOIN con el inventario para devolver el stock actual.
 * 
 * @param {Object} req - Objeto de petición HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 */
exports.getAll = async (req, res) => {
  try {
    const isAll = req.query.all === 'true';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const categoria_id = req.query.categoria_id;

    let baseSelect = `
      FROM productos p
      LEFT JOIN inventario i ON p.id = i.producto_id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.estado = 1
    `;

    let whereClause = '';
    let params = [];

    if (categoria_id) {
      whereClause += ' AND p.categoria_id = ?';
      params.push(categoria_id);
    }

    if (search) {
      whereClause += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR c.nombre LIKE ? OR p.id = ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, search);
    }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total ${baseSelect} ${whereClause}`, params);

    let rowsParams = [...params];
    
    if (isAll) {
      const [rows] = await db.query(`
        SELECT p.id, p.nombre, p.descripcion, p.precio_venta as precio, 
               p.categoria_id, p.imagen, p.vida_util_dias, p.estado,
               COALESCE(i.stock_actual, 0) as stock_actual,
               COALESCE(c.nombre, 'Sin Categoría') as categoria_nombre
        ${baseSelect}
        ${whereClause}
        ORDER BY p.nombre
      `, rowsParams);
      return res.json(rows);
    }

    const [rows] = await db.query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio_venta as precio, 
             p.categoria_id, p.imagen, p.vida_util_dias, p.estado,
             COALESCE(i.stock_actual, 0) as stock_actual,
             COALESCE(c.nombre, 'Sin Categoría') as categoria_nombre
      ${baseSelect}
      ${whereClause}
      ORDER BY p.nombre
      LIMIT ? OFFSET ?
    `, [...rowsParams, limit, offset]);

    res.json({
      data: rows,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('ERROR EN GET ALL PRODUCTOS:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

/**
 * Registra un nuevo producto en el catálogo y su registro inicial de inventario.
 * Operación transaccional: Si el insert falla, se hace rollback y se borra la imagen subida.
 */
exports.create = async (req, res) => {
  let connection;
  try {
    const { nombre, precio, stock_actual, categoria_id, descripcion, vida_util_dias } = req.body;
    const imagen = req.file ? req.file.filename : null;
    
    if (!nombre || !precio) {
      // Si se subió un archivo pero hay error de validación, eliminarlo
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Insertar en productos
    const [prodResult] = await connection.query(
      'INSERT INTO productos (nombre, precio_venta, categoria_id, descripcion, vida_util_dias, imagen) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, precio, categoria_id || 1, descripcion || null, vida_util_dias || null, imagen]
    );
    
    const producto_id = prodResult.insertId;

    // 2. Insertar en inventario
    await connection.query(
      'INSERT INTO inventario (producto_id, stock_actual) VALUES (?, ?)',
      [producto_id, stock_actual || 0]
    );

    await connection.commit();

    res.status(201).json({ id: producto_id, message: 'Producto creado exitosamente' });
  } catch (err) {
    if (connection) await connection.rollback();
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('ERROR EN CREATE PRODUCTO:', err);
    res.status(500).json({ error: 'Error al crear el producto' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Actualiza la información de un producto existente y su stock base.
 * Si se incluye una nueva imagen en la petición, elimina físicamente la imagen anterior del servidor.
 */
exports.update = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { nombre, precio, stock_actual, categoria_id, descripcion, vida_util_dias } = req.body;
    const nuevaImagen = req.file ? req.file.filename : null;

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Si se sube nueva imagen, obtener la imagen anterior para borrarla
    if (nuevaImagen) {
      const [[productoActual]] = await connection.query('SELECT imagen FROM productos WHERE id = ?', [id]);
      if (productoActual?.imagen) {
        const rutaVieja = path.join(__dirname, '../uploads/productos', productoActual.imagen);
        if (fs.existsSync(rutaVieja)) fs.unlinkSync(rutaVieja);
      }
    }

    // 1. Actualizar productos
    if (nuevaImagen) {
      await connection.query(
        'UPDATE productos SET nombre = ?, precio_venta = ?, categoria_id = ?, descripcion = ?, vida_util_dias = ?, imagen = ? WHERE id = ?',
        [nombre, precio, categoria_id || 1, descripcion || null, vida_util_dias || null, nuevaImagen, id]
      );
    } else {
      await connection.query(
        'UPDATE productos SET nombre = ?, precio_venta = ?, categoria_id = ?, descripcion = ?, vida_util_dias = ? WHERE id = ?',
        [nombre, precio, categoria_id || 1, descripcion || null, vida_util_dias || null, id]
      );
    }

    // 2. Actualizar inventario
    await connection.query(
      'UPDATE inventario SET stock_actual = ? WHERE producto_id = ?',
      [stock_actual ?? 0, id]
    );

    await connection.commit();

    res.json({ message: 'Producto actualizado exitosamente' });
  } catch (err) {
    if (connection) await connection.rollback();
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('ERROR EN UPDATE PRODUCTO:', err);
    res.status(500).json({ error: 'Error al actualizar el producto' });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Realiza una baja lógica del producto (estado = 0).
 * No se elimina físicamente para preservar la integridad de las ventas históricas.
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE productos SET estado = 0 WHERE id = ?', [id]);

    res.json({ message: 'Producto desactivado exitosamente' });
  } catch (err) {
    console.error('ERROR EN REMOVE PRODUCTO:', err);
    res.status(500).json({ error: 'Error al desactivar el producto' });
  }
};