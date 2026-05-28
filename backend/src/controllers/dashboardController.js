/**
 * Controlador del Dashboard Principal
 * 
 * Este módulo concentra la lógica analítica para el panel principal.
 * Se encarga de procesar las ventas históricas, calcular métricas de crecimiento (tendencias),
 * y fusionar esta información con las predicciones del modelo de Inteligencia Artificial (Top/Bottom).
 */
const db = require('../config/database');

/**
 * Genera el resumen consolidado de KPIs y datos para gráficos.
 * 
 * @param {Object} req - Petición HTTP conteniendo filtros en req.query (year, month).
 * @param {Object} res - Respuesta HTTP. Devuelve un objeto JSON estructurado para poblar la UI.
 */
exports.getResumen = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Parseo y validación de los años solicitados (soporta múltiples años para comparativas)
    let years = [];
    if (year) {
      years = year.split(',').map(y => parseInt(y)).filter(y => !isNaN(y));
    }
    if (years.length === 0) {
      years = [new Date().getFullYear()]; // Fallback al año actual
    }

    // Parseo y validación del mes solicitado
    let selectedMonth = parseInt(month || new Date().getMonth() + 1);
    if (isNaN(selectedMonth)) {
      selectedMonth = new Date().getMonth() + 1; // Fallback al mes actual
    }

    const yearPlaceholders = years.map(() => '?').join(',');

    // 1. Cálculo de Ventas Actuales: Suma total facturada en el mes/año(s) seleccionado(s)
    const [vh] = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS total 
       FROM ventas 
       WHERE MONTH(fecha_venta) = ? AND YEAR(fecha_venta) IN (${yearPlaceholders})`,
      [selectedMonth, ...years]
    );

    // 2. Cálculo de Ventas del Periodo Anterior: Para medir crecimiento o decrecimiento mensual
    let prevMonth = selectedMonth - 1;
    let prevYears = [...years];
    // Ajuste de cambio de año (ej. si el mes actual es enero, el previo es diciembre del año pasado)
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYears = years.map(y => y - 1);
    }
    const prevYearPlaceholders = prevYears.map(() => '?').join(',');
    const [vm] = await db.query(
      `SELECT COALESCE(SUM(total), 0) AS total 
       FROM ventas 
       WHERE MONTH(fecha_venta) = ? AND YEAR(fecha_venta) IN (${prevYearPlaceholders})`,
      [prevMonth, ...prevYears]
    );

    // Cálculo porcentual de la tendencia de ventas respecto al mes previo
    const totalMesActual = Number(vh[0]?.total || 0);
    const totalMesAnterior = Number(vm[0]?.total || 0);
    let trend = 0;
    if (totalMesAnterior > 0) {
      trend = ((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100;
    } else if (totalMesActual > 0) {
      trend = 100; // Si antes era 0 y hoy hay ventas, representa un 100% de crecimiento técnico
    }

    // 3. Producto Estrella: El pan o postre que más unidades vendió en el periodo
    const [top] = await db.query(`
      SELECT p.nombre, SUM(d.cantidad) AS u
      FROM detalle_ventas d
      JOIN ventas v ON v.id = d.venta_id
      JOIN productos p ON p.id = d.producto_id
      WHERE MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) IN (${yearPlaceholders})
      GROUP BY p.id, p.nombre
      ORDER BY u DESC
      LIMIT 1
    `, [selectedMonth, ...years]);

    // 4. Demanda Estimada Global: Pronóstico total de panes requeridos para el día siguiente
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().slice(0, 10);

    const [dem] = await db.query(
      `SELECT COALESCE(SUM(cantidad_estimada), 0) AS t FROM predicciones WHERE fecha_objetivo = ?`,
      [fechaManana]
    );

    // 5. Datos para Gráfico Circular: Distribución real de ventas (Mix de Productos)
    const [chart] = await db.query(`
      SELECT p.nombre AS name, SUM(d.cantidad) AS unidades
      FROM detalle_ventas d
      JOIN ventas v ON v.id = d.venta_id
      JOIN productos p ON p.id = d.producto_id
      WHERE MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) IN (${yearPlaceholders})
      GROUP BY p.id, p.nombre
      ORDER BY unidades DESC
      LIMIT 8
    `, [selectedMonth, ...years]);

    // Lógica de Inteligencia Artificial vs Lógica Histórica
    // Verificamos si la IA ha generado predicciones para este periodo.
    // Si existen predicciones, los rankings Top 5 / Bottom 5 se nutrirán del Machine Learning.
    // Si no existen, se utilizará el historial real como fallback.
    const [predCountRows] = await db.query(
      `SELECT COUNT(*) as count 
       FROM predicciones 
       WHERE MONTH(fecha_objetivo) = ? AND YEAR(fecha_objetivo) IN (${yearPlaceholders})`,
      [selectedMonth, ...years]
    );
    const hasPredictions = predCountRows[0].count > 0;

    let top5 = [];
    let bottom5 = [];

    if (hasPredictions) {
      // 6. Top 5 AI: Los productos que la Inteligencia Artificial estima que más se venderán
      const [top5Rows] = await db.query(`
        SELECT p.nombre AS name, COALESCE(SUM(pr.cantidad_estimada), 0) AS unidades
        FROM productos p
        JOIN predicciones pr ON p.id = pr.producto_id
        WHERE p.estado = 1 AND MONTH(pr.fecha_objetivo) = ? AND YEAR(pr.fecha_objetivo) IN (${yearPlaceholders})
        GROUP BY p.id, p.nombre
        ORDER BY unidades DESC
        LIMIT 5
      `, [selectedMonth, ...years]);
      top5 = top5Rows;

      // 7. Bottom 5 AI: Productos en alerta roja según la IA (peligro de no venderse)
      const [bottom5Rows] = await db.query(`
        SELECT p.nombre AS name, COALESCE(SUM(pr.cantidad_estimada), 0) AS unidades, p.precio_venta AS precio
        FROM productos p
        JOIN predicciones pr ON p.id = pr.producto_id
        WHERE p.estado = 1 AND MONTH(pr.fecha_objetivo) = ? AND YEAR(pr.fecha_objetivo) IN (${yearPlaceholders})
        GROUP BY p.id, p.nombre
        ORDER BY unidades ASC
        LIMIT 5
      `, [selectedMonth, ...years]);
      bottom5 = bottom5Rows;
    } else {
      // Fallback: Modo Histórico (Sin Inteligencia Artificial)
      if (totalMesActual === 0) {
        top5 = [];
        bottom5 = [];
      } else {
        // 6. Top 5 Histórico
        const [top5Rows] = await db.query(`
          SELECT p.nombre AS name, COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN d.cantidad ELSE 0 END), 0) AS unidades
          FROM productos p
          LEFT JOIN detalle_ventas d ON p.id = d.producto_id
          LEFT JOIN ventas v ON v.id = d.venta_id AND MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) IN (${yearPlaceholders})
          WHERE p.estado = 1
          GROUP BY p.id, p.nombre
          ORDER BY unidades DESC
          LIMIT 5
        `, [selectedMonth, ...years]);
        top5 = top5Rows;

        // 7. Bottom 5 Histórico
        const [bottom5Rows] = await db.query(`
          SELECT p.nombre AS name, COALESCE(SUM(CASE WHEN v.id IS NOT NULL THEN d.cantidad ELSE 0 END), 0) AS unidades, p.precio_venta AS precio
          FROM productos p
          LEFT JOIN detalle_ventas d ON p.id = d.producto_id
          LEFT JOIN ventas v ON v.id = d.venta_id AND MONTH(v.fecha_venta) = ? AND YEAR(v.fecha_venta) IN (${yearPlaceholders})
          WHERE p.estado = 1
          GROUP BY p.id, p.nombre
          ORDER BY unidades ASC
          LIMIT 5
        `, [selectedMonth, ...years]);
        bottom5 = bottom5Rows;
      }
    }

    // 8. Evolución Financiera: Ventas agregadas de los últimos 6 meses para el gráfico de líneas
    const maxYear = Math.max(...years);
    const baseDateStr = `${maxYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const [mensual] = await db.query(`
      SELECT DATE_FORMAT(v.fecha_venta, '%Y-%m') AS mes, COALESCE(SUM(v.total), 0) AS total
      FROM ventas v
      WHERE v.fecha_venta >= DATE_SUB(?, INTERVAL 6 MONTH) AND v.fecha_venta <= LAST_DAY(?)
      GROUP BY DATE_FORMAT(v.fecha_venta, '%Y-%m')
      ORDER BY mes ASC
    `, [baseDateStr, baseDateStr]);

    // 9. Métricas adicionales de inventario
    const [totalProds] = await db.query(`SELECT COUNT(*) as count FROM productos WHERE estado = 1`);
    const [alertas] = await db.query(`SELECT COUNT(*) as count FROM insumos WHERE stock_actual <= stock_minimo`);

    // Empaquetado y retorno del JSON final al frontend
    res.json({
      ventasHoy: totalMesActual,
      ventasTrend: Number(trend.toFixed(1)),
      productoTop: top[0]?.nombre || '-',
      demandaManana: Number(dem[0]?.t || 0),
      totalProductos: Number(totalProds[0]?.count || 0),
      alertas: Number(alertas[0]?.count || 0),
      chartTopProductos: chart.map((r) => ({ nombre: r.name, cantidad: Number(r.unidades) })),
      ventasMensuales: mensual.map((r) => ({ fecha: r.mes, total: Number(r.total) })),
      top5: top5.map((r) => ({ nombre: r.name, cantidad: Number(r.unidades) })),
      bottom5: bottom5.map((r) => ({ nombre: r.name, cantidad: Number(r.unidades), precio: Number(r.precio) })),
      esPrediccion: hasPredictions, // Bandera crucial que le indica a React si debe usar etiquetas de "IA" o "Historial"
    });
  } catch (err) {
    console.error('Error al procesar el dashboard analítico:', err);
    // Respuesta por defecto segura en caso de fallo crítico en la Base de Datos
    res.json({
      ventasHoy: 0,
      productoTop: '-',
      demandaManana: 0,
      totalProductos: 0,
      alertas: 0,
      chartTopProductos: [],
      ventasMensuales: [],
    });
  }
};
