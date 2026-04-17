# ═══════════════════════════════════════════════════════════
#  DeltaV Rocketry · API Flask
#  Rotas: /login, /membros, /demandas, /eventos
# ═══════════════════════════════════════════════════════════

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import database

load_dotenv()

app = Flask(__name__)

# ── CORS ─────────────────────────────────────────────────
# Permite chamadas do front-end hospedado no Azure.
# Em produção, troque "*" pela URL exata do front:
#   origins=os.getenv("FRONTEND_URL", "*")
CORS(app, resources={r"/*": {"origins": "*"}})


# ── Health check ─────────────────────────────────────────
@app.route("/")
def home():
    return jsonify({"status": "online", "app": "DeltaV Rocketry API"}), 200


# ══════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════

@app.route("/login", methods=["POST"])
def login():
    data  = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Dados não enviados."}), 400

    email = data.get("email", "").strip()
    senha = data.get("senha", "")

    if not email or not senha:
        return jsonify({"message": "E-mail e senha são obrigatórios."}), 400

    resultado = database.verificar_login(email, senha)

    if "erro" in resultado:
        return jsonify({"message": resultado["erro"]}), 401

    return jsonify({
        "message": "Login realizado com sucesso!",
        "user": resultado,
    }), 200


# ══════════════════════════════════════════════════════════
#  MEMBROS
# ══════════════════════════════════════════════════════════

@app.route("/membros", methods=["GET"])
def get_membros():
    try:
        membros = database.listar_membros()
        # Serializa booleans corretamente
        for m in membros:
            m["is_admin"]  = bool(m.get("is_admin"))
            m["is_leader"] = bool(m.get("is_leader"))
        return jsonify(membros), 200
    except Exception as e:
        print(f"[ERRO /membros GET] {e}")
        return jsonify({"message": "Erro ao buscar membros."}), 500


@app.route("/membros", methods=["POST"])
def post_membro():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Dados não enviados."}), 400

    nome  = data.get("nome", "").strip()
    email = data.get("email", "").strip()
    senha = data.get("senha", "")
    setor = data.get("setor", "")
    role  = data.get("role", "user")  # 'user' | 'leader' | 'admin'

    if not nome or not email or not senha:
        return jsonify({"message": "Nome, e-mail e senha são obrigatórios."}), 400

    sucesso = database.criar_usuario(nome, email, senha, setor, role)
    if sucesso:
        return jsonify({"message": f"Membro '{nome}' criado com sucesso!"}), 201
    return jsonify({"message": "E-mail já cadastrado."}), 409


@app.route("/membros/<int:membro_id>", methods=["PUT"])
def put_membro(membro_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Dados não enviados."}), 400
    sucesso = database.atualizar_membro(membro_id, data)
    if sucesso:
        return jsonify({"message": "Membro atualizado."}), 200
    return jsonify({"message": "Nenhum campo para atualizar."}), 400


@app.route("/membros/<int:membro_id>", methods=["DELETE"])
def delete_membro(membro_id):
    sucesso = database.deletar_membro(membro_id)
    if sucesso:
        return jsonify({"message": "Membro removido."}), 200
    return jsonify({"message": "Erro ao remover membro."}), 500


# ══════════════════════════════════════════════════════════
#  DEMANDAS (Kanban)
# ══════════════════════════════════════════════════════════

@app.route("/demandas", methods=["GET"])
def get_demandas():
    try:
        demandas = database.listar_demandas()
        # Converte datas para string (JSON não serializa datetime)
        for d in demandas:
            for campo in ("prazo", "criado_em"):
                if d.get(campo):
                    d[campo] = str(d[campo])
        return jsonify(demandas), 200
    except Exception as e:
        print(f"[ERRO /demandas GET] {e}")
        return jsonify({"message": "Erro ao buscar demandas."}), 500


@app.route("/demandas", methods=["POST"])
def post_demanda():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Dados não enviados."}), 400
    novo_id = database.criar_demanda(data)
    return jsonify({"message": "Demanda criada.", "id": novo_id}), 201


@app.route("/demandas/<int:demanda_id>", methods=["PUT"])
def put_demanda(demanda_id):
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Dados não enviados."}), 400
    sucesso = database.atualizar_demanda(demanda_id, data)
    if sucesso:
        return jsonify({"message": "Demanda atualizada."}), 200
    return jsonify({"message": "Nenhum campo para atualizar."}), 400


@app.route("/demandas/<int:demanda_id>", methods=["DELETE"])
def delete_demanda(demanda_id):
    sucesso = database.deletar_demanda(demanda_id)
    if sucesso:
        return jsonify({"message": "Demanda removida."}), 200
    return jsonify({"message": "Erro ao remover demanda."}), 500


# ══════════════════════════════════════════════════════════
#  EVENTOS (Calendário)
# ══════════════════════════════════════════════════════════

@app.route("/eventos", methods=["GET"])
def get_eventos():
    try:
        eventos = database.listar_eventos()
        for e in eventos:
            for campo in ("data_inicio", "data_fim", "criado_em"):
                if e.get(campo):
                    e[campo] = str(e[campo])
        return jsonify(eventos), 200
    except Exception as e:
        print(f"[ERRO /eventos GET] {e}")
        return jsonify({"message": "Erro ao buscar eventos."}), 500


@app.route("/eventos", methods=["POST"])
def post_evento():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"message": "Dados não enviados."}), 400
    novo_id = database.criar_evento(data)
    return jsonify({"message": "Evento criado.", "id": novo_id}), 201


@app.route("/eventos/<int:evento_id>", methods=["DELETE"])
def delete_evento(evento_id):
    sucesso = database.deletar_evento(evento_id)
    if sucesso:
        return jsonify({"message": "Evento removido."}), 200
    return jsonify({"message": "Erro ao remover evento."}), 500


# ══════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":
    app.run(debug=False)