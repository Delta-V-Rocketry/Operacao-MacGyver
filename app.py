from flask import Flask, request, jsonify
import mysql.connector
import os

app = Flask(__name__)

def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            port=4000,
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASS'), # Verifique se no Azure está DB_PASS ou DB_PASSWORD
            database=os.getenv('DB_NAME'),
            ssl_ca="/etc/ssl/certs/ca-certificates.crt",
            ssl_verify_cert=True,
            ssl_verify_identity=True
        )
        return conn
    except Exception as e:
        print(f"ERRO DE CONEXÃO: {e}")
        return None


@app.route('/')
def home():
    return " Delta Rockets Online", 200

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data:
        return jsonify({"message": "Dados não enviados."}), 400
        
    email = data.get('email')
    senha = data.get('senha')

    conn = get_db_connection()
    
    
    if conn is None:
        return jsonify({"message": "Erro de conexão com o banco de dados."}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM usuarios WHERE email = %s AND senha_hash = %s"
        cursor.execute(query, (email, senha))
        usuario = cursor.fetchone()
        
        cursor.close()
        conn.close()

        if usuario:
            return jsonify({"message": "Login realizado com sucesso!", "user": usuario['nome']}), 200
        else:
            return jsonify({"message": "E-mail ou senha incorretos."}), 401
            
    except Exception as e:
        print(f"Erro na consulta: {e}")
        return jsonify({"message": "Erro interno no servidor."}), 500

if __name__ == '__main__':
    app.run(debug=True)
