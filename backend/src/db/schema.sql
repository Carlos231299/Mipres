DROP TABLE IF EXISTS procesos_mipres;

CREATE TABLE procesos_mipres (
  id_local                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_mipres                VARCHAR(100)  DEFAULT NULL COMMENT 'ID de direccionamiento obtenido desde SISPRO',
  id_programacion          VARCHAR(100)  DEFAULT NULL,
  id_entrega               VARCHAR(100)  DEFAULT NULL,
  id_reporte               VARCHAR(100)  DEFAULT NULL,
  cod_ser_tec_a_entregar   VARCHAR(50)   DEFAULT NULL COMMENT 'Extraído mágicamente desde el GET',
  cant_tot_a_entregar      INT           DEFAULT NULL COMMENT 'Extraído mágicamente desde el GET',
  fec_max_ent              VARCHAR(20)   DEFAULT NULL COMMENT 'Extraído de SISPRO',
  disponibles              JSON          DEFAULT NULL COMMENT 'Arreglo con todos los validDirs',
  estado                   ENUM('INICIADO','VERIFICADO','PROGRAMADO','ENTREGADO','REPORTADO') NOT NULL DEFAULT 'INICIADO',
  token                    VARCHAR(500)  DEFAULT NULL,
  nit                      VARCHAR(20)   DEFAULT NULL,
  no_prescripcion          VARCHAR(100)  DEFAULT NULL,
  created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado         (estado),
  INDEX idx_nit            (nit),
  INDEX idx_id_mipres      (id_mipres)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
