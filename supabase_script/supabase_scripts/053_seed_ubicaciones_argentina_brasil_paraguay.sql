-- =============================================
-- Migration: 053 - Seed ubicaciones for Argentina, Brasil and Paraguay
-- Description: Insert main cities and departments for the tri-border region
--              and major cities across all three countries
-- =============================================

-- Note: Existing Misiones data already has pais='Argentina', provincia='Misiones'
-- This script adds data for:
-- 1. Other provinces of Argentina (focus on nearby + major cities)
-- 2. Brazilian states (focus on Parana, Santa Catarina, Rio Grande do Sul)
-- 3. Paraguay departments (focus on border region + Asuncion area)

-- =============================================
-- ARGENTINA - Other Provinces
-- =============================================

-- Buenos Aires
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Buenos Aires', 'La Plata', 'La Plata'),
('Argentina', 'Buenos Aires', 'La Matanza', 'San Justo'),
('Argentina', 'Buenos Aires', 'La Matanza', 'Isidro Casanova'),
('Argentina', 'Buenos Aires', 'La Matanza', 'Gregorio de Laferrere'),
('Argentina', 'Buenos Aires', 'Quilmes', 'Quilmes'),
('Argentina', 'Buenos Aires', 'Quilmes', 'Bernal'),
('Argentina', 'Buenos Aires', 'Lanus', 'Lanus'),
('Argentina', 'Buenos Aires', 'Lomas de Zamora', 'Lomas de Zamora'),
('Argentina', 'Buenos Aires', 'Lomas de Zamora', 'Banfield'),
('Argentina', 'Buenos Aires', 'Almirante Brown', 'Adrogue'),
('Argentina', 'Buenos Aires', 'Avellaneda', 'Avellaneda'),
('Argentina', 'Buenos Aires', 'San Isidro', 'San Isidro'),
('Argentina', 'Buenos Aires', 'Vicente Lopez', 'Vicente Lopez'),
('Argentina', 'Buenos Aires', 'Vicente Lopez', 'Olivos'),
('Argentina', 'Buenos Aires', 'Moron', 'Moron'),
('Argentina', 'Buenos Aires', 'Moron', 'Haedo'),
('Argentina', 'Buenos Aires', 'Tigre', 'Tigre'),
('Argentina', 'Buenos Aires', 'San Fernando', 'San Fernando'),
('Argentina', 'Buenos Aires', 'General San Martin', 'San Martin'),
('Argentina', 'Buenos Aires', 'Tres de Febrero', 'Caseros'),
('Argentina', 'Buenos Aires', 'Pilar', 'Pilar'),
('Argentina', 'Buenos Aires', 'Escobar', 'Escobar'),
('Argentina', 'Buenos Aires', 'Mar del Plata', 'Mar del Plata'),
('Argentina', 'Buenos Aires', 'Bahia Blanca', 'Bahia Blanca'),
('Argentina', 'Buenos Aires', 'Tandil', 'Tandil'),
('Argentina', 'Buenos Aires', 'Olavarria', 'Olavarria'),
('Argentina', 'Buenos Aires', 'Junin', 'Junin'),
('Argentina', 'Buenos Aires', 'Pergamino', 'Pergamino'),
('Argentina', 'Buenos Aires', 'Zarate', 'Zarate'),
('Argentina', 'Buenos Aires', 'Campana', 'Campana')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- CABA (Ciudad Autonoma de Buenos Aires)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Palermo', 'Palermo'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Recoleta', 'Recoleta'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Belgrano', 'Belgrano'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Caballito', 'Caballito'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Flores', 'Flores'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Villa Crespo', 'Villa Crespo'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Almagro', 'Almagro'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'San Telmo', 'San Telmo'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'La Boca', 'La Boca'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Barracas', 'Barracas'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Microcentro', 'Microcentro'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Puerto Madero', 'Puerto Madero'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Villa Urquiza', 'Villa Urquiza'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Nunez', 'Nunez'),
('Argentina', 'Ciudad Autonoma de Buenos Aires', 'Colegiales', 'Colegiales')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Cordoba
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Cordoba', 'Capital', 'Cordoba'),
('Argentina', 'Cordoba', 'Punilla', 'Carlos Paz'),
('Argentina', 'Cordoba', 'Punilla', 'Cosquin'),
('Argentina', 'Cordoba', 'Punilla', 'La Falda'),
('Argentina', 'Cordoba', 'Colon', 'Jesus Maria'),
('Argentina', 'Cordoba', 'Colon', 'Colonia Caroya'),
('Argentina', 'Cordoba', 'Rio Cuarto', 'Rio Cuarto'),
('Argentina', 'Cordoba', 'San Justo', 'San Francisco'),
('Argentina', 'Cordoba', 'General San Martin', 'Villa Maria'),
('Argentina', 'Cordoba', 'Tercero Arriba', 'Rio Tercero'),
('Argentina', 'Cordoba', 'Calamuchita', 'Villa General Belgrano'),
('Argentina', 'Cordoba', 'Calamuchita', 'Santa Rosa de Calamuchita'),
('Argentina', 'Cordoba', 'Rio Segundo', 'Rio Segundo')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Santa Fe
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Santa Fe', 'La Capital', 'Santa Fe'),
('Argentina', 'Santa Fe', 'Rosario', 'Rosario'),
('Argentina', 'Santa Fe', 'General Lopez', 'Venado Tuerto'),
('Argentina', 'Santa Fe', 'Castellanos', 'Rafaela'),
('Argentina', 'Santa Fe', 'General Obligado', 'Reconquista'),
('Argentina', 'Santa Fe', 'San Lorenzo', 'San Lorenzo'),
('Argentina', 'Santa Fe', 'Constitucion', 'Villa Constitucion'),
('Argentina', 'Santa Fe', 'Las Colonias', 'Esperanza'),
('Argentina', 'Santa Fe', 'San Cristobal', 'San Cristobal'),
('Argentina', 'Santa Fe', 'San Justo', 'San Justo'),
('Argentina', 'Santa Fe', 'Caseros', 'Casilda'),
('Argentina', 'Santa Fe', 'Belgrano', 'Las Rosas')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Corrientes (vecina de Misiones)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Corrientes', 'Capital', 'Corrientes'),
('Argentina', 'Corrientes', 'Goya', 'Goya'),
('Argentina', 'Corrientes', 'Santo Tome', 'Santo Tome'),
('Argentina', 'Corrientes', 'Paso de los Libres', 'Paso de los Libres'),
('Argentina', 'Corrientes', 'Mercedes', 'Mercedes'),
('Argentina', 'Corrientes', 'Esquina', 'Esquina'),
('Argentina', 'Corrientes', 'Bella Vista', 'Bella Vista'),
('Argentina', 'Corrientes', 'Curuzu Cuatia', 'Curuzu Cuatia'),
('Argentina', 'Corrientes', 'Monte Caseros', 'Monte Caseros'),
('Argentina', 'Corrientes', 'Ituzaingo', 'Ituzaingo'),
('Argentina', 'Corrientes', 'Alvear', 'Alvear'),
('Argentina', 'Corrientes', 'San Roque', 'San Roque'),
('Argentina', 'Corrientes', 'Empedrado', 'Empedrado'),
('Argentina', 'Corrientes', 'Saladas', 'Saladas'),
('Argentina', 'Corrientes', 'San Luis del Palmar', 'San Luis del Palmar')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Entre Rios (cercana)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Entre Rios', 'Parana', 'Parana'),
('Argentina', 'Entre Rios', 'Concordia', 'Concordia'),
('Argentina', 'Entre Rios', 'Gualeguaychu', 'Gualeguaychu'),
('Argentina', 'Entre Rios', 'Colon', 'Colon'),
('Argentina', 'Entre Rios', 'Concepcion del Uruguay', 'Concepcion del Uruguay'),
('Argentina', 'Entre Rios', 'Villaguay', 'Villaguay'),
('Argentina', 'Entre Rios', 'La Paz', 'La Paz'),
('Argentina', 'Entre Rios', 'Federacion', 'Federacion'),
('Argentina', 'Entre Rios', 'Chajarí', 'Chajari'),
('Argentina', 'Entre Rios', 'Victoria', 'Victoria'),
('Argentina', 'Entre Rios', 'Diamante', 'Diamante'),
('Argentina', 'Entre Rios', 'Nogoya', 'Nogoya')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Chaco
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Chaco', 'San Fernando', 'Resistencia'),
('Argentina', 'Chaco', 'Comandante Fernandez', 'Presidencia Roque Saenz Pena'),
('Argentina', 'Chaco', 'General Guemes', 'Castelli'),
('Argentina', 'Chaco', 'Libertador General San Martin', 'General San Martin'),
('Argentina', 'Chaco', 'Bermejo', 'La Leonesa'),
('Argentina', 'Chaco', 'Bermejo', 'General Vedia'),
('Argentina', 'Chaco', '12 de Octubre', 'General Pinedo'),
('Argentina', 'Chaco', 'Quitilipi', 'Quitilipi'),
('Argentina', 'Chaco', 'Chacabuco', 'Charata'),
('Argentina', 'Chaco', 'San Lorenzo', 'Villa Angela')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Formosa
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Formosa', 'Formosa', 'Formosa'),
('Argentina', 'Formosa', 'Pilcomayo', 'Clorinda'),
('Argentina', 'Formosa', 'Pirane', 'Pirane'),
('Argentina', 'Formosa', 'Laishi', 'Laishi'),
('Argentina', 'Formosa', 'Pilaga', 'Espinillo'),
('Argentina', 'Formosa', 'Patino', 'Las Lomitas'),
('Argentina', 'Formosa', 'Bermejo', 'Laguna Yema'),
('Argentina', 'Formosa', 'Matacos', 'Ingeniero Juarez')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Tucuman
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Tucuman', 'Capital', 'San Miguel de Tucuman'),
('Argentina', 'Tucuman', 'Cruz Alta', 'Banda del Rio Sali'),
('Argentina', 'Tucuman', 'Yerba Buena', 'Yerba Buena'),
('Argentina', 'Tucuman', 'Tafi Viejo', 'Tafi Viejo'),
('Argentina', 'Tucuman', 'Famailla', 'Famailla'),
('Argentina', 'Tucuman', 'Monteros', 'Monteros'),
('Argentina', 'Tucuman', 'Concepcion', 'Concepcion'),
('Argentina', 'Tucuman', 'Simoca', 'Simoca'),
('Argentina', 'Tucuman', 'Lules', 'Lules'),
('Argentina', 'Tucuman', 'Rio Chico', 'Aguilares')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Salta
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Salta', 'Capital', 'Salta'),
('Argentina', 'Salta', 'General Guemes', 'General Guemes'),
('Argentina', 'Salta', 'Oran', 'San Ramon de la Nueva Oran'),
('Argentina', 'Salta', 'San Martin', 'Tartagal'),
('Argentina', 'Salta', 'Rosario de Lerma', 'Rosario de Lerma'),
('Argentina', 'Salta', 'Cerrillos', 'Cerrillos'),
('Argentina', 'Salta', 'Metan', 'Metan'),
('Argentina', 'Salta', 'Cafayate', 'Cafayate'),
('Argentina', 'Salta', 'Chicoana', 'Chicoana'),
('Argentina', 'Salta', 'La Caldera', 'La Caldera')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Jujuy
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Jujuy', 'Dr. Manuel Belgrano', 'San Salvador de Jujuy'),
('Argentina', 'Jujuy', 'Palpala', 'Palpala'),
('Argentina', 'Jujuy', 'San Pedro', 'San Pedro de Jujuy'),
('Argentina', 'Jujuy', 'Ledesma', 'Libertador General San Martin'),
('Argentina', 'Jujuy', 'El Carmen', 'El Carmen'),
('Argentina', 'Jujuy', 'Tilcara', 'Tilcara'),
('Argentina', 'Jujuy', 'Humahuaca', 'Humahuaca'),
('Argentina', 'Jujuy', 'La Quiaca', 'La Quiaca'),
('Argentina', 'Jujuy', 'Yavi', 'Yavi'),
('Argentina', 'Jujuy', 'Tumbaya', 'Purmamarca')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Santiago del Estero
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Santiago del Estero', 'Capital', 'Santiago del Estero'),
('Argentina', 'Santiago del Estero', 'Banda', 'La Banda'),
('Argentina', 'Santiago del Estero', 'Rio Hondo', 'Termas de Rio Hondo'),
('Argentina', 'Santiago del Estero', 'General Taboada', 'Anatuya'),
('Argentina', 'Santiago del Estero', 'Loreto', 'Loreto'),
('Argentina', 'Santiago del Estero', 'Robles', 'Fernandez'),
('Argentina', 'Santiago del Estero', 'Belgrano', 'Bandera'),
('Argentina', 'Santiago del Estero', 'Moreno', 'Quimili')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Mendoza
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Mendoza', 'Capital', 'Mendoza'),
('Argentina', 'Mendoza', 'Godoy Cruz', 'Godoy Cruz'),
('Argentina', 'Mendoza', 'Guaymallen', 'Guaymallen'),
('Argentina', 'Mendoza', 'Las Heras', 'Las Heras'),
('Argentina', 'Mendoza', 'Lujan de Cuyo', 'Lujan de Cuyo'),
('Argentina', 'Mendoza', 'Maipu', 'Maipu'),
('Argentina', 'Mendoza', 'San Rafael', 'San Rafael'),
('Argentina', 'Mendoza', 'San Martin', 'San Martin'),
('Argentina', 'Mendoza', 'Rivadavia', 'Rivadavia'),
('Argentina', 'Mendoza', 'Tunuyan', 'Tunuyan'),
('Argentina', 'Mendoza', 'Tupungato', 'Tupungato'),
('Argentina', 'Mendoza', 'General Alvear', 'General Alvear'),
('Argentina', 'Mendoza', 'Malargue', 'Malargue')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- San Juan
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'San Juan', 'Capital', 'San Juan'),
('Argentina', 'San Juan', 'Rawson', 'Rawson'),
('Argentina', 'San Juan', 'Rivadavia', 'Rivadavia'),
('Argentina', 'San Juan', 'Chimbas', 'Chimbas'),
('Argentina', 'San Juan', 'Santa Lucia', 'Santa Lucia'),
('Argentina', 'San Juan', 'Pocito', 'Pocito'),
('Argentina', 'San Juan', 'Albardon', 'Albardon'),
('Argentina', 'San Juan', 'San Martin', 'San Martin'),
('Argentina', 'San Juan', 'Caucete', 'Caucete'),
('Argentina', 'San Juan', 'Jachal', 'San Jose de Jachal')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- San Luis
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'San Luis', 'La Capital', 'San Luis'),
('Argentina', 'San Luis', 'General Pedernera', 'Villa Mercedes'),
('Argentina', 'San Luis', 'Chacabuco', 'Merlo'),
('Argentina', 'San Luis', 'Junin', 'Merlo'),
('Argentina', 'San Luis', 'Coronel Pringles', 'La Toma'),
('Argentina', 'San Luis', 'Belgrano', 'Villa General Roca'),
('Argentina', 'San Luis', 'Ayacucho', 'Lujan')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- La Rioja
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'La Rioja', 'Capital', 'La Rioja'),
('Argentina', 'La Rioja', 'Chilecito', 'Chilecito'),
('Argentina', 'La Rioja', 'Arauco', 'Aimogasta'),
('Argentina', 'La Rioja', 'Chamical', 'Chamical'),
('Argentina', 'La Rioja', 'Sanagasta', 'Sanagasta'),
('Argentina', 'La Rioja', 'Famatina', 'Famatina')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Catamarca
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Catamarca', 'Capital', 'San Fernando del Valle de Catamarca'),
('Argentina', 'Catamarca', 'Valle Viejo', 'San Isidro'),
('Argentina', 'Catamarca', 'Fray Mamerto Esquiu', 'San Jose'),
('Argentina', 'Catamarca', 'Andalgala', 'Andalgala'),
('Argentina', 'Catamarca', 'Tinogasta', 'Tinogasta'),
('Argentina', 'Catamarca', 'Belen', 'Belen'),
('Argentina', 'Catamarca', 'Santa Maria', 'Santa Maria')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Neuquen
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Neuquen', 'Confluencia', 'Neuquen'),
('Argentina', 'Neuquen', 'Confluencia', 'Plottier'),
('Argentina', 'Neuquen', 'Confluencia', 'Centenario'),
('Argentina', 'Neuquen', 'Zapala', 'Zapala'),
('Argentina', 'Neuquen', 'Los Lagos', 'San Martin de los Andes'),
('Argentina', 'Neuquen', 'Lacar', 'Junin de los Andes'),
('Argentina', 'Neuquen', 'Huiliches', 'Villa La Angostura'),
('Argentina', 'Neuquen', 'Anelo', 'Anelo'),
('Argentina', 'Neuquen', 'Rincon de los Sauces', 'Rincon de los Sauces'),
('Argentina', 'Neuquen', 'Chos Malal', 'Chos Malal')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Rio Negro
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Rio Negro', 'General Roca', 'General Roca'),
('Argentina', 'Rio Negro', 'General Roca', 'Cipolletti'),
('Argentina', 'Rio Negro', 'General Roca', 'Allen'),
('Argentina', 'Rio Negro', 'Adolfo Alsina', 'Viedma'),
('Argentina', 'Rio Negro', 'Bariloche', 'San Carlos de Bariloche'),
('Argentina', 'Rio Negro', 'El Bolson', 'El Bolson'),
('Argentina', 'Rio Negro', 'Avellaneda', 'Choele Choel'),
('Argentina', 'Rio Negro', 'Pichi Mahuida', 'Rio Colorado'),
('Argentina', 'Rio Negro', 'San Antonio', 'San Antonio Oeste'),
('Argentina', 'Rio Negro', 'San Antonio', 'Las Grutas')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Chubut
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Chubut', 'Rawson', 'Rawson'),
('Argentina', 'Chubut', 'Biedma', 'Puerto Madryn'),
('Argentina', 'Chubut', 'Escalante', 'Comodoro Rivadavia'),
('Argentina', 'Chubut', 'Futaleufú', 'Esquel'),
('Argentina', 'Chubut', 'Gaiman', 'Gaiman'),
('Argentina', 'Chubut', 'Cushamen', 'El Hoyo'),
('Argentina', 'Chubut', 'Trelew', 'Trelew'),
('Argentina', 'Chubut', 'Sarmiento', 'Sarmiento'),
('Argentina', 'Chubut', 'Tehuelches', 'Gobernador Costa')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Santa Cruz
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Santa Cruz', 'Deseado', 'Caleta Olivia'),
('Argentina', 'Santa Cruz', 'Guer Aike', 'Rio Gallegos'),
('Argentina', 'Santa Cruz', 'Lago Argentino', 'El Calafate'),
('Argentina', 'Santa Cruz', 'Lago Argentino', 'El Chalten'),
('Argentina', 'Santa Cruz', 'Deseado', 'Puerto Deseado'),
('Argentina', 'Santa Cruz', 'Corpen Aike', 'Puerto San Julian'),
('Argentina', 'Santa Cruz', 'Magallanes', 'Puerto Santa Cruz'),
('Argentina', 'Santa Cruz', 'Deseado', 'Pico Truncado'),
('Argentina', 'Santa Cruz', 'Deseado', 'Las Heras'),
('Argentina', 'Santa Cruz', 'Lago Buenos Aires', 'Perito Moreno')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Tierra del Fuego
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'Tierra del Fuego', 'Ushuaia', 'Ushuaia'),
('Argentina', 'Tierra del Fuego', 'Rio Grande', 'Rio Grande'),
('Argentina', 'Tierra del Fuego', 'Tolhuin', 'Tolhuin')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- La Pampa
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Argentina', 'La Pampa', 'Capital', 'Santa Rosa'),
('Argentina', 'La Pampa', 'Maraco', 'General Pico'),
('Argentina', 'La Pampa', 'Rancul', 'Realico'),
('Argentina', 'La Pampa', 'Catriló', 'Catrilo'),
('Argentina', 'La Pampa', 'Chalileo', 'Santa Isabel'),
('Argentina', 'La Pampa', 'Atreuco', 'Macachín'),
('Argentina', 'La Pampa', 'Hucal', '25 de Mayo'),
('Argentina', 'La Pampa', 'Guatrache', 'Guatrache')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- =============================================
-- BRASIL - Focus on southern states (border region)
-- =============================================

-- Parana (frontera con Misiones)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Brasil', 'Parana', 'Curitiba', 'Curitiba'),
('Brasil', 'Parana', 'Foz do Iguacu', 'Foz do Iguacu'),
('Brasil', 'Parana', 'Londrina', 'Londrina'),
('Brasil', 'Parana', 'Maringa', 'Maringa'),
('Brasil', 'Parana', 'Ponta Grossa', 'Ponta Grossa'),
('Brasil', 'Parana', 'Cascavel', 'Cascavel'),
('Brasil', 'Parana', 'Sao Jose dos Pinhais', 'Sao Jose dos Pinhais'),
('Brasil', 'Parana', 'Colombo', 'Colombo'),
('Brasil', 'Parana', 'Guarapuava', 'Guarapuava'),
('Brasil', 'Parana', 'Paranagua', 'Paranagua'),
('Brasil', 'Parana', 'Toledo', 'Toledo'),
('Brasil', 'Parana', 'Umuarama', 'Umuarama'),
('Brasil', 'Parana', 'Apucarana', 'Apucarana'),
('Brasil', 'Parana', 'Campo Largo', 'Campo Largo'),
('Brasil', 'Parana', 'Araucaria', 'Araucaria'),
('Brasil', 'Parana', 'Arapongas', 'Arapongas'),
('Brasil', 'Parana', 'Pinhais', 'Pinhais'),
('Brasil', 'Parana', 'Francisco Beltrao', 'Francisco Beltrao'),
('Brasil', 'Parana', 'Campo Mourao', 'Campo Mourao'),
('Brasil', 'Parana', 'Fazenda Rio Grande', 'Fazenda Rio Grande'),
('Brasil', 'Parana', 'Almirante Tamandare', 'Almirante Tamandare'),
('Brasil', 'Parana', 'Piraquara', 'Piraquara'),
('Brasil', 'Parana', 'Medianeira', 'Medianeira'),
('Brasil', 'Parana', 'Santa Terezinha de Itaipu', 'Santa Terezinha de Itaipu'),
('Brasil', 'Parana', 'Cianorte', 'Cianorte'),
('Brasil', 'Parana', 'Irati', 'Irati'),
('Brasil', 'Parana', 'Paranavaí', 'Paranavai'),
('Brasil', 'Parana', 'Cambe', 'Cambe'),
('Brasil', 'Parana', 'Rolandia', 'Rolandia'),
('Brasil', 'Parana', 'Pato Branco', 'Pato Branco')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Santa Catarina
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Brasil', 'Santa Catarina', 'Florianopolis', 'Florianopolis'),
('Brasil', 'Santa Catarina', 'Joinville', 'Joinville'),
('Brasil', 'Santa Catarina', 'Blumenau', 'Blumenau'),
('Brasil', 'Santa Catarina', 'Sao Jose', 'Sao Jose'),
('Brasil', 'Santa Catarina', 'Chapeco', 'Chapeco'),
('Brasil', 'Santa Catarina', 'Criciuma', 'Criciuma'),
('Brasil', 'Santa Catarina', 'Itajai', 'Itajai'),
('Brasil', 'Santa Catarina', 'Jaragua do Sul', 'Jaragua do Sul'),
('Brasil', 'Santa Catarina', 'Lages', 'Lages'),
('Brasil', 'Santa Catarina', 'Palhoca', 'Palhoca'),
('Brasil', 'Santa Catarina', 'Balneario Camboriu', 'Balneario Camboriu'),
('Brasil', 'Santa Catarina', 'Brusque', 'Brusque'),
('Brasil', 'Santa Catarina', 'Tubarao', 'Tubarao'),
('Brasil', 'Santa Catarina', 'Sao Bento do Sul', 'Sao Bento do Sul'),
('Brasil', 'Santa Catarina', 'Cacador', 'Cacador'),
('Brasil', 'Santa Catarina', 'Concordia', 'Concordia'),
('Brasil', 'Santa Catarina', 'Camboriu', 'Camboriu'),
('Brasil', 'Santa Catarina', 'Rio do Sul', 'Rio do Sul'),
('Brasil', 'Santa Catarina', 'Navegantes', 'Navegantes'),
('Brasil', 'Santa Catarina', 'Dionisio Cerqueira', 'Dionisio Cerqueira')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Rio Grande do Sul
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Brasil', 'Rio Grande do Sul', 'Porto Alegre', 'Porto Alegre'),
('Brasil', 'Rio Grande do Sul', 'Caxias do Sul', 'Caxias do Sul'),
('Brasil', 'Rio Grande do Sul', 'Pelotas', 'Pelotas'),
('Brasil', 'Rio Grande do Sul', 'Canoas', 'Canoas'),
('Brasil', 'Rio Grande do Sul', 'Santa Maria', 'Santa Maria'),
('Brasil', 'Rio Grande do Sul', 'Gravataí', 'Gravatai'),
('Brasil', 'Rio Grande do Sul', 'Viamao', 'Viamao'),
('Brasil', 'Rio Grande do Sul', 'Novo Hamburgo', 'Novo Hamburgo'),
('Brasil', 'Rio Grande do Sul', 'Sao Leopoldo', 'Sao Leopoldo'),
('Brasil', 'Rio Grande do Sul', 'Rio Grande', 'Rio Grande'),
('Brasil', 'Rio Grande do Sul', 'Alvorada', 'Alvorada'),
('Brasil', 'Rio Grande do Sul', 'Passo Fundo', 'Passo Fundo'),
('Brasil', 'Rio Grande do Sul', 'Sapucaia do Sul', 'Sapucaia do Sul'),
('Brasil', 'Rio Grande do Sul', 'Uruguaiana', 'Uruguaiana'),
('Brasil', 'Rio Grande do Sul', 'Santa Cruz do Sul', 'Santa Cruz do Sul'),
('Brasil', 'Rio Grande do Sul', 'Cachoeirinha', 'Cachoeirinha'),
('Brasil', 'Rio Grande do Sul', 'Bage', 'Bage'),
('Brasil', 'Rio Grande do Sul', 'Bento Goncalves', 'Bento Goncalves'),
('Brasil', 'Rio Grande do Sul', 'Erechim', 'Erechim'),
('Brasil', 'Rio Grande do Sul', 'Guaiba', 'Guaiba'),
('Brasil', 'Rio Grande do Sul', 'Lajeado', 'Lajeado'),
('Brasil', 'Rio Grande do Sul', 'Ijui', 'Ijui'),
('Brasil', 'Rio Grande do Sul', 'Sapiranga', 'Sapiranga'),
('Brasil', 'Rio Grande do Sul', 'Cachoeira do Sul', 'Cachoeira do Sul'),
('Brasil', 'Rio Grande do Sul', 'Santana do Livramento', 'Santana do Livramento'),
('Brasil', 'Rio Grande do Sul', 'Esteio', 'Esteio'),
('Brasil', 'Rio Grande do Sul', 'Santo Angelo', 'Santo Angelo'),
('Brasil', 'Rio Grande do Sul', 'Cruz Alta', 'Cruz Alta'),
('Brasil', 'Rio Grande do Sul', 'Vacaria', 'Vacaria'),
('Brasil', 'Rio Grande do Sul', 'Sao Borja', 'Sao Borja')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Sao Paulo (principales ciudades)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Brasil', 'Sao Paulo', 'Sao Paulo', 'Sao Paulo'),
('Brasil', 'Sao Paulo', 'Guarulhos', 'Guarulhos'),
('Brasil', 'Sao Paulo', 'Campinas', 'Campinas'),
('Brasil', 'Sao Paulo', 'Sao Bernardo do Campo', 'Sao Bernardo do Campo'),
('Brasil', 'Sao Paulo', 'Santo Andre', 'Santo Andre'),
('Brasil', 'Sao Paulo', 'Osasco', 'Osasco'),
('Brasil', 'Sao Paulo', 'Ribeirao Preto', 'Ribeirao Preto'),
('Brasil', 'Sao Paulo', 'Sorocaba', 'Sorocaba'),
('Brasil', 'Sao Paulo', 'Sao Jose dos Campos', 'Sao Jose dos Campos'),
('Brasil', 'Sao Paulo', 'Santos', 'Santos'),
('Brasil', 'Sao Paulo', 'Maua', 'Maua'),
('Brasil', 'Sao Paulo', 'Mogi das Cruzes', 'Mogi das Cruzes'),
('Brasil', 'Sao Paulo', 'Diadema', 'Diadema'),
('Brasil', 'Sao Paulo', 'Jundiaí', 'Jundiai'),
('Brasil', 'Sao Paulo', 'Piracicaba', 'Piracicaba')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Rio de Janeiro (principales ciudades)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Brasil', 'Rio de Janeiro', 'Rio de Janeiro', 'Rio de Janeiro'),
('Brasil', 'Rio de Janeiro', 'Sao Goncalo', 'Sao Goncalo'),
('Brasil', 'Rio de Janeiro', 'Duque de Caxias', 'Duque de Caxias'),
('Brasil', 'Rio de Janeiro', 'Nova Iguacu', 'Nova Iguacu'),
('Brasil', 'Rio de Janeiro', 'Niteroi', 'Niteroi'),
('Brasil', 'Rio de Janeiro', 'Belem', 'Belem'),
('Brasil', 'Rio de Janeiro', 'Campos dos Goytacazes', 'Campos dos Goytacazes'),
('Brasil', 'Rio de Janeiro', 'Petropolis', 'Petropolis'),
('Brasil', 'Rio de Janeiro', 'Volta Redonda', 'Volta Redonda'),
('Brasil', 'Rio de Janeiro', 'Macae', 'Macae')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Minas Gerais (principales ciudades)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Brasil', 'Minas Gerais', 'Belo Horizonte', 'Belo Horizonte'),
('Brasil', 'Minas Gerais', 'Uberlandia', 'Uberlandia'),
('Brasil', 'Minas Gerais', 'Contagem', 'Contagem'),
('Brasil', 'Minas Gerais', 'Juiz de Fora', 'Juiz de Fora'),
('Brasil', 'Minas Gerais', 'Betim', 'Betim'),
('Brasil', 'Minas Gerais', 'Montes Claros', 'Montes Claros'),
('Brasil', 'Minas Gerais', 'Ribeirao das Neves', 'Ribeirao das Neves'),
('Brasil', 'Minas Gerais', 'Uberaba', 'Uberaba'),
('Brasil', 'Minas Gerais', 'Governador Valadares', 'Governador Valadares'),
('Brasil', 'Minas Gerais', 'Ipatinga', 'Ipatinga')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- =============================================
-- PARAGUAY - All departments
-- =============================================

-- Asuncion (Capital)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Asuncion', 'Asuncion', 'Asuncion'),
('Paraguay', 'Asuncion', 'Centro', 'Centro'),
('Paraguay', 'Asuncion', 'Sajonia', 'Sajonia'),
('Paraguay', 'Asuncion', 'Villa Morra', 'Villa Morra'),
('Paraguay', 'Asuncion', 'Recoleta', 'Recoleta'),
('Paraguay', 'Asuncion', 'Carmelitas', 'Carmelitas'),
('Paraguay', 'Asuncion', 'San Roque', 'San Roque'),
('Paraguay', 'Asuncion', 'Trinidad', 'Trinidad')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Central
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Central', 'San Lorenzo', 'San Lorenzo'),
('Paraguay', 'Central', 'Luque', 'Luque'),
('Paraguay', 'Central', 'Capiata', 'Capiata'),
('Paraguay', 'Central', 'Lambare', 'Lambare'),
('Paraguay', 'Central', 'Fernando de la Mora', 'Fernando de la Mora'),
('Paraguay', 'Central', 'Nemby', 'Nemby'),
('Paraguay', 'Central', 'Mariano Roque Alonso', 'Mariano Roque Alonso'),
('Paraguay', 'Central', 'Ita', 'Ita'),
('Paraguay', 'Central', 'Villa Elisa', 'Villa Elisa'),
('Paraguay', 'Central', 'Limpio', 'Limpio'),
('Paraguay', 'Central', 'Aregua', 'Aregua'),
('Paraguay', 'Central', 'San Antonio', 'San Antonio'),
('Paraguay', 'Central', 'Villeta', 'Villeta'),
('Paraguay', 'Central', 'Ypacarai', 'Ypacarai'),
('Paraguay', 'Central', 'J. Augusto Saldivar', 'J. Augusto Saldivar'),
('Paraguay', 'Central', 'Guarambare', 'Guarambare'),
('Paraguay', 'Central', 'Itaugua', 'Itaugua'),
('Paraguay', 'Central', 'Nueva Italia', 'Nueva Italia'),
('Paraguay', 'Central', 'Ypane', 'Ypane')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Alto Parana (frontera con Misiones)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Alto Parana', 'Ciudad del Este', 'Ciudad del Este'),
('Paraguay', 'Alto Parana', 'Presidente Franco', 'Presidente Franco'),
('Paraguay', 'Alto Parana', 'Hernandarias', 'Hernandarias'),
('Paraguay', 'Alto Parana', 'Minga Guazu', 'Minga Guazu'),
('Paraguay', 'Alto Parana', 'Santa Rita', 'Santa Rita'),
('Paraguay', 'Alto Parana', 'Mbaracayu', 'Mbaracayu'),
('Paraguay', 'Alto Parana', 'San Alberto', 'San Alberto'),
('Paraguay', 'Alto Parana', 'Iruña', 'Iruna'),
('Paraguay', 'Alto Parana', 'Santa Rosa del Monday', 'Santa Rosa del Monday'),
('Paraguay', 'Alto Parana', 'Naranjal', 'Naranjal'),
('Paraguay', 'Alto Parana', 'Los Cedrales', 'Los Cedrales'),
('Paraguay', 'Alto Parana', 'Domingo Martinez de Irala', 'Domingo Martinez de Irala'),
('Paraguay', 'Alto Parana', 'Juan Leon Mallorquin', 'Juan Leon Mallorquin')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Itapua (frontera sur con Argentina)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Itapua', 'Encarnacion', 'Encarnacion'),
('Paraguay', 'Itapua', 'Cambyreta', 'Cambyreta'),
('Paraguay', 'Itapua', 'Hohenau', 'Hohenau'),
('Paraguay', 'Itapua', 'Obligado', 'Obligado'),
('Paraguay', 'Itapua', 'Maria Auxiliadora', 'Maria Auxiliadora'),
('Paraguay', 'Itapua', 'Bella Vista', 'Bella Vista'),
('Paraguay', 'Itapua', 'Nueva Alborada', 'Nueva Alborada'),
('Paraguay', 'Itapua', 'Trinidad', 'Trinidad'),
('Paraguay', 'Itapua', 'Jesus', 'Jesus'),
('Paraguay', 'Itapua', 'San Cosme y Damian', 'San Cosme y Damian'),
('Paraguay', 'Itapua', 'Pirapo', 'Pirapo'),
('Paraguay', 'Itapua', 'Natalio', 'Natalio'),
('Paraguay', 'Itapua', 'Fram', 'Fram'),
('Paraguay', 'Itapua', 'Capitan Miranda', 'Capitan Miranda'),
('Paraguay', 'Itapua', 'San Pedro del Parana', 'San Pedro del Parana'),
('Paraguay', 'Itapua', 'Alto Vera', 'Alto Vera'),
('Paraguay', 'Itapua', 'Edelira', 'Edelira'),
('Paraguay', 'Itapua', 'Tomas Romero Pereira', 'Tomas Romero Pereira'),
('Paraguay', 'Itapua', 'Carlos Antonio Lopez', 'Carlos Antonio Lopez'),
('Paraguay', 'Itapua', 'San Rafael del Parana', 'San Rafael del Parana')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Canindeyu
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Canindeyu', 'Salto del Guaira', 'Salto del Guaira'),
('Paraguay', 'Canindeyu', 'Curuguaty', 'Curuguaty'),
('Paraguay', 'Canindeyu', 'Corpus Christi', 'Corpus Christi'),
('Paraguay', 'Canindeyu', 'La Paloma', 'La Paloma'),
('Paraguay', 'Canindeyu', 'Villa Ygatimi', 'Villa Ygatimi'),
('Paraguay', 'Canindeyu', 'Ypejhu', 'Ypejhu'),
('Paraguay', 'Canindeyu', 'Francisco Caballero Alvarez', 'Francisco Caballero Alvarez'),
('Paraguay', 'Canindeyu', 'Katueté', 'Katuete')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Caaguazu
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Caaguazu', 'Coronel Oviedo', 'Coronel Oviedo'),
('Paraguay', 'Caaguazu', 'Caaguazu', 'Caaguazu'),
('Paraguay', 'Caaguazu', 'Juan Manuel Frutos', 'Juan Manuel Frutos'),
('Paraguay', 'Caaguazu', 'Repatriacion', 'Repatriacion'),
('Paraguay', 'Caaguazu', 'Nueva Londres', 'Nueva Londres'),
('Paraguay', 'Caaguazu', 'San Jose de los Arroyos', 'San Jose de los Arroyos'),
('Paraguay', 'Caaguazu', 'Yhú', 'Yhu'),
('Paraguay', 'Caaguazu', 'San Joaquin', 'San Joaquin'),
('Paraguay', 'Caaguazu', 'Cecilio Baez', 'Cecilio Baez'),
('Paraguay', 'Caaguazu', 'Dr. J. Eulogio Estigarribia', 'Campo 9')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Guaira
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Guaira', 'Villarrica', 'Villarrica'),
('Paraguay', 'Guaira', 'Independencia', 'Independencia'),
('Paraguay', 'Guaira', 'Iturbe', 'Iturbe'),
('Paraguay', 'Guaira', 'Mbocayaty del Guaira', 'Mbocayaty del Guaira'),
('Paraguay', 'Guaira', 'Natalicio Talavera', 'Natalicio Talavera'),
('Paraguay', 'Guaira', 'Paso Yobai', 'Paso Yobai'),
('Paraguay', 'Guaira', 'San Salvador', 'San Salvador'),
('Paraguay', 'Guaira', 'Yataity del Guaira', 'Yataity del Guaira'),
('Paraguay', 'Guaira', 'Troche', 'Troche'),
('Paraguay', 'Guaira', 'Felix Perez Cardozo', 'Felix Perez Cardozo')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- San Pedro
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'San Pedro', 'San Pedro del Ycuamandiyu', 'San Pedro del Ycuamandiyu'),
('Paraguay', 'San Pedro', 'Santa Rosa del Aguaray', 'Santa Rosa del Aguaray'),
('Paraguay', 'San Pedro', 'General Elizardo Aquino', 'General Elizardo Aquino'),
('Paraguay', 'San Pedro', 'San Estanislao', 'San Estanislao'),
('Paraguay', 'San Pedro', 'Itacurubi del Rosario', 'Itacurubi del Rosario'),
('Paraguay', 'San Pedro', 'Villa del Rosario', 'Villa del Rosario'),
('Paraguay', 'San Pedro', 'Union', 'Union'),
('Paraguay', 'San Pedro', 'Guayaibi', 'Guayaibi'),
('Paraguay', 'San Pedro', 'Yataity del Norte', 'Yataity del Norte'),
('Paraguay', 'San Pedro', 'Nueva Germania', 'Nueva Germania')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Amambay
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Amambay', 'Pedro Juan Caballero', 'Pedro Juan Caballero'),
('Paraguay', 'Amambay', 'Bella Vista Norte', 'Bella Vista Norte'),
('Paraguay', 'Amambay', 'Capitan Bado', 'Capitan Bado'),
('Paraguay', 'Amambay', 'Zanja Pytã', 'Zanja Pyta'),
('Paraguay', 'Amambay', 'Karapaí', 'Karapai')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Concepcion
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Concepcion', 'Concepcion', 'Concepcion'),
('Paraguay', 'Concepcion', 'Horqueta', 'Horqueta'),
('Paraguay', 'Concepcion', 'Loreto', 'Loreto'),
('Paraguay', 'Concepcion', 'San Carlos del Apa', 'San Carlos del Apa'),
('Paraguay', 'Concepcion', 'San Lazaro', 'San Lazaro'),
('Paraguay', 'Concepcion', 'Belen', 'Belen'),
('Paraguay', 'Concepcion', 'Yby Yaú', 'Yby Yau'),
('Paraguay', 'Concepcion', 'Azotey', 'Azotey')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Paraguari
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Paraguari', 'Paraguari', 'Paraguari'),
('Paraguay', 'Paraguari', 'Yaguaron', 'Yaguaron'),
('Paraguay', 'Paraguari', 'Piribebuy', 'Piribebuy'),
('Paraguay', 'Paraguari', 'Caapucu', 'Caapucu'),
('Paraguay', 'Paraguari', 'Quiindy', 'Quiindy'),
('Paraguay', 'Paraguari', 'Acahay', 'Acahay'),
('Paraguay', 'Paraguari', 'Sapucai', 'Sapucai'),
('Paraguay', 'Paraguari', 'Caballero', 'Caballero'),
('Paraguay', 'Paraguari', 'La Colmena', 'La Colmena'),
('Paraguay', 'Paraguari', 'Mbuyapey', 'Mbuyapey')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Cordillera
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Cordillera', 'Caacupe', 'Caacupe'),
('Paraguay', 'Cordillera', 'Tobati', 'Tobati'),
('Paraguay', 'Cordillera', 'Altos', 'Altos'),
('Paraguay', 'Cordillera', 'Arroyos y Esteros', 'Arroyos y Esteros'),
('Paraguay', 'Cordillera', 'Atyrá', 'Atyra'),
('Paraguay', 'Cordillera', 'Caraguatay', 'Caraguatay'),
('Paraguay', 'Cordillera', 'Emboscada', 'Emboscada'),
('Paraguay', 'Cordillera', 'Eusebio Ayala', 'Eusebio Ayala'),
('Paraguay', 'Cordillera', 'Isla Pucu', 'Isla Pucu'),
('Paraguay', 'Cordillera', 'Itacurubi de la Cordillera', 'Itacurubi de la Cordillera'),
('Paraguay', 'Cordillera', 'Juan de Mena', 'Juan de Mena'),
('Paraguay', 'Cordillera', 'Loma Grande', 'Loma Grande'),
('Paraguay', 'Cordillera', 'Nueva Colombia', 'Nueva Colombia'),
('Paraguay', 'Cordillera', 'Piribebuy', 'Piribebuy'),
('Paraguay', 'Cordillera', 'San Bernardino', 'San Bernardino'),
('Paraguay', 'Cordillera', 'San Jose Obrero', 'San Jose Obrero'),
('Paraguay', 'Cordillera', 'Santa Elena', 'Santa Elena'),
('Paraguay', 'Cordillera', 'Valenzuela', 'Valenzuela')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Neembucu
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Neembucu', 'Pilar', 'Pilar'),
('Paraguay', 'Neembucu', 'Alberdi', 'Alberdi'),
('Paraguay', 'Neembucu', 'Cerrito', 'Cerrito'),
('Paraguay', 'Neembucu', 'Desmochados', 'Desmochados'),
('Paraguay', 'Neembucu', 'General Diaz', 'General Diaz'),
('Paraguay', 'Neembucu', 'Guazu Cua', 'Guazu Cua'),
('Paraguay', 'Neembucu', 'Humaita', 'Humaita'),
('Paraguay', 'Neembucu', 'Isla Umbu', 'Isla Umbu'),
('Paraguay', 'Neembucu', 'Laureles', 'Laureles'),
('Paraguay', 'Neembucu', 'Mayor Martinez', 'Mayor Martinez'),
('Paraguay', 'Neembucu', 'Paso de Patria', 'Paso de Patria'),
('Paraguay', 'Neembucu', 'San Juan Bautista de Neembucu', 'San Juan Bautista de Neembucu'),
('Paraguay', 'Neembucu', 'Tacuaras', 'Tacuaras'),
('Paraguay', 'Neembucu', 'Villa Franca', 'Villa Franca'),
('Paraguay', 'Neembucu', 'Villa Oliva', 'Villa Oliva'),
('Paraguay', 'Neembucu', 'Villalbin', 'Villalbin')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Misiones (Paraguay)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Misiones', 'San Juan Bautista', 'San Juan Bautista'),
('Paraguay', 'Misiones', 'Ayolas', 'Ayolas'),
('Paraguay', 'Misiones', 'San Ignacio', 'San Ignacio'),
('Paraguay', 'Misiones', 'Santa Maria', 'Santa Maria'),
('Paraguay', 'Misiones', 'Santa Rosa', 'Santa Rosa'),
('Paraguay', 'Misiones', 'Santiago', 'Santiago'),
('Paraguay', 'Misiones', 'Villa Florida', 'Villa Florida'),
('Paraguay', 'Misiones', 'San Patricio', 'San Patricio'),
('Paraguay', 'Misiones', 'San Miguel', 'San Miguel'),
('Paraguay', 'Misiones', 'Yabebyry', 'Yabebyry')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Caazapa
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Caazapa', 'Caazapa', 'Caazapa'),
('Paraguay', 'Caazapa', 'Abai', 'Abai'),
('Paraguay', 'Caazapa', 'Buena Vista', 'Buena Vista'),
('Paraguay', 'Caazapa', 'Dr. Moises Bertoni', 'Dr. Moises Bertoni'),
('Paraguay', 'Caazapa', 'Fulgencio Yegros', 'Fulgencio Yegros'),
('Paraguay', 'Caazapa', 'General Higinio Morinigo', 'General Higinio Morinigo'),
('Paraguay', 'Caazapa', 'Maciel', 'Maciel'),
('Paraguay', 'Caazapa', 'San Juan Nepomuceno', 'San Juan Nepomuceno'),
('Paraguay', 'Caazapa', 'Tavai', 'Tavai'),
('Paraguay', 'Caazapa', 'Yuty', 'Yuty')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Presidente Hayes (Chaco)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Presidente Hayes', 'Villa Hayes', 'Villa Hayes'),
('Paraguay', 'Presidente Hayes', 'Benjamin Aceval', 'Benjamin Aceval'),
('Paraguay', 'Presidente Hayes', 'Nanawa', 'Nanawa'),
('Paraguay', 'Presidente Hayes', 'Jose Falcon', 'Jose Falcon'),
('Paraguay', 'Presidente Hayes', 'Puerto Pinasco', 'Puerto Pinasco'),
('Paraguay', 'Presidente Hayes', 'Teniente Irala Fernandez', 'Teniente Irala Fernandez'),
('Paraguay', 'Presidente Hayes', 'General Jose Maria Bruguez', 'General Jose Maria Bruguez')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Boqueron (Chaco)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Boqueron', 'Filadelfia', 'Filadelfia'),
('Paraguay', 'Boqueron', 'Loma Plata', 'Loma Plata'),
('Paraguay', 'Boqueron', 'Neuland', 'Neuland'),
('Paraguay', 'Boqueron', 'Mariscal Estigarribia', 'Mariscal Estigarribia'),
('Paraguay', 'Boqueron', 'Doctor Pedro P. Peña', 'Doctor Pedro P. Pena')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Alto Paraguay (Chaco)
INSERT INTO ubicaciones (pais, provincia, departamento, localidad) VALUES
('Paraguay', 'Alto Paraguay', 'Fuerte Olimpo', 'Fuerte Olimpo'),
('Paraguay', 'Alto Paraguay', 'Bahia Negra', 'Bahia Negra'),
('Paraguay', 'Alto Paraguay', 'Puerto Casado', 'Puerto Casado'),
('Paraguay', 'Alto Paraguay', 'Carmelo Peralta', 'Carmelo Peralta')
ON CONFLICT (pais, provincia, departamento, localidad) DO NOTHING;

-- Update table statistics
ANALYZE ubicaciones;

-- Verify data
DO $$
DECLARE
  total_count INTEGER;
  argentina_count INTEGER;
  brasil_count INTEGER;
  paraguay_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM ubicaciones;
  SELECT COUNT(*) INTO argentina_count FROM ubicaciones WHERE pais = 'Argentina';
  SELECT COUNT(*) INTO brasil_count FROM ubicaciones WHERE pais = 'Brasil';
  SELECT COUNT(*) INTO paraguay_count FROM ubicaciones WHERE pais = 'Paraguay';

  RAISE NOTICE 'Total ubicaciones: %', total_count;
  RAISE NOTICE 'Argentina: %', argentina_count;
  RAISE NOTICE 'Brasil: %', brasil_count;
  RAISE NOTICE 'Paraguay: %', paraguay_count;
END $$;
