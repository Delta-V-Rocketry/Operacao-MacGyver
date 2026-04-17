# ═══════════════════════════════════════════════════════════
#  DeltaV Rocketry · Camada de banco de dados
#  Banco: joaquim (TiDB Cloud)
#  Tabela principal: membros
# ═══════════════════════════════════════════════════════════

import os
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()


def conectar():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", 4000)),  # TiDB Cloud usa porta 4000
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        database=os.getenv("DB_NAME"),         # joaquim
        ssl_ca="/etc/ssl/certs/ca-certificates.crt",
        ssl_verify_cert=True,
        ssl_verify_identity=True,
    )


# ── Usuários / Membros ────────────────────────────────────

def verificar_login(email, senha_plana):
    con = conectar()
    cursor = con.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, nome, email, senha, setor, is_admin, is_leader, status
            FROM membros
            WHERE email = %s
        """, (email,))
        usuario = cursor.fetchone()
    finally:
        cursor.close()
        con.close()

    if not usuario:
        return {"erro": "E-mail ou senha incorretos."}

    if not check_password_hash(usuario["senha"], senha_plana):
        return {"erro": "E-mail ou senha incorretos."}

    if usuario.get("status") == "inativo":
        return {"erro": "Conta inativa. Fale com a liderança."}

    if usuario.get("status") == "pendente":
        return {"erro": "Cadastro aguardando aprovação do administrador."}

    return {
        "id":       usuario["id"],
        "nome":     usuario["nome"],
        "email":    usuario["email"],
        "setor":    usuario["setor"],
        "isAdmin":  bool(usuario.get("is_admin", False)),
        "isLeader": bool(usuario.get("is_leader", False)),
    }


def criar_usuario(nome, email, senha_plana, setor, role="user"):
    senha_hash = generate_password_hash(senha_plana)
    is_admin  = role == "admin"
    is_leader = role == "leader"

    con = conectar()
    cursor = con.cursor()
    try:
        cursor.execute("""
            INSERT INTO membros (nome, email, senha, setor, is_admin, is_leader, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'ativo')
        """, (nome, email, senha_hash, setor, is_admin, is_leader))
        con.commit()
        return True
    except mysql.connector.IntegrityError:
        return False
    finally:
        cursor.close()
        con.close()


def listar_membros():
    con = conectar()
    cursor = con.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, nome, email, setor, is_admin, is_leader, status
            FROM membros
            ORDER BY nome
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        con.close()


def atualizar_membro(membro_id, dados):
    campos  = []
    valores = []
    mapa = {
        "nome": "nome", "email": "email", "setor": "setor",
        "status": "status", "is_admin": "is_admin", "is_leader": "is_leader"
    }
    for chave, coluna in mapa.items():
        if chave in dados:
            campos.append(f"{coluna} = %s")
            valores.append(dados[chave])
    if "senha" in dados and dados["senha"]:
        campos.append("senha = %s")
        valores.append(generate_password_hash(dados["senha"]))
    if not campos:
        return False
    valores.append(membro_id)
    con = conectar()
    cursor = con.cursor()
    try:
        cursor.execute(
            f"UPDATE membros SET {', '.join(campos)} WHERE id = %s", valores
        )
        con.commit()
        return True
    finally:
        cursor.close()
        con.close()


def deletar_membro(membro_id):
    con = conectar()
    cursor = con.cursor()
    try:
        cursor.execute("DELETE FROM membros WHERE id = %s", (membro_id,))
        con.commit()
        return True
    finally:
        cursor.close()
        con.close()


# ── Demandas ──────────────────────────────────────────────

def listar_demandas():
    con = conectar()
    cursor = con.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT t.*, m.nome AS responsavel_nome, m.setor AS responsavel_setor
            FROM tarefas t
            LEFT JOIN membros m ON t.responsavel_id = m.id
            ORDER BY t.criado_em DESC
        """)
        return cursor.fetchall()
    finally:
        cursor.close()
        con.close()


def criar_demanda(dados):
    con = conectar()
    cursor = con.cursor()
    try:
        cursor.execute("""
            INSERT INTO tarefas (titulo, descricao, setor, prioridade, status, responsavel_id, prazo)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            dados.get("titulo"), dados.get("descricao"),
            dados.get("setor"),  dados.get("prioridade", "media"),
            dados.get("status", "aberta"),
            dados.get("responsavel_id"), dados.get("prazo"),
        ))
        con.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        con.close()


def atualizar_demanda(demanda_id, dados):
    campos  = []
    valores = []
    for chave in ("titulo", "descricao", "setor", "prioridade", "status", "responsavel_id", "prazo"):
        if chave in dados:
            campos.append(f"{chave} = %s")
            valores.append(dados[chave])
    if not campos:
        return False
    valores.append(demanda_id)
    con = conectar()
    cursor = con.cursor()
    try:
        cursor.execute(
            f"UPDATE tarefas SET {', '.join(campos)} WHERE id = %s", valores
        )
        con.commit()
        return True
    finally:
        cursor.close()
        con.close()


def deletar_demanda(demanda_id):
    con = conectar()
    cursor = con.cursor()
    try:
        cursor.execute("DELETE FROM tarefas WHERE id = %s", (demanda_id,))
        con.commit()
        return True
    finally:
        cursor.close()
        con.close()


# ── Eventos ───────────────────────────────────────────────

def listar_eventos():
    con = conectar()
    cursor = con.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM eventos ORDER BY data_inicio")
        return cursor.fetchall()
    finally:
        cursor.close()
        con.close()


def criar_evento(dados):
    con = conectar()
    cursor = con.cursor()
    try:
        cursor.execute("""
            INSERT INTO eventos (titulo, descricao, setor, data_inicio, data_fim, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            dados.get("titulo"), dados.get("descricao"), dados.get("setor"),
            dados.get("data_inicio"), dados.get("data_fim"), dados.get("criado_por"),
        ))
        con.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        con.close()


def deletar_evento(evento_id):
    con = conectar()
    cursor = con.cursor()
    try:
        cursor.execute("DELETE FROM eventos WHERE id = %s", (evento_id,))
        con.commit()
        return True
    finally:
        cursor.close()
        con.close()