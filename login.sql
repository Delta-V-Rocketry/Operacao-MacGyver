USE joaquim;

ALTER TABLE membros
  ADD COLUMN IF NOT EXISTS is_leader BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status ENUM('pendente','ativo','inativo') DEFAULT 'ativo';

ALTER TABLE membros
  CHANGE COLUMN isadm is_admin BOOLEAN DEFAULT FALSE;


CREATE TABLE IF NOT EXISTS tarefas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    setor VARCHAR(50) NOT NULL,
    prioridade ENUM('baixa','media','alta','urgente') DEFAULT 'media',
    status ENUM('aberta','em_andamento','em_revisao','concluida') DEFAULT 'aberta',
    responsavel_id INT,
    prazo DATE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (responsavel_id) REFERENCES membros(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    setor VARCHAR(50),
    data_inicio DATETIME NOT NULL,
    data_fim DATETIME,
    criado_por INT,
    FOREIGN KEY (criado_por) REFERENCES membros(id) ON DELETE SET NULL
);