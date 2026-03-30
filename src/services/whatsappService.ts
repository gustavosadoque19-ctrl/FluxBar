import { Order, RestaurantSettings } from "../types";

export const WhatsAppService = {
  formatPhone: (phone: string) => {
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    // Ensure it starts with 55 (Brazil) if it doesn't already
    if (cleaned.length === 11 && !cleaned.startsWith('55')) {
      return `55${cleaned}`;
    }
    return cleaned;
  },

  generateOrderMessage: (order: Order, settings: RestaurantSettings | null, templateType: 'received' | 'preparing' | 'delivering' | 'finished') => {
    if (!settings) return '';

    const templates = settings.whatsappTemplates || {};
    let message = '';

    const itemsText = order.items.map(item => `• ${item.name} (x${item.quantity})`).join('\n');
    const total = order.total.toFixed(2);
    const orderId = order.id.slice(0, 8).toUpperCase();

    switch (templateType) {
      case 'received':
        message = templates.orderReceived || 
          `*Olá, ${order.customerName}!*%0A%0A` +
          `Recebemos seu pedido *#${orderId}* com sucesso! ✅%0A%0A` +
          `*Itens:*%0A${itemsText}%0A%0A` +
          `*Total:* R$ ${total}%0A%0A` +
          `Estamos preparando com muito carinho.`;
        break;
      case 'preparing':
        message = templates.orderPreparing || 
          `*Pedido #${orderId}*%0A%0A` +
          `Seu pedido já está sendo preparado na cozinha! 🍳`;
        break;
      case 'delivering':
        message = templates.orderDelivering || 
          `*Pedido #${orderId}*%0A%0A` +
          `Ótimas notícias! Seu pedido saiu para entrega. 🛵💨%0A%0A` +
          `Endereço: ${order.deliveryAddress}`;
        break;
      case 'finished':
        message = templates.orderFinished || 
          `*Pedido #${orderId}*%0A%0A` +
          `Seu pedido foi finalizado. Esperamos que goste! 😋%0A%0A` +
          `Obrigado pela preferência!`;
        break;
    }

    // Replace placeholders if any (simple implementation)
    message = message
      .replace('{name}', order.customerName || '')
      .replace('{id}', orderId)
      .replace('{total}', total)
      .replace('{items}', itemsText);

    return message;
  },

  sendToCustomer: (order: Order, settings: RestaurantSettings | null, templateType: 'received' | 'preparing' | 'delivering' | 'finished') => {
    if (!order.customerPhone) return;
    
    const phone = WhatsAppService.formatPhone(order.customerPhone);
    const text = WhatsAppService.generateOrderMessage(order, settings, templateType);
    
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  },

  sendToRestaurant: (order: Order, settings: RestaurantSettings | null) => {
    if (!settings?.whatsappNumber) return;
    
    const phone = WhatsAppService.formatPhone(settings.whatsappNumber);
    const itemsText = order.items.map(item => `• ${item.name} (x${item.quantity})`).join('\n');
    const total = order.total.toFixed(2);
    const orderId = order.id.slice(0, 8).toUpperCase();
    
    const text = `*NOVO PEDIDO - ${settings.restaurantName}*%0A%0A` +
      `*ID:* #${orderId}%0A` +
      `*Cliente:* ${order.customerName}%0A` +
      `*Tel:* ${order.customerPhone}%0A` +
      `*Endereço:* ${order.deliveryAddress || 'Não informado'}%0A%0A` +
      `*Itens:*%0A${itemsText}%0A%0A` +
      `*TOTAL:* R$ ${total}`;
      
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  }
};
