CREATE DATABASE IF  NOT EXISTS joaquim
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
USE joaquim;

CREATE TABLE IF NOT EXISTS membros (
id INT AUTO_INCREMENT PRIMARY KEY,
nome VARCHAR(100) NOT NULL,
email VARCHAR(100) NOT NULL,
senha VARCHAR(100) NOT NULL,
setor VARCHAR(50) NOT NULL,
isadm BOOLEAN DEFAULT FALSE);

INSERT INTO  membros(nome, email, senha, setor, isadm)
VALUES ('Vinicíus chaves','vllc@poli.be','1234','avionica',TRUE);

INSERT INTO  membros(nome, email, senha, setor, isadm)
VALUES ('Luiz Dias','leld@poli.be','1234','seguranca',TRUE);
