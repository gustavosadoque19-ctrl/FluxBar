# FLUXBar - Documentação Técnica

Este sistema foi projetado para gerenciar operações de bares e restaurantes de forma escalável, integrando salão e delivery.

## 1. Modelagem do Banco de Dados (NoSQL - Firestore)

Optamos por uma estrutura NoSQL devido à flexibilidade de esquemas e escalabilidade horizontal.

### Coleções Principais:

- **waiters**: { id, name, shift, commissionRate }
- **products**: { id, name, price, category (Bebidas, Pratos, etc), available }
- **tables**: { id, number, status (Livre, Ocupada, Limpeza, Fechando), currentOrderId }
- **orders**: (Centraliza Salão e Delivery)
  - `type`: "TABLE" | "DELIVERY"
  - `status`: "OPEN" | "PREPARING" | "DELIVERING" | "FINISHED" | "CANCELLED"
  - `tableId`: (Opcional)
  - `waiterId`: (Opcional)
  - `customerId`: (Opcional)
  - `items`: Array<{ productId, name, price, quantity }>
  - `subtotal`, `serviceFee`, `deliveryFee`, `total`
  - `createdAt`, `updatedAt`
- **customers**: { id, name, phone, address: { street, number, neighborhood, city } }

---

## 2. Arquitetura de API (Endpoints REST)

1. **POST `/api/tables/{id}/open`**: Abre uma nova comanda para a mesa. Altera status da mesa para "Ocupada".
2. **POST `/api/orders/{id}/items`**: Adiciona novos itens a um pedido existente (Mesa ou Delivery).
3. **POST `/api/delivery/orders`**: Cria um novo pedido de delivery vinculado a um cliente.
4. **PATCH `/api/orders/{id}/status`**: Atualiza o fluxo de produção (ex: "Pendente" -> "Em Preparo" -> "Saiu para Entrega").
5. **POST `/api/orders/{id}/checkout`**: Finaliza o pedido, calcula taxas, gera o total e libera a mesa (status "Limpeza").

---

## 3. Regras de Negócio e Conflitos

- **Conflito de Mesa**: O sistema impede a abertura de uma mesa cujo status não seja "Livre" ou "Aguardando Limpeza".
- **Bloqueio de Delivery**: Pedidos com status "Saiu para Entrega" ou "Entregue" não permitem mais alteração de itens.
- **Transferência de Itens**: Ao transferir itens entre mesas, o sistema valida se a mesa de destino está aberta e atualiza os subtotais de ambas as comandas de forma atômica.
- **Cálculo de Comissão**: A comissão do garçom é calculada apenas sobre o `subtotal` de pedidos do tipo "TABLE" com status "FINISHED".
- **Divisão de Conta**: O sistema permite dividir o `total` final pelo número de pessoas informado no checkout, gerando valores individuais sugeridos.
