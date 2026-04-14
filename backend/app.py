from flask import Flask, jsonify
import database

app = Flask(__name__)

@app.route('/')
def home():
    return "Servidor do Delta Rockets Online! Acesse /testar_cadastro para começar."


@app.route('/testar_cadastro')
def teste_cadastro():
    
    sucesso = database.criar_usuario(
        nome="Comandante Shepard", 
        email="shepard@deltarockets.com", 
        senha_plana="foguete123", 
        setor="Liderança"
    )
    
    if sucesso:
        return "SUCESSO: "
    else:
        return "ERRO: "


@app.route('/testar_login_certo')
def teste_login_certo():
    
    resultado = database.verificar_login("shepard@deltarockets.com", "foguete123")
    
    return jsonify(resultado) 


@app.route('/testar_login_errado')
def teste_login_errado():
    
    resultado = database.verificar_login("shepard@deltarockets.com", "senha_falsa_999")
    return jsonify(resultado)

if __name__ == '__main__':
    app.run(debug=True)