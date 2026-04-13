# Operação MacGyver

> Projeto interno da **DeltaV Rocketry**.
Liderado por: Vinicius Chaves e Luiz Eduardo Lima
Desenvolvido por: Aviônica DeltaV Rocketry

## Visão Geral

A Operação MacGyver é o codinome do sistema centralizado de controle interno e gestão da equipe DeltaV Rocketry. O projeto nasce da necessidade de consolidar comunicação, rastreamento de tarefas e controle de prazos em uma única plataforma — eliminando a fragmentação de informações entre os setores da equipe.

## Problema

A equipe operava sem visibilidade centralizada: demandas perdidas, datas esquecidas, permissões sem controle e informações dispersas entre membros de setores distintos.

## Solução

Um sistema web hospedado na Azure, com autenticação por perfil e espaços isolados por setor, cobrindo:

- **Gestão de demandas** — criação, atribuição e acompanhamento de tarefas por setor e responsável
- **Calendário da equipe** — eventos, prazos e marcos de projeto centralizados
- **Controle por setor** — Propulsão, Estrutura, Aerodinâmica, Eletrônica/Aviônica, Recuperação e Gestão de Projeto
- **Autenticação** — login seguro com permissões por perfil

## Stack

| Camada | Tecnologia |
|---|---|
| Front End | HTML / CSS / JavaScript |
| Back End | Python (Flask ou FastAPI) |
| Banco de Dados | MySQL |
| Infraestrutura | Microsoft Azure |
