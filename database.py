# import mysql.connector
# from dotenv import load_dotenv
# import os

# load_dotenv()

# def get_connection():
#     return mysql.connector.connect(
#         host=os.getenv("DB_HOST"),
#         user=os.getenv("DB_USER"),
#         password=os.getenv("DB_PASSWORD"),
#         database=os.getenv("DB_NAME")
#     )

import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash


def conectar():
    
    return mysql.connector.connect(
        host="localhost",       
        user="root",            
        password="dudu2303",   
        database="delta_rockets"
    )

def criar_usuario(nome, email, senha_plana, setor):
    
    senha_criptografada = generate_password_hash(senha_plana)
    
    con = conectar()
    cursor = con.cursor()
    
    try:
        
        
        sql = "INSERT INTO usuarios (nome, email, senha_hash, setor) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql, (nome, email, senha_criptografada, setor))
        
        con.commit()
        return True 
        
    except mysql.connector.IntegrityError:
        return False 
        
    finally:
        cursor.close()
        con.close()

def verificar_login(email, senha_plana):
    """Verifica a senha e devolve os dados, incluindo se é admin"""
    con = conectar()
    cursor = con.cursor(dictionary=True) # dictionary=True faz o resultado vir com os nomes das colunas!
    
    sql = "SELECT id, nome, senha_hash, is_admin, status FROM usuarios WHERE email = %s"
    cursor.execute(sql, (email,))
    usuario = cursor.fetchone()
    
    cursor.close()
    con.close()

    if usuario:
        
        if check_password_hash(usuario['senha_hash'], senha_plana):
            
            
            if usuario['status'] == 'inativo':
                return {"erro": "Conta inativa. Fale com a liderança."}
                
            
            return {
                "id": usuario['id'],
                "nome": usuario['nome'],
                "is_admin": bool(usuario['is_admin'])
            }
            
    return {"erro": "Email ou senha incorretos."}