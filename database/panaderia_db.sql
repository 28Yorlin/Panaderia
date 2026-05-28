-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 28-05-2026 a las 23:15:30
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `panaderia_db`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `poblar_calendario` (IN `fecha_inicio` DATE, IN `fecha_fin` DATE)   BEGIN
    DECLARE v_fecha DATE;
    SET v_fecha = fecha_inicio;
    
    WHILE v_fecha <= fecha_fin DO
        INSERT IGNORE INTO calendario (fecha, dia_semana, es_feriado, temporada, evento_especial)
        VALUES (
            v_fecha,
            CASE DAYOFWEEK(v_fecha)
                WHEN 1 THEN 'Domingo'
                WHEN 2 THEN 'Lunes'
                WHEN 3 THEN 'Martes'
                WHEN 4 THEN 'Miércoles'
                WHEN 5 THEN 'Jueves'
                WHEN 6 THEN 'Viernes'
                WHEN 7 THEN 'Sábado'
            END,
            FALSE,
            CASE MONTH(v_fecha)
                WHEN 12 THEN 'Verano' WHEN 1 THEN 'Verano' WHEN 2 THEN 'Verano'
                WHEN 3 THEN 'Otoño' WHEN 4 THEN 'Otoño' WHEN 5 THEN 'Otoño'
                WHEN 6 THEN 'Invierno' WHEN 7 THEN 'Invierno' WHEN 8 THEN 'Invierno'
                ELSE 'Primavera'
            END,
            NULL
        );
        SET v_fecha = DATE_ADD(v_fecha, INTERVAL 1 DAY);
    END WHILE;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auditoria`
--

CREATE TABLE `auditoria` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) DEFAULT NULL,
  `accion` varchar(50) NOT NULL,
  `tabla_afectada` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `caja_chica`
--

CREATE TABLE `caja_chica` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo_movimiento` enum('INGRESO','EGRESO') NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fecha` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calendario`
--

CREATE TABLE `calendario` (
  `fecha` date NOT NULL,
  `dia_semana` int(11) NOT NULL,
  `es_feriado` tinyint(1) DEFAULT 0,
  `temporada_id` int(11) DEFAULT NULL,
  `evento_especial` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `calendario`
--

INSERT INTO `calendario` (`fecha`, `dia_semana`, `es_feriado`, `temporada_id`, `evento_especial`) VALUES
('2026-05-14', 5, 0, NULL, NULL),
('2026-05-15', 6, 0, NULL, NULL),
('2026-05-16', 7, 0, NULL, NULL),
('2026-05-17', 1, 0, NULL, NULL),
('2026-05-18', 2, 0, NULL, NULL),
('2026-05-19', 3, 0, NULL, NULL),
('2026-05-20', 4, 0, NULL, NULL),
('2026-05-21', 5, 0, NULL, NULL),
('2026-05-22', 6, 0, NULL, NULL),
('2026-05-23', 7, 0, NULL, NULL),
('2026-05-28', 5, 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Panes', 'Todo tipo de panes'),
(2, 'Dulces', 'Tortas y pasteles'),
(3, 'Salados', 'Pasteles dulces y salados');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `dni` varchar(15) DEFAULT NULL,
  `ruc` varchar(20) DEFAULT NULL,
  `razon_social` varchar(255) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `direccion` text DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `nombre`, `apellido`, `dni`, `ruc`, `razon_social`, `telefono`, `correo`, `direccion`, `estado`, `created_at`) VALUES
(1, 'Gary', 'Sandoval', '75651664', NULL, NULL, '916563751', NULL, 'Trujilllo', 1, '2026-05-20 02:07:21');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `compras`
--

CREATE TABLE `compras` (
  `id` int(11) NOT NULL,
  `proveedor_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `estado` enum('COMPLETADO','ANULADO') DEFAULT 'COMPLETADO',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_compras`
--

CREATE TABLE `detalle_compras` (
  `id` int(11) NOT NULL,
  `compra_id` int(11) NOT NULL,
  `insumo_id` int(11) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalle_ventas`
--

CREATE TABLE `detalle_ventas` (
  `id` int(11) NOT NULL,
  `venta_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `detalle_ventas`
--
DELIMITER $$
CREATE TRIGGER `trg_after_delete_detalle` AFTER DELETE ON `detalle_ventas` FOR EACH ROW BEGIN
        DECLARE v_fecha DATE;
        DECLARE v_total_vendido INT;
        
        -- Obtener la fecha de la venta padre
        SELECT DATE(fecha_venta) INTO v_fecha FROM ventas WHERE id = OLD.venta_id;
        
        -- Calcular el nuevo total vendido para ese producto en ese dia
        SELECT COALESCE(SUM(d.cantidad), 0) INTO v_total_vendido
        FROM detalle_ventas d
        JOIN ventas v ON v.id = d.venta_id
        WHERE DATE(v.fecha_venta) = v_fecha AND d.producto_id = OLD.producto_id;
        
        -- Actualizar la tabla predicciones
        UPDATE predicciones
        SET cantidad_real_vendida = v_total_vendido,
            margen_error = ABS(cantidad_estimada - v_total_vendido)
        WHERE producto_id = OLD.producto_id AND fecha_objetivo = v_fecha;
      END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_after_insert_detalle` AFTER INSERT ON `detalle_ventas` FOR EACH ROW BEGIN
        DECLARE v_fecha DATE;
        DECLARE v_total_vendido INT;
        
        -- Obtener la fecha de la venta padre
        SELECT DATE(fecha_venta) INTO v_fecha FROM ventas WHERE id = NEW.venta_id;
        
        -- Calcular el nuevo total vendido para ese producto en ese dia
        SELECT COALESCE(SUM(d.cantidad), 0) INTO v_total_vendido
        FROM detalle_ventas d
        JOIN ventas v ON v.id = d.venta_id
        WHERE DATE(v.fecha_venta) = v_fecha AND d.producto_id = NEW.producto_id;
        
        -- Actualizar la tabla predicciones
        UPDATE predicciones
        SET cantidad_real_vendida = v_total_vendido,
            margen_error = ABS(cantidad_estimada - v_total_vendido)
        WHERE producto_id = NEW.producto_id AND fecha_objetivo = v_fecha;
      END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_after_update_detalle` AFTER UPDATE ON `detalle_ventas` FOR EACH ROW BEGIN
        DECLARE v_fecha DATE;
        DECLARE v_total_vendido INT;
        
        -- Obtener la fecha de la venta padre
        SELECT DATE(fecha_venta) INTO v_fecha FROM ventas WHERE id = NEW.venta_id;
        
        -- Calcular el nuevo total vendido para ese producto en ese dia
        SELECT COALESCE(SUM(d.cantidad), 0) INTO v_total_vendido
        FROM detalle_ventas d
        JOIN ventas v ON v.id = d.venta_id
        WHERE DATE(v.fecha_venta) = v_fecha AND d.producto_id = NEW.producto_id;
        
        -- Actualizar la tabla predicciones
        UPDATE predicciones
        SET cantidad_real_vendida = v_total_vendido,
            margen_error = ABS(cantidad_estimada - v_total_vendido)
        WHERE producto_id = NEW.producto_id AND fecha_objetivo = v_fecha;
      END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gastos`
--

CREATE TABLE `gastos` (
  `id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `descripcion` text NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fecha_gasto` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `insumos`
--

CREATE TABLE `insumos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `unidad_medida` varchar(20) NOT NULL,
  `stock_actual` decimal(10,2) DEFAULT 0.00,
  `stock_minimo` decimal(10,2) DEFAULT 1.00,
  `costo_unitario` decimal(10,2) DEFAULT 0.00,
  `estado` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario`
--

CREATE TABLE `inventario` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `stock_actual` int(11) DEFAULT 0,
  `ultima_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `inventario`
--

INSERT INTO `inventario` (`id`, `producto_id`, `stock_actual`, `ultima_actualizacion`) VALUES
(1, 1, 0, '2026-05-28 20:59:32'),
(2, 2, 0, '2026-05-28 20:59:32'),
(3, 3, 0, '2026-05-28 20:59:32'),
(4, 4, 0, '2026-05-28 20:59:32'),
(5, 5, 0, '2026-05-28 20:59:32'),
(6, 6, 0, '2026-05-28 20:59:32'),
(7, 7, 0, '2026-05-28 20:59:32'),
(8, 8, 0, '2026-05-28 20:59:32'),
(9, 9, 0, '2026-05-28 20:59:32'),
(10, 10, 0, '2026-05-28 20:59:32'),
(11, 11, 0, '2026-05-28 20:59:32'),
(12, 12, 0, '2026-05-28 20:59:32'),
(13, 13, 0, '2026-05-28 20:59:32'),
(14, 14, 0, '2026-05-28 20:59:32');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mermas`
--

CREATE TABLE `mermas` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `cantidad_perdida` int(11) NOT NULL,
  `motivo` varchar(255) NOT NULL,
  `fecha` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modelos_ml`
--

CREATE TABLE `modelos_ml` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `metrics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metrics`)),
  `fecha_entrenamiento` date DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `modelos_ml`
--

INSERT INTO `modelos_ml` (`id`, `nombre`, `metrics`, `fecha_entrenamiento`, `estado`, `created_at`) VALUES
(1, 'Random Forest v1', NULL, NULL, 1, '2026-05-17 02:41:33');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_insumos`
--

CREATE TABLE `movimientos_insumos` (
  `id` int(11) NOT NULL,
  `insumo_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo_movimiento` enum('ENTRADA','SALIDA') NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `motivo` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos_inventario`
--

CREATE TABLE `movimientos_inventario` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `usuario_id` int(11) NOT NULL,
  `tipo_movimiento` enum('ENTRADA','SALIDA') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `motivo` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` int(11) NOT NULL,
  `venta_id` int(11) NOT NULL,
  `metodo_pago` enum('Efectivo','Tarjeta','Transferencia') NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `predicciones`
--

CREATE TABLE `predicciones` (
  `id` int(11) NOT NULL,
  `modelo_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `fecha_objetivo` date NOT NULL,
  `cantidad_estimada` int(11) NOT NULL,
  `cantidad_real_vendida` int(11) DEFAULT NULL,
  `margen_error` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `predicciones`
--

INSERT INTO `predicciones` (`id`, `modelo_id`, `producto_id`, `fecha_objetivo`, `cantidad_estimada`, `cantidad_real_vendida`, `margen_error`, `created_at`) VALUES
(1, 1, 2, '2026-05-28', 107, NULL, NULL, '2026-05-28 21:10:09'),
(2, 1, 8, '2026-05-28', 121, NULL, NULL, '2026-05-28 21:10:10'),
(3, 1, 3, '2026-05-28', 127, NULL, NULL, '2026-05-28 21:10:10'),
(4, 1, 9, '2026-05-28', 137, NULL, NULL, '2026-05-28 21:10:10'),
(5, 1, 10, '2026-05-28', 135, NULL, NULL, '2026-05-28 21:10:11'),
(6, 1, 7, '2026-05-28', 104, NULL, NULL, '2026-05-28 21:10:11'),
(7, 1, 4, '2026-05-28', 98, NULL, NULL, '2026-05-28 21:10:11'),
(8, 1, 12, '2026-05-28', 117, NULL, NULL, '2026-05-28 21:10:12'),
(9, 1, 6, '2026-05-28', 106, NULL, NULL, '2026-05-28 21:10:12'),
(10, 1, 1, '2026-05-28', 135, NULL, NULL, '2026-05-28 21:10:12'),
(11, 1, 5, '2026-05-28', 113, NULL, NULL, '2026-05-28 21:10:12'),
(12, 1, 11, '2026-05-28', 86, NULL, NULL, '2026-05-28 21:10:13'),
(13, 1, 14, '2026-05-28', 56, NULL, NULL, '2026-05-28 21:10:13'),
(14, 1, 13, '2026-05-28', 30, NULL, NULL, '2026-05-28 21:10:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `produccion`
--

CREATE TABLE `produccion` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `cantidad_producida` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `cantidad_programada` int(11) NOT NULL DEFAULT 0,
  `estado` enum('PENDIENTE','COMPLETADO','ANULADO') DEFAULT 'PENDIENTE',
  `usuario_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `produccion`
--

INSERT INTO `produccion` (`id`, `producto_id`, `fecha`, `cantidad_producida`, `created_at`, `cantidad_programada`, `estado`, `usuario_id`) VALUES
(1, 2, '2026-05-28', NULL, '2026-05-28 21:10:13', 107, 'PENDIENTE', 1),
(2, 8, '2026-05-28', NULL, '2026-05-28 21:10:13', 121, 'PENDIENTE', 1),
(3, 3, '2026-05-28', NULL, '2026-05-28 21:10:13', 127, 'PENDIENTE', 1),
(4, 9, '2026-05-28', NULL, '2026-05-28 21:10:13', 137, 'PENDIENTE', 1),
(5, 10, '2026-05-28', NULL, '2026-05-28 21:10:13', 135, 'PENDIENTE', 1),
(6, 7, '2026-05-28', NULL, '2026-05-28 21:10:13', 104, 'PENDIENTE', 1),
(7, 4, '2026-05-28', NULL, '2026-05-28 21:10:13', 98, 'PENDIENTE', 1),
(8, 12, '2026-05-28', NULL, '2026-05-28 21:10:13', 117, 'PENDIENTE', 1),
(9, 6, '2026-05-28', NULL, '2026-05-28 21:10:13', 106, 'PENDIENTE', 1),
(10, 1, '2026-05-28', NULL, '2026-05-28 21:10:13', 135, 'PENDIENTE', 1),
(11, 5, '2026-05-28', NULL, '2026-05-28 21:10:13', 113, 'PENDIENTE', 1),
(12, 11, '2026-05-28', NULL, '2026-05-28 21:10:13', 86, 'PENDIENTE', 1),
(13, 14, '2026-05-28', NULL, '2026-05-28 21:10:13', 56, 'PENDIENTE', 1),
(14, 13, '2026-05-28', NULL, '2026-05-28 21:10:13', 30, 'PENDIENTE', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `categoria_id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_venta` decimal(10,2) NOT NULL,
  `stock_minimo` int(11) DEFAULT 5,
  `vida_util_dias` int(11) DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `receta_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `categoria_id`, `nombre`, `descripcion`, `precio_venta`, `stock_minimo`, `vida_util_dias`, `imagen`, `estado`, `created_at`, `receta_id`) VALUES
(1, 1, 'Pan Francés', NULL, 0.30, 5, 1, '1779596125571-pan-francã©s.png', 1, '2026-05-17 02:43:18', NULL),
(2, 1, 'Baguette', NULL, 2.50, 5, 1, '1779489050449-baguette.png', 1, '2026-05-17 02:43:18', NULL),
(3, 1, 'Ciabatta', NULL, 0.40, 5, 1, '1779575865253-ciabatta.png', 1, '2026-05-17 02:43:18', NULL),
(4, 1, 'Pan de Molde', NULL, 6.50, 5, 3, '1779575919066-pan-de-molde.png', 1, '2026-05-17 02:43:18', NULL),
(5, 1, 'Pan Integral', NULL, 0.50, 5, 2, '1779576059154-pan-integral.png', 1, '2026-05-17 02:43:18', NULL),
(6, 1, 'Pan de Yema', NULL, 0.30, 5, 1, '1779575936558-pan-de-yema.png', 1, '2026-05-17 02:43:18', NULL),
(7, 1, 'Pan de Camote', NULL, 0.30, 5, 1, '1779575894312-pan-de-camote.png', 1, '2026-05-17 02:43:18', NULL),
(8, 3, 'Cachito', NULL, 0.50, 5, 1, '1779575853952-cachito.png', 1, '2026-05-17 02:43:18', NULL),
(9, 2, 'Croissant', NULL, 2.50, 5, 1, '1779575875389-croissant.png', 1, '2026-05-17 02:43:18', NULL),
(10, 3, 'Empanada', NULL, 4.50, 5, 1, '1779575885216-empanada.png', 1, '2026-05-17 02:43:18', NULL),
(11, 1, 'Petit Pain', NULL, 0.20, 5, 1, '1779576066823-petit-pain.png', 1, '2026-05-17 02:43:18', NULL),
(12, 1, 'Pan de Trigo', NULL, 0.40, 5, 1, '1779575927096-pan-de-trigo.png', 1, '2026-05-17 02:43:18', NULL),
(13, 3, 'Torta', 'Torta entera de ocasión', 45.00, 5, 5, '1779596115815-torta.png', 1, '2026-05-24 03:04:14', NULL),
(14, 3, 'Postre', 'Postre individual', 8.50, 5, 3, '1779596106516-postre.png', 1, '2026-05-24 03:04:14', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proveedores`
--

CREATE TABLE `proveedores` (
  `id` int(11) NOT NULL,
  `nombre_empresa` varchar(150) NOT NULL,
  `ruc_dni` varchar(20) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(100) DEFAULT NULL,
  `contacto` varchar(100) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recetas`
--

CREATE TABLE `recetas` (
  `id` int(11) NOT NULL,
  `producto_id` int(11) DEFAULT NULL,
  `nombre_receta` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recetas_detalle`
--

CREATE TABLE `recetas_detalle` (
  `id` int(11) NOT NULL,
  `receta_id` int(11) NOT NULL,
  `insumo_id` int(11) NOT NULL,
  `cantidad_requerida` decimal(10,3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `permisos` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `nombre`, `descripcion`, `permisos`) VALUES
(1, 'Administrador', 'Acceso total al sistema', '[\"PRINCIPAL\", \"VENTAS\", \"PRODUCCIÓN\", \"INVENTARIO\", \"COMPRAS\", \"FINANZAS\", \"ADMINISTRACIÓN\"]'),
(2, 'Vendedor', 'Acceso a ventas y caja', '[\"PRINCIPAL\", \"PRODUCCIÓN\", \"INVENTARIO\", \"COMPRAS\"]'),
(3, 'Panadero', 'Acceso a producción e insumos', '[\"PRINCIPAL\", \"VENTAS\"]');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `temporadas`
--

CREATE TABLE `temporadas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `rol_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `estado` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `rol_id`, `nombre`, `apellido`, `username`, `email`, `password`, `telefono`, `estado`, `created_at`) VALUES
(1, 1, 'Administrador', NULL, 'admin', 'admin@rinconpanadero.com', '$2b$10$73uqhVAsMWntEBB4pq5nq.MjYkbIioBEHjvgEsg8EXUNNsVO6UFoS', NULL, 1, '2026-05-17 00:53:20');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ventas`
--

CREATE TABLE `ventas` (
  `id` int(11) NOT NULL,
  `cliente_id` int(11) DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `fecha_venta` date NOT NULL,
  `hora_venta` time NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `tipo_pago` enum('Efectivo','Tarjeta','Transferencia') DEFAULT 'Efectivo',
  `estado_pago` enum('PAGADO','ANULADO') DEFAULT 'PAGADO',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_comprobante` varchar(20) DEFAULT 'Ticket'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_demanda_historica_ml`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_demanda_historica_ml` (
`fecha` date
,`id_producto` int(11)
,`Producto` varchar(150)
,`Cantidad_Vendida` decimal(32,0)
,`Dia_Semana` int(3)
,`Es_Fin_Semana` int(1)
,`Es_Feriado` int(4)
,`Temporada` varchar(50)
,`Precio` decimal(11,2)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `v_demanda_historica_ml`
--
DROP TABLE IF EXISTS `v_demanda_historica_ml`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_demanda_historica_ml`  AS SELECT `x`.`fecha` AS `fecha`, `x`.`producto_id` AS `id_producto`, `x`.`producto` AS `Producto`, `x`.`cantidad_vendida` AS `Cantidad_Vendida`, (dayofweek(`x`.`fecha`) + 5) MOD 7 AS `Dia_Semana`, CASE WHEN dayofweek(`x`.`fecha`) in (1,7) THEN 1 ELSE 0 END AS `Es_Fin_Semana`, coalesce(`c`.`es_feriado`,0) AS `Es_Feriado`, coalesce(`t`.`nombre`,'Regular') AS `Temporada`, `x`.`precio_promedio` AS `Precio` FROM (((select `v`.`fecha_venta` AS `fecha`,`d`.`producto_id` AS `producto_id`,`p`.`nombre` AS `producto`,sum(`d`.`cantidad`) AS `cantidad_vendida`,round(avg(`d`.`precio_unitario`),2) AS `precio_promedio` from ((`detalle_ventas` `d` join `ventas` `v` on(`d`.`venta_id` = `v`.`id`)) join `productos` `p` on(`p`.`id` = `d`.`producto_id`)) group by `v`.`fecha_venta`,`d`.`producto_id`,`p`.`nombre`) `x` left join `calendario` `c` on(`c`.`fecha` = `x`.`fecha`)) left join `temporadas` `t` on(`c`.`temporada_id` = `t`.`id`)) ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`usuario_id`),
  ADD KEY `idx_fecha` (`fecha`),
  ADD KEY `idx_accion` (`accion`);

--
-- Indices de la tabla `caja_chica`
--
ALTER TABLE `caja_chica`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_caja_usuario` (`usuario_id`);

--
-- Indices de la tabla `calendario`
--
ALTER TABLE `calendario`
  ADD PRIMARY KEY (`fecha`),
  ADD KEY `fk_calendario_temporada` (`temporada_id`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dni` (`dni`),
  ADD UNIQUE KEY `ruc` (`ruc`);

--
-- Indices de la tabla `compras`
--
ALTER TABLE `compras`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_compras_proveedor` (`proveedor_id`),
  ADD KEY `fk_compras_usuario` (`usuario_id`);

--
-- Indices de la tabla `detalle_compras`
--
ALTER TABLE `detalle_compras`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_dc_compra` (`compra_id`),
  ADD KEY `fk_dc_insumo` (`insumo_id`);

--
-- Indices de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_dv_venta` (`venta_id`),
  ADD KEY `fk_dv_producto` (`producto_id`);

--
-- Indices de la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_gastos_usuario` (`usuario_id`);

--
-- Indices de la tabla `insumos`
--
ALTER TABLE `insumos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `inventario`
--
ALTER TABLE `inventario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `mermas`
--
ALTER TABLE `mermas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_mermas_producto` (`producto_id`),
  ADD KEY `fk_mermas_usuario` (`usuario_id`);

--
-- Indices de la tabla `modelos_ml`
--
ALTER TABLE `modelos_ml`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `movimientos_insumos`
--
ALTER TABLE `movimientos_insumos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_mov_ins_insumo` (`insumo_id`),
  ADD KEY `fk_mov_ins_usuario` (`usuario_id`);

--
-- Indices de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_mov_inv_producto` (`producto_id`),
  ADD KEY `fk_mov_inv_usuario` (`usuario_id`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pagos_venta` (`venta_id`);

--
-- Indices de la tabla `predicciones`
--
ALTER TABLE `predicciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_predicciones_modelo` (`modelo_id`),
  ADD KEY `fk_predicciones_producto` (`producto_id`);

--
-- Indices de la tabla `produccion`
--
ALTER TABLE `produccion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_prod_producto` (`producto_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`),
  ADD KEY `fk_productos_categoria` (`categoria_id`);

--
-- Indices de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ruc_dni` (`ruc_dni`);

--
-- Indices de la tabla `recetas`
--
ALTER TABLE `recetas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_recetas_producto` (`producto_id`);

--
-- Indices de la tabla `recetas_detalle`
--
ALTER TABLE `recetas_detalle`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_rd_receta` (`receta_id`),
  ADD KEY `fk_rd_insumo` (`insumo_id`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `temporadas`
--
ALTER TABLE `temporadas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_usuarios_rol` (`rol_id`);

--
-- Indices de la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ventas_cliente` (`cliente_id`),
  ADD KEY `fk_ventas_usuario` (`usuario_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `caja_chica`
--
ALTER TABLE `caja_chica`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `compras`
--
ALTER TABLE `compras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `detalle_compras`
--
ALTER TABLE `detalle_compras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `gastos`
--
ALTER TABLE `gastos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `insumos`
--
ALTER TABLE `insumos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `inventario`
--
ALTER TABLE `inventario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `mermas`
--
ALTER TABLE `mermas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `modelos_ml`
--
ALTER TABLE `modelos_ml`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `movimientos_insumos`
--
ALTER TABLE `movimientos_insumos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `predicciones`
--
ALTER TABLE `predicciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `produccion`
--
ALTER TABLE `produccion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `proveedores`
--
ALTER TABLE `proveedores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `recetas`
--
ALTER TABLE `recetas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `recetas_detalle`
--
ALTER TABLE `recetas_detalle`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `temporadas`
--
ALTER TABLE `temporadas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `ventas`
--
ALTER TABLE `ventas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `caja_chica`
--
ALTER TABLE `caja_chica`
  ADD CONSTRAINT `fk_caja_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `calendario`
--
ALTER TABLE `calendario`
  ADD CONSTRAINT `fk_calendario_temporada` FOREIGN KEY (`temporada_id`) REFERENCES `temporadas` (`id`);

--
-- Filtros para la tabla `compras`
--
ALTER TABLE `compras`
  ADD CONSTRAINT `fk_compras_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`),
  ADD CONSTRAINT `fk_compras_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `detalle_compras`
--
ALTER TABLE `detalle_compras`
  ADD CONSTRAINT `fk_dc_compra` FOREIGN KEY (`compra_id`) REFERENCES `compras` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dc_insumo` FOREIGN KEY (`insumo_id`) REFERENCES `insumos` (`id`);

--
-- Filtros para la tabla `detalle_ventas`
--
ALTER TABLE `detalle_ventas`
  ADD CONSTRAINT `fk_dv_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  ADD CONSTRAINT `fk_dv_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `gastos`
--
ALTER TABLE `gastos`
  ADD CONSTRAINT `fk_gastos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `inventario`
--
ALTER TABLE `inventario`
  ADD CONSTRAINT `fk_inventario_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `mermas`
--
ALTER TABLE `mermas`
  ADD CONSTRAINT `fk_mermas_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  ADD CONSTRAINT `fk_mermas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `movimientos_insumos`
--
ALTER TABLE `movimientos_insumos`
  ADD CONSTRAINT `fk_mov_ins_insumo` FOREIGN KEY (`insumo_id`) REFERENCES `insumos` (`id`),
  ADD CONSTRAINT `fk_mov_ins_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `movimientos_inventario`
--
ALTER TABLE `movimientos_inventario`
  ADD CONSTRAINT `fk_mov_inv_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  ADD CONSTRAINT `fk_mov_inv_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `fk_pagos_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `predicciones`
--
ALTER TABLE `predicciones`
  ADD CONSTRAINT `fk_predicciones_modelo` FOREIGN KEY (`modelo_id`) REFERENCES `modelos_ml` (`id`),
  ADD CONSTRAINT `fk_predicciones_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `produccion`
--
ALTER TABLE `produccion`
  ADD CONSTRAINT `fk_prod_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`);

--
-- Filtros para la tabla `recetas`
--
ALTER TABLE `recetas`
  ADD CONSTRAINT `fk_recetas_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `recetas_detalle`
--
ALTER TABLE `recetas_detalle`
  ADD CONSTRAINT `fk_rd_insumo` FOREIGN KEY (`insumo_id`) REFERENCES `insumos` (`id`),
  ADD CONSTRAINT `fk_rd_receta` FOREIGN KEY (`receta_id`) REFERENCES `recetas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`);

--
-- Filtros para la tabla `ventas`
--
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_ventas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  ADD CONSTRAINT `fk_ventas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
