const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { registrarAuditoria } = require('../utils/auditoria');

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT u.id, u.nombre, u.apellido, u.username, u.email, u.rol_id, u.estado, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE 1=1
    `;
    let params = [];
    let countParams = [];

    if (search) {
      const searchClause = ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR r.nombre LIKE ?)';
      query += searchClause;
      countQuery += searchClause;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    const [[{ total }]] = await db.query(countQuery, countParams);

    query += ' ORDER BY u.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);

    res.json({
      data: rows,
      meta: {
        total,
        page,
        last_page: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.create = async (req, res) => {
  try {
    const { nombre, apellido, username, email, password, rol_id, id_rol } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const final_rol_id = rol_id || id_rol || 1;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, apellido, username, email, password, rol_id, estado) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [nombre, apellido || null, username || null, email, hash, final_rol_id]
    );

    // Registrar en auditoría
    const desc = `Usuario creado #${result.insertId} (@${username || ''}) - Nombre: ${nombre} ${apellido || ''}, Email: ${email}`;
    const id_usuario = req.user?.id || 1;
    await registrarAuditoria(id_usuario, 'INSERT', 'usuarios', desc, req.ip);

    res.json({ id: result.insertId, nombre, apellido, username, email, rol_id: final_rol_id, estado: 1 });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El email ya esta registrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, username, email, rol_id, id_rol, estado, password } = req.body;
    const final_rol_id = rol_id || id_rol || 1;

    // 1. Auto-bloqueo: No puedes suspender tu propia cuenta
    if (parseInt(id) === req.user?.id && estado !== undefined && parseInt(estado) === 0) {
      return res.status(400).json({ error: 'No puedes suspender tu propia cuenta.' });
    }

    // 2. Obtener rol actual del usuario a editar para ver si es Administrador
    const [currentUserRoles] = await db.query(
      'SELECT u.rol_id, r.nombre, u.estado FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?',
      [id]
    );

    if (currentUserRoles.length > 0) {
      const currentRoleName = currentUserRoles[0].nombre.toUpperCase();
      const isCurrentlyAdmin = currentRoleName.includes('ADMIN');

      if (isCurrentlyAdmin) {
        // Consultar nuevo rol para ver si lo está degradando (cambiando a rol no admin)
        const [newRole] = await db.query('SELECT nombre FROM roles WHERE id = ?', [final_rol_id]);
        const newRoleName = newRole.length > 0 ? newRole[0].nombre.toUpperCase() : '';
        const isNewRoleAdmin = newRoleName.includes('ADMIN');

        // Si se intenta suspender al admin (estado === 0) OR se intenta cambiar a un rol que no es Admin (degradación)
        const isSuspending = estado !== undefined && parseInt(estado) === 0;
        const isDegrading = !isNewRoleAdmin;

        if (isSuspending || isDegrading) {
          // Contar administradores activos en el sistema
          const [[{ totalAdmin }]] = await db.query(
            "SELECT COUNT(*) as totalAdmin FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE r.nombre LIKE '%ADMIN%' AND u.estado = 1"
          );
          
          if (totalAdmin <= 1) {
            return res.status(400).json({ 
              error: 'No se puede suspender o degradar al único administrador activo del sistema.' 
            });
          }
        }
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      await db.query(
        'UPDATE usuarios SET nombre = ?, apellido = ?, username = ?, email = ?, rol_id = ?, estado = ?, password = ? WHERE id = ?',
        [nombre, apellido || null, username || null, email, final_rol_id, estado, hash, id]
      );
    } else {
      await db.query(
        'UPDATE usuarios SET nombre = ?, apellido = ?, username = ?, email = ?, rol_id = ?, estado = ? WHERE id = ?',
        [nombre, apellido || null, username || null, email, final_rol_id, estado, id]
      );
    }

    // Registrar en auditoría
    const auditDesc = `Actualizó datos de usuario #${id} (@${username || ''}) - Email: ${email}, Estado: ${estado}`;
    const id_usuario = req.user?.id || 1;
    await registrarAuditoria(id_usuario, 'UPDATE', 'usuarios', auditDesc, req.ip);

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El email ya esta registrado en otro usuario' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Auto-bloqueo: No puedes eliminar tu propia cuenta
    if (parseInt(id) === req.user?.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
    }

    // 2. Obtener rol del usuario a eliminar
    const [currentUserRoles] = await db.query(
      'SELECT r.nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = ?',
      [id]
    );

    if (currentUserRoles.length > 0) {
      const isCurrentlyAdmin = currentUserRoles[0].nombre.toUpperCase().includes('ADMIN');
      if (isCurrentlyAdmin) {
        // Contar administradores activos en el sistema
        const [[{ totalAdmin }]] = await db.query(
          "SELECT COUNT(*) as totalAdmin FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE r.nombre LIKE '%ADMIN%' AND u.estado = 1"
        );
        if (totalAdmin <= 1) {
          return res.status(400).json({ 
            error: 'No se puede eliminar al único administrador activo del sistema.' 
          });
        }
      }
    }

    const [[userRecord]] = await db.query('SELECT username FROM usuarios WHERE id = ?', [id]);
    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);

    // Registrar en auditoría
    if (userRecord) {
      const desc = `Eliminó usuario #${id} (@${userRecord.username})`;
      const id_usuario = req.user?.id || 1;
      await registrarAuditoria(id_usuario, 'DELETE', 'usuarios', desc, req.ip);
    }

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ error: 'No se puede eliminar de forma definitiva porque el usuario tiene registros asociados. Le sugerimos suspender/desactivar al usuario.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nombre FROM roles WHERE estado = 1');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};
