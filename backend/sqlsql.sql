CREATE DATABASE delta_rockets;
USE delta_rockets;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    setor VARCHAR(50),
    status ENUM('pendente', 'ativo', 'inativo') DEFAULT 'pendente',
    is_admin BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tarefas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    setor VARCHAR(50) NOT NULL,
    prioridade ENUM('baixa', 'media', 'alta') DEFAULT 'media',
    status ENUM('aberta', 'em_andamento', 'concluida') DEFAULT 'aberta',
    responsavel_id INT,
    prazo DATE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
);

CREATE TABLE eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    setor VARCHAR(50),
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME,
    criado_por INT,
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
);