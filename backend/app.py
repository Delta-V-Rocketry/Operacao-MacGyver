from flask import Flask, request, jsonify
import mysql.connector

app = Flask(__name__)


import mysql.connector

import os

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        port=4000,
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        database=os.getenv('DB_NAME'),
        ssl_ca="/etc/ssl/certs/ca-certificates.crt",
        ssl_verify_cert=True,
        ssl_verify_identity=True
    )
    )


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    senha = data.get('senha')

    conn = get_db_connection()
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

if __name__ == '__main__':
    app.run(debug=True)
