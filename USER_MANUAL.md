# Manual do Usuário - FLUXBar

Bem-vindo ao **FLUXBar**, seu sistema completo de gestão para bares e restaurantes. Este manual detalha todas as funcionalidades do sistema para que você possa operar com máxima eficiência.

---

## 1. Navegação Principal
O sistema possui uma barra lateral (sidebar) que permite alternar entre as diferentes visões:
- **Dashboard:** Visão geral do negócio, métricas em tempo real e pedidos recentes.
- **Mesas:** Gestão visual das mesas do estabelecimento.
- **Cozinha:** Controle de preparação de pedidos.
- **Delivery:** Gestão de pedidos externos (ex: iFood).
- **Cardápio:** Cadastro e edição de produtos.
- **Garçons:** Gestão da equipe de atendimento.
- **Relatórios:** Análise de vendas, ticket médio e CMV.
- **Caixa:** Controle de abertura e fechamento financeiro.
- **Fiscal:** Configuração de emissão de notas fiscais (NF-e/NFC-e).
- **Configurações:** Dados do restaurante, horários e taxas.

---

## 2. Gestão de Mesas
Na aba **Mesas**, você pode:
- **Adicionar Mesa:** Clique em "Adicionar Mesa" para criar uma nova mesa numerada.
- **Status das Mesas:**
  - **Verde (Livre):** Mesa disponível.
  - **Vermelho (Ocupada):** Mesa com pedido em aberto.
  - **Laranja (Aguardando Limpeza):** Mesa que precisa ser limpa após o fechamento.
  - **Azul (Fechando Conta):** Cliente solicitou a conta.
- **QR Code:** Clique no ícone de QR Code em cada mesa para gerar e baixar o código que permite ao cliente acessar o cardápio digital.

---

## 3. Pedidos e Comandas
### Criar Novo Pedido
1. Clique em "Novo Pedido" no Dashboard ou diretamente em uma mesa livre.
2. Selecione o garçom responsável.
3. Adicione os itens selecionando-os no cardápio lateral.
4. Clique em "Confirmar Pedido".

### Gerenciar Pedido Existente
Clique em uma mesa ocupada ou em um pedido no Dashboard para abrir os **Detalhes do Pedido**:
- **Adicionar Itens:** Clique em "Adicionar Itens" para incluir novos produtos na comanda.
- **Alterar Status:** Mude entre "Aberto", "Preparando" e "Entregando".
- **Imprimir:** Gera uma versão para impressão térmica da comanda.
- **WhatsApp:** Envia o resumo da conta diretamente para o cliente via WhatsApp.
- **Dividir Conta:** Permite dividir o total por número de pessoas ou selecionar itens específicos.
- **Finalizar Conta:** Fecha o pedido e libera a mesa para limpeza.

---

## 4. Cozinha e Preparação
A aba **Cozinha** mostra todos os itens que precisam ser preparados:
- Os pedidos aparecem em cards com o tempo decorrido.
- Clique em "Preparar" para iniciar a produção.
- Clique em "Pronto" para notificar que o item pode ser entregue.

---

## 5. Delivery
Gerencie pedidos de entrega:
- Visualize pedidos vindos de plataformas externas.
- **Simular iFood:** Botão para testes que cria um pedido fictício da plataforma.
- Acompanhe o status de entrega de cada pedido.

---

## 6. Gestão de Cardápio e Equipe
- **Cardápio:** Cadastre produtos com nome, preço, custo (para cálculo de CMV), categoria e disponibilidade.
- **Garçons:** Cadastre sua equipe e defina a taxa de comissão (opcional).

---

## 7. Financeiro e Caixa
### Operação de Caixa
O sistema utiliza o conceito de **Fechamento Cego**:
1. **Abrir Caixa:** Informe o valor inicial (fundo de reserva).
2. **Operação:** Todas as vendas finalizadas são computadas automaticamente.
3. **Fechar Caixa:** Informe o valor físico total encontrado no caixa. O sistema comparará com o valor esperado e mostrará eventuais diferenças.

### Relatórios (BI)
Acesse gráficos de evolução de vendas, ticket médio e a **Curva ABC** (produtos mais vendidos). O **CMV** (Custo de Mercadoria Vendida) ajuda a entender sua margem de lucro.

---

## 8. Módulo Fiscal
Para emitir notas fiscais:
1. Vá em **Fiscal**.
2. Preencha os dados da empresa (CNPJ, Razão Social, UF).
3. Faça o upload do seu **Certificado Digital A1** (.pfx) e informe a senha.
4. Configure o ambiente (Homologação para testes, Produção para valer).
5. Use o botão "Consultar SEFAZ" para verificar a conexão.
6. Após configurar, o botão "Emitir Nota" aparecerá nos detalhes de pedidos finalizados.

---

## 9. Configurações Gerais
- Altere o nome do restaurante e endereço (aparecem nas impressões).
- Defina a **Taxa de Serviço** (ex: 10%).
- Configure o **Happy Hour** para aplicar descontos automáticos em horários específicos.
- Acesse o link do **Cardápio Digital** para visualização pública.

---

*Dúvidas ou suporte? Entre em contato com o administrador do sistema.*
